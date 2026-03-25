import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApprovalStage } from '@/lib/types'
import { nextStage } from '@/lib/permissions'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { approver_id, stage, comment } = await req.json()

  if (!approver_id || !stage) {
    return NextResponse.json({ error: 'approver_id and stage are required' }, { status: 400 })
  }

  const { data: leaveReq } = await db.from('leave_requests').select('*').eq('id', id).single()
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (leaveReq.status !== 'pending') return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })
  if (leaveReq.current_stage !== stage) {
    return NextResponse.json({ error: `This request is at stage '${leaveReq.current_stage}', not '${stage}'` }, { status: 400 })
  }

  // Insert approval log
  await db.from('approval_logs').insert({
    id: crypto.randomUUID(),
    leave_request_id: id,
    approver_id,
    stage,
    action: 'approved',
    comment: comment ?? null,
    created_at: new Date().toISOString(),
  })

  const next = nextStage(stage as ApprovalStage)
  const newStatus = next ? 'pending' : 'approved'
  const { data: updated, error } = await db.from('leave_requests')
    .update({ current_stage: next ?? null, status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Deduct balance on final approval
  if (newStatus === 'approved') {
    if (leaveReq.leave_type === 'work_cycle' || leaveReq.leave_type === 'annual') {
      // Increment days_taken (stored as balance)
      const { data: bal } = await db.from('leave_balances')
        .select('balance').eq('user_id', leaveReq.user_id).eq('leave_type', leaveReq.leave_type).single()
      if (bal) {
        await db.from('leave_balances')
          .update({ balance: bal.balance + leaveReq.days_requested })
          .eq('user_id', leaveReq.user_id).eq('leave_type', leaveReq.leave_type)
      }
    } else {
      const { data: bal } = await db.from('leave_balances')
        .select('balance').eq('user_id', leaveReq.user_id).eq('leave_type', leaveReq.leave_type).single()
      if (bal) {
        await db.from('leave_balances')
          .update({ balance: Math.max(0, bal.balance - leaveReq.days_requested) })
          .eq('user_id', leaveReq.user_id).eq('leave_type', leaveReq.leave_type)
      }
    }

    // Notify employee
    await db.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: leaveReq.user_id,
      type: 'approved',
      message: `Your ${leaveReq.leave_type.replace('_', ' ')} leave request has been approved.`,
      read: false,
      related_id: id,
      created_at: new Date().toISOString(),
    })
  }

  return NextResponse.json(updated)
}
