// The parts of "add this match to a calendar" that are just arithmetic and
// string building.
//
// Split out from match-calendar.ts on purpose: that module reaches Linking,
// expo-calendar and Sentry, and pulling any of them in drags react-native's
// Flow-typed source behind it. A URL builder should not need a device to be
// tested, and the escaping in it is exactly the part that breaks — a Turkish
// court name carries spaces and letters that have to survive intact.

import type { MatchFormat } from '@tennis/shared';

/**
 * How long to block out, per format. A calendar entry is a promise to other
 * people about your time, so these are the realistic upper end rather than the
 * fastest a match could go.
 */
export const DURATION_MINUTES: Record<MatchFormat, number> = {
  bu_klasik: 60, // up to seven games
  hizli_tiebreak: 30, // a single tiebreak to 10
  pro_set_8: 90, // eight games, possibly a tiebreak
  '3set_klasik': 150, // best of three full sets
};

export interface MatchCalendarEvent {
  /** "Yunus Emre ile maç" — the opponent is what makes it findable later. */
  title: string;
  startsAt: Date;
  format: MatchFormat;
  courtName?: string | null;
  /** Shown in the event body; keep it short, it is read at a glance. */
  notes?: string;
}

export function matchEndsAt(e: MatchCalendarEvent): Date {
  return new Date(e.startsAt.getTime() + DURATION_MINUTES[e.format] * 60_000);
}

/** `20260914T153000Z` — the only shape Google's template URL accepts. */
function toGoogleStamp(d: Date): string {
  return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** Builds the Google Calendar "add event" URL. */
export function buildGoogleCalendarUrl(e: MatchCalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toGoogleStamp(e.startsAt)}/${toGoogleStamp(matchEndsAt(e))}`,
  });
  if (e.courtName) params.set('location', e.courtName);
  if (e.notes) params.set('details', e.notes);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
