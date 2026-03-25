import { NextRequest, NextResponse } from 'next/server'
import { departments, users } from '@/lib/store'
import { Department } from '@/lib/types'

export async function GET() {
  const enriched = departments.map(d => ({
    ...d,
    approver: users.find(u => u.id === d.approver_id) ?? null,
    employee_count: users.filter(u => u.department_id === d.id && u.is_active).length,
  }))
  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const { name, approver_id } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  if (departments.find(d => d.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: 'Department already exists' }, { status: 409 })
  }

  const dept: Department = {
    id: `d-${Date.now()}`,
    name,
    approver_id: approver_id ?? null,
    created_at: new Date().toISOString(),
  }
  departments.push(dept)
  return NextResponse.json(dept, { status: 201 })
}
