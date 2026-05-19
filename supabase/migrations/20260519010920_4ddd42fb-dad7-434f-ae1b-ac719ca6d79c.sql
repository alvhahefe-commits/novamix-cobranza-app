
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('Administrador', 'Vendedor', 'Chofer');

-- user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Get current user's primary role (highest privilege)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = auth.uid()
  ORDER BY CASE role
    WHEN 'Administrador' THEN 1
    WHEN 'Vendedor' THEN 2
    WHEN 'Chofer' THEN 3
  END
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'Administrador'));

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'Administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'Administrador'));

-- Auto-assign first user as Administrador, others as Vendedor by default
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'Administrador');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'Vendedor');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill: assign Administrador to all existing users without a role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'Administrador'::app_role FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_label TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_created ON public.activity_logs (created_at DESC);
CREATE INDEX idx_activity_logs_user ON public.activity_logs (user_id);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own logs, admins view all" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'Administrador'));

-- Add created_by / updated_by to track who did what on key tables
ALTER TABLE public.customers   ADD COLUMN IF NOT EXISTS created_by UUID, ADD COLUMN IF NOT EXISTS updated_by UUID, ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.payments    ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.deliveries  ADD COLUMN IF NOT EXISTS created_by UUID, ADD COLUMN IF NOT EXISTS updated_by UUID, ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.products    ADD COLUMN IF NOT EXISTS created_by UUID, ADD COLUMN IF NOT EXISTS updated_by UUID;

CREATE TRIGGER trg_customers_updated   BEFORE UPDATE ON public.customers   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deliveries_updated  BEFORE UPDATE ON public.deliveries  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
