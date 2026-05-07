import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadToBox } from '@/lib/box';

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

function getMediaType(mimeType: string): 'video' | 'photo' | 'document' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'photo';
  return 'document';
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData    = await request.formData();
    const file        = formData.get('file') as File;
    const projectId   = formData.get('projectId') as string;
    const taskId      = formData.get('taskId') as string | null;
    const description = formData.get('description') as string || '';
    const uploadedAt  = (formData.get('uploadedAt') as string) || new Date().toISOString();

    if (!file || !projectId)
      return NextResponse.json({ error: 'File and projectId are required' }, { status: 400 });
    if (description.length > 20)
      return NextResponse.json({ error: 'Description must be 20 characters or less' }, { status: 400 });

    const { data: project } = await supabaseAdmin
      .from('projects').select('*').eq('id', projectId).single();
    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const mediaType = getMediaType(file.type);
    const folderId  =
      mediaType === 'video' ? project.box_videos_folder_id :
      mediaType === 'photo' ? project.box_photos_folder_id :
      project.box_documents_folder_id;

    if (!folderId)
      return NextResponse.json({ error: 'Box folder not configured for this project' }, { status: 400 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const boxFile    = await uploadToBox(fileBuffer, file.name, folderId, file.type);

    const isRedFlag = mediaType === 'document' &&
                      file.type === 'application/pdf' &&
                      project.status === 'active';

    let dbRecord: any;

    if (mediaType === 'photo') {
      const { data, error } = await supabaseAdmin.from('photos').insert({
        project_id:  projectId,
        task_id:     taskId || null,
        uploader_id: currentUser.id,
        url:         boxFile.id,
        uploaded_at: uploadedAt,
        metadata: {
          box_file_id:   boxFile.id,
          original_name: file.name,
          mime_type:     file.type,
          size:          file.size,
          uploaded_at:   uploadedAt,
        },
      }).select().single();
      if (error) throw error;
      dbRecord = data;
    } else {
      const { data, error } = await supabaseAdmin.from('files').insert({
        project_id:   projectId,
        task_id:      taskId || null,
        uploader_id:  currentUser.id,
        object_key:   boxFile.id,
        description:  description || file.name.substring(0, 20),
        mime_type:    file.type,
        size:         file.size,
        red_flag:     isRedFlag,
        uploaded_at:  uploadedAt,
        // pending_approval: only admins see it until approved
        pending_approval: isRedFlag,
        metadata: {
          box_file_id:   boxFile.id,
          original_name: file.name,
          media_type:    mediaType,
          uploaded_at:   uploadedAt,
        },
      }).select().single();
      if (error) throw error;
      dbRecord = data;
    }

    if (isRedFlag) {
      await supabaseAdmin.from('projects').update({ red_flag: true }).eq('id', projectId);

      // Get project name
      const { data: projectData } = await supabaseAdmin
        .from('projects').select('name').eq('id', projectId).single();

      // Get task name if taskId exists
      let taskName = '';
      if (taskId) {
        const { data: taskData } = await supabaseAdmin
          .from('tasks').select('title').eq('id', taskId).single();
        taskName = taskData?.title || '';
      }

      const projectName = projectData?.name || projectId;
      const fileName    = description || file.name;
      const message     = taskName
        ? `PDF uploaded to active project "${projectName}" — task: "${taskName}" — file: "${fileName}"`
        : `PDF uploaded to active project "${projectName}" — file: "${fileName}"`;

      // Notify all admins and management
      const { data: adminUsers } = await supabaseAdmin
        .from('users').select('id').in('role', ['admin', 'management']);

      if (adminUsers && adminUsers.length > 0) {
        // Check if a notification already exists for this file in the last 10 seconds
        const { data: existing } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('user_id', adminUsers[0].id)
          .contains('metadata', { file_id: dbRecord.id })
          .limit(1);

        if (!existing || existing.length === 0) {
          await supabaseAdmin.from('notifications').insert(
            adminUsers.map((admin: any) => ({
              user_id:    admin.id,
              actor_id:   currentUser.id,
              title:      '🚩 Waiting for approval',
              message,
              read:       false,
              created_at: new Date().toISOString(),
              metadata:   {
                project_id: projectId,
                task_id:    taskId || null,
                file_id:    dbRecord.id,
                file_name:  fileName,
              },
            }))
          );
        }
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id:    currentUser.id,
      action:      `${mediaType}_uploaded`,
      entity_type: mediaType === 'photo' ? 'photos' : 'files',
      entity_id:   dbRecord.id,
      metadata: {
        project_id:  projectId,
        box_file_id: boxFile.id,
        uploaded_at: uploadedAt,
      },
    });

    return NextResponse.json({
      success:  true,
      file:     dbRecord,
      boxFileId: boxFile.id,
      redFlag:  isRedFlag,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 });
  }
}