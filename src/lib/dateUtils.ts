import i18n from '@/i18n/config';

export interface FormatDateOptions {
  /** Locale string (e.g. 'pl-PL', 'en-US'). Defaults to i18n.language */
  locale?: string;
  /** If true, returns relative time for recent dates ("2 minutes ago") */
  relative?: boolean;
  /** Translation function for relative time labels */
  t?: (key: string, options?: Record<string, unknown>) => string;
  /** Translation key for "no date" fallback */
  noDateKey?: string;
}

/**
 * Formats a date string for display.
 *
 * Supports ISO 8601 strings and PocketBase-style "YYYY-MM-DD HH:MM:SS" formats.
 * When `relative` is true and a `t` function is provided, returns relative
 * time strings ("2 minutes ago") for dates within the past week.
 */
export function formatDate(dateStr?: string, options: FormatDateOptions = {}): string {
  const {
    locale = i18n.language || 'en',
    relative = false,
    t,
    noDateKey = 'comments.noDate',
  } = options;

  if (!dateStr) {
    return t ? t(noDateKey) : '';
  }

  try {
    let dateObj: Date;
    if (dateStr.includes('T')) {
      dateObj = new Date(dateStr);
    } else {
      dateObj = new Date(dateStr.replace(' ', 'T'));
    }

    if (isNaN(dateObj.getTime())) {
      // Fallback: manual parsing for non-standard formats
      const parts = dateStr.split(/[ T]/);
      if (parts.length >= 2) {
        const [y, m, d] = parts[0].split('-');
        const [time] = parts[1].split('.');
        const [h, min] = time.split(':');
        return `${d}.${m}.${y}, ${h}:${min}`;
      }
      return dateStr;
    }

    // Relative time formatting
    if (relative && t) {
      const now = new Date();
      const diff = Math.max(0, now.getTime() - dateObj.getTime());
      const mins = Math.floor(diff / 60000);

      if (mins < 1) return t('comments.now');
      if (mins < 60) return t('comments.minutesAgo', { count: mins });

      const hours = Math.floor(mins / 60);
      if (hours < 24) return t('comments.hoursAgo', { count: hours });

      const days = Math.floor(hours / 24);
      if (days < 7) return t('comments.daysAgo', { count: days });
    }

    // Absolute date+time formatting
    return (
      dateObj.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ', ' +
      dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  } catch {
    return dateStr;
  }
}
