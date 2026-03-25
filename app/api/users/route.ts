import { NextRequest, NextResponse } from 'next/server'
import { users, departments, leaveBalances } from '@/lib/store'
import { getInitialBalances } from '@/lib/accrual'
import { User, Role } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dept = searchParams.get('department_id')
  const role = searchParams.get('role') as Role | null
  const active = searchParams.get('active')

  let filtered = [...users]
  if (dept) filtered = filtered.filter(u => u.department_id === dept)
  if (role) filtered = filtered.filter(u => u.role === role)
  if (active !== null) filtered = filtered.filter(u => u.is_active === (active === 'true'))

  const enriched = filtered.map(u => ({
    ...u,
    department: departments.find(d => d.id === u.department_id) ?? null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, full_name, department_id, role } = body

  if (!email || !full_name || !role) {
    return NextResponse.json({ error: 'email, full_name, and role are required' }, { status: 400 })
  }

  if (users.find(u => u.email === email)) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
  }

  const newUser: User = {
    id: `u-${Date.now()}`,
    email,
    full_name,
    department_id: department_id ?? null,
    role,
    is_active: true,
    created_at: new Date().toISOString(),
  }

  users.push(newUser)

  // Auto-initialize leave balances
  const balances = getInitialBalances(newUser.id).map((b, i) => ({
    ...b, id: `lb-${newUser.id}-${i}`,
  }))
  leaveBalances.push(...balances)

  return NextResponse.json(newUser, { status: 201 })
}
