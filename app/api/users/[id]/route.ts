import { NextRequest, NextResponse } from 'next/server'
import { users, departments } from '@/lib/store'
import { User } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = users.find(u => u.id === id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...user,
    department: departments.find(d => d.id === user.department_id) ?? null,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = users.find(u => u.id === id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const allowed: (keyof User)[] = ['full_name', 'email', 'department_id', 'role', 'is_active']
  for (const key of allowed) {
    if (key in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(user as any)[key] = body[key]
    }
  }

  return NextResponse.json(user)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const idx = users.findIndex(u => u.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft delete
  users[idx].is_active = false
  return NextResponse.json({ success: true })
}
