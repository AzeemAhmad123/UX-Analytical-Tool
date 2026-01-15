-- Add calculation_mode column to funnels table
-- This allows users to choose between session-based and user-based funnel calculation

ALTER TABLE funnels
ADD COLUMN IF NOT EXISTS calculation_mode TEXT DEFAULT 'sessions' CHECK (calculation_mode IN ('sessions', 'users'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_funnels_calculation_mode ON funnels(calculation_mode);

-- Update existing funnels to use session-based calculation (default)
UPDATE funnels SET calculation_mode = 'sessions' WHERE calculation_mode IS NULL;

-- Add comment
COMMENT ON COLUMN funnels.calculation_mode IS 'How to calculate funnel: sessions (count each session) or users (count unique users)';
