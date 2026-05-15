
-- Enums
CREATE TYPE public.delivery_status AS ENUM ('Pendiente', 'En camino', 'Entregado');
CREATE TYPE public.payment_method AS ENUM ('Efectivo', 'Transferencia', 'Tarjeta', 'Otro');
CREATE TYPE public.debt_status AS ENUM ('Pendiente', 'Parcial', 'Pagado', 'Vencido');

-- Customers
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_user ON public.customers(user_id);

-- Products
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_user ON public.products(user_id);

-- Deliveries
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.delivery_status NOT NULL DEFAULT 'Pendiente',
  delivery_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ,
  delivery_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliveries_user ON public.deliveries(user_id);
CREATE INDEX idx_deliveries_customer ON public.deliveries(customer_id);

-- Payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  method public.payment_method NOT NULL DEFAULT 'Efectivo',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  receipt_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_customer ON public.payments(customer_id);

-- Debts (manual or aggregated)
CREATE TABLE public.debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(12,2) GENERATED ALWAYS AS (GREATEST(total_amount - paid_amount, 0)) STORED,
  due_date TIMESTAMPTZ,
  status public.debt_status NOT NULL DEFAULT 'Pendiente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debts_user ON public.debts(user_id);
CREATE INDEX idx_debts_customer ON public.debts(customer_id);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

-- Policies (own rows only)
CREATE POLICY "own_select" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.customers FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.products FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON public.deliveries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.deliveries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.deliveries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.deliveries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.payments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "own_select" ON public.debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON public.debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON public.debts FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for receipts/delivery photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: each user manages files inside a folder named with their user id
CREATE POLICY "receipts_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "receipts_user_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_user_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "receipts_user_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
