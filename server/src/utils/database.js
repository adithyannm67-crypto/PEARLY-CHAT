import supabase from '../config/supabase.js';

// User-related queries
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateUserProfile = async (userId, updates) => {
  const payload = { ...updates };

  if (payload.name !== undefined) {
    payload.full_name = payload.name;
    delete payload.name;
  }

  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Connection requests
export const createConnectionRequest = async (requestData) => {
  const { data, error } = await supabase
    .from('connection_requests')
    .insert([requestData])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getConnectionRequests = async (userId) => {
  const { data, error } = await supabase
    .from('connection_requests')
    .select('*')
    .eq('receiver_id', userId);

  if (error) throw error;
  return data;
};

export const getPendingConnectionRequests = async (userId) => {
  const { data, error } = await supabase
    .from('connection_requests')
    .select('*, sender:users!connection_requests_sender_id_fkey(*)')
    .eq('receiver_id', userId)
    .eq('status', 'pending');

  if (error) throw error;
  return data;
};

// Messages
export const getMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*, sender:users!messages_sender_id_fkey(*)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const createMessage = async (messageData) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();

  if (error) throw error;
  return data;
};