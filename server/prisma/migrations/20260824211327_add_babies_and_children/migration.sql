-- AlterTable
ALTER TABLE `User` ADD COLUMN `concern` CHAR(1) NULL,
    ADD COLUMN `goal` CHAR(1) NULL,
    ADD COLUMN `hasMultiples` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mood` CHAR(1) NULL,
    ADD COLUMN `supportNetwork` CHAR(1) NULL;

-- CreateTable
CREATE TABLE `Baby` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NULL,
    `birthDate` DATETIME(3) NULL,
    `weekAtEntry` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Baby_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OtherChild` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `birthDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OtherChild_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Baby` ADD CONSTRAINT `Baby_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OtherChild` ADD CONSTRAINT `OtherChild_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
