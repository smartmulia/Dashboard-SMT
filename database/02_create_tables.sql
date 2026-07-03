-- ================================================================
-- DASHBOARD SMT ELEKTRONIK
-- Script 02: Buat Semua Tabel
-- ================================================================

USE `dashboard_smt`;

-- ================================================================
-- Nonaktifkan foreign key check sementara saat buat tabel
-- ================================================================
SET FOREIGN_KEY_CHECKS = 0;


-- ================================================================
-- TABEL 1: users
-- Menyimpan data seluruh pengguna sistem
-- ================================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `nama`       VARCHAR(150)  NOT NULL                       COMMENT 'Nama lengkap user',
  `email`      VARCHAR(150)  NOT NULL                       COMMENT 'Email untuk login (unique)',
  `password`   VARCHAR(255)  NOT NULL                       COMMENT 'Password (bcrypt hash)',
  `role`       ENUM(
                 'ADMIN',
                 'SUPER_USER',
                 'USER'
               )             NOT NULL DEFAULT 'USER'        COMMENT 'Hak akses user',
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 1             COMMENT '1=Aktif, 0=Nonaktif',
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE  KEY `uk_users_email`   (`email`),
  INDEX        `idx_users_role`  (`role`),
  INDEX        `idx_users_active`(`is_active`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel pengguna sistem Dashboard SMT';


-- ================================================================
-- TABEL 2: elektronik
-- Menyimpan data barang elektronik beserta harga & status
-- ================================================================
CREATE TABLE IF NOT EXISTS `elektronik` (
  `id`               INT              NOT NULL AUTO_INCREMENT,
  `nomor_sbg`        VARCHAR(100)     NOT NULL                       COMMENT 'Nomor SBG (Primary Key bisnis)',
  `grade`            ENUM('A','B','C','D')
                                      NOT NULL                       COMMENT 'Grade kualitas barang',
  `jenis_barang`     VARCHAR(200)     NOT NULL                       COMMENT 'Jenis/kategori barang (Laptop, HP, TV, dll)',
  `detail_barang`    VARCHAR(500)     NOT NULL                       COMMENT 'Detail lengkap barang (merk, tipe, spek)',
  `keterangan`       TEXT             NULL                           COMMENT 'Catatan tambahan',
  `cogs`             DECIMAL(15,2)    NOT NULL DEFAULT 0.00          COMMENT 'Cost of Goods Sold (modal)',
  `offering_pengepul`DECIMAL(15,2)   NULL                           COMMENT 'Harga penawaran dari pengepul',
  `harga_jual`       DECIMAL(15,2)   NULL                           COMMENT 'Harga jual sebelum pajak',
  `ppn`              DECIMAL(15,2)   NULL                           COMMENT 'PPN = Harga Jual × 1.1%',
  `total_harga`      DECIMAL(15,2)   NULL                           COMMENT 'Total = Harga Jual + PPN',
  `profit`           DECIMAL(15,2)   NULL                           COMMENT 'Profit = Harga Jual - COGS',
  `status`           ENUM(
                       'BELUM_TERJUAL',
                       'TERJUAL'
                     )                NOT NULL DEFAULT 'BELUM_TERJUAL' COMMENT 'Status penjualan barang',
  `perusahaan`       ENUM(
                       'VOLARY',
                       'SERBA_MAS'
                     )                NOT NULL DEFAULT 'SERBA_MAS'  COMMENT 'Perusahaan pemilik barang',
  `tanggal_masuk`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Tanggal barang masuk sistem',
  `created_at`       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE  KEY `uk_elektronik_nomor_sbg`    (`nomor_sbg`),
  INDEX        `idx_elektronik_grade`       (`grade`),
  INDEX        `idx_elektronik_status`      (`status`),
  INDEX        `idx_elektronik_perusahaan`  (`perusahaan`),
  INDEX        `idx_elektronik_jenis`       (`jenis_barang`),
  INDEX        `idx_elektronik_tgl_masuk`   (`tanggal_masuk`),
  INDEX        `idx_elektronik_harga_jual`  (`harga_jual`),
  INDEX        `idx_elektronik_profit`      (`profit`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel data barang elektronik';


-- ================================================================
-- TABEL 3: invoices
-- Menyimpan header invoice penjualan
-- ================================================================
CREATE TABLE IF NOT EXISTS `invoices` (
  `id`              INT              NOT NULL AUTO_INCREMENT,
  `nomor_invoice`   VARCHAR(100)     NOT NULL                       COMMENT 'Nomor invoice (unique)',
  `nama_customer`   VARCHAR(200)     NOT NULL                       COMMENT 'Nama pembeli',
  `no_telepon`      VARCHAR(20)      NOT NULL                       COMMENT 'Nomor telepon pembeli',
  `tanggal_invoice` DATE             NOT NULL                       COMMENT 'Tanggal invoice',
  `perusahaan`      ENUM(
                      'VOLARY',
                      'SERBA_MAS'
                    )                NOT NULL DEFAULT 'SERBA_MAS'  COMMENT 'Perusahaan yang mengeluarkan invoice',
  `status`          ENUM(
                      'DRAFT',
                      'WAITING_APPROVAL',
                      'APPROVED',
                      'REJECTED',
                      'PRINTED'
                    )                NOT NULL DEFAULT 'DRAFT'       COMMENT 'Status alur approval invoice',
  `catatan`         TEXT             NULL                           COMMENT 'Catatan invoice',

  -- Approval info
  `approved_by_id`  INT              NULL                           COMMENT 'ID Admin yang menyetujui',
  `approved_by_nama`VARCHAR(150)     NULL                           COMMENT 'Nama Admin yang menyetujui',
  `approved_at`     DATETIME         NULL                           COMMENT 'Waktu disetujui',

  -- Rejection info
  `rejected_at`     DATETIME         NULL                           COMMENT 'Waktu ditolak',
  `rejected_reason` TEXT             NULL                           COMMENT 'Alasan penolakan',

  -- Print info
  `printed_at`      DATETIME         NULL                           COMMENT 'Waktu dicetak',

  -- Audit
  `created_by_id`   INT              NOT NULL                       COMMENT 'FK ke users.id (pembuat invoice)',
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE  KEY `uk_invoices_nomor`           (`nomor_invoice`),
  INDEX        `idx_invoices_status`         (`status`),
  INDEX        `idx_invoices_perusahaan`     (`perusahaan`),
  INDEX        `idx_invoices_created_by`     (`created_by_id`),
  INDEX        `idx_invoices_tanggal`        (`tanggal_invoice`),
  INDEX        `idx_invoices_customer`       (`nama_customer`),

  CONSTRAINT `fk_invoices_created_by`
    FOREIGN KEY (`created_by_id`)
    REFERENCES  `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel header invoice penjualan';


-- ================================================================
-- TABEL 4: invoice_items
-- Menyimpan detail barang dalam setiap invoice
-- ================================================================
CREATE TABLE IF NOT EXISTS `invoice_items` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `invoice_id`   INT           NOT NULL                       COMMENT 'FK ke invoices.id',
  `elektronik_id`INT           NOT NULL                       COMMENT 'FK ke elektronik.id',

  -- Snapshot data saat invoice dibuat (tidak berubah walau data barang diubah)
  `nomor_sbg`    VARCHAR(100)  NOT NULL                       COMMENT 'Snapshot nomor SBG',
  `jenis_barang` VARCHAR(200)  NOT NULL                       COMMENT 'Snapshot jenis barang',
  `detail_barang`VARCHAR(500)  NOT NULL                       COMMENT 'Snapshot detail barang',
  `harga_jual`   DECIMAL(15,2) NOT NULL                       COMMENT 'Snapshot harga jual saat invoice',
  `ppn`          DECIMAL(15,2) NOT NULL DEFAULT 0.00          COMMENT 'Snapshot PPN saat invoice',
  `total_harga`  DECIMAL(15,2) NOT NULL DEFAULT 0.00          COMMENT 'Snapshot total harga saat invoice',

  PRIMARY KEY (`id`),
  INDEX `idx_inv_items_invoice`   (`invoice_id`),
  INDEX `idx_inv_items_elektronik`(`elektronik_id`),

  CONSTRAINT `fk_inv_items_invoice`
    FOREIGN KEY (`invoice_id`)
    REFERENCES  `invoices`(`id`)
    ON UPDATE CASCADE
    ON DELETE CASCADE,

  CONSTRAINT `fk_inv_items_elektronik`
    FOREIGN KEY (`elektronik_id`)
    REFERENCES  `elektronik`(`id`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel detail item per invoice';


-- ================================================================
-- TABEL 5: audit_logs
-- Menyimpan seluruh rekam jejak aktivitas sistem
-- ================================================================
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `user_id`    INT           NULL                            COMMENT 'FK ke users.id (nullable: bisa dari sistem)',
  `nama_user`  VARCHAR(150)  NULL                            COMMENT 'Snapshot nama user saat log dibuat',
  `aktivitas`  VARCHAR(300)  NOT NULL                        COMMENT 'Deskripsi aktivitas (LOGIN, TAMBAH DATA, dll)',
  `tabel`      VARCHAR(100)  NULL                            COMMENT 'Nama tabel yang diubah',
  `data_lama`  JSON          NULL                            COMMENT 'Data sebelum perubahan (JSON)',
  `data_baru`  JSON          NULL                            COMMENT 'Data sesudah perubahan (JSON)',
  `ip_address` VARCHAR(50)   NULL                            COMMENT 'IP Address user',
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_audit_user_id`   (`user_id`),
  INDEX `idx_audit_created_at`(`created_at`),
  INDEX `idx_audit_aktivitas` (`aktivitas`(100)),
  INDEX `idx_audit_tabel`     (`tabel`),

  CONSTRAINT `fk_audit_user`
    FOREIGN KEY (`user_id`)
    REFERENCES  `users`(`id`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Tabel audit trail seluruh aktivitas sistem';


-- ================================================================
-- Aktifkan kembali foreign key check
-- ================================================================
SET FOREIGN_KEY_CHECKS = 1;


-- ================================================================
-- Verifikasi tabel berhasil dibuat
-- ================================================================
SELECT
  TABLE_NAME    AS 'Nama Tabel',
  TABLE_ROWS    AS 'Jumlah Baris',
  TABLE_COMMENT AS 'Keterangan'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'dashboard_smt'
ORDER BY TABLE_NAME;

SELECT 'Semua tabel berhasil dibuat!' AS keterangan;
