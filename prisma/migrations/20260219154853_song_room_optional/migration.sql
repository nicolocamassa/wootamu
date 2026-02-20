-- DropForeignKey
ALTER TABLE `song` DROP FOREIGN KEY `Song_room_id_fkey`;

-- DropIndex
DROP INDEX `Song_room_id_fkey` ON `song`;

-- AlterTable
ALTER TABLE `song` MODIFY `room_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Song` ADD CONSTRAINT `Song_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `Room`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
