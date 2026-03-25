import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')

  let query = db.from('public_holidays').select('*').order('date')
  if (year) query = query.eq('year', parseInt(year))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { date, name } = await req.json()
  if (!date || !name) return NextResponse.json({ error: 'date and name are required' }, { status: 400 })

  const { data: existing } = await db.from('public_holidays').select('id').eq('date', date).single()
  if (existing) return NextResponse.json({ error: 'Holiday already exists on this date' }, { status: 409 })

  const holiday = { id: crypto.randomUUID(), date, name, year: new Date(date).getFullYear() }
  const { data, error } = await db.from('public_holidays').insert(holiday).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
