import { LeaveType, LeaveBalance } from './types'

export const WORK_CYCLE_WEEKLY_RATE = 1.5

export const LEAVE_DEFAULTS: Record<LeaveType, number> = {
  work_cycle: 0,
  public_holiday: 0,
  annual: 28,
  sick_full: 63,
  sick_half: 63,
  compassionate: 7,
}

export const SICK_LEAVE_RESET_YEARS = 3
export const COMPASSIONATE_RESET_MONTHS = 12

/**
 * Calculate working days between two dates (Mon–Fri, inclusive).
 */
export function calculateLeaveDays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endNorm = new Date(end)
  endNorm.setHours(0, 0, 0, 0)

  while (cur <= endNorm) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

/**
 * Returns true if the employee has an approved leave on the given date.
 */
export function isOnLeaveOnDate(
  leaveRequests: { start_date: string; end_date: string; status: string }[],
  date: Date
): boolean {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return leaveRequests.some(req => {
    if (req.status !== 'approved') return false
    const s = new Date(req.start_date)
    s.setHours(0, 0, 0, 0)
    const e = new Date(req.end_date)
    e.setHours(0, 0, 0, 0)
    return d >= s && d <= e
  })
}

/**
 * Sick leave resets every 3 years from last reset date.
 */
export function shouldResetSickLeave(lastResetAt: Date | null): boolean {
  if (!lastResetAt) return false
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - SICK_LEAVE_RESET_YEARS)
  return lastResetAt <= cutoff
}

/**
 * Compassionate leave resets every 12 months from last reset date.
 */
export function shouldResetCompassionateLeave(lastResetAt: Date | null): boolean {
  if (!lastResetAt) return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - COMPASSIONATE_RESET_MONTHS)
  return lastResetAt <= cutoff
}

/**
 * Build initial leave balances for a newly created employee.
 */
export function getInitialBalances(
  userId: string
): Omit<LeaveBalance, 'id'>[] {
  return (Object.entries(LEAVE_DEFAULTS) as [LeaveType, number][]).map(
    ([leave_type, balance]) => ({
      user_id: userId,
      leave_type,
      balance,
      last_reset_at: null,
    })
  )
}

/**
 * Parse a CSV date range and return working days count.
 * Useful for import validation.
 */
export function parseDateRange(
  startStr: string,
  endStr: string
): number | null {
  const start = new Date(startStr)
  const end = new Date(endStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
  if (end < start) return null
  return calculateLeaveDays(start, end)
}
