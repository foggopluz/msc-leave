interface PageWrapperProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function PageWrapper({ title, subtitle, action, children }: PageWrapperProps) {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">{title}</h1>
            {subtitle && <p className="text-[13px] text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
        {children}
      </div>
    </div>
  )
}
