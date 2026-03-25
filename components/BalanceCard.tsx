import { LeaveBalance, LeaveType, LEAVE_TYPE_LABELS } from '@/lib/types'

interface BalanceCardProps {
  balances: LeaveBalance[]
}

const typeColors: Record<LeaveType, string> = {
  work_cycle:    'bg-blue-500',
  public_holiday:'bg-purple-500',
  annual:        'bg-green-500',
  sick_full:     'bg-orange-500',
  sick_half:     'bg-amber-500',
  compassionate: 'bg-rose-500',
}

const typeMax: Record<LeaveType, number> = {
  work_cycle: 30,
  public_holiday: 15,
  annual: 28,
  sick_full: 63,
  sick_half: 63,
  compassionate: 7,
}

export default function BalanceCard({ balances }: BalanceCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="text-[13px] font-semibold text-gray-900 mb-4">Leave Balances</h3>
      <div className="space-y-3.5">
        {balances.map(b => {
          const max = typeMax[b.leave_type]
          const pct = Math.min(100, (b.balance / max) * 100)
          const color = typeColors[b.leave_type]
          return (
            <div key={b.leave_type}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[12px] text-gray-600">{LEAVE_TYPE_LABELS[b.leave_type]}</span>
                <span className="text-[12px] font-semibold text-gray-900">{b.balance} days</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
