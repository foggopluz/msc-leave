import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: req, error } = await db.from('leave_requests').select('*, user:users!leave_requests_user_id_fkey(*)').eq('id', id).single()
  if (error || !req) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: logs } = await db.from('approval_logs')
    .select('*, approver:users!approval_logs_approver_id_fkey(*)').eq('leave_request_id', id)
  return NextResponse.json({ ...req, approval_logs: logs ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: leaveReq } = await db.from('leave_requests').select('status').eq('id', id).single()
  if (!leaveReq) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (body.status === 'cancelled') {
    if (leaveReq.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending requests can be cancelled' }, { status: 400 })
    }
    const { data, error } = await db.from('leave_requests')
      .update({ status: 'cancelled', current_stage: null, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  return NextResponse.json(leaveReq)
}
