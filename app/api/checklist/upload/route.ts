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
  // Use getUser() to validate the stored token with the Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: userRow, error } = await supabase.from('users').select('*').eq('id', user.id).single();
  if (error) return null;
  return userRow;
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

    function getCell(row: any, keys: string[]) {
      for (const key of keys) {
        if (row[key] !== undefined) return row[key];
      }
      const lower = Object.keys(row).reduce((acc: any, k) => ({ ...acc, [k.toLowerCase()]: row[k] }), {});
      for (const key of keys) {
        if (lower[key.toLowerCase()] !== undefined) return lower[key.toLowerCase()];
      }
      return undefined;
    }

    function parsePercentage(raw: any) {
      if (raw === undefined || raw === null || raw === '') return 0;
      if (typeof raw === 'number') return raw;
      let s = String(raw).trim();
      s = s.replace(/%/g, '').replace(/\s+/g, '').replace(/,/g, '.');
      const value = parseFloat(s);
      return Number.isNaN(value) ? NaN : value;
    }

    const items = rows.map((row: any, idx: number) => {
      const number      = Number(getCell(row, ['Number', 'number', 'מספר']) ?? idx + 1);
      const description = String(getCell(row, ['Description', 'description', 'DESCRIPTION', 'תיאור']) ?? '').trim();
      const rawPct      = getCell(row, ['Percentage', 'percentage', 'PERCENTAGE', 'אחוז', '%']);
      const percentage  = parsePercentage(rawPct);
      return { number, description, percentage, rawPct };
    }).filter(item => item.description);

    if (items.length === 0)
      return NextResponse.json({ error: 'No valid checklist rows found. Check headers and description values.' }, { status: 400 });

    // Validate all rows have valid data
    for (const item of items) {
      if (isNaN(item.number) || !item.description || isNaN(item.percentage))
        return NextResponse.json({ error: `Invalid data in row: ${JSON.stringify(item)}` }, { status: 400 });
      if (item.percentage < 0)
        return NextResponse.json({ error: `Percentage must be positive in row ${item.number}` }, { status: 400 });
    }

    let total = items.reduce((sum, item) => sum + item.percentage, 0);
    let warning: string | null = null;

    // Auto-convert decimal format (0-1) to percentage format (0-100)
    if (total > 0 && total <= 1.01) {
      items.forEach(item => { item.percentage = Math.round(item.percentage * 100 * 100) / 100; });
      total = items.reduce((sum, item) => sum + item.percentage, 0);
      warning = 'Values were auto-normalized to sum to 100%.';
      console.log('Converted decimal-format percentages to 0-100 scale; new total:', total);
    }

    // Auto-normalize totals when the values are weights rather than actual percentages
    if (total > 0 && Math.abs(total - 100) > 0.1) {
      const scale = 100 / total;
      items.forEach(item => { item.percentage = Math.round((item.percentage * scale) * 100) / 100; });
      total = items.reduce((sum, item) => sum + item.percentage, 0);
      warning = 'Values were auto-normalized to sum to 100%.';
      console.log('Auto-normalized weights to sum to 100; scale:', scale, 'new total:', total);
    }

    const finalTotal = items.reduce((sum, item) => sum + item.percentage, 0);
    if (Math.abs(finalTotal - 100) > 0.5)
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

    return NextResponse.json({ success: true, count: items.length, total, warning });
  } catch (err: any) {
    console.error('Checklist upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}