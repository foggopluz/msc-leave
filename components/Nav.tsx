'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Role } from '@/lib/types'
import { canApprove, canManageEmployees, canImportEmployees, canAccessSettings } from '@/lib/permissions'

interface NavProps {
  userRole?: Role
  userName?: string
  unreadCount?: number
}

const navLinks = (role: Role) => {
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/leave', label: 'My Leave' },
  ]
  if (canApprove(role)) links.push({ href: '/approvals', label: 'Approvals' })
  if (canManageEmployees(role)) links.push({ href: '/employees', label: 'Employees' })
  if (canImportEmployees(role)) links.push({ href: '/import', label: 'Import' })
  links.push({ href: '/calendar', label: 'Calendar' })
  if (canAccessSettings(role)) links.push({ href: '/settings', label: 'Settings' })
  return links
}

export default function Nav({ userRole = 'employee', userName = 'User', unreadCount = 0 }: NavProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = navLinks(userRole)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">MSC-Leaves</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right: notifications + user */}
          <div className="flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-gray-100">
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-[13px] text-gray-700 font-medium">{userName}</span>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-2 space-y-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                pathname.startsWith(link.href)
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 pb-1 border-t border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] text-gray-700">{userName}</span>
          </div>
        </div>
      )}
    </nav>
  )
}
