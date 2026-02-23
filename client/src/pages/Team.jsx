import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users,
    Shield,
    UserPlus,
    Trash2,
    Mail,
    CheckCircle2,
    X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Team() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ name: '', email: '', role: 'tester' })
    const [submitting, setSubmitting] = useState(false)
    const [toast, setToast] = useState(null)

    const loadMembers = () => {
        fetch('/api/team')
            .then((r) => r.json())
            .then((d) => setMembers(Array.isArray(d) ? d : []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }

    useEffect(() => { loadMembers() }, [])



    const handleAdd = async (e) => {
        e.preventDefault()
        if (!form.name.trim() || !form.email.trim()) return
        setSubmitting(true)
        try {
            await fetch('/api/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            setForm({ name: '', email: '', role: 'tester' })
            setShowForm(false)
            toast.success('Team member added')
            loadMembers()
        } catch {
            toast.error('Failed to add member')
        }
        setSubmitting(false)
    }

    const handleDelete = async (id, name) => {
        if (!confirm(`Remove ${name} from the team?`)) return
        try {
            await fetch(`/api/team/${id}`, { method: 'DELETE' })
            toast.success(`${name} removed`)
            loadMembers()
        } catch {
            toast.error('Failed to remove member')
        }
    }

    const authorities = members.filter((m) => m.role === 'authority')
    const testers = members.filter((m) => m.role === 'tester')

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Team
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage testers and authorities. Authorities receive email alerts on failures.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                </button>
            </div>

            {/* Add Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <form
                            onSubmit={handleAdd}
                            className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.4)] p-6 premium-shadow space-y-4"
                        >
                            <h2 className="text-sm font-semibold text-slate-900">
                                New Team Member
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Name *
                                    </label>
                                    <input
                                        value={form.name}
                                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="John Doe"
                                        required
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                        placeholder="john@company.com"
                                        required
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Role
                                    </label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                    >
                                        <option value="tester">Tester</option>
                                        <option value="authority">Authority (receives alerts)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {submitting ? 'Adding…' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : members.length === 0 ? (
                <div className="glass-panel rounded-2xl border border-[rgba(255,255,255,0.4)] p-12 text-center premium-shadow">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-400">
                        No team members yet. Add your testers and an authority to receive email notifications.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Authorities */}
                    {authorities.length > 0 && (
                        <div>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                <Shield className="w-4 h-4 text-brand-600" />
                                Authorities
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                    — receive email alerts on Fail / Semi-Pass
                                </span>
                            </h2>
                            <div className="space-y-2">
                                <AnimatePresence mode="popLayout">
                                    {authorities.map((m) => (
                                        <MemberCard key={m.id} member={m} onDelete={handleDelete} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}

                    {/* Testers */}
                    {testers.length > 0 && (
                        <div>
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                                <Users className="w-4 h-4 text-slate-500" />
                                Testers
                            </h2>
                            <div className="space-y-2">
                                <AnimatePresence mode="popLayout">
                                    {testers.map((m) => (
                                        <MemberCard key={m.id} member={m} onDelete={handleDelete} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function MemberCard({ member, onDelete }) {
    const isAuthority = member.role === 'authority'
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`flex items-center justify-between p-4 rounded-xl border-2 glass-panel transition-all hover:shadow-md ${isAuthority ? 'border-brand-300 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-white/70' : 'border-[rgba(255,255,255,0.4)]'
                }`}
        >
            <div className="flex items-center gap-4 min-w-0">
                <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isAuthority
                        ? 'bg-brand-100 text-brand-700'
                        : 'bg-gray-100 text-slate-600'
                        }`}
                >
                    {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                        {member.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span className="text-xs text-slate-500 truncate">{member.email}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${isAuthority
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-gray-100 text-slate-600'
                        }`}
                >
                    {isAuthority ? 'Authority' : 'Tester'}
                </span>
                <button
                    onClick={() => onDelete(member.id, member.name)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    )
}
