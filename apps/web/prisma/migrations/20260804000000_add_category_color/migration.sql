-- Add color + icon to categories
ALTER TABLE "categories" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#005c9e';
ALTER TABLE "categories" ADD COLUMN "icon" TEXT;