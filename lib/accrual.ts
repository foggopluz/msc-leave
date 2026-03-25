import { LeaveType, LeaveBalance } from './types'

export const WORK_CYCLE_WEEKLY_RATE = 1.5

export const LEAVE_DEFAULTS: Record<LeaveType, number> = {
  work_cycle: 0,
  public_holiday: 0,
  annual: 0,        // Starts at 0, accrued dynamically from joining date
  sick_full: 63,
  sick_half: 63,
  compassionate: 7,
}

export const SICK_LEAVE_RESET_YEARS = 3
export const COMPASSIONATE_RESET_MONTHS = 12

// ── Joining-date-based accrual formulas ─────────────────────────────────────

/**
 * Work Cycle Days accrued from joining date to today (inclusive).
 * Formula: ((today - joiningDate + 1) / 7) * 1.5
 * Returns the total accumulated days (floored to 2 decimal places).
 */
export function computeWorkCycleAccrued(joiningDate: Date, today: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const joining = new Date(joiningDate)
  joining.setHours(0, 0, 0, 0)
  const todayNorm = new Date(today)
  todayNorm.setHours(0, 0, 0, 0)

  const daysWorked = Math.max(0, Math.floor((todayNorm.getTime() - joining.getTime()) / msPerDay) + 1)
  const accrued = (daysWorked / 7) * WORK_CYCLE_WEEKLY_RATE
  return Math.round(accrued * 100) / 100
}

/**
 * Annual Leave accrued from joining date to today (inclusive).
 * Formula: 28 * (today - joiningDate + 1) / 365
 * Returns total accumulated days (floored to 2 decimal places).
 */
export function computeAnnualLeaveAccrued(joiningDate: Date, today: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000
  const joining = new Date(joiningDate)
  joining.setHours(0, 0, 0, 0)
  const todayNorm = new Date(today)
  todayNorm.setHours(0, 0, 0, 0)

  const daysWorked = Math.max(0, Math.floor((todayNorm.getTime() - joining.getTime()) / msPerDay) + 1)
  const accrued = (28 * daysWorked) / 365
  return Math.round(accrued * 100) / 100
}

/**
 * Compute effective balance for dynamic leave types (work_cycle, annual).
 * storedBalance = total days already TAKEN (deducted on approval).
 * Returns max(0, accrued - taken).
 */
export function computeEffectiveBalance(
  leaveType: LeaveType,
  storedBalance: number,
  joiningDate: Date | null,
  today: Date
): number {
  if (leaveType === 'work_cycle') {
    if (!joiningDate) return 0
    const accrued = computeWorkCycleAccrued(joiningDate, today)
    return Math.max(0, Math.round((accrued - storedBalance) * 100) / 100)
  }
  if (leaveType === 'annual') {
    if (!joiningDate) return 0
    const accrued = computeAnnualLeaveAccrued(joiningDate, today)
    return Math.max(0, Math.round((accrued - storedBalance) * 100) / 100)
  }
  // For all other types, stored balance IS the effective balance
  return storedBalance
}

// ── Existing helpers (unchanged) ─────────────────────────────────────────────

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
 * work_cycle and annual start at 0 (tracked as days taken, accrued dynamically).
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
