import { supabaseAdmin } from '../config/supabase.js';

const PROFILE_TABLE = 'profiles';

export const findOrCreateProfile = async (user) => {
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (data) return data;

  const defaultProfile = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
    role: 'user',
    status: 'pending', // All new users start as pending - requires super admin approval
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const insertRes = await supabaseAdmin
    .from(PROFILE_TABLE)
    .insert(defaultProfile)
    .select('*')
    .single();

  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data;
};

export const listProfiles = async () => {
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateProfile = async (id, payload) => {
  const { data, error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteProfile = async (id) => {
  const { error } = await supabaseAdmin
    .from(PROFILE_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true };
};
