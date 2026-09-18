-- CreateIndex
CREATE INDEX `Post_createdAt_id_idx` ON `Post`(`createdAt`, `id`);

-- CreateIndex
CREATE INDEX `Post_authorId_createdAt_idx` ON `Post`(`authorId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Post_communityId_createdAt_idx` ON `Post`(`communityId`, `createdAt`);

