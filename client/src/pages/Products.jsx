import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, PackageSearch, X } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function Products() {
    const [products, setProducts] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ name: '', description: '' })
    const [loading, setLoading] = useState(true)

    const fetchProducts = () => {
        setLoading(true)
        fetch('/api/products')
            .then((r) => r.json())
            .then((d) => setProducts(Array.isArray(d) ? d : []))
            .catch(() => { })
            .finally(() => setLoading(false))
    }

    useEffect(fetchProducts, [])

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error('Product name is required')
            return
        }

        try {
            const res = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            if (!res.ok) throw new Error(await res.text())
            toast.success('Product created successfully!')
            setForm({ name: '', description: '' })
            setShowModal(false)
            fetchProducts()
        } catch (err) {
            toast.error('Failed to create product')
        }
    }

    const handleDelete = async (id) => {
        try {
            const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error(await res.text())
            toast.success('Product deleted')
            fetchProducts()
        } catch (err) {
            toast.error('Failed to delete product')
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Products
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage your product catalog
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Add Product
                </button>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20 glass-panel rounded-2xl premium-shadow">
                    <PackageSearch className="w-12 h-12 mx-auto text-slate-300" />
                    <p className="mt-4 text-sm text-slate-500">
                        No products yet. Add your first product to get started.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {products.map((p, i) => (
                            <motion.div
                                layout
                                key={p.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    transition: { delay: i * 0.05, duration: 0.35 },
                                }}
                                className="group glass-panel rounded-2xl p-5 premium-shadow hover:shadow-lg transition-all duration-300"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                                            {p.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {p.name}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {p.description && (
                                    <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-2">
                                        {p.description}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                y: 0,
                                transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="glass-panel border-white/40 rounded-2xl w-full max-w-md premium-shadow overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-6 pt-6 pb-2">
                                <h2 className="text-lg font-bold text-slate-900">
                                    New Product
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="px-6 pb-6 pt-2 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                        Product Name *
                                    </label>
                                    <input
                                        value={form.name}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, name: e.target.value }))
                                        }
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                                        placeholder="e.g. Widget X"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, description: e.target.value }))
                                        }
                                        rows={3}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none"
                                        placeholder="Optional product description"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
                                >
                                    Create Product
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
