-- AlterTable
ALTER TABLE `Message`
  ADD COLUMN `replyToId` VARCHAR(191) NULL,
  ADD COLUMN `replyToSenderName` VARCHAR(191) NULL,
  ADD COLUMN `replyToExcerpt` VARCHAR(191) NULL;
