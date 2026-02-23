const palette = {
    Pass: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-500/20',
    },
    Fail: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        dot: 'bg-red-500',
        ring: 'ring-red-500/20',
    },
    'Semi-Pass': {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        dot: 'bg-amber-500',
        ring: 'ring-amber-500/20',
    },
    Waiting: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        dot: 'bg-sky-500',
        ring: 'ring-sky-500/20',
    },
    Blocked: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        dot: 'bg-rose-500',
        ring: 'ring-rose-500/20',
    },
    Skipped: {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
        ring: 'ring-slate-400/20',
    },
    'In Review': {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        dot: 'bg-violet-500',
        ring: 'ring-violet-500/20',
    },
    Deferred: {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        dot: 'bg-orange-500',
        ring: 'ring-orange-500/20',
    },
}

export default function StatusBadge({ status }) {
    const s = palette[status] || palette['Pass']
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${s.bg} ${s.text} ${s.ring}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {status}
        </span>
    )
}
