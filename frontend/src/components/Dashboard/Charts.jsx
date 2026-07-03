import ReactApexChart from 'react-apexcharts'
import { formatRupiah } from '../../utils/format'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const BROWN = '#4E342E'
const GOLD = '#D4AF37'
const LIGHT_GOLD = '#F7E7A8'
const GREEN = '#10b981'
const RED = '#ef4444'

function ChartCard({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      <h3 className="font-semibold text-brown-800 dark:text-gold-300 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EmptyState({ loading }) {
  return (
    <div className="h-48 flex items-center justify-center text-brown-400 dark:text-brown-600 text-sm">
      {loading ? 'Memuat...' : 'Belum ada data'}
    </div>
  )
}

function formatBulan(str) {
  if (!str) return str
  const [y, m] = str.split('-')
  const nama = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
  return `${nama[parseInt(m) - 1]} ${y}`
}

/* ─── Trend Profit Chart ─── */
export function TrendProfitChart({ data, loading }) {
  const { isDark } = useTheme()

  if (loading || !data?.length) return (
    <ChartCard title="Trend Profit per Bulan">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  const categories = data.map(d => formatBulan(d.bulan))
  const seriesHJ    = data.map(d => Math.round(d.totalHargaJual))
  const seriesCogs  = data.map(d => Math.round(d.totalCogs))
  const seriesProfit = data.map(d => Math.round(d.totalProfit))

  const labelColor = isDark ? LIGHT_GOLD : BROWN
  const gridColor  = isDark ? '#3e2723' : '#f0ebe5'

  const options = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: [0, 0, 3], curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    fill: { opacity: [0.85, 0.85, 1] },
    colors: [GOLD, '#8B6F47', GREEN],
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { colors: labelColor, fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
          return String(v)
        },
        style: { colors: labelColor, fontSize: '11px' },
      },
    },
    grid: { borderColor: gridColor },
    legend: {
      position: 'top',
      labels: { colors: labelColor },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: v => formatRupiah(v) },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
  }

  const series = [
    { name: 'Harga Jual', type: 'bar', data: seriesHJ },
    { name: 'COGS', type: 'bar', data: seriesCogs },
    { name: 'Profit', type: 'line', data: seriesProfit },
  ]

  return (
    <ChartCard title="Trend Profit per Bulan">
      <ReactApexChart type="line" series={series} options={options} height={280} />
    </ChartCard>
  )
}

/* ─── Profit Table ─── */
export function ProfitTable({ data, loading }) {
  const { user } = useAuth()
  const canSeeCogs = user?.role !== 'USER'

  if (loading) return (
    <ChartCard title="Ringkasan Profit per Bulan">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  if (!data?.length) return (
    <ChartCard title="Ringkasan Profit per Bulan">
      <EmptyState loading={false} />
    </ChartCard>
  )

  const totalHJ   = data.reduce((s, d) => s + d.totalHargaJual, 0)
  const totalCogs = data.reduce((s, d) => s + d.totalCogs, 0)
  const totalProfit = data.reduce((s, d) => s + d.totalProfit, 0)
  const totalJumlah = data.reduce((s, d) => s + d.jumlah, 0)

  const margin = totalHJ > 0 ? ((totalProfit / totalHJ) * 100) : 0

  // Tampilkan urutan terbaru di atas
  const rows = [...data].reverse()

  return (
    <ChartCard title="Ringkasan Profit per Bulan">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brown-100 dark:border-brown-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Bulan</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Item</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Harga Jual</th>
              {canSeeCogs && (
                <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">COGS</th>
              )}
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Profit</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => {
              const m = d.totalHargaJual > 0 ? (d.totalProfit / d.totalHargaJual) * 100 : 0
              const isPositive = d.totalProfit > 0
              return (
                <tr key={d.bulan} className={`border-b border-brown-50 dark:border-brown-800 transition-colors hover:bg-brown-50/50 dark:hover:bg-brown-800/50 ${i === 0 ? 'bg-gold-50/30 dark:bg-gold-900/10' : ''}`}>
                  <td className="py-2.5 px-3 font-medium text-brown-700 dark:text-gold-200 whitespace-nowrap">
                    {i === 0 && <span className="text-[10px] bg-gold-100 dark:bg-gold-900/40 text-gold-700 dark:text-gold-400 px-1.5 py-0.5 rounded-full mr-1.5 font-semibold">Terbaru</span>}
                    {formatBulan(d.bulan)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-brown-600 dark:text-brown-300">{d.jumlah}</td>
                  <td className="py-2.5 px-3 text-right text-brown-700 dark:text-brown-200 whitespace-nowrap">{formatRupiah(d.totalHargaJual)}</td>
                  {canSeeCogs && (
                    <td className="py-2.5 px-3 text-right text-brown-500 dark:text-brown-400 whitespace-nowrap">{formatRupiah(d.totalCogs)}</td>
                  )}
                  <td className={`py-2.5 px-3 text-right font-semibold whitespace-nowrap ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                    {formatRupiah(d.totalProfit)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      m >= 20 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : m >= 10 ? 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {m >= 10 ? <TrendingUp className="w-3 h-3" /> : m > 0 ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {m.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          {/* Total row */}
          <tfoot>
            <tr className="border-t-2 border-brown-200 dark:border-brown-600 bg-brown-50 dark:bg-brown-800/50">
              <td className="py-2.5 px-3 font-bold text-brown-800 dark:text-gold-300">Total</td>
              <td className="py-2.5 px-3 text-right font-bold text-brown-700 dark:text-brown-200">{totalJumlah}</td>
              <td className="py-2.5 px-3 text-right font-bold text-brown-700 dark:text-brown-200 whitespace-nowrap">{formatRupiah(totalHJ)}</td>
              {canSeeCogs && (
                <td className="py-2.5 px-3 text-right font-bold text-brown-500 dark:text-brown-400 whitespace-nowrap">{formatRupiah(totalCogs)}</td>
              )}
              <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatRupiah(totalProfit)}</td>
              <td className="py-2.5 px-3 text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  {margin.toFixed(1)}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ChartCard>
  )
}

/* ─── Trend Profit & Rugi Gabungan ─── */
export function TrendProfitRugiChart({ profitData, rugiData, loading }) {
  const { isDark } = useTheme()

  const hasData = profitData?.length || rugiData?.length

  if (loading || !hasData) return (
    <ChartCard title="Trend Profit & Rugi per Bulan">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  // Merge semua bulan dari kedua dataset
  const bulanSet = new Set([
    ...(profitData || []).map(d => d.bulan),
    ...(rugiData || []).map(d => d.bulan),
  ])
  const allBulan = Array.from(bulanSet).sort()

  const profitMap = Object.fromEntries((profitData || []).map(d => [d.bulan, d.totalProfit]))
  const rugiMap   = Object.fromEntries((rugiData   || []).map(d => [d.bulan, d.totalRugi]))

  const categories   = allBulan.map(formatBulan)
  const seriesProfit = allBulan.map(b => Math.round(profitMap[b] || 0))
  const seriesRugi   = allBulan.map(b => Math.round(rugiMap[b]   || 0))

  const labelColor = isDark ? LIGHT_GOLD : BROWN
  const gridColor  = isDark ? '#3e2723' : '#f0ebe5'

  const options = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: [3, 3], curve: 'smooth' },
    colors: [GREEN, RED],
    dataLabels: { enabled: false },
    markers: { size: 4 },
    xaxis: {
      categories,
      labels: { style: { colors: labelColor, fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
          return String(v)
        },
        style: { colors: labelColor, fontSize: '11px' },
      },
    },
    grid: { borderColor: gridColor },
    legend: {
      position: 'top',
      labels: { colors: labelColor },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: v => formatRupiah(v) },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.25,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
  }

  const series = [
    { name: 'Profit', data: seriesProfit },
    { name: 'Rugi', data: seriesRugi },
  ]

  return (
    <ChartCard title="Trend Profit & Rugi per Bulan">
      <ReactApexChart type="area" series={series} options={options} height={280} />
    </ChartCard>
  )
}

/* ─── Trend Rugi Chart ─── */
export function TrendRugiChart({ data, loading }) {
  const { isDark } = useTheme()

  if (loading || !data?.length) return (
    <ChartCard title="Trend Rugi per Bulan">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  const categories  = data.map(d => formatBulan(d.bulan))
  const seriesHJ    = data.map(d => Math.round(d.totalHargaJual))
  const seriesCogs  = data.map(d => Math.round(d.totalCogs))
  const seriesRugi  = data.map(d => Math.round(d.totalRugi))

  const labelColor = isDark ? LIGHT_GOLD : BROWN
  const gridColor  = isDark ? '#3e2723' : '#f0ebe5'

  const options = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { width: [0, 0, 3], curve: 'smooth' },
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 4 } },
    fill: { opacity: [0.85, 0.85, 1] },
    colors: ['#f59e0b', '#92400e', RED],
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { colors: labelColor, fontSize: '11px' } },
    },
    yaxis: {
      labels: {
        formatter: v => {
          if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}M`
          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}jt`
          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
          return String(v)
        },
        style: { colors: labelColor, fontSize: '11px' },
      },
    },
    grid: { borderColor: gridColor },
    legend: {
      position: 'top',
      labels: { colors: labelColor },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: v => formatRupiah(v) },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
  }

  const series = [
    { name: 'Harga Jual', type: 'bar', data: seriesHJ },
    { name: 'COGS', type: 'bar', data: seriesCogs },
    { name: 'Rugi', type: 'line', data: seriesRugi },
  ]

  return (
    <ChartCard title="Trend Rugi per Bulan">
      <ReactApexChart type="line" series={series} options={options} height={280} />
    </ChartCard>
  )
}

/* ─── Rugi Table ─── */
export function RugiTable({ data, loading }) {
  const { user } = useAuth()
  const canSeeCogs = user?.role !== 'USER'

  if (loading) return (
    <ChartCard title="Ringkasan Rugi per Bulan">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  if (!data?.length) return (
    <ChartCard title="Ringkasan Rugi per Bulan">
      <div className="h-24 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-sm font-medium">
        Tidak ada item rugi — bagus!
      </div>
    </ChartCard>
  )

  const totalHJ     = data.reduce((s, d) => s + d.totalHargaJual, 0)
  const totalCogs   = data.reduce((s, d) => s + d.totalCogs, 0)
  const totalRugi   = data.reduce((s, d) => s + d.totalRugi, 0)
  const totalJumlah = data.reduce((s, d) => s + d.jumlah, 0)
  const totalSelisih = totalCogs > 0 ? ((totalRugi / totalCogs) * 100) : 0

  const rows = [...data].reverse()

  return (
    <ChartCard title="Ringkasan Rugi per Bulan">
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brown-100 dark:border-brown-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Bulan</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Item</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Harga Jual</th>
              {canSeeCogs && (
                <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">COGS</th>
              )}
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Rugi</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-brown-500 dark:text-brown-400 uppercase tracking-wide">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => {
              const pct = d.totalCogs > 0 ? (d.totalRugi / d.totalCogs) * 100 : 0
              return (
                <tr key={d.bulan} className={`border-b border-brown-50 dark:border-brown-800 transition-colors hover:bg-red-50/30 dark:hover:bg-red-900/10 ${i === 0 ? 'bg-red-50/20 dark:bg-red-900/5' : ''}`}>
                  <td className="py-2.5 px-3 font-medium text-brown-700 dark:text-gold-200 whitespace-nowrap">
                    {i === 0 && <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full mr-1.5 font-semibold">Terbaru</span>}
                    {formatBulan(d.bulan)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-brown-600 dark:text-brown-300">{d.jumlah}</td>
                  <td className="py-2.5 px-3 text-right text-brown-700 dark:text-brown-200 whitespace-nowrap">{formatRupiah(d.totalHargaJual)}</td>
                  {canSeeCogs && (
                    <td className="py-2.5 px-3 text-right text-brown-500 dark:text-brown-400 whitespace-nowrap">{formatRupiah(d.totalCogs)}</td>
                  )}
                  <td className="py-2.5 px-3 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                    -{formatRupiah(d.totalRugi)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                      <TrendingDown className="w-3 h-3" />
                      {pct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-brown-200 dark:border-brown-600 bg-brown-50 dark:bg-brown-800/50">
              <td className="py-2.5 px-3 font-bold text-brown-800 dark:text-gold-300">Total</td>
              <td className="py-2.5 px-3 text-right font-bold text-brown-700 dark:text-brown-200">{totalJumlah}</td>
              <td className="py-2.5 px-3 text-right font-bold text-brown-700 dark:text-brown-200 whitespace-nowrap">{formatRupiah(totalHJ)}</td>
              {canSeeCogs && (
                <td className="py-2.5 px-3 text-right font-bold text-brown-500 dark:text-brown-400 whitespace-nowrap">{formatRupiah(totalCogs)}</td>
              )}
              <td className="py-2.5 px-3 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">-{formatRupiah(totalRugi)}</td>
              <td className="py-2.5 px-3 text-right">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <TrendingDown className="w-3 h-3" />
                  {totalSelisih.toFixed(1)}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ChartCard>
  )
}

/* ─── Top Profit Chart ─── */
export function TopProfitChart({ data, loading }) {
  const { isDark } = useTheme()
  if (loading || !data?.length) return (
    <ChartCard title="Top 10 Profit Tertinggi">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  const categories = data.map(d => d.nomorSbg)
  const series = [{ name: 'Profit', data: data.map(d => parseFloat(d.profit || 0)) }]

  const options = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    colors: [GOLD],
    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { formatter: v => formatRupiah(v), style: { colors: isDark ? LIGHT_GOLD : BROWN, fontSize: '11px' } },
    },
    yaxis: { labels: { style: { colors: isDark ? LIGHT_GOLD : BROWN, fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#3e2723' : '#f0ebe5' },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: { y: { formatter: v => formatRupiah(v) } },
  }

  return (
    <ChartCard title="Top 10 Profit Tertinggi">
      <ReactApexChart type="bar" series={series} options={options} height={280} />
    </ChartCard>
  )
}

/* ─── Top Harga Jual Chart ─── */
export function TopHargaJualChart({ data, loading }) {
  const { isDark } = useTheme()
  if (loading || !data?.length) return (
    <ChartCard title="Top 10 Harga Jual Tertinggi">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  const categories = data.map(d => d.nomorSbg)
  const series = [{ name: 'Harga Jual', data: data.map(d => parseFloat(d.hargaJual || 0)) }]

  const options = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false } },
    colors: [BROWN],
    plotOptions: { bar: { horizontal: true, borderRadius: 6 } },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { formatter: v => formatRupiah(v), style: { colors: isDark ? LIGHT_GOLD : BROWN, fontSize: '11px' } },
    },
    yaxis: { labels: { style: { colors: isDark ? LIGHT_GOLD : BROWN, fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#3e2723' : '#f0ebe5' },
    theme: { mode: isDark ? 'dark' : 'light' },
    tooltip: { y: { formatter: v => formatRupiah(v) } },
  }

  return (
    <ChartCard title="Top 10 Harga Jual Tertinggi">
      <ReactApexChart type="bar" series={series} options={options} height={280} />
    </ChartCard>
  )
}

/* ─── Trend Harian Chart ─── */
export function TrendHarianChart({ data, loading }) {
  const { isDark } = useTheme()
  if (loading || !data?.length) return (
    <ChartCard title="Trend Barang Masuk">
      <EmptyState loading={loading} />
    </ChartCard>
  )

  const categories = data.map(d => d.tanggal)
  const series = [{ name: 'Jumlah Barang', data: data.map(d => Number(d.jumlah)) }]

  const options = {
    chart: { type: 'area', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false } },
    colors: [GOLD],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { colors: isDark ? LIGHT_GOLD : BROWN, fontSize: '10px' }, rotate: -30 },
      tickAmount: Math.min(data.length, 8),
    },
    yaxis: { labels: { style: { colors: isDark ? LIGHT_GOLD : BROWN, fontSize: '11px' } } },
    grid: { borderColor: isDark ? '#3e2723' : '#f0ebe5' },
    theme: { mode: isDark ? 'dark' : 'light' },
  }

  return (
    <ChartCard title="Trend Barang Masuk">
      <ReactApexChart type="area" series={series} options={options} height={220} />
    </ChartCard>
  )
}
