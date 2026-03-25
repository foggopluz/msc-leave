import { NextRequest, NextResponse } from 'next/server'
import { users, leaveBalances, departments } from '@/lib/store'
import { getInitialBalances } from '@/lib/accrual'
import { User, Role, LeaveType } from '@/lib/types'

// CSV columns: Name, Department, Role, Work Cycle Balance, Public Holidays Balance,
//              Annual Leave, Sick Leave (Full), Sick Leave (Half), Compassionate Leave

const LEAVE_COLUMNS: { col: number; type: LeaveType }[] = [
  { col: 3, type: 'work_cycle' },
  { col: 4, type: 'public_holiday' },
  { col: 5, type: 'annual' },
  { col: 6, type: 'sick_full' },
  { col: 7, type: 'sick_half' },
  { col: 8, type: 'compassionate' },
]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { csv } = body // raw CSV string

  if (!csv) return NextResponse.json({ error: 'csv field required' }, { status: 400 })

  const lines = (csv as string)
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ error: 'CSV must have a header and at least one row' }, { status: 400 })
  }

  const [_header, ...rows] = lines
  const created: User[] = []
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const [full_name, dept_name, role_raw] = cols

    if (!full_name || !role_raw) {
      errors.push(`Row ${i + 2}: Name and Role are required`)
      continue
    }

    const role = role_raw.toLowerCase() as Role
    if (!['employee', 'manager', 'hr', 'gm', 'viewer', 'admin'].includes(role)) {
      errors.push(`Row ${i + 2}: Invalid role "${role_raw}"`)
      continue
    }

    const email = `${full_name.toLowerCase().replace(/\s+/g, '.')}@naenda.co.tz`
    if (users.find(u => u.email === email)) {
      errors.push(`Row ${i + 2}: Employee "${full_name}" already exists`)
      continue
    }

    const dept = departments.find(d => d.name.toLowerCase() === dept_name?.toLowerCase())

    const newUser: User = {
      id: `u-import-${Date.now()}-${i}`,
      email,
      full_name,
      department_id: dept?.id ?? null,
      role,
      is_active: true,
      joining_date: cols[9] || new Date().toISOString().split('T')[0], // col 9 = Joining Date (optional)
      created_at: new Date().toISOString(),
    }
    users.push(newUser)

    // Initialize balances with optional overrides from CSV
    const balances = getInitialBalances(newUser.id).map((b, idx) => {
      const override = LEAVE_COLUMNS.find(c => c.type === b.leave_type)
      const val = override ? parseFloat(cols[override.col]) : undefined
      return {
        ...b,
        id: `lb-import-${newUser.id}-${idx}`,
        balance: isNaN(val as number) ? b.balance : (val as number),
      }
    })
    leaveBalances.push(...balances)
    created.push(newUser)
  }

  return NextResponse.json({ created: created.length, errors })
}
