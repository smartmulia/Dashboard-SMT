import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import { formatDateTime } from '../utils/format'
import { RefreshCw, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewLog, setViewLog] = useState(null)

  const fetchLogs = async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/audit', { params: { page, limit: 50, search, startDate, endDate } })
      setLogs(data.data)
      setPagination(data.pagination)
    } catch { toast.error('Gagal memuat audit log') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [search, startDate, endDate])

  const getActivityColor = (act) => {
    if (act.includes('LOGIN')) return 'badge-success'
    if (act.includes('LOGOUT')) return 'badge-gray'
    if (act.includes('HAPUS') || act.includes('DELETE')) return 'badge-danger'
    if (act.includes('TAMBAH') || act.includes('CREATE') || act.includes('BUAT')) return 'badge-info'
    if (act.includes('EDIT') || act.includes('UPDATE')) return 'badge-warning'
    if (act.includes('APPROVE')) return 'badge-success'
    if (act.includes('REJECT')) return 'badge-danger'
    if (act.includes('IMPORT')) return 'badge-gold'
    if (act.includes('EXPORT') || act.includes('CETAK')) return 'badge-gold'
    return 'badge-gray'
  }

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-40 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari user atau aktivitas..." className="input-field pl-9" />
        </div>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-40" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field w-40" />
        <button onClick={() => fetchLogs()} className="btn-outline p-2.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full sticky-table">
            <thead>
              <tr>
                <th className="table-header">Waktu</th>
                <th className="table-header">User</th>
                <th className="table-header">Aktivitas</th>
                <th className="table-header">Tabel</th>
                <th className="table-header">IP Address</th>
                <th className="table-header text-center">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-brown-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat...
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-brown-400">Tidak ada log aktivitas</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gold-50/50 dark:hover:bg-brown-800/30 transition-colors">
                  <td className="table-cell text-sm text-brown-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td className="table-cell">
                    <p className="font-medium text-sm text-brown-800 dark:text-gold-200">{log.namaUser || '-'}</p>
                    {log.user?.role && <p className="text-xs text-brown-400">{log.user.role.replace('_', ' ')}</p>}
                  </td>
                  <td className="table-cell">
                    <span className={getActivityColor(log.aktivitas)}>{log.aktivitas}</span>
                  </td>
                  <td className="table-cell text-sm text-brown-500">{log.tabel || '-'}</td>
                  <td className="table-cell font-mono text-xs text-brown-400">{log.ipAddress || '-'}</td>
                  <td className="table-cell text-center">
                    {(log.dataLama || log.dataBaru) && (
                      <button onClick={() => setViewLog(log)} className="p-1.5 rounded-lg text-brown-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-brown-100 dark:border-brown-800">
          <p className="text-sm text-brown-500">{logs.length} dari {pagination.total} log</p>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-brown-200 dark:border-brown-700 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4 text-brown-500" />
            </button>
            <span className="text-sm text-brown-600 dark:text-brown-400">{pagination.page} / {pagination.totalPages}</span>
            <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg border border-brown-200 dark:border-brown-700 disabled:opacity-40">
              <ChevronRight className="w-4 h-4 text-brown-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!viewLog} onClose={() => setViewLog(null)} title="Detail Perubahan Data" size="lg">
        {viewLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm border-b border-brown-100 dark:border-brown-800 pb-4">
              <div><span className="text-brown-500">Aktivitas:</span> <span className="font-medium">{viewLog.aktivitas}</span></div>
              <div><span className="text-brown-500">User:</span> <span className="font-medium">{viewLog.namaUser}</span></div>
              <div><span className="text-brown-500">Tabel:</span> <span className="font-medium">{viewLog.tabel}</span></div>
              <div><span className="text-brown-500">Waktu:</span> <span className="font-medium">{formatDateTime(viewLog.createdAt)}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {viewLog.dataLama && (
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Data Lama</p>
                  <pre className="text-xs bg-red-50 dark:bg-red-900/20 rounded-xl p-3 overflow-x-auto text-red-700 dark:text-red-300 max-h-64">
                    {JSON.stringify(viewLog.dataLama, null, 2)}
                  </pre>
                </div>
              )}
              {viewLog.dataBaru && (
                <div>
                  <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Data Baru</p>
                  <pre className="text-xs bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 overflow-x-auto text-emerald-700 dark:text-emerald-300 max-h-64">
                    {JSON.stringify(viewLog.dataBaru, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
