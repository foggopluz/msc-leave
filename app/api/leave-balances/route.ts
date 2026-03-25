import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeWorkCycleAccrued, computeAnnualLeaveAccrued } from '@/lib/accrual'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id is required' }, { status: 400 })

  const { data: user } = await db.from('users').select('joining_date').eq('id', userId).single()
  const { data: balances, error } = await db.from('leave_balances').select('*').eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const today = new Date()
  const joiningDate = user?.joining_date ? new Date(user.joining_date) : null

  // Get approved leave days taken for dynamic types
  const { data: approvedLeave } = await db.from('leave_requests')
    .select('leave_type, days_requested')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .in('leave_type', ['work_cycle', 'annual'])

  const workCycleTaken = (approvedLeave ?? []).filter(r => r.leave_type === 'work_cycle').reduce((s, r) => s + r.days_requested, 0)
  const annualTaken = (approvedLeave ?? []).filter(r => r.leave_type === 'annual').reduce((s, r) => s + r.days_requested, 0)

  const enriched = (balances ?? []).map(b => {
    if (b.leave_type === 'work_cycle' && joiningDate) {
      const accrued = computeWorkCycleAccrued(joiningDate, today)
      const effective = Math.max(0, Math.round((accrued - workCycleTaken) * 100) / 100)
      return { ...b, balance: effective, accrued, effective, days_taken: workCycleTaken }
    }
    if (b.leave_type === 'annual' && joiningDate) {
      const accrued = computeAnnualLeaveAccrued(joiningDate, today)
      const effective = Math.max(0, Math.round((accrued - annualTaken) * 100) / 100)
      return { ...b, balance: effective, accrued, effective, days_taken: annualTaken }
    }
    return b
  })

  return NextResponse.json(enriched)
}

export async function PATCH(req: NextRequest) {
  const { user_id, leave_type, balance } = await req.json()
  if (!user_id || !leave_type || balance === undefined) {
    return NextResponse.json({ error: 'user_id, leave_type, and balance are required' }, { status: 400 })
  }

  let newStoredBalance = Math.max(0, balance)

  if (leave_type === 'work_cycle' || leave_type === 'annual') {
    const { data: user } = await db.from('users').select('joining_date').eq('id', user_id).single()
    if (user?.joining_date) {
      const today = new Date()
      const joiningDate = new Date(user.joining_date)
      const accrued = leave_type === 'work_cycle'
        ? computeWorkCycleAccrued(joiningDate, today)
        : computeAnnualLeaveAccrued(joiningDate, today)
      newStoredBalance = Math.max(0, Math.round((accrued - balance) * 100) / 100)
    }
  }

  const { data, error } = await db.from('leave_balances')
    .update({ balance: newStoredBalance })
    .eq('user_id', user_id).eq('leave_type', leave_type)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
