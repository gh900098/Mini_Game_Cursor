UPDATE member_prizes SET "prizeType" = 'physical' WHERE "prizeName" ILIKE '%iphone%' OR metadata->'config'->>'type' = 'physical';
UPDATE member_prizes SET "prizeType" = 'bonus_credit' WHERE "prizeName" ILIKE '%credit%' OR "prizeName" ILIKE '%bonus%' OR metadata->'config'->>'type' = 'bonus_credit';
UPDATE member_prizes SET "prizeType" = 'points' WHERE "prizeType" IS NULL OR ("prizeType" != 'physical' AND "prizeType" != 'bonus_credit' AND "prizeType" != 'virtual');
