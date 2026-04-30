import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const authHelpers = {
  async signUp(email, password, additionalData = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: additionalData,
        // Send email confirmation link back to Channels Connect, not Supabase
        emailRedirectTo: `${window.location.origin}/AuthCallback`,
      },
    });
    return { data, error };
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signInWithGoogle(redirectTo) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || window.location.origin,
      },
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async resetPasswordRequest(email) {
    // Always redirect to the canonical Channels Connect reset-password page
    const resetUrl = process.env.NODE_ENV === 'production'
      ? 'https://channelsconnect.com/ResetPassword'
      : `${window.location.origin}/ResetPassword`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetUrl,
    });
    return { data, error };
  },

  async resetPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  },
};

