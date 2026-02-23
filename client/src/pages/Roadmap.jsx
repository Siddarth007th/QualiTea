import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    MarkerType,
    addEdge,
    reconnectEdge,
    getBezierPath,
    BaseEdge,
    EdgeLabelRenderer,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import {
    ChevronDown, Lock, Clock, CheckCircle2, XCircle, AlertTriangle,
    X, Send, ArrowRight, Plus, History, User, Calendar, FileText,
    BarChart3, SkipForward, Ban, Eye, CalendarClock,
    Trash2, Edit3, Zap, MoreHorizontal, Pencil, Check, Shield, Unlink,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

/* ════════════════════════════════════════════════════
   Status definitions — 8 statuses + Locked pseudo-status
   ════════════════════════════════════════════════════ */
const ALL_STATUSES = ['Pass', 'Semi-Pass', 'Fail', 'Waiting', 'Blocked', 'Skipped', 'In Review', 'Deferred']
const EMAIL_STATUSES = ['Fail', 'Semi-Pass']

const STATUS = {
    LOCKED: 'Locked', PENDING: 'Pending',
    PASS: 'Pass', FAIL: 'Fail', SEMI: 'Semi-Pass',
    WAITING: 'Waiting', BLOCKED: 'Blocked',
    SKIPPED: 'Skipped', IN_REVIEW: 'In Review', DEFERRED: 'Deferred',
}

const statusConfig = {
    [STATUS.LOCKED]: { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-400', dot: 'bg-slate-300', icon: Lock, label: 'Locked', ring: '', glow: false },
    [STATUS.PENDING]: { border: 'border-brand-300', bg: 'bg-white', text: 'text-brand-700', dot: 'bg-brand-500', icon: Clock, label: 'Ready', ring: 'ring-2 ring-brand-200/60', glow: false },
    [STATUS.PASS]: { border: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2, label: 'Pass', ring: '', glow: false },
    [STATUS.FAIL]: { border: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', icon: XCircle, label: 'Fail', ring: '', glow: true },
    [STATUS.SEMI]: { border: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', icon: AlertTriangle, label: 'Semi-Pass', ring: '', glow: true },
    [STATUS.WAITING]: { border: 'border-sky-400', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500', icon: Clock, label: 'Waiting', ring: '', glow: false },
    [STATUS.BLOCKED]: { border: 'border-rose-400', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500', icon: Ban, label: 'Blocked', ring: '', glow: false },
    [STATUS.SKIPPED]: { border: 'border-slate-300', bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400', icon: SkipForward, label: 'Skipped', ring: '', glow: false },
    [STATUS.IN_REVIEW]: { border: 'border-violet-400', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500', icon: Eye, label: 'In Review', ring: '', glow: false },
    [STATUS.DEFERRED]: { border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', icon: CalendarClock, label: 'Deferred', ring: '', glow: false },
}

const priorityConfig = {
    critical: { label: 'Critical', color: 'priority-critical', text: 'text-white' },
    high: { label: 'High', color: 'priority-high', text: 'text-white' },
    medium: { label: 'Medium', color: 'priority-medium', text: 'text-white' },
    low: { label: 'Low', color: 'priority-low', text: 'text-white' },
}

const NODE_W = 280
const NODE_H = 110

/* ── Layout ──────────────────────────────────────── */
function layoutGraph(nodes, edges) {
    const g = new dagre.graphlib.Graph()
    g.setDefaultEdgeLabel(() => ({}))
    g.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 60 })
    nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
    edges.forEach((e) => g.setEdge(e.source, e.target))
    dagre.layout(g)
    return nodes.map((n) => {
        const pos = g.node(n.id)
        return { ...n, position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 } }
    })
}

/* ── Compute statuses ────────────────────────────── */
function computeStatuses(attributes, results) {
    const latestResult = {}
    results.forEach((r) => {
        if (!latestResult[r.attribute_id] || new Date(r.tested_at) > new Date(latestResult[r.attribute_id].tested_at))
            latestResult[r.attribute_id] = r
    })
    const prereqOf = {}
    attributes.forEach((a) => { prereqOf[a.id] = a.prerequisite_id })

    const memo = {}
    function isUnlocked(id) {
        if (memo[id] !== undefined) return memo[id]
        const pid = prereqOf[id]
        if (!pid) { memo[id] = true; return true }
        const ps = latestResult[pid]?.status
        if (ps !== STATUS.PASS) { memo[id] = false; return false }
        memo[id] = isUnlocked(pid)
        return memo[id]
    }

    const statusMap = {}
    attributes.forEach((a) => {
        const lr = latestResult[a.id]
        if (!isUnlocked(a.id)) statusMap[a.id] = STATUS.LOCKED
        else if (lr) statusMap[a.id] = lr.status
        else statusMap[a.id] = STATUS.PENDING
    })
    return { statusMap, latestResult }
}

function relativeTime(d) {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
}

/* ════════════════════════════════════════════════════
   Confetti burst
   ════════════════════════════════════════════════════ */
function spawnConfetti() {
    const colors = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6']
    for (let i = 0; i < 60; i++) {
        const el = document.createElement('div')
        el.className = 'confetti-piece'
        el.style.left = `${Math.random() * 100}vw`
        el.style.background = colors[Math.floor(Math.random() * colors.length)]
        el.style.animationDelay = `${Math.random() * 0.8}s`
        el.style.animationDuration = `${2 + Math.random() * 2}s`
        el.style.width = `${6 + Math.random() * 8}px`
        el.style.height = `${6 + Math.random() * 8}px`
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 4000)
    }
}

/* ════════════════════════════════════════════════════
   Custom Node — with priority badge, inline edit, context trigger
   ════════════════════════════════════════════════════ */
function QANode({ data }) {
    const cfg = statusConfig[data.effectiveStatus] || statusConfig[STATUS.PENDING]
    const Icon = cfg.icon
    const isLocked = data.effectiveStatus === STATUS.LOCKED
    const pri = priorityConfig[data.priority || 'medium']
    const needsAttention = cfg.glow

    return (
        <div
            onClick={(e) => {
                if (!isLocked && data.onNodeClick) data.onNodeClick(data)
            }}
            onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (data.onContextMenu) data.onContextMenu(e, data)
            }}
            className={`
                relative rounded-2xl border-2 px-4 py-3 shadow-sm transition-all duration-300
                ${cfg.border} ${cfg.bg} ${cfg.ring}
                ${isLocked ? 'opacity-50 cursor-not-allowed qa-locked-node' : 'cursor-pointer hover:shadow-lg hover:scale-[1.02]'}
                ${needsAttention && !isLocked ? 'qa-attention-node' : ''}
            `}
            style={{ width: NODE_W }}
        >
            <Handle type="target" position={Position.Top} className="!w-3 !h-3 !bg-brand-400 !border-2 !border-white !-top-1.5" />
            <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !bg-brand-400 !border-2 !border-white !-bottom-1.5" />

            <div className="flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg} ${cfg.border} border`}>
                    <Icon className={`w-4 h-4 ${cfg.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate flex-1">{data.label}</p>
                        {/* Priority badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${pri.color} ${pri.text}`}>
                            {pri.label}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                        {EMAIL_STATUSES.includes(data.effectiveStatus) && (
                            <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-medium ml-1">📧 Alert</span>
                        )}
                    </div>
                    {data.lastResult && (
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                            {data.lastResult.tested_by && (
                                <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{data.lastResult.tested_by}</span>
                            )}
                            <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{relativeTime(data.lastResult.tested_at)}</span>
                        </div>
                    )}
                </div>
            </div>
            {!isLocked && data.effectiveStatus === STATUS.PENDING && (
                <ArrowRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-300 animate-pulse" />
            )}
        </div>
    )
}

const nodeTypes = { qa: QANode }

/* ════════════════════════════════════════════════════
   Custom Edge — with visible ✕ delete button on hover
   ════════════════════════════════════════════════════ */
function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data, label, labelStyle }) {
    const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                {/* Label: "needs X" */}
                {label && (
                    <div
                        style={{ position: 'absolute', transform: `translate(-50%, -120%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'none', ...labelStyle }}
                        className="text-[9px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded glass-panel"
                    >
                        {label}
                    </div>
                )}
                {/* Delete button */}
                <div
                    style={{ position: 'absolute', transform: `translate(-50%, 30%) translate(${labelX}px,${labelY}px)`, pointerEvents: 'all' }}
                    className="nodrag nopan"
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (data?.onDelete) data.onDelete(id) }}
                        className="flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 rounded-full border-2 border-red-200 dark:border-red-800 shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 hover:border-red-400 hover:scale-125 transition-all cursor-pointer group"
                        title="Remove prerequisite"
                    >
                        <X className="w-3.5 h-3.5 text-red-400 group-hover:text-red-600" />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </>
    )
}

const edgeTypes = { deletable: DeletableEdge }

/* ════════════════════════════════════════════════════
   Context Menu
   ════════════════════════════════════════════════════ */
function ContextMenu({ x, y, node, onClose, onQuickStatus, onEdit, onDelete, onViewHistory, onRemovePrerequisite }) {
    const menuRef = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [onClose])

    const isLocked = node.effectiveStatus === STATUS.LOCKED

    return (
        <div
            ref={menuRef}
            className="qa-context-menu fixed glass-panel border-white/40 rounded-xl premium-shadow py-2 z-50 min-w-[200px]"
            style={{ left: x, top: y }}
        >
            <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{node.label}</p>
                <p className="text-[10px] text-slate-400">{statusConfig[node.effectiveStatus]?.label}</p>
            </div>

            {!isLocked && (
                <>
                    <button onClick={() => { onViewHistory(); onClose() }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                        <History className="w-3.5 h-3.5 text-slate-400" /> View History
                    </button>
                    <button onClick={() => { onEdit(); onClose() }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer">
                        <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit Attribute
                    </button>
                    {node.prerequisiteId && (
                        <button onClick={() => { onRemovePrerequisite(); onClose() }}
                            className="w-full px-3 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2 cursor-pointer">
                            <Unlink className="w-3.5 h-3.5" /> Remove Prerequisite
                        </button>
                    )}
                    <div className="px-3 py-1.5 mt-1 border-t border-gray-100">
                        <p className="text-[10px] uppercase font-semibold text-slate-400 mb-1">Quick Status</p>
                        <div className="flex flex-wrap gap-1">
                            {ALL_STATUSES.map((s) => {
                                const sc = statusConfig[s]
                                return (
                                    <button key={s} onClick={() => { onQuickStatus(s); onClose() }}
                                        className={`px-2 py-1 rounded-md text-[10px] font-semibold border ${sc.border} ${sc.bg} ${sc.text} hover:opacity-80 cursor-pointer`}>
                                        {sc.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </>
            )}

            <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={() => { onDelete(); onClose() }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /> Delete Attribute
                </button>
            </div>
        </div>
    )
}

/* ════════════════════════════════════════════════════
   Progress Summary
   ════════════════════════════════════════════════════ */
function ProgressSummary({ attributes, statusMap }) {
    const counts = {}
        ;[STATUS.PASS, STATUS.FAIL, STATUS.SEMI, STATUS.WAITING, STATUS.BLOCKED, STATUS.SKIPPED, STATUS.IN_REVIEW, STATUS.DEFERRED, STATUS.PENDING, STATUS.LOCKED].forEach((s) => { counts[s] = 0 })
    attributes.forEach((a) => { counts[statusMap[a.id]] = (counts[statusMap[a.id]] || 0) + 1 })
    const total = attributes.length
    const passPercent = total > 0 ? Math.round((counts[STATUS.PASS] / total) * 100) : 0

    const segments = [
        { key: STATUS.PASS, count: counts[STATUS.PASS], color: 'bg-emerald-500' },
        { key: STATUS.SEMI, count: counts[STATUS.SEMI], color: 'bg-amber-500' },
        { key: STATUS.FAIL, count: counts[STATUS.FAIL], color: 'bg-red-500' },
        { key: STATUS.IN_REVIEW, count: counts[STATUS.IN_REVIEW], color: 'bg-violet-500' },
        { key: STATUS.WAITING, count: counts[STATUS.WAITING], color: 'bg-sky-500' },
        { key: STATUS.BLOCKED, count: counts[STATUS.BLOCKED], color: 'bg-rose-500' },
        { key: STATUS.DEFERRED, count: counts[STATUS.DEFERRED], color: 'bg-orange-500' },
        { key: STATUS.SKIPPED, count: counts[STATUS.SKIPPED], color: 'bg-slate-400' },
        { key: STATUS.PENDING, count: counts[STATUS.PENDING], color: 'bg-brand-500' },
        { key: STATUS.LOCKED, count: counts[STATUS.LOCKED], color: 'bg-slate-300' },
    ]

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.4)] p-5 premium-shadow">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Progress</h3>
                </div>
                <span className="text-2xl font-bold text-slate-900">{passPercent}%</span>
            </div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                {segments.map((s) => s.count > 0 ? (
                    <motion.div key={s.key} className={`h-full ${s.color}`}
                        initial={{ width: 0 }} animate={{ width: `${(s.count / total) * 100}%` }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
                ) : null)}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
                {segments.filter((s) => s.count > 0).map((s) => (
                    <span key={s.key} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                        <span className={`w-2 h-2 rounded-full ${s.color}`} />
                        {statusConfig[s.key]?.label || s.key}: {s.count}
                    </span>
                ))}
            </div>
        </motion.div>
    )
}



/* ════════════════════════════════════════════════════
   Slide-Over Panel (8 statuses + History)
   ════════════════════════════════════════════════════ */
function SlideOver({ node, onClose, onSubmit, submitting, results, teamMembers, isEditMode, onSaveEdit }) {
    const [status, setStatus] = useState('Pass')
    const [notes, setNotes] = useState('')
    const [testedBy, setTestedBy] = useState('')
    const [tab, setTab] = useState(isEditMode ? 'edit' : 'submit')

    // Edit fields
    const [editName, setEditName] = useState(node?.label || '')
    const [editDesc, setEditDesc] = useState(node?.description || '')
    const [editPriority, setEditPriority] = useState(node?.priority || 'medium')

    if (!node) return null

    const history = results.filter((r) => r.attribute_id === node.attributeId)
        .sort((a, b) => new Date(b.tested_at) - new Date(a.tested_at))
    const testers = teamMembers.filter((m) => m.role === 'tester' || m.role === 'authority')
    const cfg = statusConfig[node.effectiveStatus] || statusConfig[STATUS.PENDING]
    const Icon = cfg.icon

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit({ attribute_id: node.attributeId, product_id: node.productId, status, notes, tested_by: testedBy })
    }

    const handleSaveEdit = (e) => {
        e.preventDefault()
        onSaveEdit(node.attributeId, { name: editName, description: editDesc, priority: editPriority })
    }

    const tabs = [
        { id: 'submit', label: 'Submit', icon: Send },
        { id: 'history', label: `History (${history.length})`, icon: History },
        { id: 'edit', label: 'Edit', icon: Pencil },
    ]

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />

            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full max-w-md glass-panel border-l border-white/40 premium-shadow z-50 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{node.label}</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                            <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    {tabs.map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex-1 py-3 text-xs font-medium transition-colors cursor-pointer ${tab === t.id ? 'text-brand-700 border-b-2 border-brand-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            <t.icon className="w-3.5 h-3.5 inline mr-1" />{t.label}
                        </button>
                    ))}
                </div>

                {tab === 'submit' ? (
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-6 py-5 gap-4 overflow-y-auto">
                        {/* Status selector — 8 options in a 4x2 grid */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Result *</label>
                            <div className="grid grid-cols-4 gap-1.5">
                                {ALL_STATUSES.map((s) => {
                                    const sc = statusConfig[s]
                                    const sel = status === s
                                    const isEmail = EMAIL_STATUSES.includes(s)
                                    return (
                                        <button key={s} type="button" onClick={() => setStatus(s)}
                                            className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all cursor-pointer relative
                                                ${sel ? `${sc.border} ${sc.bg} shadow-sm` : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                                            <sc.icon className={`w-4 h-4 ${sel ? sc.text : 'text-slate-300'}`} />
                                            <span className={`text-[10px] font-semibold leading-tight ${sel ? sc.text : 'text-slate-400'}`}>{sc.label}</span>
                                            {isEmail && <span className="absolute -top-1 -right-1 text-[8px]">📧</span>}
                                        </button>
                                    )
                                })}
                            </div>
                            {EMAIL_STATUSES.includes(status) && (
                                <p className="text-[10px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                                    <Shield className="w-3 h-3" /> This will send an email alert to authorities
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tested By</label>
                            {testers.length > 0 ? (
                                <select value={testedBy} onChange={(e) => setTestedBy(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500">
                                    <option value="">Select tester…</option>
                                    {testers.map((t) => <option key={t.id} value={t.name}>{t.name} {t.role === 'authority' ? '(Authority)' : ''}</option>)}
                                </select>
                            ) : (
                                <input value={testedBy} onChange={(e) => setTestedBy(e.target.value)} placeholder="Your name"
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                            )}
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                placeholder="Observations, defect details…" rows={3}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                        </div>

                        <button type="submit" disabled={submitting}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer">
                            {submitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send className="w-4 h-4" />Submit Result</>}
                        </button>
                    </form>
                ) : tab === 'history' ? (
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <History className="w-8 h-8 text-slate-300" />
                                <p className="text-sm text-slate-400">No results recorded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((r, i) => {
                                    const sc = statusConfig[r.status] || statusConfig[STATUS.PASS]
                                    return (
                                        <motion.div key={r.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.04 } }}
                                            className={`p-4 rounded-xl border-2 ${sc.border} ${sc.bg}`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <sc.icon className={`w-4 h-4 ${sc.text}`} />
                                                    <span className={`text-sm font-semibold ${sc.text}`}>{r.status}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">{relativeTime(r.tested_at)}</span>
                                            </div>
                                            {r.tested_by && <p className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{r.tested_by}</p>}
                                            {r.notes && <p className="text-xs text-slate-600 mt-1 flex items-start gap-1"><FileText className="w-3 h-3 mt-0.5 shrink-0" />{r.notes}</p>}
                                        </motion.div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Edit Tab */
                    <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col px-6 py-5 gap-4 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} required
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                            <div className="grid grid-cols-4 gap-2">
                                {Object.entries(priorityConfig).map(([key, pc]) => (
                                    <button key={key} type="button" onClick={() => setEditPriority(key)}
                                        className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${editPriority === key ? `${pc.color} ${pc.text}` : 'bg-gray-100 text-slate-500'}`}>
                                        {pc.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit"
                            className="flex items-center justify-center gap-2 w-full py-3 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors cursor-pointer mt-auto">
                            <Check className="w-4 h-4" /> Save Changes
                        </button>
                    </form>
                )}
            </motion.div>
        </>
    )
}

/* ════════════════════════════════════════════════════
   Add Attribute Form
   ════════════════════════════════════════════════════ */
function AddAttributeForm({ onAdd, attributes, onCancel }) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [prerequisiteId, setPrerequisiteId] = useState('')
    const [priority, setPriority] = useState('medium')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim()) return
        onAdd({ name, description, prerequisite_id: prerequisiteId || null, priority })
        setName(''); setDescription(''); setPrerequisiteId(''); setPriority('medium')
    }

    return (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} className="glass-panel rounded-2xl p-5 premium-shadow border-[rgba(255,255,255,0.4)] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Plus className="w-4 h-4 text-brand-600" />Add Attribute</h3>
                <button type="button" onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" required
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                <select value={prerequisiteId} onChange={(e) => setPrerequisiteId(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    <option value="">No prerequisite</option>
                    {attributes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                    {Object.entries(priorityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button type="submit"
                    className="px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors cursor-pointer">
                    Add
                </button>
            </div>
        </motion.form>
    )
}

/* ════════════════════════════════════════════════════
   Main Roadmap
   ════════════════════════════════════════════════════ */
export default function Roadmap() {
    const [products, setProducts] = useState([])
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [attributes, setAttributes] = useState([])
    const [results, setResults] = useState([])
    const [teamMembers, setTeamMembers] = useState([])
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [loading, setLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)
    const [selectedNode, setSelectedNode] = useState(null)
    const [editMode, setEditMode] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [toastState, setToastState] = useState(null)
    const prevPassPercentRef = useRef(0)

    const showToast = (message, variant = 'success') => {
        if (variant === 'error') {
            toast.error(message)
        } else if (variant === 'warning') {
            toast(message, { icon: '⚠️' })
        } else {
            toast.success(message)
        }
    }

    const { statusMap } = useMemo(
        () => attributes.length > 0 ? computeStatuses(attributes, results) : { statusMap: {} },
        [attributes, results]
    )

    // Check for confetti trigger
    useEffect(() => {
        if (attributes.length === 0) return
        const passCount = attributes.filter((a) => statusMap[a.id] === STATUS.PASS).length
        const percent = Math.round((passCount / attributes.length) * 100)
        if (percent === 100 && prevPassPercentRef.current < 100 && prevPassPercentRef.current > 0) {
            spawnConfetti()
            showToast('🎉 All checks passed! Product is fully verified!', 'success')
        }
        prevPassPercentRef.current = percent
    }, [statusMap, attributes])

    useEffect(() => {
        Promise.all([
            fetch('/api/products').then((r) => r.json()),
            fetch('/api/team').then((r) => r.json()),
        ]).then(([p, t]) => {
            setProducts(Array.isArray(p) ? p : [])
            setTeamMembers(Array.isArray(t) ? t : [])
        }).catch(() => { })
    }, [])

    const loadProduct = useCallback(async (product) => {
        setSelectedProduct(product)
        setLoading(true)
        try {
            const [attrs, res] = await Promise.all([
                fetch(`/api/attributes/product/${product.id}`).then((r) => r.json()),
                fetch(`/api/results?product_id=${product.id}`).then((r) => r.json()),
            ])
            setAttributes(Array.isArray(attrs) ? attrs : [])
            setResults(Array.isArray(res) ? res : [])
        } catch { setAttributes([]); setResults([]) }
        setLoading(false)
    }, [])

    const handleNodeClick = useCallback((nodeData) => {
        if (nodeData.effectiveStatus === STATUS.LOCKED) return
        setEditMode(false)
        setSelectedNode(nodeData)
    }, [])

    const handleContextMenu = useCallback((e, nodeData) => {
        setContextMenu({ x: e.clientX, y: e.clientY, node: nodeData })
    }, [])

    // Quick status from context menu
    const handleQuickStatus = useCallback(async (status) => {
        if (!contextMenu?.node || !selectedProduct) return
        try {
            await fetch('/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attribute_id: contextMenu.node.attributeId,
                    product_id: selectedProduct.id,
                    status,
                    notes: `Quick status set to ${status}`,
                    tested_by: '',
                }),
            })
            showToast(`Status set to ${status}`)
            loadProduct(selectedProduct)
        } catch { showToast('Failed to set status', 'error') }
    }, [contextMenu, selectedProduct, loadProduct])

    // Submit result from slide-over
    const handleSubmitResult = useCallback(async (payload) => {
        setSubmitting(true)
        try {
            const res = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            const data = await res.json()
            showToast(data._emailTriggered ? `📧 Alert sent for ${payload.status}` : 'Result recorded', data._emailTriggered ? 'warning' : 'success')
            setSelectedNode(null)
            if (selectedProduct) loadProduct(selectedProduct)
        } catch { showToast('Failed to submit', 'error') }
        setSubmitting(false)
    }, [selectedProduct, loadProduct])

    // Save attribute edit
    const handleSaveEdit = useCallback(async (attrId, updates) => {
        try {
            await fetch(`/api/attributes/${attrId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
            showToast('Attribute updated')
            setSelectedNode(null)
            if (selectedProduct) loadProduct(selectedProduct)
        } catch { showToast('Failed to update', 'error') }
    }, [selectedProduct, loadProduct])

    // Delete attribute from context menu
    const handleDeleteAttribute = useCallback(async () => {
        if (!contextMenu?.node) return
        try {
            await fetch(`/api/attributes/${contextMenu.node.attributeId}`, { method: 'DELETE' })
            showToast('Attribute deleted')
            if (selectedProduct) loadProduct(selectedProduct)
        } catch { showToast('Failed to delete', 'error') }
    }, [contextMenu, selectedProduct, loadProduct])

    // Add attribute
    const handleAddAttribute = useCallback(async (attrData) => {
        if (!selectedProduct) return
        try {
            await fetch('/api/attributes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...attrData, product_id: selectedProduct.id, sort_order: attributes.length }),
            })
            showToast('Attribute added')
            setShowAddForm(false)
            loadProduct(selectedProduct)
        } catch { showToast('Failed to add', 'error') }
    }, [selectedProduct, attributes.length, loadProduct])

    // Create edge (new prerequisite) by dragging between handles
    const handleConnect = useCallback(async (connection) => {
        if (!selectedProduct) return
        // source → target means target depends on source
        try {
            const res = await fetch(`/api/attributes/${connection.target}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prerequisite_id: connection.source }),
            })
            const data = await res.json()
            if (data.error) { showToast(data.error, 'error'); return }
            showToast('Prerequisite set')
            loadProduct(selectedProduct)
        } catch { showToast('Failed to connect', 'error') }
    }, [selectedProduct, loadProduct])

    // Reconnect edge (change prerequisite by dragging edge endpoint)
    const handleReconnect = useCallback(async (oldEdge, newConnection) => {
        if (!selectedProduct) return
        try {
            // Remove old prerequisite
            await fetch(`/api/attributes/${oldEdge.target}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prerequisite_id: newConnection.source }),
            })
            showToast('Prerequisite changed')
            loadProduct(selectedProduct)
        } catch { showToast('Failed to reconnect', 'error') }
    }, [selectedProduct, loadProduct])

    // Delete edge — remove prerequisite
    const handleEdgeDelete = useCallback(async (edgeId) => {
        // Parse edge ID directly: format is "sourceId->targetId"
        const parts = edgeId.split('->')
        if (parts.length !== 2 || !selectedProduct) return
        const targetId = parts[1]
        try {
            const res = await fetch(`/api/attributes/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prerequisite_id: null }),
            })
            const data = await res.json()
            if (data.error) { showToast(data.error, 'error'); return }
            showToast('Prerequisite removed')
            loadProduct(selectedProduct)
        } catch { showToast('Failed to remove prerequisite', 'error') }
    }, [selectedProduct, loadProduct])

    // Build graph
    useEffect(() => {
        if (attributes.length === 0) { setNodes([]); setEdges([]); return }
        const { statusMap, latestResult } = computeStatuses(attributes, results)

        const rawNodes = attributes.map((a) => ({
            id: a.id,
            type: 'qa',
            data: {
                label: a.name, description: a.description,
                effectiveStatus: statusMap[a.id], attributeId: a.id,
                productId: a.product_id, prerequisiteId: a.prerequisite_id,
                priority: a.priority || 'medium',
                lastResult: latestResult[a.id] || null,
                onNodeClick: handleNodeClick,
                onContextMenu: handleContextMenu,
            },
            position: { x: 0, y: 0 },
        }))

        const rawEdges = attributes.filter((a) => a.prerequisite_id).map((a) => {
            const ss = statusMap[a.prerequisite_id]
            const passed = ss === STATUS.PASS
            const prereqName = attributes.find((x) => x.id === a.prerequisite_id)?.name || ''
            return {
                id: `${a.prerequisite_id}->${a.id}`,
                source: a.prerequisite_id, target: a.id,
                animated: passed,
                type: 'deletable',
                data: { onDelete: handleEdgeDelete },
                style: { stroke: passed ? '#10b981' : '#cbd5e1', strokeWidth: passed ? 2.5 : 1.5, strokeDasharray: passed ? undefined : '6 4' },
                markerEnd: { type: MarkerType.ArrowClosed, color: passed ? '#10b981' : '#cbd5e1', width: 20, height: 20 },
                label: `needs ${prereqName}`,
                labelStyle: { fontSize: 9, fontWeight: 600, fill: passed ? '#10b981' : '#94a3b8', fontFamily: 'Inter, sans-serif' },
                labelBgStyle: { fill: 'transparent' },
                deletable: true,
            }
        })

        const laidOut = layoutGraph(rawNodes, rawEdges)
        setNodes(laidOut)
        setEdges(rawEdges)
    }, [attributes, results, handleNodeClick, handleContextMenu])

    return (
        <div className="max-w-7xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QA Roadmap</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Drag handles to connect · Right-click for quick actions · Click a node to submit results
                    </p>
                </div>
                {selectedProduct && (
                    <button onClick={() => setShowAddForm(!showAddForm)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors shadow-sm cursor-pointer">
                        <Plus className="w-4 h-4" />Add Attribute
                    </button>
                )}
            </div>

            {/* Product Selector */}
            <div className="relative max-w-xs">
                <select
                    value={selectedProduct?.id || ''}
                    onChange={(e) => {
                        const p = products.find((x) => x.id === e.target.value)
                        if (p) loadProduct(p)
                    }}
                    className="w-full appearance-none px-4 py-2.5 glass-panel border border-[rgba(255,255,255,0.4)] rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 cursor-pointer transition-all"
                ><option value="">Select a product…</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            <AnimatePresence>
                {showAddForm && selectedProduct && (
                    <AddAttributeForm onAdd={handleAddAttribute} attributes={attributes} onCancel={() => setShowAddForm(false)} />
                )}
            </AnimatePresence>

            {selectedProduct && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {attributes.length > 0 && <ProgressSummary attributes={attributes} statusMap={statusMap} />}

                    <div className="bg-white rounded-2xl border border-gray-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden" style={{ height: 600 }}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : attributes.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 py-32 glass-panel rounded-3xl border border-[rgba(255,255,255,0.4)] premium-shadow">
                                <Clock className="w-10 h-10 text-slate-300" />
                                <p className="text-sm text-slate-400">No attributes yet. Click "Add Attribute" to build your roadmap.</p>
                            </div>
                        ) : (
                            <ReactFlow
                                nodes={nodes} edges={edges}
                                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                                onConnect={handleConnect}
                                onReconnect={handleReconnect}
                                onEdgesDelete={(deletedEdges) => deletedEdges.forEach((e) => handleEdgeDelete(e.id))}
                                nodeTypes={nodeTypes}
                                edgeTypes={edgeTypes}
                                fitView fitViewOptions={{ padding: 0.3 }}
                                proOptions={{ hideAttribution: true }}
                                nodesDraggable={true}
                                nodesConnectable={true}
                                elementsSelectable={true}
                                snapToGrid={true}
                                snapGrid={[20, 20]}
                                deleteKeyCode="Delete"
                                connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
                            >
                                <Background gap={20} size={1} color="#e2e8f0" />
                                <Controls showInteractive={false} className="!rounded-xl !border-gray-200 !shadow-sm" />
                                <MiniMap
                                    nodeColor={(n) => {
                                        const s = n.data?.effectiveStatus
                                        if (s === STATUS.PASS) return '#10b981'
                                        if (s === STATUS.FAIL) return '#ef4444'
                                        if (s === STATUS.SEMI) return '#f59e0b'
                                        if (s === STATUS.BLOCKED) return '#f43f5e'
                                        if (s === STATUS.WAITING) return '#0ea5e9'
                                        if (s === STATUS.IN_REVIEW) return '#8b5cf6'
                                        if (s === STATUS.DEFERRED) return '#f97316'
                                        if (s === STATUS.LOCKED) return '#cbd5e1'
                                        return '#6366f1'
                                    }}
                                    maskColor="rgba(248,250,252,0.8)"
                                    className="!rounded-xl !border !border-gray-200"
                                />
                            </ReactFlow>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Legend */}
            {selectedProduct && attributes.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }}
                    className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700 text-xs">Legend:</span>
                    {[STATUS.PENDING, STATUS.PASS, STATUS.FAIL, STATUS.SEMI, STATUS.WAITING, STATUS.BLOCKED, STATUS.IN_REVIEW, STATUS.DEFERRED, STATUS.SKIPPED, STATUS.LOCKED].map((s) => {
                        const c = statusConfig[s]
                        return <span key={s} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded border ${c.border} ${c.bg}`} />{c.label}</span>
                    })}
                </motion.div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x} y={contextMenu.y} node={contextMenu.node}
                    onClose={() => setContextMenu(null)}
                    onQuickStatus={handleQuickStatus}
                    onEdit={() => { setEditMode(true); setSelectedNode(contextMenu.node) }}
                    onDelete={handleDeleteAttribute}
                    onViewHistory={() => { setEditMode(false); setSelectedNode(contextMenu.node) }}
                    onRemovePrerequisite={async () => {
                        if (!contextMenu?.node || !selectedProduct) return
                        try {
                            await fetch(`/api/attributes/${contextMenu.node.attributeId}`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prerequisite_id: null }),
                            })
                            showToast('Prerequisite removed')
                            loadProduct(selectedProduct)
                        } catch { showToast('Failed to remove', 'error') }
                    }}
                />
            )}

            {/* Slide-Over */}
            <AnimatePresence>
                {selectedNode && (
                    <SlideOver
                        node={selectedNode} onClose={() => setSelectedNode(null)}
                        onSubmit={handleSubmitResult} submitting={submitting}
                        results={results} teamMembers={teamMembers}
                        isEditMode={editMode} onSaveEdit={handleSaveEdit}
                    />
                )}
            </AnimatePresence>

        </div>
    )
}
