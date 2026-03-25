import { NextRequest, NextResponse } from 'next/server'
import {
  users, leaveBalances, leaveRequests, publicHolidays
} from '@/lib/store'
import {
  LEAVE_DEFAULTS,
  isOnLeaveOnDate,
  shouldResetSickLeave,
  shouldResetCompassionateLeave,
  computeWorkCycleAccrued,
  computeAnnualLeaveAccrued,
} from '@/lib/accrual'

export async function POST(req: NextRequest) {
  const { job } = await req.json()
  const results: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Work Cycle Accrual ──────────────────────────────────────────────────────
  if (job === 'work_cycle_accrual') {
    const activeUsers = users.filter(u => u.is_active)
    if (activeUsers.length === 0) {
      return NextResponse.json(
        { error: 'work_cycle_accrual aborted: no active users found. Possible data issue.' },
        { status: 400 }
      )
    }

    let updated = 0
    for (const user of activeUsers) {
      if (!user.joining_date) continue

      const userLeaves = leaveRequests.filter(r => r.user_id === user.id)
      const onLeaveToday = isOnLeaveOnDate(userLeaves, today)

      const joiningDate = new Date(user.joining_date)
      // Effective today for accrual: if on leave, accrue up to yesterday
      const accrualDate = onLeaveToday
        ? new Date(today.getTime() - 86400000)
        : today

      const accrued = computeWorkCycleAccrued(joiningDate, accrualDate)

      // Recalculate days taken from approved leave
      const daysTaken = userLeaves
        .filter(r => r.status === 'approved' && r.leave_type === 'work_cycle')
        .reduce((sum, r) => sum + r.days_requested, 0)

      const bal = leaveBalances.find(b => b.user_id === user.id && b.leave_type === 'work_cycle')
      if (bal) {
        // Sync stored days_taken (in case manual overrides happened)
        bal.balance = daysTaken
        updated++
      }

      results.push(`${user.full_name}: ${accrued} accrued, ${daysTaken} taken, effective ${Math.max(0, accrued - daysTaken).toFixed(2)} days`)
    }
    results.unshift(`work_cycle_accrual: recalculated for ${updated} employees`)
  }

  // ── Annual Leave Accrual ────────────────────────────────────────────────────
  if (job === 'annual_leave_accrual') {
    const activeUsers = users.filter(u => u.is_active)
    if (activeUsers.length === 0) {
      return NextResponse.json(
        { error: 'annual_leave_accrual aborted: no active users found.' },
        { status: 400 }
      )
    }

    let updated = 0
    for (const user of activeUsers) {
      if (!user.joining_date) continue

      const joiningDate = new Date(user.joining_date)
      const accrued = computeAnnualLeaveAccrued(joiningDate, today)

      const userLeaves = leaveRequests.filter(r => r.user_id === user.id)
      const daysTaken = userLeaves
        .filter(r => r.status === 'approved' && r.leave_type === 'annual')
        .reduce((sum, r) => sum + r.days_requested, 0)

      const bal = leaveBalances.find(b => b.user_id === user.id && b.leave_type === 'annual')
      if (bal) {
        bal.balance = daysTaken
        updated++
      }

      results.push(`${user.full_name}: ${accrued} accrued, ${daysTaken} taken, effective ${Math.max(0, accrued - daysTaken).toFixed(2)} days`)
    }
    results.unshift(`annual_leave_accrual: recalculated for ${updated} employees`)
  }

  // ── Public Holiday Credit ───────────────────────────────────────────────────
  if (job === 'public_holiday_credit') {
    const todayStr = today.toISOString().split('T')[0]
    const holiday = publicHolidays.find(h => h.date === todayStr)

    if (holiday) {
      const activeUsers = users.filter(u => u.is_active)
      if (activeUsers.length === 0) {
        return NextResponse.json(
          { error: 'public_holiday_credit aborted: no active users found. Possible data issue.' },
          { status: 400 }
        )
      }
      let credited = 0
      for (const user of activeUsers) {
        const userLeaves = leaveRequests.filter(r => r.user_id === user.id)
        if (isOnLeaveOnDate(userLeaves, today)) continue

        const bal = leaveBalances.find(b => b.user_id === user.id && b.leave_type === 'public_holiday')
        if (bal) {
          bal.balance += 1
          credited++
        }
      }
      results.push(`public_holiday_credit: "${holiday.name}" credited to ${credited} employees`)
    } else {
      results.push('public_holiday_credit: today is not a public holiday')
    }
  }

  // ── Reset Sick Leave ────────────────────────────────────────────────────────
  if (job === 'reset_sick_leave') {
    let reset = 0
    for (const bal of leaveBalances.filter(
      b => b.leave_type === 'sick_full' || b.leave_type === 'sick_half'
    )) {
      const lastReset = bal.last_reset_at ? new Date(bal.last_reset_at) : null
      if (shouldResetSickLeave(lastReset)) {
        bal.balance = LEAVE_DEFAULTS[bal.leave_type]
        bal.last_reset_at = today.toISOString()
        reset++
      }
    }
    results.push(`reset_sick_leave: reset ${reset} balances`)
  }

  // ── Reset Compassionate Leave ───────────────────────────────────────────────
  if (job === 'reset_compassionate_leave') {
    let reset = 0
    for (const bal of leaveBalances.filter(b => b.leave_type === 'compassionate')) {
      const lastReset = bal.last_reset_at ? new Date(bal.last_reset_at) : null
      if (shouldResetCompassionateLeave(lastReset)) {
        bal.balance = LEAVE_DEFAULTS.compassionate
        bal.last_reset_at = today.toISOString()
        reset++
      }
    }
    results.push(`reset_compassionate_leave: reset ${reset} balances`)
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: `Unknown job: ${job}. Valid jobs: work_cycle_accrual, annual_leave_accrual, public_holiday_credit, reset_sick_leave, reset_compassionate_leave` },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true, results })
}
