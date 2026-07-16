const path = require('path');
const fs = require('fs');
const OSS = require('ali-oss');
const logger = require('./logger');

// ── Deteksi konfigurasi OSS ──
// Jika kredensial Alibaba Cloud OSS tersedia, gambar disimpan di cloud.
// Jika tidak, otomatis fallback ke penyimpanan disk lokal (uploads/).
const ossEnabled = !!(
  process.env.OSS_ACCESS_KEY_ID &&
  process.env.OSS_ACCESS_KEY_SECRET &&
  process.env.OSS_BUCKET &&
  (process.env.OSS_REGION || process.env.OSS_ENDPOINT)
);

let ossClient = null;
if (ossEnabled) {
  ossClient = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    ...(process.env.OSS_ENDPOINT && { endpoint: process.env.OSS_ENDPOINT }),
    secure: true,
  });
  logger.info(`Penyimpanan gambar: Alibaba Cloud OSS (bucket: ${process.env.OSS_BUCKET})`);
} else {
  logger.info('Penyimpanan gambar: disk lokal (uploads/) — kredensial OSS tidak ditemukan');
}

// Base URL publik untuk membangun URL gambar OSS.
// Jika tidak diisi, dibangun otomatis dari bucket + endpoint.
const ossPublicBase =
  process.env.OSS_PUBLIC_BASE_URL ||
  (ossEnabled && process.env.OSS_ENDPOINT
    ? process.env.OSS_ENDPOINT.replace('https://', `https://${process.env.OSS_BUCKET}.`)
    : null);

const LOCAL_ROOT = path.join(__dirname, '../..');

/**
 * Simpan file gambar (buffer dari multer memoryStorage).
 * @param {object} file - req.file dari multer (harus punya .buffer, .originalname, .mimetype)
 * @param {string} folder - subfolder tujuan (mis. 'katalog')
 * @returns {Promise<string>} URL/path gambar yang disimpan ke DB
 */
async function simpanGambar(file, folder = 'katalog') {
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `${folder}_${Date.now()}${ext}`;
  const key = `${folder}/${filename}`;

  if (ossEnabled) {
    await ossClient.put(key, file.buffer, {
      mime: file.mimetype,
      headers: {
        'Cache-Control': 'public, max-age=31536000',
        // Objek gambar dibuat publik agar bisa ditampilkan langsung di <img src>.
        // Bucket boleh tetap privat; ACL ini hanya berlaku per objek.
        'x-oss-object-acl': 'public-read',
      },
    });
    return `${ossPublicBase}/${key}`;
  }

  // Fallback disk lokal
  const dir = path.join(LOCAL_ROOT, 'uploads', folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/${folder}/${filename}`;
}

/**
 * Hapus gambar berdasarkan nilai yang tersimpan di DB.
 * Otomatis mengenali apakah gambar ada di OSS (URL penuh) atau disk lokal (/uploads/...).
 * @param {string} gambar - nilai kolom gambar dari DB
 */
async function hapusGambar(gambar) {
  if (!gambar) return;

  try {
    // Gambar OSS: URL penuh diawali base publik OSS
    if (ossPublicBase && gambar.startsWith(ossPublicBase)) {
      const key = gambar.slice(ossPublicBase.length + 1); // buang "base/"
      if (ossClient && key) await ossClient.delete(key);
      return;
    }
    // Gambar lokal: path relatif /uploads/...
    if (gambar.startsWith('/uploads/')) {
      const localPath = path.join(LOCAL_ROOT, gambar);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    }
  } catch (err) {
    // Kegagalan hapus gambar tidak boleh menggagalkan operasi utama
    logger.error(`Gagal menghapus gambar "${gambar}": ${err.message}`);
  }
}

module.exports = { simpanGambar, hapusGambar, ossEnabled };
