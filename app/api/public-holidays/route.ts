import { NextRequest, NextResponse } from 'next/server'
import { publicHolidays } from '@/lib/store'
import { PublicHoliday } from '@/lib/types'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  let result = [...publicHolidays].sort((a, b) => a.date.localeCompare(b.date))
  if (year) result = result.filter(h => h.date.startsWith(year))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { date, name } = await req.json()
  if (!date || !name) {
    return NextResponse.json({ error: 'date and name are required' }, { status: 400 })
  }

  if (publicHolidays.find(h => h.date === date)) {
    return NextResponse.json({ error: 'Holiday already exists on this date' }, { status: 409 })
  }

  const holiday: PublicHoliday = {
    id: `ph-${Date.now()}`,
    date,
    name,
    year: new Date(date).getFullYear(),
  }
  publicHolidays.push(holiday)
  return NextResponse.json(holiday, { status: 201 })
}
