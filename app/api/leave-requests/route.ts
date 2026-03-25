import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { LeaveType } from '@/lib/types'
import { calculateLeaveDays } from '@/lib/accrual'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const status = searchParams.get('status')
  const stage = searchParams.get('stage')
  const deptId = searchParams.get('department_id')

  let query = db.from('leave_requests').select('*, user:users!leave_requests_user_id_fkey(*)').order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  if (status) query = query.eq('status', status)
  if (stage) query = query.eq('current_stage', stage)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = data ?? []
  if (deptId) {
    const { data: deptUsers } = await db.from('users').select('id').eq('department_id', deptId)
    const ids = new Set((deptUsers ?? []).map(u => u.id))
    result = result.filter(r => ids.has(r.user_id))
  }

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, leave_type, start_date, end_date, notes } = body

  if (!user_id || !leave_type || !start_date || !end_date) {
    return NextResponse.json({ error: 'user_id, leave_type, start_date, end_date are required' }, { status: 400 })
  }

  const { data: user } = await db.from('users').select('id').eq('id', user_id).single()
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const start = new Date(start_date)
  const end = new Date(end_date)
  if (end < start) return NextResponse.json({ error: 'end_date must be after start_date' }, { status: 400 })

  const days_requested = calculateLeaveDays(start, end)
  if (days_requested === 0) return NextResponse.json({ error: 'No working days in selected range' }, { status: 400 })

  // Check balance for non-dynamic types
  if (leave_type !== 'work_cycle' && leave_type !== 'annual') {
    const { data: bal } = await db.from('leave_balances')
      .select('balance').eq('user_id', user_id).eq('leave_type', leave_type).single()
    if (bal && bal.balance < days_requested) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${bal.balance} days, Requested: ${days_requested} days` },
        { status: 422 }
      )
    }
  }

  // Check overlap
  const { data: overlap } = await db.from('leave_requests')
    .select('id')
    .eq('user_id', user_id)
    .in('status', ['pending', 'approved'])
    .lte('start_date', end_date)
    .gte('end_date', start_date)
  if (overlap && overlap.length > 0) {
    return NextResponse.json({ error: 'Overlapping leave request exists' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const newRequest = {
    id: crypto.randomUUID(),
    user_id,
    leave_type,
    start_date,
    end_date,
    days_requested,
    status: 'pending',
    current_stage: 'manager',
    notes: notes ?? null,
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await db.from('leave_requests').insert(newRequest).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create notification for submitter
  await db.from('notifications').insert({
    id: crypto.randomUUID(),
    user_id,
    type: 'submitted',
    message: `Your ${leave_type.replace('_', ' ')} request for ${days_requested} day(s) has been submitted.`,
    read: false,
    related_id: data.id,
    created_at: now,
  })

  return NextResponse.json(data, { status: 201 })
}
