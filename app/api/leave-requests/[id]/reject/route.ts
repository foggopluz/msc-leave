import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApprovalStage } from '@/lib/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { approver_id, stage, comment } = await req.json()

  if (!approver_id || !stage) {
    return NextResponse.json({ error: 'approver_id and stage are required' }, { status: 400 })
  }

  const { data: leaveReq } = await db.from('leave_requests').select('*').eq('id', id).single()
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (leaveReq.status !== 'pending') return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })

  await db.from('approval_logs').insert({
    id: crypto.randomUUID(),
    leave_request_id: id,
    approver_id,
    stage,
    action: 'rejected',
    comment: comment ?? null,
    created_at: new Date().toISOString(),
  })

  const { data: updated, error } = await db.from('leave_requests')
    .update({ status: 'rejected', current_stage: null, updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify employee
  await db.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id: leaveReq.user_id,
    type: 'rejected',
    message: `Your ${leaveReq.leave_type.replace('_', ' ')} leave request has been rejected.${comment ? ` Reason: ${comment}` : ''}`,
    read: false,
    related_id: id,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json(updated)
}
