-- AlterTable
ALTER TABLE `room` ADD COLUMN `night` INTEGER NULL;

-- AlterTable
ALTER TABLE `song` ADD COLUMN `artist_canonical` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `vote` ADD COLUMN `night` INTEGER NULL;
