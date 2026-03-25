import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getInitialBalances } from '@/lib/accrual'
import { Role, LeaveType } from '@/lib/types'

const LEAVE_COLUMNS: { col: number; type: LeaveType }[] = [
  { col: 3, type: 'work_cycle' },
  { col: 4, type: 'public_holiday' },
  { col: 5, type: 'annual' },
  { col: 6, type: 'sick_full' },
  { col: 7, type: 'sick_half' },
  { col: 8, type: 'compassionate' },
]

export async function POST(req: NextRequest) {
  const { csv } = await req.json()
  if (!csv) return NextResponse.json({ error: 'csv field required' }, { status: 400 })

  const lines = (csv as string).split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV must have a header and at least one row' }, { status: 400 })

  const [, ...rows] = lines
  const created: unknown[] = []
  const errors: string[] = []

  const { data: depts } = await db.from('departments').select('id, name')
  const { data: existingUsers } = await db.from('users').select('email')
  const existingEmails = new Set((existingUsers ?? []).map(u => u.email))

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const [full_name, dept_name, role_raw] = cols
    if (!full_name || !role_raw) { errors.push(`Row ${i + 2}: Name and Role are required`); continue }
    const role = role_raw.toLowerCase() as Role
    if (!['employee', 'manager', 'hr', 'gm', 'viewer', 'admin'].includes(role)) { errors.push(`Row ${i + 2}: Invalid role "${role_raw}"`); continue }
    const email = `${full_name.toLowerCase().replace(/\s+/g, '.')}@naenda.co.tz`
    if (existingEmails.has(email)) { errors.push(`Row ${i + 2}: Employee "${full_name}" already exists`); continue }

    const dept = (depts ?? []).find(d => d.name.toLowerCase() === dept_name?.toLowerCase())
    const newUser = {
      id: crypto.randomUUID(),
      email, full_name,
      department_id: dept?.id ?? null,
      role, is_active: true,
      joining_date: cols[9] || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    }

    const { data: insertedUser, error } = await db.from('users').insert(newUser).select().single()
    if (error) { errors.push(`Row ${i + 2}: ${error.message}`); continue }

    const balances = getInitialBalances(newUser.id).map((b, idx) => {
      const override = LEAVE_COLUMNS.find(c => c.type === b.leave_type)
      const val = override ? parseFloat(cols[override.col]) : undefined
      return { ...b, id: `lb-${newUser.id}-${idx}`, balance: isNaN(val as number) ? b.balance : (val as number) }
    })
    await db.from('leave_balances').insert(balances)
    created.push(insertedUser)
    existingEmails.add(email)
  }

  return NextResponse.json({ created: created.length, errors })
}
