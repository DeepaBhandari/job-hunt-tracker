/*
  Warnings:

  - You are about to drop the column `s3_key` on the `resume_versions` table. All the data in the column will be lost.
  - Added the required column `file_path` to the `resume_versions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "resume_versions" DROP COLUMN "s3_key",
ADD COLUMN     "file_path" TEXT NOT NULL;
