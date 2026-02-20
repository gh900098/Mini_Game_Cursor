SELECT email, count(*) FROM users GROUP BY email HAVING count(*) > 1;
SELECT "emailHash", count(*) FROM users GROUP BY "emailHash" HAVING count(*) > 1;
SELECT * FROM users;
SELECT * FROM user_companies;
