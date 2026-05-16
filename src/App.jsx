import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login       from './pages/Login'
import Dashboard   from './pages/Dashboard'
import MyBookings  from './pages/MyBookings'
import BookSession from './pages/BookSession'
import Profile     from './pages/Profile'
import BottomNav   from './components/Layout/BottomNav'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}

function AppLayout({ children }) {
  return (
    <div className="cp-root">
      <main className="cp-main">{children}</main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <div className="cp-loading"><div className="cp-spinner" /></div>

  return (
    <Routes>
      <Route path="/login"    element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/"         element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/bookings"  element={<ProtectedRoute><AppLayout><MyBookings /></AppLayout></ProtectedRoute>} />
      <Route path="/book"      element={<ProtectedRoute><AppLayout><BookSession /></AppLayout></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
      <Route path="*"          element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
