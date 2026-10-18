-- Migration: Add image_url column to Property table
-- Run this if prisma db push fails due to network issues.
-- Execute against your Neon PostgreSQL database.

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "image_url" TEXT;
