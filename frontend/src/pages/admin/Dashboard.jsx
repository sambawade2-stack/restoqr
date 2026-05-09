import { useState, useCallback, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Banknote, Truck, Clock } from 'lucide-react'
import { getDashboardStats } from '../../api/orders'

const ReactApexChart = lazy(() => import('react-apexcharts'))
import { usePolling } from '../../hooks/usePolling'
import { formatCurrency } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import clsx from 'clsx'

const QUICK_ACTIONS = [
  { label: 'Gérer le Menu',      to: '/admin/menu',   color: 'bg-primary-500' },
  { label: 'Gérer les Tables',   to: '/admin/tables', color: 'bg-success-600' },
  { label: 'Commandes Clients',  to: '/admin/orders', color: 'bg-red-500' },
  { label: 'Statistiques',       to: '/admin/stats',  color: 'bg-blue-500' },
]

const CACHE_KEY = 'dashboard_stats_cache'

export default function AdminDashboard() {
  const navigate = useNavigate()

  // Affiche immédiatement les stats du cache local (évite le spinner au rechargement)
  const [stats, setStats]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) } catch { return null }
  })
  const [loading, setLoading] = useState(!stats)

  const fetch = useCallback(async () => {
    try {
      const { data } = await getDashboardStats()
      setStats(data)
      localStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch {}
    finally { setLoading(false) }
  }, [])

  usePolling(fetch, 5_000)

  if (loading) return <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
  if (!stats)  return null

  const chartOptions = {
    chart:   { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    colors:  ['#f97316', '#93c5fd'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: stats.weekly_sales.map(d => d.label),
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels:     { style: { colors: '#9ca3af', fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: '#9ca3af', fontSize: '11px' } } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
    legend: { position: 'top', labels: { colors: '#6b7280' } },
    tooltip: { y: { formatter: v => formatCurrency(v) } },
  }

  const chartSeries = [
    { name: 'Revenus (FCFA)', data: stats.weekly_sales.map(d => d.revenue) },
    { name: 'Commandes',      data: stats.weekly_sales.map(d => d.orders) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble — Aujourd'hui</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ label, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className={clsx(
              color,
              'text-white rounded-2xl p-5 text-left font-semibold hover:opacity-90 transition-opacity shadow-sm'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingBag} label="Commandes"    value={stats.today.orders}     color="text-primary-500" bg="bg-primary-50" />
        <StatCard icon={Banknote}    label="Revenus"       value={formatCurrency(stats.today.revenue)} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={Truck}       label="Livraisons"    value={stats.today.deliveries} color="text-blue-600"  bg="bg-blue-50" />
        <StatCard icon={Clock}       label="En cours"      value={stats.today.active}     color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Chart + Top Products */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Ventes Cette Semaine</h2>
          <Suspense fallback={<div className="h-[260px] bg-gray-50 rounded-xl animate-pulse" />}>
            <ReactApexChart
              options={chartOptions}
              series={chartSeries}
              type="bar"
              height={260}
            />
          </Suspense>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Top Produits</h2>
          {stats.top_products.length === 0 ? (
            <p className="text-gray-400 text-sm">Aucune vente aujourd'hui</p>
          ) : (
            <div className="space-y-3">
              {stats.top_products.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className={clsx(
                    'w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                    idx === 0 ? 'bg-yellow-100 text-yellow-700'
                    : idx === 1 ? 'bg-gray-100 text-gray-600'
                    : 'bg-orange-50 text-orange-600'
                  )}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-primary-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (p.total_qty / (stats.top_products[0]?.total_qty || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 shrink-0">{p.total_qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', bg)}>
        <Icon className={clsx('w-5 h-5', color)} />
      </div>
      <div>
        <p className="text-gray-500 text-xs font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
