/*
  Warnings:

  - You are about to drop the column `user_id` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `reaction` table. All the data in the column will be lost.
  - You are about to drop the column `current_song_id` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `current_status` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `event` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `image_url_nobg` on the `song` table. All the data in the column will be lost.
  - You are about to drop the column `performance_time` on the `song` table. All the data in the column will be lost.
  - You are about to drop the column `performed` on the `song` table. All the data in the column will be lost.
  - You are about to drop the column `room_id` on the `song` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `vote` table. All the data in the column will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[profile_id,song_id,night]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `profile_id` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `Reaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profile_id` to the `Vote` table without a default value. This is not possible if the table is not empty.
  - Made the column `night` on table `vote` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `comment` DROP FOREIGN KEY `Comment_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `reaction` DROP FOREIGN KEY `Reaction_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `room` DROP FOREIGN KEY `Room_current_song_id_fkey`;

-- DropForeignKey
ALTER TABLE `song` DROP FOREIGN KEY `Song_room_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_profile_id_fkey`;

-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `User_room_id_fkey`;

-- DropForeignKey
ALTER TABLE `vote` DROP FOREIGN KEY `Vote_user_id_fkey`;

-- DropIndex
DROP INDEX `Comment_user_id_fkey` ON `comment`;

-- DropIndex
DROP INDEX `Reaction_user_id_fkey` ON `reaction`;

-- DropIndex
DROP INDEX `Room_current_song_id_fkey` ON `room`;

-- DropIndex
DROP INDEX `Song_room_id_fkey` ON `song`;

-- DropIndex
DROP INDEX `Vote_user_id_fkey` ON `vote`;

-- AlterTable
ALTER TABLE `comment` DROP COLUMN `user_id`,
    ADD COLUMN `profile_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `reaction` DROP COLUMN `user_id`,
    ADD COLUMN `profile_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `room` DROP COLUMN `current_song_id`,
    DROP COLUMN `current_status`,
    DROP COLUMN `event`,
    ADD COLUMN `name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `song` DROP COLUMN `image_url_nobg`,
    DROP COLUMN `performance_time`,
    DROP COLUMN `performed`,
    DROP COLUMN `room_id`;

-- AlterTable
ALTER TABLE `vote` DROP COLUMN `user_id`,
    ADD COLUMN `profile_id` INTEGER NOT NULL,
    MODIFY `night` INTEGER NOT NULL;

-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `RoomMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `room_id` INTEGER NOT NULL,
    `profile_id` INTEGER NOT NULL,
    `isHost` BOOLEAN NOT NULL DEFAULT false,
    `userToken` VARCHAR(191) NOT NULL,
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RoomMember_userToken_key`(`userToken`),
    UNIQUE INDEX `RoomMember_room_id_profile_id_key`(`room_id`, `profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SongPerformance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `song_id` INTEGER NOT NULL,
    `night` INTEGER NOT NULL,
    `performance_time` DATETIME(3) NULL,
    `performed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `SongPerformance_song_id_night_key`(`song_id`, `night`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Vote_profile_id_song_id_night_key` ON `Vote`(`profile_id`, `song_id`, `night`);

-- AddForeignKey
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoomMember` ADD CONSTRAINT `RoomMember_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SongPerformance` ADD CONSTRAINT `SongPerformance_song_id_fkey` FOREIGN KEY (`song_id`) REFERENCES `Song`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reaction` ADD CONSTRAINT `Reaction_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_profile_id_fkey` FOREIGN KEY (`profile_id`) REFERENCES `Profile`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
