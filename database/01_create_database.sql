-- ================================================================
-- DASHBOARD SMT ELEKTRONIK
-- Script 01: Buat Database
-- ================================================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS `dashboard_smt`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Gunakan database
USE `dashboard_smt`;

-- ================================================================
-- Informasi
-- ================================================================
-- Database  : dashboard_smt
-- Charset   : utf8mb4 (mendukung emoji & karakter Indonesia)
-- Collation : utf8mb4_unicode_ci
-- Engine    : InnoDB (mendukung foreign key & transaction)
-- ================================================================

SELECT 'Database dashboard_smt berhasil dibuat atau sudah ada.' AS keterangan;
