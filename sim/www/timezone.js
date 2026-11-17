// Local time in the clock's time zone, independent of the viewer's own zone.
// The firmware gets the same result from its POSIX TZ string.
export const TIME_ZONE = 'Europe/Berlin';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hourCycle: 'h23', weekday: 'short',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(ms) {
  const p = {};
  for (const part of fmt.formatToParts(new Date(ms))) p[part.type] = part.value;
  return {
    year: +p.year, month: +p.month, day: +p.day,
    hour: +p.hour, minute: +p.minute, second: +p.second,
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

function offsetMs(ms) {
  const l = localParts(ms);
  return Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute, l.second) - Math.floor(ms / 1000) * 1000;
}

// Local wall-clock time → epoch ms. A time skipped by DST lands just after the jump.
export function localToEpoch(year, month, day, hour, minute) {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  let t = asUtc - offsetMs(asUtc);
  t = asUtc - offsetMs(t);
  return t;
}
