-- payOS rejects an order code it has seen before, and the merchant account already holds low codes from pre-launch
-- tests, so new top-ups start at 1000000 (or after the highest code in use). "EH" + 7 digits stays within the
-- 9-character transfer description payOS allows.
SELECT setval('"CreditTopUp_orderCode_seq"', GREATEST(999999, (SELECT COALESCE(MAX("orderCode"), 0) FROM "CreditTopUp")), true);
