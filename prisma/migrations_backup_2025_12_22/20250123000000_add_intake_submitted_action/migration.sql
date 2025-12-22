-- Add INTAKE_SUBMITTED to AccessLogAction enum
-- This allows tracking intake submissions separately from general CREATED actions

ALTER TYPE "AccessLogAction" ADD VALUE 'INTAKE_SUBMITTED';

