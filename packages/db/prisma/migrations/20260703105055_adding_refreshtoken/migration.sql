/*
  Warnings:

  - You are about to drop the column `passwork` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "passwork",
ADD COLUMN     "RefreshToken" TEXT,
ADD COLUMN     "password" TEXT;
