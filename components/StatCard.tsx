interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  accent?: 'blue' | 'green' | 'orange' | 'red' | 'gray'
  icon?: React.ReactNode
}

const accents = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-400' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-400' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-400' },
  red:    { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
  gray:   { bg: 'bg-gray-50',   text: 'text-gray-600',   dot: 'bg-gray-400' },
}

export default function StatCard({ label, value, sub, accent = 'gray', icon }: StatCardProps) {
  const a = accents[accent]
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={`w-8 h-8 rounded-xl ${a.bg} ${a.text} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <span className={`text-3xl font-semibold tracking-tight ${a.text}`}>{value}</span>
        {sub && <p className="text-[12px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
