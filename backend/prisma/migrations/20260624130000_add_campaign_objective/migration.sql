ALTER TABLE `campaign_metrics_daily`
  ADD COLUMN `objective` VARCHAR(60) NULL AFTER `campaign_name`;
