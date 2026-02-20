/*
  Warnings:

  - A unique constraint covering the columns `[userToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - The required column `userToken` was added to the `User` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX `User_username_key` ON `user`;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `userToken` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_userToken_key` ON `User`(`userToken`);
