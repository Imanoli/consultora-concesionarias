CREATE TABLE `revenue_entries` (
  `id`           INT             NOT NULL AUTO_INCREMENT,
  `client_id`    VARCHAR(50)     NOT NULL,
  `year`         INT             NOT NULL,
  `month`        INT             NOT NULL,
  `amount_ars`   DECIMAL(15, 2)  NOT NULL,
  `usd_ars_rate` DECIMAL(8, 2)   NOT NULL,
  `notes`        VARCHAR(200)    NULL,
  `created_at`   DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at`   DATETIME(3)     NOT NULL,

  UNIQUE KEY `revenue_entries_client_id_year_month_key` (`client_id`, `year`, `month`),
  PRIMARY KEY (`id`),
  CONSTRAINT `revenue_entries_client_id_fkey`
    FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
