import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import LoadingSpinner from './components/common/LoadingSpinner'

// ── Lazy imports — chaque page chargée seulement quand nécessaire ───────────
const MenuPage     = lazy(() => import('./pages/client/MenuPage'))
const DeliveryPage = lazy(() => import('./pages/client/DeliveryPage'))
const TrackOrder   = lazy(() => import('./pages/client/TrackOrder'))
const LoginPage    = lazy(() => import('./pages/LoginPage'))

const KitchenDashboard  = lazy(() => import('./pages/kitchen/KitchenDashboard'))
const CashierDashboard  = lazy(() => import('./pages/cashier/CashierDashboard'))

const AdminLayout      = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'))
const MenuManagement   = lazy(() => import('./pages/admin/MenuManagement'))
const TableManagement  = lazy(() => import('./pages/admin/TableManagement'))
const OrdersManagement = lazy(() => import('./pages/admin/OrdersManagement'))
const Statistics       = lazy(() => import('./pages/admin/Statistics'))
const StaffManagement  = lazy(() => import('./pages/admin/StaffManagement'))
const AdminSettings    = lazy(() => import('./pages/admin/Settings'))
const OrderHistory     = lazy(() => import('./pages/admin/OrderHistory'))

// ── Fallback de chargement ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" />
    </div>
  )
}

function PrivateRoute({ children, roles }) {
  const { user, token } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public: Client ─────────────────────────────────────────────── */}
        <Route path="/menu/:slug/:tableId" element={<MenuPage />} />
        <Route path="/order/:slug"         element={<DeliveryPage />} />
        <Route path="/track/:orderNumber"  element={<TrackOrder />} />

        {/* ── Auth ───────────────────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Kitchen ────────────────────────────────────────────────────── */}
        <Route path="/kitchen" element={
          <PrivateRoute roles={['kitchen', 'admin']}>
            <KitchenDashboard />
          </PrivateRoute>
        } />

        {/* ── Cashier ────────────────────────────────────────────────────── */}
        <Route path="/cashier" element={
          <PrivateRoute roles={['cashier', 'admin']}>
            <CashierDashboard />
          </PrivateRoute>
        } />

        {/* ── Admin ──────────────────────────────────────────────────────── */}
        <Route path="/admin" element={
          <PrivateRoute roles={['admin']}>
            <AdminLayout />
          </PrivateRoute>
        }>
          <Route index             element={<AdminDashboard />} />
          <Route path="menu"       element={<MenuManagement />} />
          <Route path="tables"     element={<TableManagement />} />
          <Route path="orders"     element={<OrdersManagement />} />
          <Route path="history"    element={<OrderHistory />} />
          <Route path="stats"      element={<Statistics />} />
          <Route path="staff"      element={<StaffManagement />} />
          <Route path="settings"   element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
