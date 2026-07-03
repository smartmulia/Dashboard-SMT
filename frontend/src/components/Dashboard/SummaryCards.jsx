import { Package, TrendingUp, DollarSign, BarChart3, ShoppingCart, XCircle } from 'lucide-react'
import { formatRupiah } from '../../utils/format'
import { useAuth } from '../../contexts/AuthContext'

function StatCard({ icon: Icon, label, value, sub, color, bgColor, iconBg }) {
  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wider mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-brown-400 dark:text-brown-500 mt-1">{sub}</p>}
        </div>
        <div className={`${iconBg} p-3 rounded-2xl`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  )
}

export default function SummaryCards({ stats, loading }) {
  const { canSeeCogs } = useAuth()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-brown-100 dark:bg-brown-800 rounded w-3/4 mb-3" />
            <div className="h-8 bg-brown-100 dark:bg-brown-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      icon: Package,
      label: 'Total SBG',
      value: stats?.totalSbg?.toLocaleString('id-ID') || '0',
      sub: `${stats?.totalTerjual || 0} terjual · ${stats?.totalBelumTerjual || 0} belum`,
      color: 'text-brown-800 dark:text-gold-300',
      iconBg: 'bg-gold-200/50 dark:bg-gold-900/20',
    },
    {
      icon: DollarSign,
      label: 'Total COGS',
      value: canSeeCogs() ? formatRupiah(stats?.totalCogs) : '••••••',
      sub: canSeeCogs() ? 'Nilai modal seluruh barang' : 'Tidak memiliki akses',
      color: 'text-brown-700 dark:text-brown-300',
      iconBg: 'bg-brown-100 dark:bg-brown-800',
    },
    {
      icon: ShoppingCart,
      label: 'Total Harga Jual',
      value: formatRupiah(stats?.totalHargaJual),
      sub: 'Before Tax',
      color: 'text-emerald-700 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
    {
      icon: TrendingUp,
      label: 'Total Profit',
      value: formatRupiah(stats?.totalProfit),
      sub: `Margin: ${stats?.persentaseProfit || 0}%`,
      color: 'text-gold-700 dark:text-gold-400',
      iconBg: 'bg-gold-100 dark:bg-gold-900/20',
    },
    {
      icon: BarChart3,
      label: '% Profit',
      value: `${stats?.persentaseProfit || 0}%`,
      sub: 'Profit / Harga Jual',
      color: stats?.persentaseProfit >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <StatCard key={i} {...card} />
      ))}
    </div>
  )
}
