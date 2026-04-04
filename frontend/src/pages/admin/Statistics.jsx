import { useState, useEffect, lazy, Suspense } from 'react'
import { getDashboardStats } from '../../api/orders'

const ReactApexChart = lazy(() => import('react-apexcharts'))
import { formatCurrency } from '../../utils/format'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner size="lg" className="py-20" />
  if (!stats)  return null

  const revenueOptions = {
    chart:   { type: 'area', toolbar: { show: false }, background: 'transparent' },
    colors:  ['#f97316'],
    fill:    { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    stroke:  { curve: 'smooth', width: 3 },
    dataLabels: { enabled: false },
    xaxis: {
      categories: stats.weekly_sales.map(d => d.label),
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { style: { colors: '#9ca3af', fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: '#9ca3af' }, formatter: v => formatCurrency(v) } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
    tooltip: { y: { formatter: v => formatCurrency(v) } },
  }

  const ordersOptions = {
    chart:  { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    colors: ['#16a34a'],
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    dataLabels: { enabled: false },
    xaxis: {
      categories: stats.weekly_sales.map(d => d.label),
      axisBorder: { show: false },
      axisTicks:  { show: false },
      labels: { style: { colors: '#9ca3af', fontSize: '12px' } },
    },
    yaxis: { labels: { style: { colors: '#9ca3af' } } },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
  }

  const totalRevenue = stats.weekly_sales.reduce((s, d) => s + d.revenue, 0)
  const totalOrders  = stats.weekly_sales.reduce((s, d) => s + d.orders, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analyse des 7 derniers jours</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Revenus (7j)',    value: formatCurrency(totalRevenue), color: 'text-primary-500' },
          { label: 'Commandes (7j)', value: totalOrders,                  color: 'text-green-600' },
          { label: 'Revenus auj.',   value: formatCurrency(stats.today.revenue), color: 'text-blue-600' },
          { label: 'Commandes auj.', value: stats.today.orders,           color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Évolution des Revenus</h2>
          <Suspense fallback={<div className="h-[250px] bg-gray-50 rounded-xl animate-pulse" />}>
            <ReactApexChart
              options={revenueOptions}
              series={[{ name: 'Revenus', data: stats.weekly_sales.map(d => d.revenue) }]}
              type="area"
              height={250}
            />
          </Suspense>
        </div>

        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">Nombre de Commandes</h2>
          <Suspense fallback={<div className="h-[250px] bg-gray-50 rounded-xl animate-pulse" />}>
            <ReactApexChart
              options={ordersOptions}
              series={[{ name: 'Commandes', data: stats.weekly_sales.map(d => d.orders) }]}
              type="bar"
              height={250}
            />
          </Suspense>
        </div>
      </div>

      {/* Top products */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Top Produits du Jour</h2>
        {stats.top_products.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune vente aujourd'hui.</p>
        ) : (
          <div className="space-y-3">
            {stats.top_products.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-7 h-7 bg-primary-50 text-primary-600 font-bold text-sm rounded-xl flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900">{p.name}</span>
                    <span className="font-bold text-sm text-gray-700">{p.total_qty} vendus</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${(p.total_qty / (stats.top_products[0]?.total_qty || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
