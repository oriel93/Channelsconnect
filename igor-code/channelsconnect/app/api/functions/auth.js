// Auth functions using Supabase
import { authHelpers } from '@/lib/supabase';

export const auth = {
  signIn: authHelpers.signIn,
  signUp: authHelpers.signUp,
  signOut: authHelpers.signOut,
  getUser: authHelpers.getUser,
  getSession: authHelpers.getSession,
  onAuthStateChange: authHelpers.onAuthStateChange,
};

export default auth;

