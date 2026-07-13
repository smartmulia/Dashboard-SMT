import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Modal from '../components/UI/Modal'
import { useAuth } from '../contexts/AuthContext'
import { formatRupiah, formatDate, formatDateTime, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, PERUSAHAAN_LABELS } from '../utils/format'
import { Plus, Eye, Printer, CheckCircle, XCircle, Clock, Send, Download, RefreshCw, ChevronLeft, ChevronRight, Search, CheckSquare, Square, Trash2, Ban, PackagePlus } from 'lucide-react'
import { downloadInvoicePDF, printInvoicePDF } from '../utils/pdfInvoice'

const STATUS_FILTER = [
  { value: '', label: 'Semua Status' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'WAITING_APPROVAL', label: 'Menunggu Approval' },
  { value: 'APPROVED', label: 'Disetujui' },
  { value: 'REJECTED', label: 'Ditolak' },
  { value: 'PRINTED', label: 'Dicetak' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
]

// Pemilih barang BELUM_TERJUAL (dipakai modal Buat & Ubah barang invoice).
// Pencarian & filter grade dilakukan server-side; daftar dibatasi 100 hasil teratas.
function ItemPicker({ selectedItems, totalSelected, gradeFilter, setGradeFilter, itemSearch, setItemSearch, pilihSemua, batalSemua, pilihGrade, filteredItems, toggleItem, itemsLoading }) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="label mb-0">Pilih Barang <span className="text-brown-400 font-normal">(Status: Belum Terjual)</span></p>
        <span className="text-sm text-gold-600 dark:text-gold-400 font-semibold">
          {selectedItems.length} dipilih · {formatRupiah(totalSelected)}
        </span>
      </div>

      {/* Filter & aksi toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {/* Grade filter tabs */}
        <div className="flex gap-1">
          {['', 'A', 'B', 'C', 'D'].map(g => (
            <button key={g || 'all'} type="button" onClick={() => setGradeFilter(g)}
              className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                gradeFilter === g
                  ? 'bg-gold-500 text-white'
                  : 'bg-brown-100 dark:bg-brown-800 text-brown-600 dark:text-brown-400 hover:bg-brown-200 dark:hover:bg-brown-700'
              }`}>
              {g || 'Semua'}
            </button>
          ))}
        </div>

        {/* Search (server-side) */}
        <div className="relative flex-1 min-w-32">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-brown-400" />
          <input value={itemSearch} onChange={e => setItemSearch(e.target.value)}
            placeholder="Cari SBG / jenis / detail..."
            className="w-full pl-6 pr-2 py-1 text-xs border border-brown-200 dark:border-brown-700 rounded-lg bg-white dark:bg-brown-900 text-brown-800 dark:text-brown-200 focus:outline-none focus:ring-1 focus:ring-gold-400" />
        </div>

        {/* Pilih / batal */}
        <button type="button" onClick={pilihSemua}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium transition-colors">
          <CheckSquare className="w-3 h-3" /> Pilih Hasil
        </button>
        <button type="button" onClick={batalSemua}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors">
          <Square className="w-3 h-3" /> Batal Hasil
        </button>
      </div>

      {/* Pilih sesuai Grade quick-select */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <span className="text-xs text-brown-500 dark:text-brown-400">Pilih semua grade:</span>
        {[
          { g: 'A', cls: 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
          { g: 'B', cls: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
          { g: 'C', cls: 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
          { g: 'D', cls: 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        ].map(({ g, cls }) => (
          <button key={g} type="button" onClick={() => pilihGrade(g)}
            className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${cls}`}>
            Grade {g}
          </button>
        ))}
      </div>

      {/* Daftar barang */}
      <div className="max-h-52 overflow-y-auto border border-brown-100 dark:border-brown-700 rounded-xl">
        {itemsLoading ? (
          <p className="text-center py-8 text-brown-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat barang...
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center py-8 text-brown-400 text-sm">
            {itemSearch || gradeFilter ? 'Tidak ada barang sesuai pencarian' : 'Tidak ada barang tersedia'}
          </p>
        ) : filteredItems.map(item => {
          const sel = selectedItems.find(i => i.id === item.id)
          return (
            <div key={item.id} onClick={() => toggleItem(item)}
              className={`flex items-center gap-3 p-3 cursor-pointer border-b border-brown-50 dark:border-brown-800 hover:bg-gold-50/50 dark:hover:bg-brown-800/30 transition-colors ${sel ? 'bg-gold-50 dark:bg-gold-900/10' : ''}`}>
              <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${sel ? 'bg-gold-500 border-gold-500' : 'border-brown-300 dark:border-brown-600'}`}>
                {sel && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brown-800 dark:text-gold-200">{item.nomorSbg} — {item.jenisBarang}</p>
                <p className="text-xs text-brown-500 truncate">{item.detailBarang}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-brown-800 dark:text-gold-300">{formatRupiah(item.totalHarga)}</p>
                <span className={`text-xs font-medium ${item.grade === 'A' ? 'text-emerald-600' : item.grade === 'B' ? 'text-blue-600' : item.grade === 'C' ? 'text-amber-600' : 'text-red-600'}`}>Grade {item.grade}</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-brown-400 mt-1">Menampilkan maksimal 100 barang. Gunakan pencarian untuk menemukan barang lain — barang yang sudah dipilih tetap tersimpan meski berpindah pencarian.</p>
    </div>
  )
}

export default function Invoice() {
  const { canApprove, user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  const [showCreate, setShowCreate] = useState(false)
  const [viewInvoice, setViewInvoice] = useState(null)
  const [showApprove, setShowApprove] = useState(null)
  const [showReject, setShowReject] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showDelete, setShowDelete] = useState(null)
  const [showCancel, setShowCancel] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [editItemsInvoice, setEditItemsInvoice] = useState(null)

  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState([])
  const [gradeFilter, setGradeFilter] = useState('')
  const [itemSearch, setItemSearch] = useState('')
  const [form, setForm] = useState({ namaCustomer: '', noTelepon: '', tanggalInvoice: new Date().toISOString().split('T')[0], perusahaan: 'SERBA_MAS', catatan: '' })
  const [formLoading, setFormLoading] = useState(false)

  const fetchInvoices = async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/invoices', { params: { page, limit: 20, status: statusFilter, search } })
      setInvoices(data.data)
      setPagination(data.pagination)
    } catch { toast.error('Gagal memuat invoice') }
    finally { setLoading(false) }
  }

  // Ambil barang BELUM_TERJUAL dari server (pencarian & grade dilakukan server-side, M-05).
  // Hanya barang dengan harga jual > 0 yang bisa masuk invoice.
  const fetchItems = async ({ search: q = '', grade = '' } = {}) => {
    setItemsLoading(true)
    try {
      const { data } = await api.get('/items', {
        params: { status: 'BELUM_TERJUAL', search: q, grade, limit: 100, sortBy: 'nomorSbg', sortOrder: 'asc' },
      })
      setItems((data.data || []).filter(i => i.hargaJual && parseFloat(i.hargaJual) > 0))
    } catch {} finally { setItemsLoading(false) }
  }

  useEffect(() => { fetchInvoices() }, [statusFilter, search])

  // Debounce pencarian/grade barang saat salah satu modal pemilih barang terbuka
  useEffect(() => {
    if (!showCreate && !editItemsInvoice) return
    const t = setTimeout(() => { fetchItems({ search: itemSearch, grade: gradeFilter }) }, 350)
    return () => clearTimeout(t)
  }, [itemSearch, gradeFilter, showCreate, editItemsInvoice])

  const openCreate = async () => {
    setSelectedItems([])
    setGradeFilter('')
    setItemSearch('')
    setForm({ namaCustomer: '', noTelepon: '', tanggalInvoice: new Date().toISOString().split('T')[0], perusahaan: 'SERBA_MAS', catatan: '' })
    setShowCreate(true)
    fetchItems()
  }

  const openEditItems = async (inv) => {
    setGradeFilter('')
    setItemSearch('')
    try {
      // Ambil invoice lengkap untuk memuat item yang sudah ada sebagai pilihan awal
      const { data } = await api.get(`/invoices/${inv.id}`)
      const existing = (data.data.items || []).map(it => ({
        id: it.elektronikId,
        nomorSbg: it.nomorSbg,
        jenisBarang: it.jenisBarang,
        detailBarang: it.detailBarang,
        hargaJual: it.hargaJual,
        ppn: it.ppn,
        totalHarga: it.totalHarga,
        grade: it.elektronik?.grade,
      }))
      setSelectedItems(existing)
      setEditItemsInvoice(data.data)
      fetchItems()
    } catch { toast.error('Gagal memuat data invoice') }
  }

  const toggleItem = (item) => {
    setSelectedItems(prev =>
      prev.find(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
    )
  }

  // Server sudah memfilter grade & pencarian; daftar tampil = items
  const filteredItems = items

  const pilihSemua = () => {
    const toAdd = filteredItems.filter(i => !selectedItems.find(s => s.id === i.id))
    setSelectedItems(prev => [...prev, ...toAdd])
  }

  const batalSemua = () => {
    const filteredIds = new Set(filteredItems.map(i => i.id))
    setSelectedItems(prev => prev.filter(i => !filteredIds.has(i.id)))
  }

  // Pilih seluruh barang satu grade (ambil penuh dari server, bukan hanya yang tampil)
  const pilihGrade = async (grade) => {
    try {
      const { data } = await api.get('/items', {
        params: { status: 'BELUM_TERJUAL', grade, limit: 1000, sortBy: 'nomorSbg', sortOrder: 'asc' },
      })
      const gradeItems = (data.data || [])
        .filter(i => i.hargaJual && parseFloat(i.hargaJual) > 0)
        .filter(i => !selectedItems.find(s => s.id === i.id))
      setSelectedItems(prev => [...prev, ...gradeItems])
    } catch { toast.error('Gagal memilih grade') }
  }

  const handleUpdateItems = async () => {
    if (!selectedItems.length) return toast.error('Pilih minimal 1 barang')
    setFormLoading(true)
    try {
      await api.put(`/invoices/${editItemsInvoice.id}/items`, { itemIds: selectedItems.map(i => i.id) })
      toast.success('Daftar barang invoice berhasil diperbarui')
      setEditItemsInvoice(null)
      fetchInvoices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui barang')
    } finally { setFormLoading(false) }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!selectedItems.length) return toast.error('Pilih minimal 1 barang')
    setFormLoading(true)
    try {
      const { data } = await api.post('/invoices', { ...form, itemIds: selectedItems.map(i => i.id) })
      toast.success(data.message || 'Invoice berhasil dibuat')
      setShowCreate(false)
      fetchInvoices()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membuat invoice')
    } finally { setFormLoading(false) }
  }

  const handleSubmit = async (id) => {
    try {
      await api.post(`/invoices/${id}/submit`)
      toast.success('Invoice berhasil disubmit untuk approval')
      fetchInvoices()
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal submit') }
  }

  const handleApprove = async () => {
    try {
      await api.post(`/invoices/${showApprove.id}/approve`)
      toast.success('Invoice berhasil disetujui')
      setShowApprove(null)
      fetchInvoices()
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal approve') }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Alasan penolakan wajib diisi')
    try {
      await api.post(`/invoices/${showReject.id}/reject`, { alasan: rejectReason })
      toast.success('Invoice ditolak')
      setShowReject(null)
      setRejectReason('')
      fetchInvoices()
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal reject') }
  }

  const handlePrint = async (invoice) => {
    try {
      const { data } = await api.get(`/invoices/${invoice.id}`)
      const full = data.data
      await api.put(`/invoices/${invoice.id}/print`)
      await printInvoicePDF(full)
      toast.success('Invoice dicetak')
      fetchInvoices()
    } catch (err) { toast.error('Gagal cetak invoice') }
  }

  const handleDownload = async (invoice) => {
    try {
      const { data } = await api.get(`/invoices/${invoice.id}`)
      await downloadInvoicePDF(data.data)
      toast.success('Invoice berhasil didownload')
    } catch { toast.error('Gagal download invoice') }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/invoices/${showDelete.id}`)
      toast.success('Invoice berhasil dihapus')
      setShowDelete(null)
      fetchInvoices()
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal hapus invoice') }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) return toast.error('Alasan pembatalan wajib diisi')
    try {
      await api.post(`/invoices/${showCancel.id}/cancel`, { alasan: cancelReason })
      toast.success('Invoice dibatalkan, barang dikembalikan ke Belum Terjual')
      setShowCancel(null)
      setCancelReason('')
      fetchInvoices()
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal batalkan invoice') }
  }

  const totalSelected = selectedItems.reduce((s, i) => s + parseFloat(i.totalHarga || 0), 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Buat Invoice
        </button>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nomor / customer..."
          className="input-field flex-1 min-w-40"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-44">
          {STATUS_FILTER.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => fetchInvoices()} className="btn-outline p-2.5">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full sticky-table">
            <thead>
              <tr>
                <th className="table-header">No. Invoice</th>
                <th className="table-header">Customer</th>
                <th className="table-header">No. Telepon</th>
                <th className="table-header">Perusahaan</th>
                <th className="table-header">Tanggal</th>
                <th className="table-header">Total</th>
                <th className="table-header">Status</th>
                <th className="table-header">Dibuat Oleh</th>
                <th className="table-header text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-brown-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" /> Memuat...
                </td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-brown-400">Tidak ada invoice</td></tr>
              ) : invoices.map(inv => {
                const grandTotal = inv.items?.reduce((s, i) => s + parseFloat(i.totalHarga || 0), 0) || 0
                return (
                  <tr key={inv.id} className="hover:bg-gold-50/50 dark:hover:bg-brown-800/30 transition-colors">
                    <td className="table-cell font-mono font-medium text-brown-800 dark:text-gold-300">{inv.nomorInvoice}</td>
                    <td className="table-cell font-medium">{inv.namaCustomer}</td>
                    <td className="table-cell text-brown-500">{inv.noTelepon}</td>
                    <td className="table-cell">
                      <span className={inv.perusahaan === 'VOLARY' ? 'badge-gold' : 'badge-info'}>{PERUSAHAAN_LABELS[inv.perusahaan]}</span>
                    </td>
                    <td className="table-cell text-sm text-brown-500">{formatDate(inv.tanggalInvoice)}</td>
                    <td className="table-cell text-right font-mono font-semibold">{formatRupiah(grandTotal)}</td>
                    <td className="table-cell">
                      <span className={INVOICE_STATUS_COLORS[inv.status]}>{INVOICE_STATUS_LABELS[inv.status]}</span>
                    </td>
                    <td className="table-cell text-sm text-brown-500">{inv.createdBy?.nama}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewInvoice(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Detail">
                          <Eye className="w-4 h-4" />
                        </button>
                        {['DRAFT', 'REJECTED'].includes(inv.status) && (
                          <button onClick={() => openEditItems(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-gold-600 hover:bg-gold-50 dark:hover:bg-gold-900/20" title="Ubah Barang">
                            <PackagePlus className="w-4 h-4" />
                          </button>
                        )}
                        {['DRAFT', 'REJECTED'].includes(inv.status) && (
                          <button onClick={() => handleSubmit(inv.id)} className="p-1.5 rounded-lg text-brown-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20" title="Submit Approval">
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {canApprove() && inv.status === 'WAITING_APPROVAL' && (
                          <>
                            <button onClick={() => setShowApprove(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Setujui">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setShowReject(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Tolak">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {inv.status === 'APPROVED' && (
                          <button onClick={() => handlePrint(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-brown-700 hover:bg-brown-50 dark:hover:bg-brown-800" title="Cetak">
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        {['APPROVED', 'PRINTED'].includes(inv.status) && (
                          <button onClick={() => handleDownload(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-gold-500 hover:bg-gold-50 dark:hover:bg-gold-900/20" title="Download PDF">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {inv.status === 'DRAFT' && (
                          <button onClick={() => setShowDelete(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Hapus Draft">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {canApprove() && ['APPROVED', 'PRINTED'].includes(inv.status) && (
                          <button onClick={() => setShowCancel(inv)} className="p-1.5 rounded-lg text-brown-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Batalkan Invoice">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-brown-100 dark:border-brown-800">
          <p className="text-sm text-brown-500">{invoices.length} dari {pagination.total} invoice</p>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchInvoices(pagination.page - 1)} disabled={pagination.page <= 1} className="p-1.5 rounded-lg border border-brown-200 dark:border-brown-700 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4 text-brown-500" />
            </button>
            <span className="text-sm text-brown-600 dark:text-brown-400">{pagination.page} / {pagination.totalPages}</span>
            <button onClick={() => fetchInvoices(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="p-1.5 rounded-lg border border-brown-200 dark:border-brown-700 disabled:opacity-40">
              <ChevronRight className="w-4 h-4 text-brown-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Buat Invoice Baru" size="xl"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-outline">Batal</button>
            <button onClick={handleCreate} disabled={formLoading} className="btn-primary">
              {formLoading ? 'Menyimpan...' : 'Buat Invoice'}
            </button>
          </>
        }>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Nomor Invoice</label>
              <input value="Otomatis dari sistem (INV-tahun-urut)" disabled className="input-field bg-brown-50 dark:bg-brown-800 text-brown-400 cursor-not-allowed" /></div>
            <div><label className="label">Tanggal Invoice *</label>
              <input type="date" value={form.tanggalInvoice} onChange={e => setForm(p => ({...p, tanggalInvoice: e.target.value}))} className="input-field" required /></div>
            <div><label className="label">Nama Customer *</label>
              <input value={form.namaCustomer} onChange={e => setForm(p => ({...p, namaCustomer: e.target.value}))} className="input-field" placeholder="Nama lengkap" required /></div>
            <div><label className="label">Nomor Telepon</label>
              <input value={form.noTelepon} onChange={e => setForm(p => ({...p, noTelepon: e.target.value}))} className="input-field" placeholder="08xxx (opsional)" /></div>
            <div><label className="label">Perusahaan</label>
              <select value={form.perusahaan} onChange={e => setForm(p => ({...p, perusahaan: e.target.value}))} className="input-field">
                <option value="SERBA_MAS">Serba Mas</option>
                <option value="VOLARY">Volary</option>
              </select></div>
            <div><label className="label">Catatan</label>
              <input value={form.catatan} onChange={e => setForm(p => ({...p, catatan: e.target.value}))} className="input-field" placeholder="Opsional" /></div>
          </div>

          <ItemPicker
            selectedItems={selectedItems} totalSelected={totalSelected}
            gradeFilter={gradeFilter} setGradeFilter={setGradeFilter}
            itemSearch={itemSearch} setItemSearch={setItemSearch}
            pilihSemua={pilihSemua} batalSemua={batalSemua} pilihGrade={pilihGrade}
            filteredItems={filteredItems} toggleItem={toggleItem} itemsLoading={itemsLoading}
          />
        </div>
      </Modal>

      {/* Edit Items Modal (invoice DRAFT/REJECTED) */}
      <Modal isOpen={!!editItemsInvoice} onClose={() => setEditItemsInvoice(null)} title={`Ubah Barang — ${editItemsInvoice?.nomorInvoice}`} size="xl"
        footer={
          <>
            <button onClick={() => setEditItemsInvoice(null)} className="btn-outline">Batal</button>
            <button onClick={handleUpdateItems} disabled={formLoading} className="btn-primary">
              {formLoading ? 'Menyimpan...' : 'Simpan Barang'}
            </button>
          </>
        }>
        <ItemPicker
          selectedItems={selectedItems} totalSelected={totalSelected}
          gradeFilter={gradeFilter} setGradeFilter={setGradeFilter}
          itemSearch={itemSearch} setItemSearch={setItemSearch}
          pilihSemua={pilihSemua} batalSemua={batalSemua} pilihGrade={pilihGrade}
          filteredItems={filteredItems} toggleItem={toggleItem} itemsLoading={itemsLoading}
        />
      </Modal>

      {/* View Invoice Modal */}
      <Modal isOpen={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice — ${viewInvoice?.nomorInvoice}`} size="lg">
        {viewInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Customer', viewInvoice.namaCustomer],
                ['Telepon', viewInvoice.noTelepon],
                ['Tanggal', formatDate(viewInvoice.tanggalInvoice)],
                ['Perusahaan', PERUSAHAAN_LABELS[viewInvoice.perusahaan]],
                ['Dibuat oleh', viewInvoice.createdBy?.nama],
                ['Status', INVOICE_STATUS_LABELS[viewInvoice.status]],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-brown-50 dark:border-brown-800 pb-2">
                  <span className="text-brown-500">{k}</span>
                  <span className="font-medium text-brown-800 dark:text-gold-200">{v}</span>
                </div>
              ))}
            </div>
            {viewInvoice.items?.length > 0 && (
              <div>
                <p className="font-semibold text-brown-700 dark:text-gold-300 mb-2 text-sm">Daftar Barang</p>
                <table className="w-full text-sm">
                  <thead><tr className="bg-brown-50 dark:bg-brown-800/50">
                    <th className="table-header">SBG</th><th className="table-header">Jenis</th>
                    <th className="table-header text-right">Harga Jual</th><th className="table-header text-right">PPN</th>
                    <th className="table-header text-right">Total</th>
                  </tr></thead>
                  <tbody>
                    {viewInvoice.items.map(i => (
                      <tr key={i.id} className="border-b border-brown-50 dark:border-brown-800">
                        <td className="py-2 px-4 font-mono">{i.nomorSbg}</td>
                        <td className="py-2 px-4">{i.jenisBarang}</td>
                        <td className="py-2 px-4 text-right">{formatRupiah(i.hargaJual)}</td>
                        <td className="py-2 px-4 text-right text-brown-500">{formatRupiah(i.ppn)}</td>
                        <td className="py-2 px-4 text-right font-semibold">{formatRupiah(i.totalHarga)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gold-50 dark:bg-gold-900/10 font-bold">
                      <td colSpan={4} className="py-2 px-4 text-right text-brown-700 dark:text-gold-300">Grand Total</td>
                      <td className="py-2 px-4 text-right text-brown-800 dark:text-gold-300">
                        {formatRupiah(viewInvoice.items.reduce((s, i) => s + parseFloat(i.totalHarga || 0), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {viewInvoice.approvedByNama && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-sm">
                <p className="text-emerald-700 dark:text-emerald-400 font-medium">Disetujui oleh: {viewInvoice.approvedByNama}</p>
                <p className="text-emerald-600 dark:text-emerald-500 text-xs">{formatDateTime(viewInvoice.approvedAt)}</p>
              </div>
            )}
            {viewInvoice.rejectedReason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-sm">
                <p className="text-red-700 dark:text-red-400 font-medium">Alasan penolakan:</p>
                <p className="text-red-600 dark:text-red-500">{viewInvoice.rejectedReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Approve Modal */}
      <Modal isOpen={!!showApprove} onClose={() => setShowApprove(null)} title="Setujui Invoice" size="sm"
        footer={
          <>
            <button onClick={() => setShowApprove(null)} className="btn-outline">Batal</button>
            <button onClick={handleApprove} className="btn-primary bg-emerald-600 hover:bg-emerald-700">Setujui</button>
          </>
        }>
        <p className="text-brown-700 dark:text-brown-300">Yakin ingin menyetujui invoice <strong>{showApprove?.nomorInvoice}</strong>?</p>
        <p className="text-sm text-brown-500 mt-2">Setelah disetujui, user dapat mencetak invoice ini.</p>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!showReject} onClose={() => { setShowReject(null); setRejectReason('') }} title="Tolak Invoice" size="sm"
        footer={
          <>
            <button onClick={() => { setShowReject(null); setRejectReason('') }} className="btn-outline">Batal</button>
            <button onClick={handleReject} className="btn-danger">Tolak</button>
          </>
        }>
        <p className="text-brown-700 dark:text-brown-300 mb-3">Invoice: <strong>{showReject?.nomorInvoice}</strong></p>
        <label className="label">Alasan Penolakan *</label>
        <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input-field" rows={3} placeholder="Masukkan alasan penolakan..." />
      </Modal>

      {/* Delete Draft Modal */}
      <Modal isOpen={!!showDelete} onClose={() => setShowDelete(null)} title="Hapus Invoice Draft" size="sm"
        footer={
          <>
            <button onClick={() => setShowDelete(null)} className="btn-outline">Batal</button>
            <button onClick={handleDelete} className="btn-danger">Hapus</button>
          </>
        }>
        <p className="text-brown-700 dark:text-brown-300">Yakin ingin menghapus invoice draft <strong>{showDelete?.nomorInvoice}</strong>?</p>
        <p className="text-sm text-brown-500 mt-2">Tindakan ini tidak dapat dibatalkan. Barang yang terdaftar akan kembali tersedia untuk invoice lain.</p>
      </Modal>

      {/* Cancel Approved Modal */}
      <Modal isOpen={!!showCancel} onClose={() => { setShowCancel(null); setCancelReason('') }} title="Batalkan Invoice" size="sm"
        footer={
          <>
            <button onClick={() => { setShowCancel(null); setCancelReason('') }} className="btn-outline">Kembali</button>
            <button onClick={handleCancel} className="btn-danger">Batalkan Invoice</button>
          </>
        }>
        <p className="text-brown-700 dark:text-brown-300 mb-2">Invoice: <strong>{showCancel?.nomorInvoice}</strong></p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">Semua barang pada invoice ini akan dikembalikan ke status <strong>Belum Terjual</strong>.</p>
        <label className="label">Alasan Pembatalan *</label>
        <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="input-field" rows={3} placeholder="Masukkan alasan pembatalan..." />
      </Modal>
    </div>
  )
}
