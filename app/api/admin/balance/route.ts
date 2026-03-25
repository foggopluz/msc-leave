import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeWorkCycleAccrued, computeAnnualLeaveAccrued } from '@/lib/accrual'

export async function PATCH(req: NextRequest) {
  const { admin_id, user_id, leave_type, new_balance } = await req.json()

  const { data: admin } = await db.from('users').select('id').eq('id', admin_id).eq('role', 'admin').single()
  if (!admin) return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })

  const { data: targetUser } = await db.from('users').select('*').eq('id', user_id).single()
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: bal } = await db.from('leave_balances').select('*').eq('user_id', user_id).eq('leave_type', leave_type).single()
  if (!bal) return NextResponse.json({ error: 'Balance record not found' }, { status: 404 })

  let newStoredBalance = Math.max(0, new_balance)
  if ((leave_type === 'work_cycle' || leave_type === 'annual') && targetUser.joining_date) {
    const today = new Date()
    const joiningDate = new Date(targetUser.joining_date)
    const accrued = leave_type === 'work_cycle'
      ? computeWorkCycleAccrued(joiningDate, today)
      : computeAnnualLeaveAccrued(joiningDate, today)
    newStoredBalance = Math.max(0, Math.round((accrued - new_balance) * 100) / 100)
  }

  const { data: updated, error } = await db.from('leave_balances').update({ balance: newStoredBalance }).eq('id', bal.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('audit_logs').insert({
    id: crypto.randomUUID(), admin_id, action: 'override_balance', target_user_id: user_id,
    details: `Override ${leave_type} balance for ${targetUser.full_name}: ${bal.balance} -> ${new_balance} (effective)`,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ success: true, balance: updated })
}
