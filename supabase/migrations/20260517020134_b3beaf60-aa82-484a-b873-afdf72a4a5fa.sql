
-- Customers new fields
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS phone_secondary text DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_type text DEFAULT 'Particular',
  ADD COLUMN IF NOT EXISTS nit text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ci text DEFAULT '',
  ADD COLUMN IF NOT EXISTS business_notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS additional_info text DEFAULT '';

-- Payment method enum: add QR, Crédito, Mixto
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'QR';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Crédito';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'Mixto';

-- Deliveries: add order_date and payment_date
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS order_date timestamptz,
  ADD COLUMN IF NOT EXISTS payment_date timestamptz;

-- Realtime
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.debts REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.customers; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.payments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.debts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
