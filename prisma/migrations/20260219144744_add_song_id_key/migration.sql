-- AddForeignKey
ALTER TABLE `FestivalStatus` ADD CONSTRAINT `FestivalStatus_songId_fkey` FOREIGN KEY (`songId`) REFERENCES `Song`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
