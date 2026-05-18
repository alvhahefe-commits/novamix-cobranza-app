
-- Extend products with inventory fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS min_stock integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Stock movements log
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('entrada','salida','ajuste','venta')),
  quantity integer NOT NULL,
  stock_after integer NOT NULL,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS own_select ON public.stock_movements;
DROP POLICY IF EXISTS own_insert ON public.stock_movements;
DROP POLICY IF EXISTS own_update ON public.stock_movements;
DROP POLICY IF EXISTS own_delete ON public.stock_movements;

CREATE POLICY own_select ON public.stock_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY own_insert ON public.stock_movements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY own_update ON public.stock_movements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY own_delete ON public.stock_movements FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_user_created ON public.stock_movements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

-- Update trigger for products.updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent negative stock at DB level
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stock_non_negative;
ALTER TABLE public.products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);
