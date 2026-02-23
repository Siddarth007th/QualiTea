import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import QualityCheck from './pages/QualityCheck'
import Roadmap from './pages/Roadmap'
import Team from './pages/Team'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

function AnimatedPage({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex-1 min-h-0"
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <AnimatedPage>
                  <Dashboard />
                </AnimatedPage>
              }
            />
            <Route
              path="/products"
              element={
                <AnimatedPage>
                  <Products />
                </AnimatedPage>
              }
            />
            <Route
              path="/quality-check"
              element={
                <AnimatedPage>
                  <QualityCheck />
                </AnimatedPage>
              }
            />
            <Route
              path="/roadmap"
              element={
                <AnimatedPage>
                  <Roadmap />
                </AnimatedPage>
              }
            />
            <Route
              path="/team"
              element={
                <AnimatedPage>
                  <Team />
                </AnimatedPage>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  )
}
