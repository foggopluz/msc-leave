import { NextRequest, NextResponse } from 'next/server'
import {
  users, leaveBalances, leaveRequests, publicHolidays
} from '@/lib/store'
import {
  WORK_CYCLE_WEEKLY_RATE,
  LEAVE_DEFAULTS,
  isOnLeaveOnDate,
  shouldResetSickLeave,
  shouldResetCompassionateLeave,
} from '@/lib/accrual'

export async function POST(req: NextRequest) {
  const { job } = await req.json()
  const results: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (job === 'work_cycle_accrual') {
    // Run weekly: add 1.5 days to each active employee NOT on leave
    let credited = 0
    for (const user of users.filter(u => u.is_active)) {
      const userLeaves = leaveRequests.filter(r => r.user_id === user.id)
      if (isOnLeaveOnDate(userLeaves, today)) continue

      const bal = leaveBalances.find(b => b.user_id === user.id && b.leave_type === 'work_cycle')
      if (bal) {
        bal.balance += WORK_CYCLE_WEEKLY_RATE
        credited++
      }
    }
    results.push(`work_cycle_accrual: credited ${WORK_CYCLE_WEEKLY_RATE} days to ${credited} employees`)
  }

  if (job === 'public_holiday_credit') {
    // Check if today is a public holiday
    const todayStr = today.toISOString().split('T')[0]
    const holiday = publicHolidays.find(h => h.date === todayStr)

    if (holiday) {
      let credited = 0
      for (const user of users.filter(u => u.is_active)) {
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
      { error: `Unknown job: ${job}. Valid jobs: work_cycle_accrual, public_holiday_credit, reset_sick_leave, reset_compassionate_leave` },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true, results })
}
