CREATE OR REPLACE FUNCTION public.sync_invoice_payment_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _paid numeric(12,2);
  _total numeric(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO _paid FROM public.payments WHERE invoice_id = NEW.invoice_id;
  SELECT total INTO _total FROM public.invoices WHERE id = NEW.invoice_id;
  UPDATE public.invoices
  SET paid = _paid,
      status = CASE WHEN _paid >= _total THEN 'paid'::public.invoice_status WHEN _paid > 0 THEN 'partial'::public.invoice_status ELSE 'unpaid'::public.invoice_status END
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_invoice_payment_totals() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_invoice_payment_totals() TO service_role;
CREATE TRIGGER sync_invoice_payment_totals_after_insert
AFTER INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_totals();