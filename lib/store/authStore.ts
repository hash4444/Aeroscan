import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';

interface AuthState {
  session: Session | null;
  initialized: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  session: null,
  initialized: false,
}));

let started = false;

/** Call once near app start (root layout). Safe to call more than once. */
export function startAuthListener(): void {
  if (started) return;
  started = true;

  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, initialized: true });
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, initialized: true });
  });
}
