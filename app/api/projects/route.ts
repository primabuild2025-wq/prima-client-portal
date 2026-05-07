import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createProjectFolders } from '@/lib/box';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: user } = await supabase.from('users').select('*').eq('id', session.user.id).single();
  return user;
}

export async function POST(request: Request) {
  console.log('=== POST /api/projects START ===');
  try {
    console.log('=== STEP 1: getting user ===');
    const currentUser = await getCurrentUser();
    if (!currentUser || !['admin', 'management'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('=== STEP 2: parsing body ===');
    const { name, description } = await request.json();
    if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

    console.log('=== STEP 3: creating Box folders ===');
    let boxFolderIds = {
      projectFolderId: null as string | null,
      videosFolderId: null as string | null,
      photosFolderId: null as string | null,
      documentsFolderId: null as string | null,
    };
    try {
      boxFolderIds = await createProjectFolders(name);
      console.log('=== Box folders created ===', boxFolderIds);
    } catch (boxErr: any) {
      console.error('Box folder creation failed:', boxErr.message);
    }

    console.log('=== STEP 4: inserting into Supabase ===');
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        name,
        description,
        owner_id: currentUser.id,
        box_folder_id: boxFolderIds.projectFolderId,
        box_videos_folder_id: boxFolderIds.videosFolderId,
        box_photos_folder_id: boxFolderIds.photosFolderId,
        box_documents_folder_id: boxFolderIds.documentsFolderId,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('=== STEP 5: assignments and audit ===');
    await supabaseAdmin.from('project_assignments').insert({
      project_id: project.id,
      user_id: currentUser.id,
      role: currentUser.role,
    });

    await supabaseAdmin.from('audit_logs').insert({
      actor_id: currentUser.id,
      action: 'project_created',
      entity_type: 'project',
      entity_id: project.id,
      metadata: { name, box_folder_id: boxFolderIds.projectFolderId },
    });

    console.log('=== PROJECT CREATED SUCCESSFULLY ===');
    return NextResponse.json({ project });

  } catch (err: any) {
    console.error('Project creation error:', err.message, err.stack);
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let query = supabaseAdmin
      .from('projects')
      .select('*, owner:users!owner_id(name, email), assignments:project_assignments(user:users(name, email), role)')
      .order('created_at', { ascending: false });

    if (currentUser.role !== 'admin' && currentUser.role !== 'management') {
      const { data: assignments } = await supabaseAdmin
        .from('project_assignments').select('project_id').eq('user_id', currentUser.id);
      const ids = (assignments || []).map((a: any) => a.project_id);
      if (ids.length === 0) return NextResponse.json({ projects: [] });
      query = query.in('id', ids);
    }

    const { data: projects, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}