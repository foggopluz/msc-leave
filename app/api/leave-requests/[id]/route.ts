import { NextRequest, NextResponse } from 'next/server'
import { leaveRequests, users, approvalLogs } from '@/lib/store'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const req = leaveRequests.find(r => r.id === id)
  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...req,
    user: users.find(u => u.id === req.user_id),
    approval_logs: approvalLogs
      .filter(l => l.leave_request_id === id)
      .map(l => ({ ...l, approver: users.find(u => u.id === l.approver_id) })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const leaveReq = leaveRequests.find(r => r.id === id)
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  // Only allow cancellation by employee
  if (body.status === 'cancelled') {
    if (leaveReq.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 400 })
    }
    leaveReq.status = 'cancelled'
    leaveReq.current_stage = null
    leaveReq.updated_at = new Date().toISOString()
  }

  return NextResponse.json(leaveReq)
}
