import { NextRequest, NextResponse } from 'next/server'
import { users, leaveBalances, departments } from '@/lib/store'
import { LeaveType } from '@/lib/types'

const LEAVE_TYPES: LeaveType[] = [
  'work_cycle', 'public_holiday', 'annual', 'sick_full', 'sick_half', 'compassionate'
]
const LEAVE_HEADERS = [
  'Work Cycle Balance', 'Public Holidays Balance',
  'Annual Leave', 'Sick Leave (Full)', 'Sick Leave (Half)', 'Compassionate Leave'
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'balances'

  if (type === 'template') {
    const header = ['Name', 'Department', 'Role', ...LEAVE_HEADERS].join(',')
    const example = ['John Doe', 'Engineering', 'employee', '0', '0', '28', '63', '63', '7'].join(',')
    const csv = [header, example].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="msc-leaves-import-template.csv"',
      },
    })
  }

  // Export current balances
  const header = ['Name', 'Email', 'Department', 'Role', ...LEAVE_HEADERS].join(',')

  const rows = users
    .filter(u => u.is_active)
    .map(u => {
      const dept = departments.find(d => d.id === u.department_id)
      const balMap = Object.fromEntries(
        leaveBalances
          .filter(b => b.user_id === u.id)
          .map(b => [b.leave_type, b.balance])
      )
      const balCols = LEAVE_TYPES.map(t => balMap[t] ?? 0)
      return [u.full_name, u.email, dept?.name ?? '', u.role, ...balCols].join(',')
    })

  const csv = [header, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="msc-leaves-balances.csv"',
    },
  })
}
