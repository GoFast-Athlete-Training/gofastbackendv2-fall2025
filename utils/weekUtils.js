/**
 * Week Utilities
 * 
 * Provides standardized week calculations for GoFast leaderboards and activity tracking.
 * All weeks are Monday-Sunday (ISO 8601 week standard).
 * 
 * Monday = 0, Sunday = 6 (JavaScript Date.getDay() returns 0 for Sunday)
 * We adjust: Monday = 1, Sunday = 7 for easier calculation
 */

/**
 * Get the start of the week (Monday 00:00:00) for a given date
 * @param {Date} date - The date to get the week start for (defaults to now)
 * @returns {Date} Monday 00:00:00 of the week containing the date
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = day === 0 ? 6 : day - 1; // Convert to Monday = 0, Sunday = 6
  
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday 23:59:59.999) for a given date
 * @param {Date} date - The date to get the week end for (defaults to now)
 * @returns {Date} Sunday 23:59:59.999 of the week containing the date
 */
export function getWeekEnd(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Add 6 days to get Sunday
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Get the current week range (Monday-Sunday)
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getCurrentWeek() {
  const start = getWeekStart();
  const end = getWeekEnd();
  
  return {
    start,
    end,
    label: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  };
}

/**
 * Get the previous week range (Monday-Sunday)
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getPreviousWeek() {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  const start = getWeekStart(lastWeek);
  const end = getWeekEnd(lastWeek);
  
  return {
    start,
    end,
    label: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  };
}

/**
 * Get week range for a specific date
 * @param {Date} date - The date to get the week for
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getWeekForDate(date) {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  
  return {
    start,
    end,
    label: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  };
}

/**
 * Check if a date is within the current week (Monday-Sunday)
 * @param {Date} date - The date to check
 * @returns {boolean}
 */
export function isInCurrentWeek(date) {
  const week = getCurrentWeek();
  return date >= week.start && date <= week.end;
}

/**
 * Get week number (1-52/53) for a given date
 * @param {Date} date - The date to get the week number for
 * @returns {number} Week number (1-52/53)
 */
export function getWeekNumber(date = new Date()) {
  const d = new Date(date);
  const weekStart = getWeekStart(d);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekStartYear = getWeekStart(yearStart);
  
  const diff = weekStart - weekStartYear;
  const weekNumber = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return weekNumber;
}

/**
 * Format week range for display
 * @param {Date} start - Week start date
 * @param {Date} end - Week end date
 * @returns {string} Formatted string like "Mon, Jan 1 - Sun, Jan 7"
 */
export function formatWeekRange(start, end) {
  const startStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

/**
 * Get the start of the month (first day 00:00:00) for a given date
 * @param {Date} date - The date to get the month start for (defaults to now)
 * @returns {Date} First day of the month at 00:00:00
 */
export function getMonthStart(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the month (last day 23:59:59.999) for a given date
 * @param {Date} date - The date to get the month end for (defaults to now)
 * @returns {Date} Last day of the month at 23:59:59.999
 */
export function getMonthEnd(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // Last day of previous month (which is the last day of current month)
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get the current month range
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getCurrentMonth() {
  const start = getMonthStart();
  const end = getMonthEnd();
  
  return {
    start,
    end,
    label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
}

/**
 * Get the previous month range
 * @returns {{ start: Date, end: Date, label: string }}
 */
export function getPreviousMonth() {
  const now = new Date();
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  const start = getMonthStart(lastMonth);
  const end = getMonthEnd(lastMonth);
  
  return {
    start,
    end,
    label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  };
}

