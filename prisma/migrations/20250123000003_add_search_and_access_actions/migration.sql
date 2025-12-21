-- Add SEARCH_PERFORMED, ACCESS_REQUESTED, and ACCESS_GRANTED to AccessLogAction enum
-- These actions track search operations and access requests separately from other actions

ALTER TYPE "AccessLogAction" ADD VALUE 'SEARCH_PERFORMED';
ALTER TYPE "AccessLogAction" ADD VALUE 'ACCESS_REQUESTED';
ALTER TYPE "AccessLogAction" ADD VALUE 'ACCESS_GRANTED';

