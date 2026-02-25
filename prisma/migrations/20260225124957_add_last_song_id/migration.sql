-- AlterTable
ALTER TABLE `festivalstatus` ADD COLUMN `lastSongId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `FestivalStatus` ADD CONSTRAINT `FestivalStatus_lastSongId_fkey` FOREIGN KEY (`lastSongId`) REFERENCES `Song`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
