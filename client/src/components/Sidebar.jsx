import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTheme } from '../ThemeContext'
import {
    LayoutDashboard,
    PackageSearch,
    ClipboardCheck,
    GitBranchPlus,
    Users,
    Sun,
    Moon,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/products', label: 'Products', icon: PackageSearch },
    { to: '/quality-check', label: 'Quality Check', icon: ClipboardCheck },
    { to: '/roadmap', label: 'Roadmap', icon: GitBranchPlus },
    { to: '/team', label: 'Team', icon: Users },
]

export default function Sidebar() {
    const { dark, toggle } = useTheme()
    const [isCollapsed, setIsCollapsed] = useState(false)

    return (
        <aside className={`hidden lg:flex flex-col glass-panel border-r border-[rgba(255,255,255,0.4)] dark:border-[rgba(255,255,255,0.05)] shadow-sm shrink-0 relative transition-all duration-300 py-8 ${isCollapsed ? 'w-20 px-2 items-center' : 'w-64 px-4'}`}>
            {/* Logo and Toggle Button */}
            <div className={`flex items-center mb-10 ${isCollapsed ? 'justify-center px-0 flex-col gap-4' : 'justify-between px-3'}`}>
                <div className={`flex items-center gap-3 overflow-hidden transition-all ${isCollapsed ? 'w-0 opacity-0 h-0 hidden' : 'w-auto opacity-100'}`}>
                    <img src="/qualitea-logo.png" alt="QualiTea" className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg object-cover" />
                    <span className="text-lg font-bold brand-gradient-text tracking-tight whitespace-nowrap">
                        QualiTea
                    </span>
                </div>
                {/* When collapsed, we can show just a small logo or just the button. Let's just show the logo and button stack */}
                {isCollapsed && (
                    <img src="/qualitea-logo.png" alt="QualiTea" className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg object-cover mb-2" />
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 flex-1">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'
                            } ${isActive
                                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
                            }`
                        }
                        title={isCollapsed ? label : undefined}
                    >
                        <Icon className="w-[18px] h-[18px] min-w-[18px]" />
                        {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Theme Toggle */}
            <div className={`mb-3 ${isCollapsed ? 'px-0' : 'px-3'}`}>
                <button
                    onClick={toggle}
                    className={`w-full flex items-center rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer ${isCollapsed ? 'justify-center p-3' : 'justify-between px-3 py-2.5'
                        }`}
                    title={isCollapsed ? (dark ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
                >
                    <span className="flex items-center gap-3">
                        {dark ? <Moon className="w-[18px] h-[18px] min-w-[18px]" /> : <Sun className="w-[18px] h-[18px] min-w-[18px]" />}
                        {!isCollapsed && <span className="whitespace-nowrap">{dark ? 'Dark Mode' : 'Light Mode'}</span>}
                    </span>
                    {!isCollapsed && (
                        <div className={`relative w-10 h-5 rounded-full transition-colors ${dark ? 'bg-brand-600' : 'bg-gray-300'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${dark ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                    )}
                </button>
            </div>

            {/* Footer */}
            {!isCollapsed && (
                <div className="border-t border-gray-100 dark:border-slate-700 pt-4 px-3 whitespace-nowrap overflow-hidden">
                    <p className="text-xs text-slate-400 dark:text-slate-500">v2.0.0 · QualiTea</p>
                </div>
            )}
        </aside>
    )
}
