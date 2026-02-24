-- Fix physical items (Iphone, etc.)
UPDATE member_prizes 
SET "prizeType" = 'physical', status = 'pending' 
WHERE "prizeName" ILIKE '%iphone%' 
   OR metadata->'config'->>'prizeType' = 'physical'
   OR metadata->'config'->>'type' = 'physical'
   OR metadata->'config'->>'prizeType' = 'egift';

-- Fix bonus/cash/credit
UPDATE member_prizes 
SET "prizeType" = 'bonus_credit' 
WHERE "prizeName" ILIKE '%credit%' 
   OR "prizeName" ILIKE '%bonus%' 
   OR "prizeName" ILIKE '%BIG WIN%'
   OR metadata->'config'->>'prizeType' = 'cash'
   OR metadata->'config'->>'type' = 'bonus_credit';

-- Clean up points
UPDATE member_prizes 
SET "prizeType" = 'points' 
WHERE "prizeType" NOT IN ('physical', 'bonus_credit', 'virtual');
