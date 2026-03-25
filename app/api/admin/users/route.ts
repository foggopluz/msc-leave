import { NextRequest, NextResponse } from 'next/server'
import { users, departments, leaveBalances, auditLogs, logAdminAction } from '@/lib/store'
import { getInitialBalances } from '@/lib/accrual'
import { User, Role } from '@/lib/types'

// GET /api/admin/users : list all users (active + inactive), enriched
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.toLowerCase()
  const roleFilter = searchParams.get('role') as Role | null
  const activeFilter = searchParams.get('active')

  let filtered = [...users]
  if (search) {
    filtered = filtered.filter(u =>
      u.full_name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    )
  }
  if (roleFilter) filtered = filtered.filter(u => u.role === roleFilter)
  if (activeFilter !== null) filtered = filtered.filter(u => u.is_active === (activeFilter === 'true'))

  const enriched = filtered.map(u => ({
    ...u,
    department: departments.find(d => d.id === u.department_id) ?? null,
  }))

  return NextResponse.json(enriched)
}

// POST /api/admin/users : create user (admin only)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { admin_id, email, full_name, department_id, role, joining_date } = body

  if (!admin_id || !email || !full_name || !role || !joining_date) {
    return NextResponse.json(
      { error: 'admin_id, email, full_name, role, and joining_date are required' },
      { status: 400 }
    )
  }

  const admin = users.find(u => u.id === admin_id && u.role === 'admin')
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })
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
    joining_date,
    created_at: new Date().toISOString(),
  }

  users.push(newUser)

  const balances = getInitialBalances(newUser.id).map((b, i) => ({
    ...b, id: `lb-${newUser.id}-${i}`,
  }))
  leaveBalances.push(...balances)

  logAdminAction(admin_id, 'create_user', newUser.id,
    `Created user ${full_name} (${email}) with role ${role}`)

  return NextResponse.json(newUser, { status: 201 })
}
