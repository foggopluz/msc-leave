import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getInitialBalances } from '@/lib/accrual'
import { Role } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.toLowerCase()
  const roleFilter = searchParams.get('role') as Role | null
  const activeFilter = searchParams.get('active')

  let query = db.from('users').select('*, department:departments!users_department_id_fkey(*)')
  if (roleFilter) query = query.eq('role', roleFilter)
  if (activeFilter !== null) query = query.eq('is_active', activeFilter === 'true')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = data ?? []
  if (search) result = result.filter(u => u.full_name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { admin_id, email, full_name, department_id, role, joining_date } = body

  if (!admin_id || !email || !full_name || !role || !joining_date) {
    return NextResponse.json({ error: 'admin_id, email, full_name, role, and joining_date are required' }, { status: 400 })
  }

  const { data: admin } = await db.from('users').select('id').eq('id', admin_id).eq('role', 'admin').single()
  if (!admin) return NextResponse.json({ error: 'Unauthorized: admin access required' }, { status: 403 })

  const { data: existing } = await db.from('users').select('id').eq('email', email).single()
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

  const newUser = {
    id: crypto.randomUUID(),
    email, full_name,
    department_id: department_id ?? null,
    role, is_active: true, joining_date,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await db.from('users').insert(newUser).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const balances = getInitialBalances(newUser.id).map((b, i) => ({ ...b, id: `lb-${newUser.id}-${i}` }))
  await db.from('leave_balances').insert(balances)

  await db.from('audit_logs').insert({
    id: crypto.randomUUID(), admin_id, action: 'create_user', target_user_id: newUser.id,
    details: `Created user ${full_name} (${email}) with role ${role}`, created_at: new Date().toISOString(),
  })

  return NextResponse.json(data, { status: 201 })
}
