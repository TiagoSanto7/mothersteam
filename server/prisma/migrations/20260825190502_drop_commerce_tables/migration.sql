-- DropForeignKey
ALTER TABLE `Address` DROP FOREIGN KEY `Address_userId_fkey`;

-- DropForeignKey
ALTER TABLE `CartItem` DROP FOREIGN KEY `CartItem_ownProductId_fkey`;

-- DropForeignKey
ALTER TABLE `CartItem` DROP FOREIGN KEY `CartItem_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Order` DROP FOREIGN KEY `Order_addressId_fkey`;

-- DropForeignKey
ALTER TABLE `Order` DROP FOREIGN KEY `Order_userId_fkey`;

-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_ownProductId_fkey`;

-- DropForeignKey
ALTER TABLE `OwnProduct` DROP FOREIGN KEY `OwnProduct_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `PaymentMethod` DROP FOREIGN KEY `PaymentMethod_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Review` DROP FOREIGN KEY `Review_ownProductId_fkey`;

-- DropForeignKey
ALTER TABLE `Review` DROP FOREIGN KEY `Review_productId_fkey`;

-- DropForeignKey
ALTER TABLE `WishlistItem` DROP FOREIGN KEY `WishlistItem_ownProductId_fkey`;

-- DropForeignKey
ALTER TABLE `WishlistItem` DROP FOREIGN KEY `WishlistItem_productId_fkey`;

-- DropIndex
DROP INDEX `Review_userId_ownProductId_key` ON `Review`;

-- DropIndex
DROP INDEX `WishlistItem_userId_ownProductId_key` ON `WishlistItem`;

-- AlterTable
ALTER TABLE `Category` MODIFY `icon` VARCHAR(191) NOT NULL DEFAULT '🛍️';

-- Delete orphan Review rows (productId NULL from old OwnProduct-only reviews) before enforcing NOT NULL
DELETE FROM `Review` WHERE `productId` IS NULL;

-- AlterTable
ALTER TABLE `Review` DROP COLUMN `ownProductId`,
    MODIFY `productId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` DROP COLUMN `mpCustomerId`;

-- Delete orphan WishlistItem rows (productId NULL from old OwnProduct-only wishlist) before enforcing NOT NULL
DELETE FROM `WishlistItem` WHERE `productId` IS NULL;

-- AlterTable
ALTER TABLE `WishlistItem` DROP COLUMN `ownProductId`,
    MODIFY `productId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `Address`;

-- DropTable
DROP TABLE `CartItem`;

-- DropTable
DROP TABLE `Order`;

-- DropTable
DROP TABLE `OrderItem`;

-- DropTable
DROP TABLE `OwnProduct`;

-- DropTable
DROP TABLE `PaymentMethod`;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WishlistItem` ADD CONSTRAINT `WishlistItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
