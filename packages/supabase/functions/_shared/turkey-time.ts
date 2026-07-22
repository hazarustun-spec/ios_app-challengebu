// Turkey runs on a fixed UTC+3 offset (TRT) year-round — no DST since 2016.
//
// Match requests store `proposed_date` (YYYY-MM-DD) and `proposed_time` (HH:MM)
// as the players' local wall-clock time. Parsing them with a `Z` suffix would
// treat that wall-clock as UTC and shift every scheduled match 3 hours earlier
// on display. Anchoring to +03:00 keeps the stored instant correct.
const TURKEY_UTC_OFFSET = '+03:00';

/** Combine a local (Turkey) date + time into a correct UTC ISO instant. */
export function buildPlayedAtTR(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${date}T${normalizedTime}${TURKEY_UTC_OFFSET}`).toISOString();
}
