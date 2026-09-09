// "Takvime ekle" for an agreed match.
//
// Two destinations, because they work differently and neither covers the other:
//
//   Apple / device calendar — writes straight into whatever calendar the phone
//     defaults to, via expo-calendar. One permission prompt, no browser.
//   Google Calendar — opens a pre-filled event in Google's own web composer.
//     Nothing is written until the person presses Save there, and it needs no
//     permission at all. This is the one that works when someone keeps their
//     life in Google but has not connected it to iOS.
//
// SDK 56 note: expo-calendar moved to instance methods. `createEventAsync` and
// friends now throw at runtime — the calendar object's `createEvent` is the
// supported path (docs.expo.dev/versions/v56.0.0/sdk/calendar).
//
// expo-calendar is imported LAZILY, and that is not a style choice. Its module
// body calls `requireNativeModule('CalendarNext')`, which THROWS when the
// native module is absent — and JS ships over the air while native code only
// ships with a build. A static import here would crash the match detail screen
// on every phone running the current App Store binary the moment this update
// landed. So: probe for the native module to decide what to offer, and only
// pull the JS in once we know it is there.

import { requireOptionalNativeModule } from 'expo';
import { Linking, Platform } from 'react-native';
import { type MatchCalendarEvent, buildGoogleCalendarUrl, matchEndsAt } from './calendar-event';
import { captureException } from './sentry';

export { buildGoogleCalendarUrl, type MatchCalendarEvent } from './calendar-event';

export type AddResult =
  | { ok: true; eventId: string }
  | { ok: false; reason: 'permission' | 'no-calendar' | 'failed' };

/**
 * Writes the match into the device's default calendar.
 *
 * Asks for WRITE-ONLY access on iOS 17+: this feature only ever creates an
 * event, and the write-only prompt does not hand the app the user's existing
 * calendar — there is no reason to ask for something we will not read.
 */
export async function addMatchToDeviceCalendar(e: MatchCalendarEvent): Promise<AddResult> {
  if (!deviceCalendarSupported()) return { ok: false, reason: 'no-calendar' };
  try {
    const Calendar = await import('expo-calendar');
    const { granted } = await Calendar.requestCalendarPermissions(true);
    if (!granted) return { ok: false, reason: 'permission' };

    // iOS only; the app ships iOS-only today and the caller gates on Platform.
    const calendar = Calendar.getDefaultCalendarSync();
    if (!calendar) return { ok: false, reason: 'no-calendar' };

    const created = await calendar.createEvent({
      title: e.title,
      startDate: e.startsAt,
      endDate: matchEndsAt(e),
      location: e.courtName ?? undefined,
      notes: e.notes,
      // A match is a place you have to physically be; an hour is the amount of
      // notice that is actually useful for getting to a court.
      alarms: [{ relativeOffset: -60 }],
    });
    return { ok: true, eventId: created.id };
  } catch (err) {
    captureException(err, { where: 'addMatchToDeviceCalendar' });
    return { ok: false, reason: 'failed' };
  }
}

export async function openInGoogleCalendar(e: MatchCalendarEvent): Promise<boolean> {
  const url = buildGoogleCalendarUrl(e);
  try {
    await Linking.openURL(url);
    return true;
  } catch (err) {
    captureException(err, { where: 'openInGoogleCalendar' });
    return false;
  }
}

export function deviceCalendarSupported(): boolean {
  // getDefaultCalendarSync is iOS-only. Android would need a calendar picker,
  // and the Android build is a v2 item.
  if (Platform.OS !== 'ios') return false;
  // The optional variant returns null instead of throwing, which is what makes
  // it safe to ask this question from a binary that predates the module. Until
  // the build carrying expo-calendar ships, this is false and the sheet offers
  // Google Calendar only — which needs nothing native at all.
  return requireOptionalNativeModule('CalendarNext') != null;
}
