import { NextRequest, NextResponse } from 'next/server'
import { users, leaveBalances, logAdminAction } from '@/lib/store'
import { computeWorkCycleAccrued, computeAnnualLeaveAccrued } from '@/lib/accrual'
import { LeaveType } from '@/lib/types'

// PATCH /api/admin/balance : admin override of any user's leave balance
export async function PATCH(req: NextRequest) {
  const { admin_id, user_id, leave_type, new_balance } = await req.json()

  const admin = users.find(u => u.id === admin_id && u.role === 'admin')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })
  }

  const targetUser = users.find(u => u.id === user_id)
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const bal = leaveBalances.find(b => b.user_id === user_id && b.leave_type === (leave_type as LeaveType))
  if (!bal) return NextResponse.json({ error: 'Balance record not found' }, { status: 404 })

  const prevBalance = bal.balance

  if ((leave_type === 'work_cycle' || leave_type === 'annual') && targetUser.joining_date) {
    const today = new Date()
    const joiningDate = new Date(targetUser.joining_date)
    const accrued = leave_type === 'work_cycle'
      ? computeWorkCycleAccrued(joiningDate, today)
      : computeAnnualLeaveAccrued(joiningDate, today)
    // Store as days_taken = accrued - desired_effective_balance
    bal.balance = Math.max(0, Math.round((accrued - new_balance) * 100) / 100)
  } else {
    bal.balance = Math.max(0, new_balance)
  }

  logAdminAction(admin_id, 'override_balance', user_id,
    `Override ${leave_type} balance for ${targetUser.full_name}: ${prevBalance} → ${new_balance} (effective)`)

  return NextResponse.json({ success: true, balance: bal })
}
