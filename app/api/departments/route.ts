import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { data: depts, error } = await db.from('departments').select('*, approver:users!fk_dept_approver(*)')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Add employee_count
  const { data: users } = await db.from('users').select('id, department_id, is_active').eq('is_active', true)
  const enriched = (depts ?? []).map(d => ({
    ...d,
    employee_count: (users ?? []).filter(u => u.department_id === d.id).length,
  }))
  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { name, approver_id } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const { data: existing } = await db.from('departments').select('id').ilike('name', name).single()
  if (existing) return NextResponse.json({ error: 'Department already exists' }, { status: 409 })

  const dept = { id: crypto.randomUUID(), name, approver_id: approver_id ?? null, created_at: new Date().toISOString() }
  const { data, error } = await db.from('departments').insert(dept).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
