-- Add REGISTRY_UPDATED_BY_TOKEN to AccessLogAction enum
-- This allows tracking updates made via QR token separately from other updates

ALTER TYPE "AccessLogAction" ADD VALUE 'REGISTRY_UPDATED_BY_TOKEN';

