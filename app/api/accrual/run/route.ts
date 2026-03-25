import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  LEAVE_DEFAULTS, shouldResetSickLeave, shouldResetCompassionateLeave,
  computeWorkCycleAccrued, computeAnnualLeaveAccrued, isOnLeaveOnDate,
} from '@/lib/accrual'
import { LeaveType } from '@/lib/types'

export async function POST(req: NextRequest) {
  const { job } = await req.json()
  const results: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().split('T')[0]

  if (job === 'work_cycle_accrual' || job === 'annual_leave_accrual') {
    const { data: activeUsers } = await db.from('users').select('*').eq('is_active', true)
    if (!activeUsers?.length) return NextResponse.json({ error: `${job} aborted: no active users found.` }, { status: 400 })

    const { data: allLeave } = await db.from('leave_requests').select('user_id, leave_type, days_requested, status, start_date, end_date').eq('status', 'approved')
    const leaveType = job === 'work_cycle_accrual' ? 'work_cycle' : 'annual'

    let updated = 0
    for (const user of activeUsers) {
      if (!user.joining_date) continue
      const joiningDate = new Date(user.joining_date)
      const userLeave = (allLeave ?? []).filter(r => r.user_id === user.id)
      const onLeaveToday = isOnLeaveOnDate(userLeave, today)
      const accrualDate = onLeaveToday ? new Date(today.getTime() - 86400000) : today
      const accrued = job === 'work_cycle_accrual'
        ? computeWorkCycleAccrued(joiningDate, accrualDate)
        : computeAnnualLeaveAccrued(joiningDate, today)
      const daysTaken = userLeave.filter(r => r.leave_type === leaveType).reduce((s, r) => s + r.days_requested, 0)
      await db.from('leave_balances').update({ balance: daysTaken }).eq('user_id', user.id).eq('leave_type', leaveType)
      updated++
      results.push(`${user.full_name}: ${accrued} accrued, ${daysTaken} taken, effective ${Math.max(0, accrued - daysTaken).toFixed(2)} days`)
    }
    results.unshift(`${job}: recalculated for ${updated} employees`)
  }

  if (job === 'public_holiday_credit') {
    const { data: holiday } = await db.from('public_holidays').select('name').eq('date', todayStr).single()
    if (holiday) {
      const { data: activeUsers } = await db.from('users').select('id').eq('is_active', true)
      if (!activeUsers?.length) return NextResponse.json({ error: 'public_holiday_credit aborted: no active users.' }, { status: 400 })
      const { data: onLeave } = await db.from('leave_requests').select('user_id').eq('status', 'approved').lte('start_date', todayStr).gte('end_date', todayStr)
      const onLeaveIds = new Set((onLeave ?? []).map(r => r.user_id))
      let credited = 0
      for (const user of activeUsers) {
        if (onLeaveIds.has(user.id)) continue
        const { data: bal } = await db.from('leave_balances').select('balance').eq('user_id', user.id).eq('leave_type', 'public_holiday').single()
        if (bal) { await db.from('leave_balances').update({ balance: bal.balance + 1 }).eq('user_id', user.id).eq('leave_type', 'public_holiday'); credited++ }
      }
      results.push(`public_holiday_credit: "${holiday.name}" credited to ${credited} employees`)
    } else {
      results.push('public_holiday_credit: today is not a public holiday')
    }
  }

  if (job === 'reset_sick_leave') {
    const { data: bals } = await db.from('leave_balances').select('*').in('leave_type', ['sick_full', 'sick_half'])
    let reset = 0
    for (const bal of bals ?? []) {
      if (shouldResetSickLeave(bal.last_reset_at ? new Date(bal.last_reset_at) : null)) {
        await db.from('leave_balances').update({ balance: LEAVE_DEFAULTS[bal.leave_type as LeaveType], last_reset_at: today.toISOString() }).eq('id', bal.id)
        reset++
      }
    }
    results.push(`reset_sick_leave: reset ${reset} balances`)
  }

  if (job === 'reset_compassionate_leave') {
    const { data: bals } = await db.from('leave_balances').select('*').eq('leave_type', 'compassionate')
    let reset = 0
    for (const bal of bals ?? []) {
      if (shouldResetCompassionateLeave(bal.last_reset_at ? new Date(bal.last_reset_at) : null)) {
        await db.from('leave_balances').update({ balance: LEAVE_DEFAULTS.compassionate, last_reset_at: today.toISOString() }).eq('id', bal.id)
        reset++
      }
    }
    results.push(`reset_compassionate_leave: reset ${reset} balances`)
  }

  if (results.length === 0) {
    return NextResponse.json({ error: `Unknown job: ${job}` }, { status: 400 })
  }
  return NextResponse.json({ success: true, results })
}
