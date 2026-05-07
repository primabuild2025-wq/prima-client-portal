import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import * as XLSX from 'xlsx';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
  return user;
}

export async function POST(request: Request) {
  try {
    console.log('Upload route hit');
    console.log('Service key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'management'].includes(currentUser.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const formData  = await request.formData();
    const file      = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId)
      return NextResponse.json({ error: 'File and projectId required' }, { status: 400 });

    const buffer    = Buffer.from(await file.arrayBuffer());
    const workbook  = XLSX.read(buffer, { type: 'buffer' });
    const sheet     = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0)
    return NextResponse.json({ error: 'No data rows found in file' }, { status: 400 });

    console.log('First row keys:', Object.keys(rows[0]));
    console.log('First row:', rows[0]);

    const items = rows.map((row: any) => {
    const number      = Number(row['Number'] ?? row['number'] ?? row['מספר'] ?? 0);
    const description = String(row['Description'] ?? row['description'] ?? row['תיאור'] ?? '').trim();
    const rawPct      = Number(row['Percentage'] ?? row['percentage'] ?? row['אחוז'] ?? row['%'] ?? 0);
    return { number, description, percentage: rawPct };
    }).filter(item => item.description);

    // Validate all rows have valid data
    for (const item of items) {
      if (isNaN(item.number) || !item.description || isNaN(item.percentage))
        return NextResponse.json({ error: `Invalid data in row: ${JSON.stringify(item)}` }, { status: 400 });
      if (item.percentage < 0 || item.percentage > 100)
        return NextResponse.json({ error: `Percentage out of range in row ${item.number}` }, { status: 400 });
    }

    // Validate percentages add up to 100
    const total = items.reduce((sum, item) => sum + item.percentage, 0);

    // Auto-convert decimal format (0-1) to percentage format (0-100)
    if (total <= 1.01) {
    items.forEach(item => { item.percentage = Math.round(item.percentage * 100 * 100) / 100; });
    }

    const finalTotal = items.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(finalTotal - 100) > 0.1)
    return NextResponse.json({
        error: `Percentages must add up to 100%. Current total: ${finalTotal.toFixed(2)}%`
    }, { status: 400 });

    // Delete existing checklist for this project and replace
    await supabaseAdmin.from('project_checklist').delete().eq('project_id', projectId);

    const { error } = await supabaseAdmin.from('project_checklist').insert(
      items.map(item => ({
        project_id:  projectId,
        number:      item.number,
        description: item.description,
        percentage:  item.percentage,
        completed:   false,
      }))
    );

    if (error) throw error;

    return NextResponse.json({ success: true, count: items.length, total });
  } catch (err: any) {
    console.error('Checklist upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}