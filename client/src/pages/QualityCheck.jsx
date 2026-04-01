import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown,
    Plus,
    Send,
    CheckCircle2,
    X,
    Trash2,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { toast } from 'react-hot-toast'

export default function QualityCheck() {
    const [products, setProducts] = useState([])
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [attributes, setAttributes] = useState([])
    const [results, setResults] = useState([])
    const [teamMembers, setTeamMembers] = useState([])
    const [loading, setLoading] = useState(false)

    // Form state for adding an attribute
    const [showAttrForm, setShowAttrForm] = useState(false)
    const [attrForm, setAttrForm] = useState({
        name: '',
        description: '',
        prerequisite_id: '',
        sort_order: 0,
        priority: 'medium',
    })

    // Form state for submitting a result
    const [resultForm, setResultForm] = useState({
        attribute_id: '',
        status: 'Pass',
        difficulty: '',
        notes: '',
        tested_by: '',
    })

    useEffect(() => {
        Promise.all([
            fetch('/api/products').then((r) => r.json()),
            fetch('/api/team').then((r) => r.json()),
        ]).then(([p, t]) => {
            setProducts(Array.isArray(p) ? p : [])
            setTeamMembers(Array.isArray(t) ? t : [])
        }).catch(() => { })
    }, [])

    const loadProductData = async (product) => {
        setSelectedProduct(product)
        setLoading(true)
        try {
            const [attrs, res] = await Promise.all([
                fetch(`/api/attributes/product/${product.id}`).then((r) => r.json()),
                fetch(`/api/results?product_id=${product.id}`).then((r) => r.json()),
            ])
            setAttributes(Array.isArray(attrs) ? attrs : [])
            setResults(Array.isArray(res) ? res : [])
        } catch {
            setAttributes([])
            setResults([])
        }
        setLoading(false)
    }

    const handleAddAttribute = async (e) => {
        e.preventDefault()
        if (!attrForm.name.trim()) return
        try {
            const res = await fetch('/api/attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...attrForm,
                    product_id: selectedProduct.id,
                    prerequisite_id: attrForm.prerequisite_id || null,
                }),
            })
            if (!res.ok) throw new Error('Failed to add attribute')
            setAttrForm({ name: '', description: '', prerequisite_id: '', sort_order: 0, priority: 'medium' })
            setShowAttrForm(false)
            loadProductData(selectedProduct)
        } catch (err) {
            toast.error(err.message)
        }
    }

    const handleDeleteAttribute = async (attr) => {
        if (!confirm(`Delete attribute "${attr.name}"? This will also remove all its results.`)) return
        try {
            const res = await fetch(`/api/attributes/${attr.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete attribute')
            toast.success(`"${attr.name}" deleted`)
            loadProductData(selectedProduct)
        } catch (err) {
            toast.error(err.message)
        }
    }

    const handleSubmitResult = async (e) => {
        e.preventDefault()
        if (!resultForm.attribute_id) return

        try {
            const res = await fetch('/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...resultForm,
                    product_id: selectedProduct.id,
                    difficulty: resultForm.difficulty || null,
                    tested_by: resultForm.tested_by || null,
                    notes: resultForm.notes || null
                }),
            })
            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Failed to submit result')
                return
            }

            if (data._emailTriggered) {
                toast(`Alert email triggered for ${resultForm.status} status`, { icon: '📧' })
            } else {
                toast.success('Result recorded successfully')
            }
            setResultForm({ attribute_id: '', status: 'Pass', difficulty: '', notes: '', tested_by: '' })
            loadProductData(selectedProduct)
        } catch (err) {
            toast.error('Network error occurred')
        }
    }

    // Get latest result for a given attribute
    const latestResult = (attrId) =>
        results.find((r) => r.attribute_id === attrId)

    // Filter team members who are testers
    const testers = teamMembers.filter((m) => m.role === 'tester' || m.role === 'authority')

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Quality Check
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Manage attributes and run quality checks against products
                </p>
            </div>

            {/* Product Selector */}
            <div className="relative max-w-xs">
                <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                        const p = products.find((x) => x.id === e.target.value)
                        if (p) loadProductData(p)
                    }}
                    className="w-full appearance-none px-4 py-2.5 glass-panel border border-[rgba(255,255,255,0.4)] rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 cursor-pointer transition-all"
                >
                    <option value="">Select a product…</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {selectedProduct && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Attributes Table */}
                    <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.4)] premium-shadow overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50">
                            <h2 className="text-sm font-semibold text-slate-900">
                                QA Attributes — {selectedProduct.name}
                            </h2>
                            <button
                                onClick={() => setShowAttrForm(!showAttrForm)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Add Attribute
                            </button>
                        </div>

                        {/* Inline add attribute form */}
                        <AnimatePresence>
                            {showAttrForm && (
                                <motion.form
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    onSubmit={handleAddAttribute}
                                    className="overflow-hidden border-b border-gray-100"
                                >
                                    <div className="px-6 py-4 bg-gray-50/50 grid grid-cols-1 sm:grid-cols-5 gap-3">
                                        <input
                                            value={attrForm.name}
                                            onChange={(e) =>
                                                setAttrForm((f) => ({ ...f, name: e.target.value }))
                                            }
                                            placeholder="Attribute name *"
                                            required
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                        />
                                        <input
                                            value={attrForm.description}
                                            onChange={(e) =>
                                                setAttrForm((f) => ({
                                                    ...f,
                                                    description: e.target.value,
                                                }))
                                            }
                                            placeholder="Description"
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                        />
                                        <select
                                            value={attrForm.prerequisite_id}
                                            onChange={(e) =>
                                                setAttrForm((f) => ({
                                                    ...f,
                                                    prerequisite_id: e.target.value,
                                                }))
                                            }
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                        >
                                            <option value="">No prerequisite</option>
                                            {attributes.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={attrForm.priority}
                                            onChange={(e) =>
                                                setAttrForm((f) => ({ ...f, priority: e.target.value }))
                                            }
                                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                        >
                                            <option value="critical">Critical</option>
                                            <option value="high">High</option>
                                            <option value="medium">Medium</option>
                                            <option value="low">Low</option>
                                        </select>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors cursor-pointer"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : attributes.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-12">
                                No attributes yet. Add attributes to begin quality checks.
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            #
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Attribute
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Prerequisite
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Latest Status
                                        </th>
                                        <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {attributes.map((a, i) => {
                                        const lr = latestResult(a.id)
                                        const prereq = attributes.find(
                                            (x) => x.id === a.prerequisite_id
                                        )
                                        return (
                                            <motion.tr
                                                key={a.id}
                                                initial={{ opacity: 0 }}
                                                animate={{
                                                    opacity: 1,
                                                    transition: { delay: i * 0.03 },
                                                }}
                                                className="hover:bg-gray-50/50 transition-colors group"
                                            >
                                                <td className="px-6 py-3 text-slate-400">{i + 1}</td>
                                                <td className="px-6 py-3">
                                                    <p className="font-medium text-slate-900">{a.name}</p>
                                                    {a.description && (
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {a.description}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-slate-500">
                                                    {prereq ? prereq.name : '—'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    {lr ? <StatusBadge status={lr.status} /> : (
                                                        <span className="text-xs text-slate-400">Not tested</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button
                                                        onClick={() => handleDeleteAttribute(a)}
                                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                                                        title={`Delete ${a.name}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Submit Result Form */}
                    {attributes.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                            className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.4)] p-6 premium-shadow"
                        >
                            <h2 className="text-sm font-semibold text-slate-900 mb-4">
                                Submit Result
                            </h2>
                            <form
                                onSubmit={handleSubmitResult}
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 items-end"
                            >
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Attribute *
                                    </label>
                                    <select
                                        value={resultForm.attribute_id}
                                        onChange={(e) =>
                                            setResultForm((f) => ({
                                                ...f,
                                                attribute_id: e.target.value,
                                            }))
                                        }
                                        required
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    >
                                        <option value="">Select…</option>
                                        {attributes.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Status *
                                    </label>
                                    <select
                                        value={resultForm.status}
                                        onChange={(e) =>
                                            setResultForm((f) => ({ ...f, status: e.target.value }))
                                        }
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    >
                                        <option value="Pass">✅ Pass</option>
                                        <option value="Semi-Pass">⚠️ Semi-Pass (sends email)</option>
                                        <option value="Fail">❌ Fail (sends email)</option>
                                        <option value="Waiting">⏳ Waiting</option>
                                        <option value="Blocked">🚫 Blocked</option>
                                        <option value="Skipped">⏭️ Skipped</option>
                                        <option value="In Review">🔍 In Review</option>
                                        <option value="Deferred">📅 Deferred</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Difficulty
                                    </label>
                                    <select
                                        value={resultForm.difficulty}
                                        onChange={(e) =>
                                            setResultForm((f) => ({ ...f, difficulty: e.target.value }))
                                        }
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    >
                                        <option value="">None</option>
                                        <option value="Easy">🟢 Easy</option>
                                        <option value="Medium">🟡 Medium</option>
                                        <option value="Hard">🔴 Hard</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Tested By
                                    </label>
                                    <select
                                        value={resultForm.tested_by}
                                        onChange={(e) =>
                                            setResultForm((f) => ({ ...f, tested_by: e.target.value }))
                                        }
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    >
                                        <option value="">Select tester…</option>
                                        {testers.map((t) => (
                                            <option key={t.id} value={t.name}>
                                                {t.name} {t.role === 'authority' ? '(Authority)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Notes
                                    </label>
                                    <input
                                        value={resultForm.notes}
                                        onChange={(e) =>
                                            setResultForm((f) => ({ ...f, notes: e.target.value }))
                                        }
                                        placeholder="Optional notes"
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                                >
                                    <Send className="w-4 h-4" />
                                    Submit
                                </button>
                            </form>
                        </motion.div>
                    )}
                </motion.div>
            )}

        </div>
    )
}
