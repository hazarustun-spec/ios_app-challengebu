// App Store review sign-in — fixed-code path for the OTP-only auth flow.
//
// The reviewer can't read the demo mailbox to get a mailed OTP, so the
// review-login Edge Function accepts a fixed code and returns a magic-link token
// hash. verifyOtp() turns that hash into a real session — same session the
// normal OTP path produces, so the rest of the app behaves identically.
//
// See packages/supabase/functions/review-login and isReviewEmail() in
// @tennis/shared for the allowlist that gates this path.

import type { Session } from '@supabase/supabase-js';
import { invokeFunction } from './invoke-function';
import { supabase } from './supabase';

export async function reviewLogin(email: string, code: string): Promise<Session> {
  const { tokenHash } = await invokeFunction<{ tokenHash: string }>(
    'review-login',
    { email, code },
  );
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (error) throw error;
  if (!data.session) throw new Error('Oturum oluşturulamadı.');
  return data.session;
}
