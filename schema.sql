-- ============================================================
-- Dashboard SMT — Database Schema
-- Engine  : MySQL 8.0+
-- Charset : utf8mb4
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Tabel: users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT             NOT NULL AUTO_INCREMENT,
  `nama`       VARCHAR(191)    NOT NULL,
  `email`      VARCHAR(191)    NOT NULL,
  `password`   VARCHAR(191)    NOT NULL,
  `role`       ENUM('ADMIN','SUPER_USER','USER','KATALOG_USER') NOT NULL DEFAULT 'USER',
  `is_active`  TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: notifikasi
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifikasi` (
  `id`         INT             NOT NULL AUTO_INCREMENT,
  `user_id`    INT             NOT NULL,
  `judul`      VARCHAR(191)    NOT NULL,
  `pesan`      TEXT            NOT NULL,
  `tipe`       VARCHAR(191)    NOT NULL,
  `invoice_id` INT             NULL,
  `dibaca`     TINYINT(1)      NOT NULL DEFAULT 0,
  `created_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `notifikasi_user_id_fk` (`user_id`),
  CONSTRAINT `notifikasi_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: elektronik
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `elektronik` (
  `id`                INT             NOT NULL AUTO_INCREMENT,
  `nomor_sbg`         VARCHAR(191)    NOT NULL,
  `grade`             ENUM('A','B','C','D') NOT NULL,
  `jenis_barang`      VARCHAR(191)    NOT NULL,
  `detail_barang`     VARCHAR(191)    NOT NULL,
  `keterangan`        TEXT            NULL,
  `cogs`              DECIMAL(15,2)   NOT NULL,
  `offering_pengepul` DECIMAL(15,2)   NULL,
  `harga_jual`        DECIMAL(15,2)   NULL,
  `ppn`               DECIMAL(15,2)   NULL,
  `total_harga`       DECIMAL(15,2)   NULL,
  `profit`            DECIMAL(15,2)   NULL,
  `status`            ENUM('BELUM_TERJUAL','TERJUAL') NOT NULL DEFAULT 'BELUM_TERJUAL',
  `perusahaan`        ENUM('VOLARY','SERBA_MAS')      NOT NULL DEFAULT 'SERBA_MAS',
  `tanggal_masuk`     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`        DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `elektronik_nomor_sbg_key` (`nomor_sbg`),
  KEY `elektronik_status_idx` (`status`),
  KEY `elektronik_perusahaan_idx` (`perusahaan`),
  KEY `elektronik_tanggal_masuk_idx` (`tanggal_masuk`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: invoices
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id`               INT             NOT NULL AUTO_INCREMENT,
  `nomor_invoice`    VARCHAR(191)    NOT NULL,
  `nama_customer`    VARCHAR(191)    NOT NULL,
  `no_telepon`       VARCHAR(191)    NULL,
  `tanggal_invoice`  DATETIME(3)     NOT NULL,
  `perusahaan`       ENUM('VOLARY','SERBA_MAS') NOT NULL DEFAULT 'SERBA_MAS',
  `status`           ENUM('DRAFT','WAITING_APPROVAL','APPROVED','REJECTED','PRINTED') NOT NULL DEFAULT 'DRAFT',
  `catatan`          TEXT            NULL,
  `approved_by_id`   INT             NULL,
  `approved_by_nama` VARCHAR(191)    NULL,
  `approved_at`      DATETIME(3)     NULL,
  `rejected_at`      DATETIME(3)     NULL,
  `rejected_reason`  TEXT            NULL,
  `printed_at`       DATETIME(3)     NULL,
  `created_by_id`    INT             NOT NULL,
  `created_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoices_nomor_invoice_key` (`nomor_invoice`),
  KEY `invoices_created_by_id_fk` (`created_by_id`),
  KEY `invoices_status_idx` (`status`),
  CONSTRAINT `invoices_created_by_id_fk`
    FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: invoice_items
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id`            INT             NOT NULL AUTO_INCREMENT,
  `invoice_id`    INT             NOT NULL,
  `elektronik_id` INT             NOT NULL,
  `nomor_sbg`     VARCHAR(191)    NOT NULL,
  `jenis_barang`  VARCHAR(191)    NOT NULL,
  `detail_barang` VARCHAR(191)    NOT NULL,
  `harga_jual`    DECIMAL(15,2)   NOT NULL,
  `ppn`           DECIMAL(15,2)   NOT NULL,
  `total_harga`   DECIMAL(15,2)   NOT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_items_invoice_id_fk` (`invoice_id`),
  KEY `invoice_items_elektronik_id_fk` (`elektronik_id`),
  CONSTRAINT `invoice_items_invoice_id_fk`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  CONSTRAINT `invoice_items_elektronik_id_fk`
    FOREIGN KEY (`elektronik_id`) REFERENCES `elektronik` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: audit_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         INT             NOT NULL AUTO_INCREMENT,
  `user_id`    INT             NULL,
  `nama_user`  VARCHAR(191)    NULL,
  `aktivitas`  VARCHAR(191)    NOT NULL,
  `tabel`      VARCHAR(191)    NULL,
  `data_lama`  JSON            NULL,
  `data_baru`  JSON            NULL,
  `ip_address` VARCHAR(191)    NULL,
  `created_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `audit_logs_user_id_fk` (`user_id`),
  CONSTRAINT `audit_logs_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: cabang
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cabang` (
  `id`         INT             NOT NULL AUTO_INCREMENT,
  `nama`       VARCHAR(191)    NOT NULL,
  `alamat`     TEXT            NULL,
  `aktif`      TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tabel: katalog_emas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `katalog_emas` (
  `id`           INT             NOT NULL AUTO_INCREMENT,
  `cabang_id`    INT             NULL,
  `kategori`     ENUM('PERHIASAN','LM') NOT NULL,
  `jenis_barang` VARCHAR(191)    NOT NULL,
  `nama`         VARCHAR(191)    NOT NULL,
  `deskripsi`    TEXT            NULL,
  `harga`        DECIMAL(15,2)   NOT NULL,
  `gambar`       VARCHAR(191)    NULL,
  `tersedia`     TINYINT(1)      NOT NULL DEFAULT 1,
  `urutan`       INT             NOT NULL DEFAULT 0,
  `created_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `katalog_emas_cabang_id_fk` (`cabang_id`),
  KEY `katalog_emas_tersedia_idx` (`tersedia`),
  CONSTRAINT `katalog_emas_cabang_id_fk`
    FOREIGN KEY (`cabang_id`) REFERENCES `cabang` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
