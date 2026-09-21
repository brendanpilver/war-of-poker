-- Short Stack PLO pricing architecture: five offers instead of three.
--
--   book               $25   book
--   field-kit          $19   field-kit          (new)
--   system             $39   complete-system
--   system-quiz        $29   complete-system    (10-Hand Challenge Player Price)
--   field-kit-upgrade  $15   complete-system    (new; book owners only)
--
-- Prices live in src/lib/offers.ts, not here. What the database knows is which
-- offer ids and products a purchase row may name, and the Stripe webhook's
-- upsert is rejected by these constraints for any id it does not list. Run this
-- BEFORE deploying the new offers: otherwise a paid Field Kit or upgrade sale
-- fails to record, the webhook returns 500, and Stripe retries it indefinitely.

alter table purchases drop constraint if exists purchases_offer_id_check;

alter table purchases
  add constraint purchases_offer_id_check
  check (offer_id in ('book', 'field-kit', 'system', 'system-quiz', 'field-kit-upgrade'));

alter table purchases drop constraint if exists purchases_product_check;

alter table purchases
  add constraint purchases_product_check
  check (product in ('book', 'field-kit', 'complete-system'));

-- Which book purchase a `field-kit-upgrade` sale upgraded. Written by the
-- webhook from the Checkout session's metadata. It is how the upgrade
-- entitlement (src/lib/book-ownership.ts) knows a purchase has already been
-- upgraded, and how support can trace an upgrade back to the book it extends.
-- Deliberately not unique: if a buyer pays twice in two tabs, both sales are
-- real and both must record; the duplicate is refunded by hand.
alter table purchases
  add column if not exists upgrade_of uuid references purchases (id) on delete set null;

create index if not exists purchases_upgrade_of_idx on purchases (upgrade_of);
