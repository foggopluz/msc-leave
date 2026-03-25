import { NextRequest, NextResponse } from 'next/server'
import { approveLeaveRequest, leaveRequests } from '@/lib/store'
import { ApprovalStage } from '@/lib/types'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { approver_id, stage, comment } = await req.json()

  if (!approver_id || !stage) {
    return NextResponse.json({ error: 'approver_id and stage are required' }, { status: 400 })
  }

  const leaveReq = leaveRequests.find(r => r.id === id)
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (leaveReq.status !== 'pending') {
    return NextResponse.json({ error: 'Request is not pending' }, { status: 400 })
  }

  if (leaveReq.current_stage !== stage) {
    return NextResponse.json(
      { error: `This request is at stage '${leaveReq.current_stage}', not '${stage}'` },
      { status: 400 }
    )
  }

  const updated = approveLeaveRequest(id, approver_id, stage as ApprovalStage, comment)
  if (!updated) return NextResponse.json({ error: 'Failed to approve' }, { status: 500 })

  return NextResponse.json(updated)
}
