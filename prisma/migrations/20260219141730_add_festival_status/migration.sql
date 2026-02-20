-- CreateTable
CREATE TABLE `FestivalStatus` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `type` VARCHAR(191) NOT NULL,
    `songId` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
