-- Add 3-day funeral schedule fields to reservations table
-- This migration adds support for multi-day funeral services (burol)
-- Start date/time comes from reservation_date and reservation_time
-- Only need to add END date/time fields

-- Add funeral schedule fields (start is from reservation_date/time)
ALTER TABLE reservations 
ADD COLUMN IF NOT EXISTS funeral_start_date DATE,
ADD COLUMN IF NOT EXISTS funeral_end_date DATE,
ADD COLUMN IF NOT EXISTS funeral_start_time TIME,
ADD COLUMN IF NOT EXISTS funeral_end_time TIME;

-- Add indexes for funeral date queries
CREATE INDEX IF NOT EXISTS idx_reservations_funeral_dates ON reservations(funeral_start_date, funeral_end_date);

-- Add comments to table
COMMENT ON COLUMN reservations.funeral_start_date IS 'Start date for multi-day funeral (same as reservation_date)';
COMMENT ON COLUMN reservations.funeral_end_date IS 'End date for multi-day funeral service (typically 3 days from start)';
COMMENT ON COLUMN reservations.funeral_start_time IS 'Start time for funeral (same as reservation_time)';
COMMENT ON COLUMN reservations.funeral_end_time IS 'End time for funeral service';
