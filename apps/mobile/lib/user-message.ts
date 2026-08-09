// Turn a thrown backend error into something a player can read.
//
// Every Edge Function answers in English and in the vocabulary of the schema
// ("Only direct_challenge requests can be accepted this way", "targetId
// required for direct_challenge"), and PostgREST answers with raw Postgres
// ("new row for relation \"profiles\" violates check constraint ..."). Screens
// used to pass err.message straight into Alert.alert, so all of that landed in
// front of the user in a Turkish app — including, on the sign-up screen, the
// constraint violation that got 1.1.0 (27) rejected.
//
// The map is an allowlist, not a filter: an error is shown only if it has a
// translation here. Anything else falls back to the caller's own sentence, so a
// new backend string can never leak by being forgotten.

const MESSAGES_TR: Record<string, string> = {
  // Auth / permissions
  Unauthorized: 'Oturumun sona ermiş. Tekrar giriş yap.',
  Forbidden: 'Bunu yapma yetkin yok.',
  'Internal server error': 'Sunucuda bir sorun oluştu. Biraz sonra tekrar dene.',
  'Invalid input': 'Girdiğin bilgiler geçersiz.',
  'Invalid code': 'Kod yanlış veya süresi doldu.',

  // Not found
  'Profile not found': 'Profil bulunamadı.',
  'Match not found': 'Maç bulunamadı.',
  'Request not found': 'İstek bulunamadı.',
  'Conversation not found': 'Sohbet bulunamadı.',
  'Dispute not found': 'İtiraz bulunamadı.',
  'Application not found': 'Başvuru bulunamadı.',
  'Season not found': 'Sezon bulunamadı.',
  'Tournament not found': 'Turnuva bulunamadı.',

  // Match requests
  'Cannot challenge yourself': 'Kendine meydan okuyamazsın.',
  'Cannot apply to your own call': 'Kendi ilanına başvuramazsın.',
  'You already applied': 'Bu ilana zaten başvurdun.',
  'Request has expired': 'İsteğin süresi dolmuş.',
  'Only the target can accept this challenge':
    'Bu meydan okumayı yalnızca davet edilen oyuncu kabul edebilir.',
  'Only the target can reject': 'Bu isteği yalnızca davet edilen oyuncu reddedebilir.',
  'Only the creator can select': 'Seçimi yalnızca ilanı açan oyuncu yapabilir.',
  'Only open_call accepts applications': 'Bu isteğe başvuru yapılamaz.',
  'Only direct_challenge requests can be accepted this way':
    'Bu istek bu şekilde kabul edilemez.',

  // Match lifecycle
  'Not a match participant': 'Bu maçın oyuncusu değilsin.',
  'Only participants can confirm': 'Maçı yalnızca oyuncuları onaylayabilir.',
  'Only participants can submit scores': 'Skoru yalnızca maçın oyuncuları girebilir.',
  'Only participants can raise disputes': 'İtirazı yalnızca maçın oyuncuları açabilir.',
  'Scores must be submitted before confirmation': 'Onaylamadan önce skor girilmeli.',
  'Scores must be submitted before a dispute can be raised':
    'İtiraz açabilmek için önce skor girilmeli.',
  'Dispute already resolved': 'Bu itiraz zaten sonuçlandırılmış.',

  // Messaging
  'Messaging is blocked between these users': 'Bu oyuncuyla mesajlaşma engellenmiş.',
  'Not a participant of this conversation': 'Bu sohbetin katılımcısı değilsin.',

  // Admin
  'Cannot delete last admin. Assign another admin first.':
    'Son yöneticiyi silemezsin. Önce başka bir yönetici ata.',
  'Admin cannot demote self': 'Kendi yöneticiliğini kaldıramazsın.',
  'Season already closed': 'Sezon zaten kapatılmış.',

  // Already Turkish on the server — listed so they pass through the allowlist.
  'Maç saati gelmeden skor girilemez.': 'Maç saati gelmeden skor girilemez.',
  'Bu oyuncuyla bu hafta en fazla 3 puanlı maç oynayabilirsiniz.':
    'Bu oyuncuyla bu hafta en fazla 3 puanlı maç oynayabilirsiniz.',
};

/**
 * `fallback` is what the user sees for anything unrecognised — write it as a
 * full sentence describing the action that failed, not as a generic "error".
 */
export function userMessage(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message.trim() : '';
  if (raw && Object.hasOwn(MESSAGES_TR, raw)) return MESSAGES_TR[raw];
  if (raw) {
    // Keeps the real cause reachable in a device log without putting schema
    // vocabulary on screen.
    console.warn('[user-message] untranslated backend error:', raw);
  }
  return fallback;
}
