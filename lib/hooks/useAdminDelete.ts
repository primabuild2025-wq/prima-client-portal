import { createBrowserClient } from '@supabase/ssr';

export function useAdminDelete() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const deleteFile = async (id: string) => {
    const { error } = await supabase.from('files').delete().eq('id', id);
    if (error) throw error;
  };

  const deletePhoto = async (id: string) => {
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) throw error;
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  };

  const deleteNote = async (taskId: string, noteIndex: number, currentNotes: string) => {
    const entries = currentNotes.split('\n\n');
    const updated = entries.filter((_: string, i: number) => i !== noteIndex).join('\n\n');
    const { error } = await supabase
      .from('tasks')
      .update({ notes: updated || null, notes_updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) throw error;
    return updated || null;
  };

  return { deleteFile, deletePhoto, deleteNotification, deleteTask, deleteNote };
}