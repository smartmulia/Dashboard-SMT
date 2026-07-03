require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(__dirname, 'uploads/katalog');

// Buat folder jika belum ada
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── CRC32 & PNG builder ─────────────────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
const crc32 = (data) => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};
const chunk = (type, data) => {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
};

function createPNG(w, h, pixels) {
  // pixels = array of {x,y,r,g,b} or solid color {r,g,b}
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  const raw = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter byte: None
    for (let x = 0; x < w; x++) {
      const px = pixels(x, y, w, h);
      raw.push(px.r, px.g, px.b);
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.from(raw))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Gambar sederhana ────────────────────────────────────────────────────────
function gambarEmas(x, y, w, h) {
  // Gradient gold: atas terang, bawah gelap
  const ratio = y / h;
  return { r: 255, g: Math.floor(200 - ratio * 60), b: Math.floor(30 - ratio * 30) };
}

function gambarCincin(x, y, w, h) {
  // Lingkaran di tengah (cincin)
  const cx = w / 2, cy = h / 2;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const outerR = w * 0.42, innerR = w * 0.25;
  if (dist > outerR) return { r: 245, g: 240, b: 230 }; // background krem
  if (dist < innerR) return { r: 245, g: 240, b: 230 }; // lubang cincin
  return { r: 255, g: Math.floor(210 - (dist / outerR) * 30), b: 0 }; // cincin emas
}

function gambarKalung(x, y, w, h) {
  // Garis melengkung (kalung)
  const cx = w / 2;
  const curvY = h * 0.6 - Math.pow((x - cx) / (w * 0.4), 2) * h * 0.3;
  const dist = Math.abs(y - curvY);
  if (dist < 5) return { r: 255, g: 200, b: 0 };
  if (dist < 9) return { r: 200, g: 150, b: 0 };
  return { r: 245, g: 240, b: 230 };
}

function gambarLM(x, y, w, h) {
  // Batangan emas (persegi panjang rounded)
  const pad = w * 0.12;
  const inBar = x > pad && x < w - pad && y > h * 0.25 && y < h * 0.75;
  if (!inBar) return { r: 230, g: 225, b: 215 };
  // gradient horizontal
  const ratio = (x - pad) / (w - 2 * pad);
  const shine = ratio < 0.5 ? ratio * 2 : 2 - ratio * 2;
  return {
    r: Math.min(255, Math.floor(200 + shine * 55)),
    g: Math.min(255, Math.floor(160 + shine * 50)),
    b: Math.floor(shine * 20),
  };
}

function gambarAnting(x, y, w, h) {
  // Dua lingkaran kecil (anting)
  const y1 = h * 0.35, y2 = h * 0.65;
  const cx = w / 2;
  const r1 = Math.sqrt((x - cx) ** 2 + (y - y1) ** 2);
  const r2 = Math.sqrt((x - cx) ** 2 + (y - y2) ** 2);
  const R = w * 0.2;
  if (r1 < R || r2 < R) return { r: 255, g: 200, b: 0 };
  return { r: 245, g: 240, b: 230 };
}

// ── Simpan gambar ────────────────────────────────────────────────────────────
function savePNG(name, fn) {
  const filePath = path.join(UPLOADS_DIR, name);
  const buf = createPNG(200, 200, fn);
  fs.writeFileSync(filePath, buf);
  return `/uploads/katalog/${name}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Membuat gambar demo...');
  const g1 = savePNG('demo_cincin.png', gambarCincin);
  const g2 = savePNG('demo_kalung.png', gambarKalung);
  const g3 = savePNG('demo_anting.png', gambarAnting);
  const g4 = savePNG('demo_lm.png', gambarLM);
  const g5 = savePNG('demo_gelang.png', gambarEmas);
  console.log('Gambar berhasil dibuat:', [g1, g2, g3, g4, g5]);

  console.log('Memasukkan data demo ke database...');
  const demos = [
    {
      kategori: 'PERHIASAN', jenisBarang: 'Cincin', nama: 'Cincin Emas Polos 18K',
      deskripsi: 'Cincin emas kuning 18 karat, berat 3gr. Cocok untuk sehari-hari.',
      harga: 2850000, gambar: g1, tersedia: true, urutan: 1,
    },
    {
      kategori: 'PERHIASAN', jenisBarang: 'Kalung', nama: 'Kalung Emas Choker 24K',
      deskripsi: 'Kalung emas 24 karat, panjang 40cm, berat 5gr.',
      harga: 5200000, gambar: g2, tersedia: true, urutan: 2,
    },
    {
      kategori: 'PERHIASAN', jenisBarang: 'Anting', nama: 'Anting Emas Bulat 18K',
      deskripsi: 'Anting emas kuning 18 karat. Sepasang, berat total 2gr.',
      harga: 1900000, gambar: g3, tersedia: true, urutan: 3,
    },
    {
      kategori: 'PERHIASAN', jenisBarang: 'Gelang', nama: 'Gelang Emas Polos 22K',
      deskripsi: 'Gelang emas 22 karat, desain minimalis, berat 4gr.',
      harga: 3700000, gambar: g5, tersedia: true, urutan: 4,
    },
    {
      kategori: 'LM', jenisBarang: 'LM 1gr', nama: 'Logam Mulia Antam 1 Gram',
      deskripsi: 'LM Antam 999.9 fine gold. Dilengkapi sertifikat resmi.',
      harga: 1150000, gambar: g4, tersedia: true, urutan: 1,
    },
    {
      kategori: 'LM', jenisBarang: 'LM 5gr', nama: 'Logam Mulia Antam 5 Gram',
      deskripsi: 'LM Antam 999.9 fine gold. Dilengkapi sertifikat resmi.',
      harga: 5500000, gambar: g4, tersedia: true, urutan: 2,
    },
    {
      kategori: 'LM', jenisBarang: 'LM 10gr', nama: 'Logam Mulia Antam 10 Gram',
      deskripsi: 'LM Antam 999.9 fine gold. Dilengkapi sertifikat resmi.',
      harga: 10800000, gambar: g4, tersedia: true, urutan: 3,
    },
  ];

  for (const item of demos) {
    await prisma.katalogEmas.create({ data: item });
    console.log(`  ✓ ${item.nama}`);
  }

  console.log('\nSelesai! Buka http://localhost:5173/katalog untuk melihat hasilnya.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
