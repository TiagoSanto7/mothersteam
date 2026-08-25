-- Rename Product.affiliateUrl to Product.mercadoLivreUrl
ALTER TABLE `Product` RENAME COLUMN `affiliateUrl` TO `mercadoLivreUrl`;
ALTER TABLE `Product` MODIFY COLUMN `mercadoLivreUrl` VARCHAR(500);
