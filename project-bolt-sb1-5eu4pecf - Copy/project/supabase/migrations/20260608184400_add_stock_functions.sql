/*
# Add stock management functions

Creates SQL functions for safe stock decrement/increment operations.
These prevent race conditions during concurrent bill saves.

1. Functions
- `decrement_stock(med_id, qty)` - safely reduce stock on sale
- `increment_stock(med_id, qty)` - restore stock on purchase/return
*/

CREATE OR REPLACE FUNCTION decrement_stock(med_id uuid, qty numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE medicines
  SET current_stock = GREATEST(0, current_stock - qty),
      updated_at = now()
  WHERE id = med_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_stock(med_id uuid, qty numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE medicines
  SET current_stock = current_stock + qty,
      updated_at = now()
  WHERE id = med_id;
END;
$$;
