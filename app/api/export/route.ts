import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { LeaveType } from '@/lib/types'

const LEAVE_TYPES: LeaveType[] = ['work_cycle', 'public_holiday', 'annual', 'sick_full', 'sick_half', 'compassionate']
const LEAVE_HEADERS = ['Work Cycle Balance', 'Public Holidays Balance', 'Annual Leave', 'Sick Leave (Full)', 'Sick Leave (Half)', 'Compassionate Leave']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'balances'

  if (type === 'template') {
    const header = ['Name', 'Department', 'Role', ...LEAVE_HEADERS, 'Joining Date'].join(',')
    const example = ['John Doe', 'Engineering', 'employee', '0', '0', '28', '63', '63', '7', '2024-01-15'].join(',')
    return new NextResponse([header, example].join('\n'), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="naenda-import-template.csv"' },
    })
  }

  const { data: users } = await db.from('users').select('*, department:departments(name)').eq('is_active', true)
  const { data: balances } = await db.from('leave_balances').select('*')

  const header = ['Name', 'Email', 'Department', 'Role', ...LEAVE_HEADERS].join(',')
  const rows = (users ?? []).map(u => {
    const balMap = Object.fromEntries(
      (balances ?? []).filter(b => b.user_id === u.id).map(b => [b.leave_type, b.balance])
    )
    const balCols = LEAVE_TYPES.map(t => balMap[t] ?? 0)
    return [u.full_name, u.email, (u.department as any)?.name ?? '', u.role, ...balCols].join(',')
  })

  return new NextResponse([header, ...rows].join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="naenda-balances.csv"' },
  })
}
