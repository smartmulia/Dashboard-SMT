-- ================================================================
-- DASHBOARD SMT ELEKTRONIK
-- Script 04: Views & Query Berguna
-- ================================================================

USE `dashboard_smt`;

-- ================================================================
-- VIEW 1: Ringkasan statistik dashboard
-- ================================================================
CREATE OR REPLACE VIEW `v_dashboard_stats` AS
SELECT
  COUNT(*)                                            AS total_sbg,
  SUM(cogs)                                           AS total_cogs,
  SUM(CASE WHEN harga_jual IS NOT NULL THEN harga_jual ELSE 0 END) AS total_harga_jual,
  SUM(CASE WHEN profit IS NOT NULL THEN profit ELSE 0 END)          AS total_profit,
  CASE
    WHEN SUM(harga_jual) > 0
    THEN ROUND(SUM(profit) / SUM(harga_jual) * 100, 2)
    ELSE 0
  END                                                               AS persen_profit,
  SUM(CASE WHEN status = 'TERJUAL' THEN 1 ELSE 0 END)              AS total_terjual,
  SUM(CASE WHEN status = 'BELUM_TERJUAL' THEN 1 ELSE 0 END)        AS total_belum_terjual,
  ROUND(SUM(CASE WHEN status='TERJUAL' THEN 1 ELSE 0 END) / COUNT(*) * 100, 1) AS persen_terjual
FROM `elektronik`;


-- ================================================================
-- VIEW 2: Statistik per perusahaan
-- ================================================================
CREATE OR REPLACE VIEW `v_stats_per_perusahaan` AS
SELECT
  perusahaan,
  COUNT(*)                                            AS total_sbg,
  SUM(cogs)                                           AS total_cogs,
  SUM(IFNULL(harga_jual, 0))                          AS total_harga_jual,
  SUM(IFNULL(profit, 0))                              AS total_profit,
  SUM(CASE WHEN status = 'TERJUAL' THEN 1 ELSE 0 END)AS total_terjual,
  SUM(CASE WHEN status = 'BELUM_TERJUAL' THEN 1 ELSE 0 END) AS total_belum_terjual
FROM `elektronik`
GROUP BY perusahaan;


-- ================================================================
-- VIEW 3: Distribusi grade barang
-- ================================================================
CREATE OR REPLACE VIEW `v_distribusi_grade` AS
SELECT
  grade,
  COUNT(*)                                            AS jumlah,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM elektronik), 1) AS persen,
  SUM(IFNULL(profit, 0))                              AS total_profit,
  AVG(IFNULL(harga_jual, 0))                          AS rata_harga_jual
FROM `elektronik`
GROUP BY grade
ORDER BY grade;


-- ================================================================
-- VIEW 4: Top 10 profit tertinggi
-- ================================================================
CREATE OR REPLACE VIEW `v_top10_profit` AS
SELECT
  nomor_sbg,
  jenis_barang,
  detail_barang,
  grade,
  perusahaan,
  cogs,
  harga_jual,
  profit,
  ROUND(profit / harga_jual * 100, 1) AS persen_margin
FROM `elektronik`
WHERE profit IS NOT NULL
ORDER BY profit DESC
LIMIT 10;


-- ================================================================
-- VIEW 5: Invoice lengkap beserta total
-- ================================================================
CREATE OR REPLACE VIEW `v_invoice_summary` AS
SELECT
  i.id,
  i.nomor_invoice,
  i.nama_customer,
  i.no_telepon,
  i.tanggal_invoice,
  i.perusahaan,
  i.status,
  i.catatan,
  u.nama                                              AS dibuat_oleh,
  i.approved_by_nama,
  i.approved_at,
  i.rejected_reason,
  i.printed_at,
  COUNT(ii.id)                                        AS jumlah_item,
  SUM(ii.harga_jual)                                  AS subtotal_harga_jual,
  SUM(ii.ppn)                                         AS total_ppn,
  SUM(ii.total_harga)                                 AS grand_total,
  i.created_at
FROM `invoices` i
LEFT JOIN `users` u ON u.id = i.created_by_id
LEFT JOIN `invoice_items` ii ON ii.invoice_id = i.id
GROUP BY i.id;


-- ================================================================
-- VIEW 6: Trend barang masuk 30 hari terakhir
-- ================================================================
CREATE OR REPLACE VIEW `v_trend_30_hari` AS
SELECT
  DATE(tanggal_masuk)                AS tanggal,
  COUNT(*)                           AS jumlah_masuk,
  SUM(IFNULL(cogs, 0))               AS total_cogs_masuk,
  SUM(IFNULL(harga_jual, 0))         AS total_harga_masuk
FROM `elektronik`
WHERE tanggal_masuk >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(tanggal_masuk)
ORDER BY tanggal;


-- ================================================================
-- STORED PROCEDURE: Hitung ulang profit & ppn semua barang
-- (Jalankan jika ada perubahan rumus)
-- ================================================================
DROP PROCEDURE IF EXISTS `sp_recalculate_all`;
DELIMITER $$
CREATE PROCEDURE `sp_recalculate_all`()
BEGIN
  UPDATE `elektronik`
  SET
    ppn        = CASE WHEN harga_jual IS NOT NULL THEN ROUND(harga_jual * 0.011, 2) ELSE NULL END,
    total_harga= CASE WHEN harga_jual IS NOT NULL THEN ROUND(harga_jual + harga_jual * 0.011, 2) ELSE NULL END,
    profit     = CASE WHEN harga_jual IS NOT NULL THEN ROUND(harga_jual - cogs, 2) ELSE NULL END;

  SELECT ROW_COUNT() AS `baris_diperbarui`, 'Perhitungan berhasil diperbarui' AS keterangan;
END$$
DELIMITER ;


-- ================================================================
-- STORED PROCEDURE: Statistik lengkap untuk dashboard
-- ================================================================
DROP PROCEDURE IF EXISTS `sp_dashboard_stats`;
DELIMITER $$
CREATE PROCEDURE `sp_dashboard_stats`(
  IN p_perusahaan VARCHAR(20)  -- 'VOLARY', 'SERBA_MAS', atau NULL untuk semua
)
BEGIN
  -- Summary card
  SELECT
    COUNT(*)                                          AS total_sbg,
    SUM(cogs)                                         AS total_cogs,
    SUM(IFNULL(harga_jual, 0))                        AS total_harga_jual,
    SUM(IFNULL(profit, 0))                            AS total_profit,
    CASE
      WHEN SUM(harga_jual) > 0
      THEN ROUND(SUM(profit)/SUM(harga_jual)*100, 2)
      ELSE 0
    END                                               AS persen_profit,
    SUM(CASE WHEN status='TERJUAL' THEN 1 ELSE 0 END) AS total_terjual,
    SUM(CASE WHEN status='BELUM_TERJUAL' THEN 1 ELSE 0 END) AS total_belum_terjual
  FROM `elektronik`
  WHERE (p_perusahaan IS NULL OR perusahaan = p_perusahaan);

  -- Grade distribution
  SELECT grade, COUNT(*) AS jumlah
  FROM `elektronik`
  WHERE (p_perusahaan IS NULL OR perusahaan = p_perusahaan)
  GROUP BY grade ORDER BY grade;

  -- Top 10 profit
  SELECT nomor_sbg, jenis_barang, detail_barang, profit
  FROM `elektronik`
  WHERE profit IS NOT NULL
    AND (p_perusahaan IS NULL OR perusahaan = p_perusahaan)
  ORDER BY profit DESC LIMIT 10;

  -- Top 10 harga jual
  SELECT nomor_sbg, jenis_barang, detail_barang, harga_jual
  FROM `elektronik`
  WHERE harga_jual IS NOT NULL
    AND (p_perusahaan IS NULL OR perusahaan = p_perusahaan)
  ORDER BY harga_jual DESC LIMIT 10;

  -- Trend 30 hari
  SELECT DATE(tanggal_masuk) AS tanggal, COUNT(*) AS jumlah
  FROM `elektronik`
  WHERE tanggal_masuk >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND (p_perusahaan IS NULL OR perusahaan = p_perusahaan)
  GROUP BY DATE(tanggal_masuk) ORDER BY tanggal;
END$$
DELIMITER ;


-- ================================================================
-- Verifikasi views berhasil dibuat
-- ================================================================
SELECT TABLE_NAME AS view_name
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'dashboard_smt'
ORDER BY TABLE_NAME;

SELECT 'Views dan Stored Procedure berhasil dibuat!' AS keterangan;
