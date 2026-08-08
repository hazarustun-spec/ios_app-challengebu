// Input rules for the 6-digit OTP field.
//
// Extracted from app/(auth)/otp.tsx so they are assertable under `bun test` —
// the screen imports the Supabase client and cannot be loaded there.
//
// Why the screen no longer keeps one TextInput per digit: each cell moved focus
// to the next one on every keystroke, and focus() lands a frame after React has
// committed the value. Typing "424242" at normal speed delivered keystrokes to a
// cell that had not handed over focus yet, so the code came out as "4244" —
// digits dropped and duplicated. Once six cells filled with the wrong digits the
// screen auto-submitted and showed "Geçersiz kod". Pasting was worse: the whole
// string arrived in a single maxLength={1} cell and only the last character
// survived. One input now owns the whole code and the cells are presentational.

/**
 * Normalise whatever the keyboard, a paste or iOS one-time-code autofill hands
 * us into the code we are willing to hold: digits only, never longer than the
 * expected length.
 */
export function sanitizeOtp(raw: string, length: number): string {
  return raw.replace(/\D/g, '').slice(0, length);
}
