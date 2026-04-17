/*
  Warnings:

  - Added the required column `language_snapshot` to the `Execution` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source_code_snapshot` to the `Execution` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "language_snapshot" TEXT NOT NULL,
ADD COLUMN     "source_code_snapshot" TEXT NOT NULL;
