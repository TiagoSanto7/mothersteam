-- AlterTable User: add optional username field
ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `User_username_key` ON `User`(`username`);

-- AlterTable Notification: add actor info + post excerpt for rich notifications
ALTER TABLE `Notification` ADD COLUMN `actorId` VARCHAR(191) NULL;
ALTER TABLE `Notification` ADD COLUMN `actorName` VARCHAR(191) NULL;
ALTER TABLE `Notification` ADD COLUMN `postExcerpt` VARCHAR(300) NULL;
