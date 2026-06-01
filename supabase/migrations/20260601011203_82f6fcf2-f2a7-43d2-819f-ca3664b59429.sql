
-- 1) Delivery note number on deliveries
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS note_number text;
CREATE INDEX IF NOT EXISTS idx_deliveries_note_number ON public.deliveries(user_id, note_number);

-- 2) Payments can optionally target a specific delivery note
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS delivery_id uuid;
CREATE INDEX IF NOT EXISTS idx_payments_delivery_id ON public.payments(delivery_id);

-- 3) Recovery: promote every existing auth user to Administrador (one-time)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'Administrador'::app_role
FROM auth.users u
ON CONFLICT (user_id, role) DO NOTHING;

-- 4) Safe self-service recovery RPC: only grants admin when there is no admin
CREATE OR REPLACE FUNCTION public.claim_admin_if_none()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  has_admin boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'Administrador') INTO has_admin;
  IF NOT has_admin THEN
    INSERT INTO public.user_roles(user_id, role)
    VALUES (uid, 'Administrador')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_admin_if_none() TO authenticated;
