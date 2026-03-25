'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import PageWrapper from '@/components/PageWrapper'
import { useDemoUser } from '@/lib/demo-user'

const TEMPLATE_HEADERS = [
  'Name', 'Department', 'Role',
  'Work Cycle Balance', 'Public Holidays Balance',
  'Annual Leave', 'Sick Leave (Full)', 'Sick Leave (Half)', 'Compassionate Leave',
  'Joining Date'
]

export default function ImportPage() {
  useDemoUser() // ensure context is active
  const [csv, setCsv] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const parseFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => setCsv(e.target?.result as string)
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const handleImport = async () => {
    if (!csv.trim()) return
    setLoading(true)
    setResult(null)

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  return (
    <>
      <Nav />
      <PageWrapper
        title="Import Employees"
        subtitle="Bulk import via CSV"
        action={
          <a
            href="/api/export?type=template"
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-medium hover:bg-gray-50 transition-colors"
          >
            Download Template
          </a>
        }
      >
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload zone */}
          <div className="lg:col-span-2 space-y-5">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-3">📁</div>
              <p className="text-[13px] font-medium text-gray-700 mb-1">
                Drop your CSV file here
              </p>
              <p className="text-[12px] text-gray-400 mb-4">or</p>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-gray-100 text-[13px] font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Browse file
                <input type="file" accept=".csv,.txt" onChange={handleFileInput} className="hidden" />
              </label>
            </div>

            {/* CSV preview */}
            {csv && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-medium text-gray-700">
                    {csv.split('\n').filter(Boolean).length - 1} rows detected
                  </p>
                  <button onClick={() => { setCsv(''); setResult(null) }} className="text-[12px] text-red-500 hover:text-red-700">
                    Clear
                  </button>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 overflow-auto max-h-40">
                  <pre className="text-[11px] text-gray-600 whitespace-pre">{csv.slice(0, 800)}{csv.length > 800 ? '\n…' : ''}</pre>
                </div>
              </div>
            )}

            {/* Paste fallback */}
            {!csv && (
              <div>
                <p className="text-[12px] font-medium text-gray-700 mb-2">Or paste CSV directly:</p>
                <textarea
                  rows={6}
                  placeholder={`${TEMPLATE_HEADERS.join(',')}\nJohn Doe,Engineering,employee,0,0,28,63,63,7`}
                  value={csv}
                  onChange={e => { setCsv(e.target.value); setResult(null) }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-[12px] font-mono text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!csv.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Importing…' : 'Import Employees'}
            </button>

            {/* Result */}
            {result && (
              <div className={`rounded-xl p-4 ${result.errors.length === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                <p className={`text-[13px] font-semibold mb-2 ${result.errors.length === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                  ✓ {result.created} employee{result.created !== 1 ? 's' : ''} imported
                  {result.errors.length > 0 ? `, ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}` : ''}
                </p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-[12px] text-red-600">• {err}</p>
                ))}
              </div>
            )}
          </div>

          {/* Guide */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 h-fit">
            <h3 className="text-[13px] font-semibold text-gray-900 mb-3">CSV Format</h3>
            <p className="text-[12px] text-gray-500 mb-3">Required columns (in order):</p>
            <div className="space-y-1.5">
              {TEMPLATE_HEADERS.map((h, i) => (
                <div key={h} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold text-gray-400 mt-0.5 w-4">{i + 1}.</span>
                  <span className="text-[12px] text-gray-700">{h}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 rounded-xl">
              <p className="text-[11px] text-amber-700">
                <strong>Note:</strong> If a balance column is empty, the default value will be used. Department must match exactly.
              </p>
            </div>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
