import { NextRequest, NextResponse } from 'next/server'
import { leaveRequests, leaveBalances, users, createLeaveRequest } from '@/lib/store'
import { LeaveType } from '@/lib/types'
import { calculateLeaveDays } from '@/lib/accrual'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const status = searchParams.get('status')
  const stage = searchParams.get('stage')
  const deptId = searchParams.get('department_id')

  let filtered = [...leaveRequests]
  if (userId) filtered = filtered.filter(r => r.user_id === userId)
  if (status) filtered = filtered.filter(r => r.status === status)
  if (stage) filtered = filtered.filter(r => r.current_stage === stage)
  if (deptId) {
    const deptUserIds = new Set(users.filter(u => u.department_id === deptId).map(u => u.id))
    filtered = filtered.filter(r => deptUserIds.has(r.user_id))
  }

  const enriched = filtered
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(r => ({
      ...r,
      user: users.find(u => u.id === r.user_id),
    }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, leave_type, start_date, end_date, notes } = body

  if (!user_id || !leave_type || !start_date || !end_date) {
    return NextResponse.json(
      { error: 'user_id, leave_type, start_date, end_date are required' },
      { status: 400 }
    )
  }

  const user = users.find(u => u.id === user_id)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const start = new Date(start_date)
  const end = new Date(end_date)
  if (end < start) {
    return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 })
  }

  const days_requested = calculateLeaveDays(start, end)
  if (days_requested === 0) {
    return NextResponse.json({ error: 'No working days in selected range' }, { status: 400 })
  }

  // Check balance (unless HR/GM override)
  const bal = leaveBalances.find(b => b.user_id === user_id && b.leave_type === (leave_type as LeaveType))
  if (bal && bal.balance < days_requested) {
    return NextResponse.json(
      { error: `Insufficient balance. Available: ${bal.balance} days, Requested: ${days_requested} days` },
      { status: 422 }
    )
  }

  // Check for overlapping pending/approved leave
  const overlap = leaveRequests.find(r =>
    r.user_id === user_id &&
    ['pending', 'approved'].includes(r.status) &&
    !(new Date(r.end_date) < start || new Date(r.start_date) > end)
  )
  if (overlap) {
    return NextResponse.json({ error: 'Overlapping leave request exists' }, { status: 409 })
  }

  const newRequest = createLeaveRequest({
    user_id,
    leave_type,
    start_date,
    end_date,
    days_requested,
    notes: notes ?? null,
  })

  return NextResponse.json(newRequest, { status: 201 })
}
