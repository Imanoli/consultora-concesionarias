-- CreateTable
CREATE TABLE `fund_loads` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `client_id` VARCHAR(191) NOT NULL,
  `source` VARCHAR(20) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `currency` VARCHAR(5) NOT NULL,
  `loaded_at` DATETIME(0) NOT NULL,
  `notes` VARCHAR(200) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `fund_loads_client_id_fkey`(`client_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fund_loads_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
