SELECT amount, type, "eligibilityReason", reason FROM credit_transactions WHERE "memberId" IN (SELECT id FROM members WHERE "externalId" = 'dev_user_1') ORDER BY "createdAt" ASC;
