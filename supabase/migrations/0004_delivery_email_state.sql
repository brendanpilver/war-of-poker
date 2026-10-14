-- Purchase email delivery state.
--
-- The webhook records a purchase once (ON CONFLICT DO NOTHING on the Checkout
-- session id) and must still be able to recover a delivery email that failed.
-- `delivery_email_claimed_at` lets exactly one webhook delivery send at a time;
-- `delivery_emailed_at` records success. A purchase that is `paid` with no
-- `delivery_emailed_at` is an email still owed, and a Stripe redelivery of its
-- event (automatic retry or a manual "Resend") will send it.

alter table purchases
  add column if not exists delivery_emailed_at timestamptz,
  add column if not exists delivery_email_claimed_at timestamptz;

-- Purchases recorded before this migration were emailed by the webhook when
-- they were recorded.
update purchases
   set delivery_emailed_at = created_at
 where delivery_emailed_at is null;

create index if not exists purchases_delivery_owed_idx
  on purchases (created_at)
  where status = 'paid' and delivery_emailed_at is null;
