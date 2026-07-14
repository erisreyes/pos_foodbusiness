import { differenceInCalendarDays, parseISO } from 'date-fns';

export type RangeKey = 'today' | 'yesterday' | 'this_month' | 'custom';

const RANGE_KEYS: RangeKey[] = ['today', 'yesterday', 'this_month', 'custom'];

export function isRangeKey(value: string): value is RangeKey {
  return RANGE_KEYS.includes(value as RangeKey);
}

/** Business timezone for report calendar days (Philippines). */
export const REPORT_TIMEZONE = 'Asia/Manila';

export type NaiveTimestampRange = {
  start: string;
  end: string;
};

export type ReportPeriodRanges = {
  current: NaiveTimestampRange;
  previous: NaiveTimestampRange;
  comparisonLabel: string;
};

/** Calendar date (yyyy-MM-dd) in the report timezone. */
export function getTodayYmdInReportZone(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Inclusive wall-clock bounds for a calendar day (matches Supabase date column display). */
export function naiveDayBounds(ymd: string): NaiveTimestampRange {
  return {
    start: `${ymd} 00:00:00`,
    end: `${ymd} 23:59:59.999`,
  };
}

export function addYmdDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function getMonthBoundsYmd(ymd: string): { start: string; end: string } {
  const [y, m] = ymd.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function previousMonthBounds(ymd: string): { start: string; end: string } {
  const [y, m] = ymd.split('-').map(Number);
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const anchor = `${prevY}-${String(prevM).padStart(2, '0')}-15`;
  return getMonthBoundsYmd(anchor);
}

export function getReportPeriodRanges(
  range: RangeKey,
  customStart?: string,
  customEnd?: string,
): ReportPeriodRanges {
  const today = getTodayYmdInReportZone();

  if (range === 'today') {
    const yesterday = addYmdDays(today, -1);
    return {
      current: naiveDayBounds(today),
      previous: naiveDayBounds(yesterday),
      comparisonLabel: 'vs yesterday',
    };
  }

  if (range === 'yesterday') {
    const yesterday = addYmdDays(today, -1);
    const dayBefore = addYmdDays(today, -2);
    return {
      current: naiveDayBounds(yesterday),
      previous: naiveDayBounds(dayBefore),
      comparisonLabel: 'vs prior day',
    };
  }

  if (range === 'this_month') {
    const { start, end } = getMonthBoundsYmd(today);
    const prev = previousMonthBounds(today);
    return {
      current: naiveDayBoundsRange(start, end),
      previous: naiveDayBoundsRange(prev.start, prev.end),
      comparisonLabel: 'vs last month',
    };
  }

  if (customStart && customEnd) {
    const spanDays = Math.max(1, differenceInCalendarDays(parseISO(customEnd), parseISO(customStart)) + 1);
    const previousEnd = addYmdDays(customStart, -1);
    const previousStart = addYmdDays(customStart, -spanDays);
    return {
      current: naiveDayBoundsRange(customStart, customEnd),
      previous: naiveDayBoundsRange(previousStart, previousEnd),
      comparisonLabel: 'vs prior period',
    };
  }

  const fallbackEnd = today;
  const fallbackStart = addYmdDays(today, -29);
  const prevEnd = addYmdDays(fallbackStart, -1);
  const prevStart = addYmdDays(fallbackStart, -30);
  return {
    current: naiveDayBoundsRange(fallbackStart, fallbackEnd),
    previous: naiveDayBoundsRange(prevStart, prevEnd),
    comparisonLabel: 'vs prior period',
  };
}

function naiveDayBoundsRange(startYmd: string, endYmd: string): NaiveTimestampRange {
  return {
    start: `${startYmd} 00:00:00`,
    end: `${endYmd} 23:59:59.999`,
  };
}

/** Date portion from DB `created_at` (timestamp without time zone). */
export function naiveDatePart(createdAt: string): string {
  return createdAt.slice(0, 10);
}

/** Hour (0–23) from DB `created_at` wall-clock time. */
export function naiveHourPart(createdAt: string): string {
  const time = createdAt.includes('T') ? createdAt.split('T')[1] : createdAt.split(' ')[1] ?? '00:00:00';
  return String(parseInt(time.split(':')[0], 10));
}

/** List each calendar day between start and end (inclusive). */
export function listYmdDays(startYmd: string, endYmd: string): string[] {
  const days: string[] = [];
  let cursor = startYmd;
  while (cursor <= endYmd) {
    days.push(cursor);
    cursor = addYmdDays(cursor, 1);
  }
  return days;
}
