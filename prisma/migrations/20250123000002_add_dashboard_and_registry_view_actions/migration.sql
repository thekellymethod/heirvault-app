-- Add DASHBOARD_VIEW and REGISTRY_VIEW to AccessLogAction enum
-- These actions track dashboard and registry detail views separately from general VIEWED actions

ALTER TYPE "AccessLogAction" ADD VALUE 'DASHBOARD_VIEW';
ALTER TYPE "AccessLogAction" ADD VALUE 'REGISTRY_VIEW';

