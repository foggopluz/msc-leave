import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getInitialBalances } from '@/lib/accrual'
import { User, Role } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dept = searchParams.get('department_id')
  const role = searchParams.get('role') as Role | null
  const active = searchParams.get('active')

  let query = db.from('users').select('*, department:departments(*)')
  if (dept) query = query.eq('department_id', dept)
  if (role) query = query.eq('role', role)
  if (active !== null) query = query.eq('is_active', active === 'true')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, full_name, department_id, role, joining_date } = body

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name, and role are required' }, { status: 400 })
  }

  const { data: existing } = await db.from('users').select('id').eq('email', email).single()
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const newUser = {
    id: crypto.randomUUID(),
    email,
    full_name,
    department_id: department_id ?? null,
    role,
    is_active: true,
    joining_date: joining_date || new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  }

  const { data, error } = await db.from('users').insert(newUser).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-initialize leave balances
  const balances = getInitialBalances(newUser.id).map((b, i) => ({
    ...b, id: `lb-${newUser.id}-${i}`,
  }))
  await db.from('leave_balances').insert(balances)

  return NextResponse.json(data, { status: 201 })
}
