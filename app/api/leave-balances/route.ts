import { NextRequest, NextResponse } from 'next/server'
import { leaveBalances, users, leaveRequests } from '@/lib/store'
import { computeEffectiveBalance, computeWorkCycleAccrued, computeAnnualLeaveAccrued } from '@/lib/accrual'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  const user = users.find(u => u.id === userId)
  const today = new Date()
  const joiningDate = user?.joining_date ? new Date(user.joining_date) : null

  const balances = leaveBalances.filter(b => b.user_id === userId)

  // Enrich with dynamic accrual for work_cycle and annual
  const enriched = balances.map(b => {
    if ((b.leave_type === 'work_cycle' || b.leave_type === 'annual') && joiningDate) {
      const accrued = b.leave_type === 'work_cycle'
        ? computeWorkCycleAccrued(joiningDate, today)
        : computeAnnualLeaveAccrued(joiningDate, today)

      // b.balance stores days TAKEN for these types
      const daysTaken = leaveRequests
        .filter(r => r.user_id === userId && r.status === 'approved' && r.leave_type === b.leave_type)
        .reduce((sum, r) => sum + r.days_requested, 0)

      const effective = Math.max(0, Math.round((accrued - daysTaken) * 100) / 100)

      return { ...b, balance: effective, accrued, effective, days_taken: daysTaken }
    }
    return b
  })

  return NextResponse.json(enriched)
}

export async function PATCH(req: NextRequest) {
  const { user_id, leave_type, balance } = await req.json()

  if (!user_id || !leave_type || balance === undefined) {
    return NextResponse.json(
      { error: 'user_id, leave_type, and balance are required' },
      { status: 400 }
    )
  }

  const bal = leaveBalances.find(b => b.user_id === user_id && b.leave_type === leave_type)
  if (!bal) return NextResponse.json({ error: 'Balance not found' }, { status: 404 })

  // For dynamic types, store as days taken (0 means no days taken)
  // Admin override: set days_taken so that effective = balance
  if (leave_type === 'work_cycle' || leave_type === 'annual') {
    const user = users.find(u => u.id === user_id)
    if (user?.joining_date) {
      const today = new Date()
      const joiningDate = new Date(user.joining_date)
      const accrued = leave_type === 'work_cycle'
        ? computeWorkCycleAccrued(joiningDate, today)
        : computeAnnualLeaveAccrued(joiningDate, today)
      // Set days_taken = accrued - desired_balance
      bal.balance = Math.max(0, Math.round((accrued - balance) * 100) / 100)
    }
  } else {
    bal.balance = Math.max(0, balance)
  }

  // Return enriched balance
  const user = users.find(u => u.id === user_id)
  const today = new Date()
  const joiningDate = user?.joining_date ? new Date(user.joining_date) : null
  const effective = computeEffectiveBalance(leave_type as never, bal.balance, joiningDate, today)

  return NextResponse.json({ ...bal, effective })
}
