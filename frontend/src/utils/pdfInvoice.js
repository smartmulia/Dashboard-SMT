import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { formatRupiah, formatDate } from './format'

const LOGO_PATHS = {
  VOLARY: '/logos/logo-volary.png',
  SERBA_MAS: '/logos/logo-serbamas.png',
}

const COMPANY_INFO = {
  VOLARY: { nama: 'VOLARY', warna: '#C8963E' },
  SERBA_MAS: { nama: 'SERBA MAS TENTRAM', warna: '#4E342E' },
}

async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

export async function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const perusahaan = invoice.perusahaan || 'SERBA_MAS'
  const company = COMPANY_INFO[perusahaan]
  const primaryColor = [78, 52, 46]
  const goldColor = [212, 175, 55]

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 15

  // Load logo once — dipakai di header dan tanda tangan
  let logoBase64 = null
  try {
    logoBase64 = await loadImageAsBase64(LOGO_PATHS[perusahaan])
  } catch {}

  // Header background
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageW, 45, 'F')

  // Gold accent bar
  doc.setFillColor(...goldColor)
  doc.rect(0, 43, pageW, 2, 'F')

  // Logo di header (kiri atas)
  if (logoBase64) {
    if (perusahaan === 'VOLARY') {
      doc.addImage(logoBase64, 'PNG', margin, 5, 55, 35)
    } else {
      doc.addImage(logoBase64, 'PNG', margin, 4, 30, 37)
    }
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(company.nama, margin, 25)
  }

  // Invoice title on header
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('INVOICE', pageW - margin, 15, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`No: ${invoice.nomorInvoice}`, pageW - margin, 22, { align: 'right' })
  doc.text(`Tanggal: ${formatDate(invoice.tanggalInvoice)}`, pageW - margin, 28, { align: 'right' })

  // Customer info
  doc.setTextColor(78, 52, 46)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('KEPADA:', margin, 58)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(invoice.namaCustomer, margin, 64)
  if (invoice.noTelepon) {
    doc.text(`No. Telp: ${invoice.noTelepon}`, margin, 70)
  }

  // Perusahaan info
  doc.setFont('helvetica', 'bold')
  doc.text('DARI:', pageW / 2, 58)
  doc.setFont('helvetica', 'normal')
  doc.text(company.nama, pageW / 2, 64)

  // Divider
  doc.setDrawColor(...goldColor)
  doc.setLineWidth(0.5)
  doc.line(margin, 76, pageW - margin, 76)

  // Table — dengan kolom Nomor SBG untuk rekonsiliasi barang fisik
  const tableData = invoice.items.map((item, i) => [
    i + 1,
    item.nomorSbg || '-',
    item.jenisBarang,
    item.detailBarang,
    formatRupiah(item.hargaJual),
    formatRupiah(item.ppn),
    formatRupiah(item.totalHarga),
  ])

  doc.autoTable({
    startY: 80,
    head: [['No', 'No. SBG', 'Jenis Barang', 'Detail Barang', 'Harga Jual', 'PPN (1.1%)', 'Total Harga']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    alternateRowStyles: { fillColor: [250, 246, 240] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 22 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
    },
  })

  const finalY = doc.lastAutoTable.finalY + 8

  // Totals
  const totalHargaJual = invoice.items.reduce((s, i) => s + parseFloat(i.hargaJual || 0), 0)
  const totalPPN = invoice.items.reduce((s, i) => s + parseFloat(i.ppn || 0), 0)
  const grandTotal = invoice.items.reduce((s, i) => s + parseFloat(i.totalHarga || 0), 0)

  const totalsX = pageW - margin - 70
  doc.setFontSize(9)
  doc.setTextColor(78, 52, 46)
  doc.text('Subtotal Harga Jual:', totalsX, finalY)
  doc.text(formatRupiah(totalHargaJual), pageW - margin, finalY, { align: 'right' })
  doc.text('Total PPN (1.1%):', totalsX, finalY + 6)
  doc.text(formatRupiah(totalPPN), pageW - margin, finalY + 6, { align: 'right' })

  doc.setDrawColor(...goldColor)
  doc.setLineWidth(0.3)
  doc.line(totalsX, finalY + 8, pageW - margin, finalY + 8)

  doc.setFillColor(...goldColor)
  doc.setTextColor(...primaryColor)
  doc.roundedRect(totalsX - 2, finalY + 10, pageW - margin - totalsX + 2, 10, 2, 2, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('GRAND TOTAL:', totalsX + 1, finalY + 17)
  doc.text(formatRupiah(grandTotal), pageW - margin - 2, finalY + 17, { align: 'right' })

  // Catatan
  const signY = finalY + 28
  if (invoice.catatan) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Catatan: ${invoice.catatan}`, margin, signY)
  }

  // Area tanda tangan — urutan: "Disetujui oleh," → logo → nama approver
  const approvalX = pageW - margin - 60
  const approvalCenterX = approvalX + 30

  doc.setTextColor(78, 52, 46)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Disetujui oleh,', approvalCenterX, signY, { align: 'center' })

  if (logoBase64) {
    if (perusahaan === 'VOLARY') {
      // logo lebar 38mm, center di 60mm → offset 11
      doc.addImage(logoBase64, 'PNG', approvalX + 11, signY + 4, 38, 24)
    } else {
      // logo lebar 22mm, center di 60mm → offset 19
      doc.addImage(logoBase64, 'PNG', approvalX + 19, signY + 4, 22, 27)
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(invoice.approvedByNama || '_______________', approvalCenterX, signY + 36, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Tanggal: ${invoice.approvedAt ? formatDate(invoice.approvedAt) : '_______________'}`, approvalCenterX, signY + 42, { align: 'center' })

  // Footer
  doc.setFillColor(...primaryColor)
  doc.rect(0, pageH - 15, pageW, 15, 'F')
  doc.setFillColor(...goldColor)
  doc.rect(0, pageH - 17, pageW, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${company.nama} — Dokumen ini digenerate secara otomatis`, pageW / 2, pageH - 7, { align: 'center' })
  doc.text(`Dicetak: ${formatDate(new Date())}`, pageW - margin, pageH - 7, { align: 'right' })

  return doc
}

export async function printInvoicePDF(invoice) {
  const doc = await generateInvoicePDF(invoice)
  doc.autoPrint()
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export async function downloadInvoicePDF(invoice) {
  const doc = await generateInvoicePDF(invoice)
  doc.save(`Invoice-${invoice.nomorInvoice}.pdf`)
}
