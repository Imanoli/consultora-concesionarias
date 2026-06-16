-- AlterTable
ALTER TABLE `clients` ADD COLUMN `meta_fondos_updated_at` DATETIME(3) NULL,
    ADD COLUMN `meta_fondos_usd` DECIMAL(10, 2) NULL;
