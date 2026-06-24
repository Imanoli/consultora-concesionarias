CREATE TABLE `users` (
  `id`            INT            NOT NULL AUTO_INCREMENT,
  `email`         VARCHAR(100)   NOT NULL,
  `password_hash` VARCHAR(100)   NOT NULL,
  `role`          VARCHAR(10)    NOT NULL DEFAULT 'client',
  `client_id`     VARCHAR(50)    NULL,
  `created_at`    DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_key` (`email`),
  CONSTRAINT `fk_users_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
