/*
  Warnings:

  - The primary key for the `clients` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `ai_insights` DROP FOREIGN KEY `ai_insights_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `campaign_metrics_daily` DROP FOREIGN KEY `campaign_metrics_daily_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `daily_metrics` DROP FOREIGN KEY `daily_metrics_client_id_fkey`;

-- AlterTable
ALTER TABLE `ai_insights` MODIFY `client_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `campaign_metrics_daily` MODIFY `client_id` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `clients` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `daily_metrics` MODIFY `client_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `daily_metrics` ADD CONSTRAINT `daily_metrics_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_metrics_daily` ADD CONSTRAINT `campaign_metrics_daily_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ai_insights` ADD CONSTRAINT `ai_insights_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
