import { supabaseAdmin } from '../config/supabase.js';

const COMPLAINT_TABLE = 'complaints';

export const listComplaints = async ({ orderBy = 'created_at', ascending = false }) => {
  const { data, error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .select('*')
    .order(orderBy, { ascending });

  if (error) throw error;
  return data;
};

export const createComplaint = async (payload) => {
  const { data, error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const updateComplaint = async (id, payload) => {
  const { data, error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

export const deleteComplaint = async (id) => {
  const { error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const bulkDeleteComplaints = async (ids) => {
  const { error } = await supabaseAdmin
    .from(COMPLAINT_TABLE)
    .delete()
    .in('id', ids);

  if (error) throw error;
};
