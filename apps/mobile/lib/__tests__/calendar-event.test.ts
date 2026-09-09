// The Google Calendar path is a URL, and a URL is where this breaks: a Turkish
// court name carries spaces and letters that must survive percent-encoding, and
// Google rejects any timestamp that is not exactly `YYYYMMDDTHHMMSSZ`.

import { describe, expect, test } from 'bun:test';
import { buildGoogleCalendarUrl } from '../calendar-event';

const base = {
  title: 'Yunus Emre ile maç 🎾',
  startsAt: new Date('2026-09-14T15:30:00.000Z'),
  format: 'bu_klasik' as const,
};

describe('buildGoogleCalendarUrl', () => {
  test('stamps the window in the compact UTC form Google requires', () => {
    const url = new URL(buildGoogleCalendarUrl(base));
    // Klasik blocks 60 minutes.
    expect(url.searchParams.get('dates')).toBe('20260914T153000Z/20260914T163000Z');
  });

  test('duration follows the format, not a fixed hour', () => {
    const tb = new URL(buildGoogleCalendarUrl({ ...base, format: 'hizli_tiebreak' }));
    expect(tb.searchParams.get('dates')).toBe('20260914T153000Z/20260914T160000Z');

    const threeSet = new URL(buildGoogleCalendarUrl({ ...base, format: '3set_klasik' }));
    // Best of three is a long afternoon — 150 minutes.
    expect(threeSet.searchParams.get('dates')).toBe('20260914T153000Z/20260914T180000Z');
  });

  test('title and location survive encoding intact', () => {
    const url = new URL(buildGoogleCalendarUrl({ ...base, courtName: 'Kuzey Kampüs Kort 2' }));
    expect(url.searchParams.get('text')).toBe('Yunus Emre ile maç 🎾');
    expect(url.searchParams.get('location')).toBe('Kuzey Kampüs Kort 2');
    // Raw spaces in a query string would truncate the value at the first one.
    expect(url.toString()).not.toContain('Kuzey Kampüs');
  });

  test('omits location and details when there is nothing to say', () => {
    const url = new URL(buildGoogleCalendarUrl(base));
    expect(url.searchParams.has('location')).toBe(false);
    expect(url.searchParams.has('details')).toBe(false);
  });

  test('is a template action on the real Google host', () => {
    const url = new URL(buildGoogleCalendarUrl(base));
    expect(url.host).toBe('calendar.google.com');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
  });
});
