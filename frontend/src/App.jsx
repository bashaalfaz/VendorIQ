import { useEffect, useState } from 'react'
import {
  NavLink,
  Routes,
  Route,
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  LayoutDashboard,
  Users,
  PlusCircle,
  History as HistoryIcon,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileText,
  Copy,
  Brain,
  Activity,
  ArrowLeft,
  Eye,
  TrendingUp,
  Percent,
  Download
} from 'lucide-react'

import api from './api'

// ---------------- NAVIGATION ----------------

const nav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/new', 'New onboarding', PlusCircle],
  ['/history', 'Run history', HistoryIcon]
]

// ---------------- COMMON LAYOUT ----------------

function Shell({ children }) {
  return (
    <div className="min-h-screen md:flex bg-slate-50">
      <aside className="w-full md:w-64 bg-[#101b34] text-white p-5 md:min-h-screen">
        <div className="text-2xl font-black tracking-tight">
          Vendor<span className="text-blue-400">IQ</span>
        </div>

        <p className="text-xs text-slate-400 mt-1">
          Vendor onboarding intelligence
        </p>

        <nav className="mt-9 space-y-2">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-white/10'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-12 rounded-xl bg-white/5 p-4 text-xs text-slate-300">
          <ShieldCheck size={20} className="text-blue-300 mb-2" />
          Human review is required for uncertain or high-risk submissions.
        </div>
      </aside>

      <main className="flex-1 p-5 md:p-9 max-w-[1500px]">
        <header className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs uppercase tracking-[.2em] text-blue-600 font-bold">
              Operations workspace
            </p>
            <h1 className="text-2xl font-bold mt-1">
              Vendor onboarding
            </h1>
          </div>

          <div className="text-xs text-slate-500 bg-white border rounded-full px-4 py-2">
            Demo environment
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}

// ---------------- STATUS COMPONENTS ----------------

function Status({ status }) {
  const styles = {
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    PENDING: 'bg-amber-100 text-amber-800'
  }

  return (
    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {status || 'UNKNOWN'}
    </span>
  )
}

function RiskCategory({ category }) {
  const styles = {
    LOW: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-amber-100 text-amber-800',
    HIGH: 'bg-red-100 text-red-700'
  }

  return (
    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${styles[category] || 'bg-slate-100 text-slate-700'}`}>
      {category || 'NOT AVAILABLE'} RISK
    </span>
  )
}

// ---------------- FINDINGS ----------------

function FindingCard({ finding }) {
  if (typeof finding === 'string') {
    return (
      <div className="border border-slate-200 bg-slate-50 rounded-xl p-4">
        <p className="text-sm text-slate-700">{finding}</p>
      </div>
    )
  }

  const styles = {
    Critical: 'border-red-300 bg-red-50',
    High: 'border-orange-200 bg-orange-50',
    Medium: 'border-amber-200 bg-amber-50',
    Low: 'border-blue-200 bg-blue-50'
  }

  return (
    <div className={`border rounded-xl p-4 ${styles[finding?.severity] || 'border-slate-200 bg-slate-50'}`}>
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-semibold text-sm">
            {finding?.issue || 'Validation issue'}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            {finding?.reason || 'Further verification is required.'}
          </p>
        </div>
        <span className="text-xs font-bold">
          {finding?.severity || 'Review'}
        </span>
      </div>

      {finding?.points !== undefined && (
        <p className="text-xs text-slate-500 mt-3">
          Risk points: {finding.points}
        </p>
      )}
    </div>
  )
}

function parseFindings(findings) {
  if (Array.isArray(findings)) return findings

  if (typeof findings === 'string') {
    try {
      const parsed = JSON.parse(findings)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

// ---------------- DASHBOARD ----------------
function Dashboard() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    setError('')

    api.get('/vendors')
      .then(response => setRows(response.data))
      .catch(() => setError('Unable to load vendor records. Check the backend.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const counts = {
    approved: rows.filter(x => x.status === 'APPROVED').length,
    pending: rows.filter(x => x.status === 'PENDING').length,
    rejected: rows.filter(x => x.status === 'REJECTED').length,
    highRisk: rows.filter(x => Number(x.risk_score) >= 60).length
  }

  const averageRisk = rows.length
    ? Math.round(
        rows.reduce(
          (total, vendor) => total + Number(vendor.risk_score || 0),
          0
        ) / rows.length
      )
    : 0

  const approvalRate = rows.length
    ? Math.round((counts.approved / rows.length) * 100)
    : 0

  const riskDistribution = [
    {
      label: 'Low Risk',
      count: rows.filter(x => Number(x.risk_score) < 30).length,
      color: 'bg-green-500',
      textColor: 'text-green-700'
    },
    {
      label: 'Medium Risk',
      count: rows.filter(x => Number(x.risk_score) >= 30 && Number(x.risk_score) < 60).length,
      color: 'bg-amber-500',
      textColor: 'text-amber-700'
    },
    {
      label: 'High Risk',
      count: rows.filter(x => Number(x.risk_score) >= 60).length,
      color: 'bg-red-500',
      textColor: 'text-red-700'
    }
  ]

  const stats = [
    ['Total submissions', rows.length, Users],
    ['Approved', counts.approved, CheckCircle2],
    ['Pending review', counts.pending, AlertTriangle],
    ['Rejected', counts.rejected, XCircle],
    ['High-risk vendors', counts.highRisk, ShieldCheck]
  ]

  return (
    <>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex justify-between text-slate-500 text-sm">
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <div className="text-3xl font-bold mt-4">{value}</div>
            <p className="text-xs text-slate-400 mt-1">
              All recorded runs
            </p>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Average risk score</p>
            <TrendingUp size={20} className="text-blue-600" />
          </div>
          <p className="text-3xl font-bold mt-4">
            {averageRisk}<span className="text-base text-slate-400">/100</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Average across all vendor submissions
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Approval rate</p>
            <Percent size={20} className="text-green-600" />
          </div>
          <p className="text-3xl font-bold mt-4">{approvalRate}%</p>
          <p className="text-xs text-slate-400 mt-1">
            {counts.approved} approved out of {rows.length} submissions
          </p>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-7 p-6">
        <div className="mb-6">
          <h2 className="font-bold text-lg">Risk Distribution</h2>
          <p className="text-sm text-slate-500 mt-1">
            Breakdown of vendors based on their risk scores.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading risk data...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">
            No vendor data available yet.
          </p>
        ) : (
          <div className="space-y-6">
            {riskDistribution.map(item => {
              const percentage = (item.count / rows.length) * 100

              return (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${item.textColor}`}>
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-slate-700">
                      {item.count} vendors ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-6">
          Total vendors analyzed: {rows.length}
        </p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm mt-7">
        <div className="p-5 flex justify-between items-center border-b">
          <div>
            <h2 className="font-bold">Recent onboarding runs</h2>
            <p className="text-xs text-slate-500 mt-1">
              Latest vendor submissions and decisions
            </p>
          </div>
          <button
            onClick={load}
            className="p-2 rounded-lg hover:bg-slate-100"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {loading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : error ? (
          <p className="p-6 text-red-600 text-sm">{error}</p>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto text-slate-300" size={35} />
            <p className="font-semibold mt-3">No submissions yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Create your first vendor onboarding run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Vendor', 'Email', 'Risk score', 'Status', 'Run ID'].map(x => (
                    <th className="text-left p-4 font-medium" key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map(r => (
                  <tr
                    className="border-t hover:bg-blue-50 cursor-pointer"
                    key={r.id}
                    onClick={() => navigate(`/vendors/${r.id}`)}
                    title="View vendor details"
                  >
                    <td className="p-4 font-semibold">{r.vendor_name}</td>
                    <td className="p-4 text-slate-500">{r.email || '—'}</td>
                    <td className="p-4">{r.risk_score}/100</td>
                    <td className="p-4"><Status status={r.status} /></td>
                    <td className="p-4 text-slate-500">#{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

// ---------------- NEW VENDOR SUBMISSION ----------------
function NewVendor() {
  const [form, setForm] = useState({
    vendor_name: '',
    email: '',
    country: 'India',
    tax_id: '',
    bank_account_name: ''
  })

  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [stages, setStages] = useState([])

  const change = event => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    })
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)

    try {
      const body = new FormData()

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value)
      })

      files.forEach(file => body.append('files', file))

      setStages([])

      const baseURL = api.defaults.baseURL || 'http://127.0.0.1:8000/api'
      const response = await fetch(`${baseURL}/vendors/process`, {
        method: 'POST',
        body
      })

      if (!response.ok) {
        let message = 'Could not process submission.'
        try {
          const errorData = await response.json()
          message = errorData.detail || message
        } catch {}
        throw new Error(message)
      }

      if (!response.body) {
        throw new Error('Your browser could not read the live processing stream.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult = null

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const messages = buffer.split('\n\n')
        buffer = messages.pop() || ''

        for (const message of messages) {
          const eventLine = message.split('\n').find(line => line.startsWith('event:'))
          const dataLine = message.split('\n').find(line => line.startsWith('data:'))
          if (!eventLine || !dataLine) continue

          const eventName = eventLine.slice(6).trim()
          let payload
          try {
            payload = JSON.parse(dataLine.slice(5).trim())
          } catch {
            continue
          }

          if (eventName === 'stage') {
            setStages(current => {
              const existingIndex = current.findIndex(item => item.name === payload.name)
              if (existingIndex === -1) return [...current, payload]
              return current.map((item, index) => index === existingIndex ? payload : item)
            })
          } else if (eventName === 'result') {
            finalResult = payload
            setResult(payload)
          } else if (eventName === 'processing_error') {
            throw new Error(payload.detail || 'Vendor processing failed.')
          }
        }
      }

      if (!finalResult) {
        throw new Error('The processing stream ended without a final decision. Please try again.')
      }
    } catch (err) {
      setError(
        err.message ||
        err.response?.data?.detail ||
        'Could not process submission. Check whether the backend is running.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(result.follow_up)
      setCopyMessage('Copied successfully!')
    } catch {
      setCopyMessage('Copy failed. Please copy manually.')
    }
  }

  const ai = result?.ai_extraction
  const hasAI = ai?.used_ai === true

  return (
    <div className="grid xl:grid-cols-[1.1fr_.9fr] gap-6">

      <form onSubmit={submit} className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-lg">New vendor submission</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Enter vendor details and attach supporting PDF documents.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            ['vendor_name', 'Company / vendor name'],
            ['email', 'Contact email'],
            ['country', 'Country'],
            ['tax_id', 'Tax / registration ID'],
            ['bank_account_name', 'Bank account holder name']
          ].map(([name, label]) => (
            <label className="text-sm font-medium" key={name}>
              {label}{name === 'vendor_name' ? ' *' : ''}

              <input
                required={name === 'vendor_name'}
                name={name}
                value={form[name]}
                onChange={change}
                placeholder={`Enter ${label.toLowerCase()}`}
                className="mt-2 w-full border rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          ))}
        </div>

        <label className="block mt-5 text-sm font-medium">
          Supporting documents (PDF, max 10 MB each)

          <div className="mt-2 border-2 border-dashed rounded-xl p-6 text-center hover:border-blue-400">
            <UploadCloud className="mx-auto text-blue-500" size={28} />
            <p className="mt-2 text-sm text-slate-600">Choose PDF files</p>

            <input
              type="file"
              accept=".pdf,application/pdf"
              multiple
              onChange={event => setFiles(Array.from(event.target.files || []))}
              className="mt-3 block w-full text-xs"
            />
          </div>
        </label>

        {files.length > 0 && (
          <p className="text-xs text-slate-500 mt-2">
            {files.map(file => file.name).join(', ')}
          </p>
        )}

        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

        <button
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3"
        >
          {busy ? 'Processing submission...' : 'Run vendor checks'}
        </button>
      </form>

      {/* RESULT PANEL */}

      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-lg">Live execution & decision</h2>
        <p className="text-sm text-slate-500 mt-1">
          Processing stages and explainable outcome appear here.
        </p>

        {!result && stages.length === 0 ? (
          <div className="mt-8 rounded-xl bg-slate-50 p-8 text-center text-slate-400">
            <ShieldCheck size={38} className="mx-auto" />
            <p className="mt-3 text-sm">
              Submit a vendor to view the execution trace.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            {busy && (
              <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <RefreshCw size={16} className="animate-spin" />
                  Vendor checks are running
                </div>
                <p className="mt-1 text-xs text-blue-700">The stages below update as each backend operation runs.</p>
              </div>
            )}
            <div className="mb-6">
              <h4 className="font-semibold text-sm mb-4">Live processing stages</h4>
              {stages.length === 0 ? (
                <p className="text-xs text-slate-400">Waiting for the backend to begin...</p>
              ) : (
                <div className="space-y-3">
                  {stages.map(stage => (
                    <div className="flex gap-3 items-center text-sm" key={stage.name}>
                      {stage.status === 'completed' || stage.status === 'skipped' ? (
                        <CheckCircle2 size={18} className={stage.status === 'skipped' ? 'text-slate-400' : 'text-green-600'} />
                      ) : stage.status === 'started' ? (
                        <RefreshCw size={17} className="text-blue-600 animate-spin" />
                      ) : (
                        <AlertTriangle size={18} className="text-amber-500" />
                      )}
                      <span>{stage.name}</span>
                      <span className="ml-auto text-xs text-slate-400">{stage.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {result && <>

            <div className="flex justify-between items-center gap-3">
              <div>
                <p className="text-xs text-slate-500">Decision · Run #{result.id}</p>
                <h3 className="text-2xl font-bold mt-1">
                  {result.vendor?.vendor_name}
                </h3>
              </div>
              <Status status={result.status} />
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Risk score</p>
                <p className="text-xl font-bold">{result.risk_score}/100</p>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2.5 mt-3">
                <div
                  className={`h-2.5 rounded-full ${
                    result.risk_score >= 60
                      ? 'bg-red-500'
                      : result.risk_score >= 30
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, result.risk_score || 0))}%`
                  }}
                />
              </div>

              <div className="mt-3">
                <RiskCategory category={result.risk_category} />
              </div>
            </div>

            {/* AI EXTRACTION */}

            <div className="mt-6 border-t pt-5">
              <div className="flex justify-between items-center gap-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Brain size={18} className="text-blue-600" />
                  AI document extraction
                </h4>

                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  hasAI
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {hasAI ? 'Successful' : 'Unavailable'}
                </span>
              </div>

              {hasAI ? (
                <div className="grid sm:grid-cols-2 gap-3 mt-4">
                  {[
                    ['Vendor name', ai.vendor_name],
                    ['Email address', ai.email],
                    ['Country', ai.country],
                    ['Tax / registration ID', ai.tax_id],
                    ['Bank account name', ai.bank_account_name],
                    ['Model used', ai.model_used]
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-semibold mt-1 break-words">
                        {value || 'Not found in document'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-amber-700 mt-3">
                  {ai?.message || 'AI extraction was not completed.'}
                </p>
              )}
            </div>

            {/* FINDINGS */}

            <div className="mt-6 border-t pt-5">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Activity size={17} />
                Risk findings
              </h4>

              {result.findings?.length > 0 ? (
                <div className="space-y-3 mt-3">
                  {result.findings.map((finding, index) => (
                    <FindingCard finding={finding} key={index} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-700 mt-3">
                  No configured risk issues detected.
                </p>
              )}
            </div>

            {/* FOLLOW-UP EMAIL */}

            <div className="mt-6 bg-slate-50 rounded-xl p-4">
              <h4 className="font-semibold text-sm">Follow-up email draft</h4>

              <pre className="whitespace-pre-wrap text-xs text-slate-600 mt-3 font-sans">
                {result.follow_up}
              </pre>

              <button
                type="button"
                onClick={copyEmail}
                className="flex items-center gap-2 text-xs text-blue-600 font-semibold mt-4"
              >
                <Copy size={15} />
                Copy email draft
              </button>

              {copyMessage && (
                <p className="text-xs text-green-600 mt-2">{copyMessage}</p>
              )}
            </div>
            </>}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------- RUN HISTORY ----------------
function History() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [riskFilter, setRiskFilter] = useState('ALL')
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    setError('')

    api.get('/vendors')
      .then(response => setRows(response.data))
      .catch(() => setError('Unable to load run history.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const getRiskCategory = (score) => {
    const value = Number(score || 0)
    if (value >= 60) return 'HIGH'
    if (value >= 30) return 'MEDIUM'
    return 'LOW'
  }

  const filteredRows = rows.filter(row => {
    const searchText = `${row.vendor_name || ''} ${row.email || ''}`.toLowerCase()
    const matchesSearch = searchText.includes(search.trim().toLowerCase())

    const matchesStatus = statusFilter === 'ALL' ||
      String(row.status || '').toUpperCase() === statusFilter

    const matchesRisk = riskFilter === 'ALL' ||
      getRiskCategory(row.risk_score) === riskFilter

    return matchesSearch && matchesStatus && matchesRisk
  })

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setRiskFilter('ALL')
  }

  return (
    <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b flex justify-between items-center">
        <div>
          <h2 className="font-bold">All processing runs</h2>
          <p className="text-sm text-slate-500">
            Persistent audit history stored in the database.
          </p>
        </div>

        <button
          onClick={load}
          className="p-2 rounded-lg hover:bg-slate-100"
          title="Refresh history"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* SEARCH AND FILTERS */}

      <div className="p-5 border-b bg-slate-50/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search vendor name or email..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={riskFilter}
            onChange={event => setRiskFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All risk levels</option>
            <option value="LOW">Low risk</option>
            <option value="MEDIUM">Medium risk</option>
            <option value="HIGH">High risk</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Showing {filteredRows.length} of {rows.length} processing runs
          </p>

          <button
            onClick={clearFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* HISTORY TABLE */}

      {loading ? (
        <p className="p-8 text-center text-slate-500">Loading...</p>
      ) : error ? (
        <p className="p-8 text-center text-red-600">{error}</p>
      ) : filteredRows.length === 0 ? (
        <p className="p-8 text-center text-slate-400">
          {rows.length === 0
            ? 'No history yet.'
            : 'No vendors match these filters.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Run', 'Vendor', 'Email', 'Status', 'Risk', 'Findings', 'Action'].map(x => (
                  <th className="text-left p-4" key={x}>{x}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredRows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => navigate(`/vendors/${row.id}`)}
                  className="border-t hover:bg-blue-50 cursor-pointer"
                >
                  <td className="p-4">#{row.id}</td>

                  <td className="p-4 font-medium">
                    {row.vendor_name}
                  </td>

                  <td className="p-4 text-slate-500">
                    {row.email || '—'}
                  </td>

                  <td className="p-4">
                    <Status status={row.status} />
                  </td>

                  <td className="p-4">
                    <span className="font-medium">
                      {row.risk_score}/100
                    </span>
                    <span className="block text-xs text-slate-500">
                      {getRiskCategory(row.risk_score)} risk
                    </span>
                  </td>

                  <td className="p-4 text-slate-500">
                    {parseFindings(row.findings).length} issue(s)
                  </td>

                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 text-blue-600 font-semibold text-xs">
                      <Eye size={15} /> View
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------- VENDOR DETAILS ----------------
function VendorDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [vendor, setVendor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  async function downloadReport() {
    try {
      setDownloading(true)

      const response = await api.get(`/vendors/${id}/report`, {
        responseType: 'blob'
      })

      const pdfBlob = new Blob([response.data], {
        type: 'application/pdf'
      })

      const pdfUrl = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')

      link.href = pdfUrl
      link.download = `VendorIQ_Report_${id}.pdf`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.setTimeout(() => {
        window.URL.revokeObjectURL(pdfUrl)
      }, 1000)
    } catch (err) {
      console.error('PDF download failed:', err)
      alert('Unable to download the PDF report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    setVendor(null)

    api.get(`/vendors/${id}`)
      .then(response => setVendor(response.data))
      .catch(err => {
        setError(
          err.response?.data?.detail ||
          'Unable to load vendor details.'
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="bg-white border rounded-2xl p-8 text-center text-slate-500">
        Loading vendor details...
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="bg-white border rounded-2xl p-6">
        <p className="text-red-600">
          {error || 'Vendor not found.'}
        </p>

        <button
          onClick={() => navigate('/history')}
          className="mt-4 text-blue-600 font-semibold"
        >
          ← Back to Run History
        </button>
      </div>
    )
  }

  const findings = parseFindings(vendor.findings)

  return (
    <div className="space-y-6">

      {/* BACK AND DOWNLOAD BUTTONS */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/history')}
          className="inline-flex items-center gap-2 text-sm text-blue-600 font-semibold hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Run History
        </button>

        <button
          type="button"
          onClick={downloadReport}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download size={17} />
          {downloading ? 'Generating PDF...' : 'Download PDF Report'}
        </button>
      </div>

      {/* VENDOR SUMMARY */}

      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <p className="text-xs text-slate-500">
              Vendor record #{vendor.id}
            </p>

            <h2 className="text-2xl font-bold mt-1">
              {vendor.vendor_name}
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Vendor onboarding assessment
            </p>
          </div>

          <Status status={vendor.status} />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[
            ['Email', vendor.email],
            ['Country', vendor.country],
            ['Tax ID', vendor.tax_id],
            ['Bank account holder', vendor.bank_account_name],
            ['Risk score', `${vendor.risk_score ?? 0}/100`],
            ['Risk category', vendor.risk_category]
          ].map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="font-semibold text-sm mt-2 break-words">
                {value || 'Not available'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RISK ASSESSMENT */}

      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Risk assessment</h3>
          <RiskCategory category={vendor.risk_category} />
        </div>

        <div className="flex justify-between items-center mt-5">
          <p className="text-sm text-slate-500">Overall risk score</p>
          <p className="text-2xl font-bold">
            {vendor.risk_score ?? 0}/100
          </p>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3 mt-3">
          <div
            className={`h-3 rounded-full ${
              vendor.risk_score >= 60
                ? 'bg-red-500'
                : vendor.risk_score >= 30
                ? 'bg-amber-500'
                : 'bg-green-500'
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, vendor.risk_score || 0))}%`
            }}
          />
        </div>
      </section>

      {/* RISK FINDINGS */}

      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-blue-600" />
          <h3 className="font-bold text-lg">Risk findings</h3>
        </div>

        <p className="text-sm text-slate-500 mt-1">
          Issues identified during vendor validation.
        </p>

        {findings.length > 0 ? (
          <div className="space-y-3 mt-5">
            {findings.map((finding, index) => (
              <FindingCard key={index} finding={finding} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-green-700 mt-4">
            No configured risk issues detected.
          </p>
        )}
      </section>

      {/* DOCUMENTS */}

      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg">Uploaded documents</h3>

        {Array.isArray(vendor.documents) && vendor.documents.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {vendor.documents.map((file, index) => (
              <li
                key={index}
                className="text-sm text-slate-600 flex gap-2"
              >
                <FileText size={17} />

                {typeof file === 'string'
                  ? file
                  : file.filename || JSON.stringify(file)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 mt-3">
            No document details available.
          </p>
        )}
      </section>
    </div>
  )
}

// ---------------- MAIN APP ----------------

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewVendor />} />
        <Route path="/history" element={<History />} />
        <Route path="/vendors/:id" element={<VendorDetails />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Shell>
  )
}