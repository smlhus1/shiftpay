-- ShiftPay schema for Supabase (mirrors expo-sqlite schema in shiftpay/lib/db.ts)
-- Run in Supabase Dashboard → SQL Editor, or: supabase db push

-- Tariff rates (single row per user in app; id 1 = default)
CREATE TABLE IF NOT EXISTS tariff_rates (
  id integer PRIMARY KEY DEFAULT 1,
  base_rate real NOT NULL DEFAULT 0,
  evening_supplement real NOT NULL DEFAULT 0,
  night_supplement real NOT NULL DEFAULT 0,
  weekend_supplement real NOT NULL DEFAULT 0,
  holiday_supplement real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Timesheets (one row per pay period)
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  shifts jsonb NOT NULL,
  expected_pay real NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('ocr', 'csv', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional: RLS (row-level security) — enable if you add auth later
-- ALTER TABLE tariff_rates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE tariff_rates IS 'Hourly rates and supplements; app uses id=1';
COMMENT ON TABLE timesheets IS 'Imported pay periods with shifts JSON and calculated expected pay';
