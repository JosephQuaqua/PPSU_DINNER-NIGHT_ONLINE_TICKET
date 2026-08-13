import { supabase } from './client';

export async function uploadPaymentProof(file: File, bookingId: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${bookingId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('payment-proofs')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }
  return path;
}

export async function getPaymentProofUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUrl(path, 3600);
  if (error) {
    console.error('Signed URL error:', error.message);
    return null;
  }
  return data?.signedUrl || null;
}

export async function uploadEventBanner(file: File, slug: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${slug}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('event-banners')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }
  const { data: urlData } = supabase.storage.from('event-banners').getPublicUrl(path);
  return urlData.publicUrl;
}

export async function uploadAvatar(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    console.error('Upload error:', error.message);
    return null;
  }
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
  return urlData.publicUrl;
}
