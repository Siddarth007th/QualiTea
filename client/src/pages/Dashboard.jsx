import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
    PackageSearch, CheckCircle2, XCircle, AlertTriangle,
    ArrowRight, TrendingUp, ShieldAlert, Clock,
    ChevronDown, X,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { toast } from 'react-hot-toast'

const cardMotion = {
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: (i) => ({
        opacity: 1, y: 0, scale: 1,
        transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    }),
}

/* Animated counter */
function AnimatedPercent({ value, duration = 1200 }) {
    const [display, setDisplay] = useState(0)
    useEffect(() => {
        if (value === 0) { setDisplay(0); return }
        let start = null
        const step = (ts) => {
            if (!start) start = ts
            const p = Math.min((ts - start) / duration, 1)
            setDisplay(Math.round(p * value))
            if (p < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
    }, [value, duration])
    return <>{display}%</>
}

/* Circular ring */
function ProgressRing({ percent, size = 56, stroke = 5 }) {
    const r = (size - stroke) / 2
    const circ = 2 * Math.PI * r
    const offset = circ - (percent / 100) * circ
    const color = percent >= 80 ? '#10b981' : percent >= 50 ? '#f59e0b' : percent > 0 ? '#ef4444' : '#cbd5e1'
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
            <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke} strokeLinecap="round"
                initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                style={{ strokeDasharray: circ }} />
        </svg>
    )
}

/* Risk weights */
const RISK_WEIGHTS = {
    Fail: 3, 'Semi-Pass': 2, Blocked: 2, Waiting: 1,
    'In Review': 0, Deferred: 0, Skipped: 0, Pass: 0,
}

/* Segment colors */
const segmentColors = {
    'Pass': 'bg-emerald-500', 'Fail': 'bg-red-500', 'Semi-Pass': 'bg-amber-500',
    'Waiting': 'bg-sky-500', 'Blocked': 'bg-rose-500', 'In Review': 'bg-violet-500',
    'Deferred': 'bg-orange-500', 'Skipped': 'bg-slate-400',
}

export default function Dashboard() {
    const [products, setProducts] = useState([])
    const [results, setResults] = useState([])
    const [allAttributes, setAllAttributes] = useState({})
    const [loading, setLoading] = useState(true)
    const [expandedProduct, setExpandedProduct] = useState(null)

    const loadAll = useCallback(() => {
        Promise.all([
            fetch('/api/products').then((r) => r.json()),
            fetch('/api/results').then((r) => r.json()),
        ]).then(async ([p, r]) => {
            const prods = Array.isArray(p) ? p : []
            const resData = Array.isArray(r) ? r : []

            // Load attributes for all products BEFORE setting state
            const attrMap = {}
            await Promise.all(prods.map(async (prod) => {
                try {
                    const attrs = await fetch(`/api/attributes/product/${prod.id}`).then((x) => x.json())
                    attrMap[prod.id] = Array.isArray(attrs) ? attrs : []
                } catch { attrMap[prod.id] = [] }
            }))
            
            setAllAttributes(attrMap)
            setProducts(prods)
            setResults(resData)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    useEffect(() => { loadAll() }, [loadAll])

    // Quick status from Dashboard
    const handleQuickStatus = async (productId, attributeId, status) => {
        try {
            const res = await fetch('/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    product_id: productId, 
                    attribute_id: attributeId, 
                    status, 
                    notes: `Quick ${status} from Dashboard`, 
                    tested_by: null,
                    difficulty: null
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Failed to update status')
                return
            }
            toast.success(data._emailTriggered ? `📧 Alert sent — ${status}` : `Marked as ${status}`)
            loadAll()
        } catch { toast.error('Network error while updating status') }
    }

    // Product metrics
    const productMetrics = (() => {
        const byProduct = {}
        results.forEach((r) => {
            if (!byProduct[r.product_id]) byProduct[r.product_id] = {}
            const ex = byProduct[r.product_id][r.attribute_id]
            if (!ex || new Date(r.tested_at) > new Date(ex.tested_at))
                byProduct[r.product_id][r.attribute_id] = r
        })

        let passedProducts = 0, failedProducts = 0, inProgressProducts = 0
        let totalPassCount = 0, totalTestedCount = 0, totalRiskScore = 0
        const productDetails = []

        products.forEach((p) => {
            const latest = byProduct[p.id] ? Object.values(byProduct[p.id]) : []
            const latestMap = byProduct[p.id] || {}
            const counts = {}
            latest.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })

            const passCount = counts['Pass'] || 0
            const failCount = counts['Fail'] || 0
            const semiCount = counts['Semi-Pass'] || 0
            
            const totalTested = latest.length
            const totalAttributes = (allAttributes[p.id] || []).length

            totalPassCount += passCount
            totalTestedCount += totalTested

            let riskScore = 0
            latest.forEach((r) => { riskScore += RISK_WEIGHTS[r.status] || 0 })
            totalRiskScore += riskScore

            const hasIssues = failCount > 0 || semiCount > 0
            const allPassed = totalAttributes > 0 && passCount === totalAttributes
            
            if (allPassed) {
                passedProducts++
            } else if (totalAttributes > 0) {
                inProgressProducts++
                if (hasIssues) {
                    failedProducts++ // It is In Progress AND has issues.
                }
            }

            const passPercent = totalAttributes > 0 ? Math.round((passCount / totalAttributes) * 100) : 0

            productDetails.push({
                ...p, passCount, failCount, semiCount,
                totalTested, totalAttributes, passPercent, riskScore, counts, latestMap,
            })
        })

        productDetails.sort((a, b) => b.riskScore - a.riskScore)
        // Pass rate is out of actual tests performed, not total possible attributes.
        const overallPassRate = totalTestedCount > 0 ? Math.round((totalPassCount / totalTestedCount) * 100) : 0

        return { passedProducts, failedProducts, inProgressProducts, productDetails, overallPassRate, totalRiskScore }
    })()

    const stats = [
        { label: 'Total Products', value: products.length, icon: PackageSearch, color: 'text-brand-600', bg: 'bg-brand-50' },
        { label: 'Overall Pass Rate', value: loading ? '—' : `${productMetrics.overallPassRate}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Risk Score', value: loading ? '—' : productMetrics.totalRiskScore, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50', subtitle: 'Fail×3 Semi×2 Blocked×2' },
        { label: 'In Progress', value: productMetrics.inProgressProducts, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    ]

    const recentResults = results.slice(0, 8)

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">Quick Pass/Fail per attribute — expand a product card to see its attributes</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {stats.map((s, i) => (
                    <motion.div key={s.label} custom={i} variants={cardMotion} initial="initial" animate="animate"
                        className="glass-panel rounded-2xl p-6 premium-shadow hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{s.label}</p>
                                <p className="mt-2 text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">{loading ? '—' : s.value}</p>
                                {s.subtitle && <p className="text-[10px] text-slate-400 mt-1">{s.subtitle}</p>}
                            </div>
                            <div className={`${s.bg} ${s.color} p-3 rounded-xl`}><s.icon className="w-5 h-5" /></div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Product Breakdown with expandable quick actions */}
            {productMetrics.productDetails.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
                    className="glass-panel rounded-2xl p-6 premium-shadow">
                    <h2 className="text-sm font-semibold text-slate-900 mb-4">Product Pass Rate & Risk</h2>
                    <div className="space-y-4">
                        {productMetrics.productDetails.map((p) => {
                            const allPassed = p.totalTested > 0 && p.passCount === p.totalTested
                            const hasIssues = p.failCount > 0 || p.semiCount > 0
                            const isExpanded = expandedProduct === p.id
                            const attrs = allAttributes[p.id] || []

                            return (
                                <div key={p.id}
                                    className={`rounded-xl border-2 transition-all overflow-hidden ${allPassed ? 'border-emerald-200 bg-emerald-50/50' : hasIssues ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white/40'}`}>
                                    {/* Product summary — clickable to expand */}
                                    <button onClick={() => setExpandedProduct(isExpanded ? null : p.id)}
                                        className="w-full text-left p-5 cursor-pointer hover:bg-white/40 transition-colors">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm text-slate-900 truncate">{p.name}</p>
                                                    {p.riskScore > 0 && (
                                                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700">
                                                            Risk: {p.riskScore}
                                                        </span>
                                                    )}
                                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {Object.entries(p.counts).filter(([, c]) => c > 0).map(([status, count]) => (
                                                        <span key={status} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-slate-600 font-medium">
                                                            {status}: {count}
                                                        </span>
                                                    ))}
                                                    {p.totalTested === 0 && <span className="text-[10px] text-slate-400">No tests yet</span>}
                                                </div>
                                                {p.totalAttributes > 0 && (
                                                    <div className="mt-3">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-xs font-semibold text-slate-700"><AnimatedPercent value={p.passPercent} /></span>
                                                            <span className="text-[10px] text-slate-400">{p.passCount}/{p.totalAttributes} passed</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                                            {Object.entries(p.counts).map(([status, count]) => count > 0 ? (
                                                                <motion.div key={status}
                                                                    className={`h-full ${segmentColors[status] || 'bg-slate-300'}`}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${(count / p.totalAttributes) * 100}%` }}
                                                                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} />
                                                            ) : null)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0">
                                                <ProgressRing percent={p.passPercent} size={48} stroke={4} />
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded: attribute list with quick Pass/Fail */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                                className="overflow-hidden border-t border-gray-200/50"
                                            >
                                                <div className="p-4 space-y-1.5">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Pass / Fail</p>
                                                        <Link to="/roadmap" className="text-[10px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5">
                                                            Full options → Roadmap <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    </div>
                                                    {attrs.length === 0 ? (
                                                        <p className="text-xs text-slate-400 py-2">No attributes. Add them on the Roadmap page.</p>
                                                    ) : (
                                                        attrs.map((attr) => {
                                                            const lr = p.latestMap[attr.id]
                                                            return (
                                                                <div key={attr.id}
                                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/70 border border-gray-100 hover:border-gray-200 transition-colors group">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium text-slate-900 truncate">{attr.name}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            {lr ? <StatusBadge status={lr.status} /> : <span className="text-[10px] text-slate-400">Not tested</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <button
                                                                            onClick={() => handleQuickStatus(p.id, attr.id, 'Pass')}
                                                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                                                                                ${lr?.status === 'Pass' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-gray-50 text-slate-500 border border-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'}`}
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleQuickStatus(p.id, attr.id, 'Fail')}
                                                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                                                                                ${lr?.status === 'Fail' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-50 text-slate-500 border border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300'}`}
                                                                        >
                                                                            <XCircle className="w-3.5 h-3.5" /> Fail
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>
            )}

            {/* Recent Results */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.45 } }}
                className="glass-panel rounded-2xl p-6 premium-shadow">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Recent Results</h2>
                {recentResults.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">No results yet. Head to the Roadmap to run quality checks.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Attribute</th>
                                    <th className="text-left py-2 pr-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Tested By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentResults.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-3 pr-4 font-medium text-slate-900">{r.product_name}</td>
                                        <td className="py-3 pr-4 text-slate-600">{r.attribute_name}</td>
                                        <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                                        <td className="py-3 text-slate-500">{r.tested_by || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
