/**
 * BUG-002: Tenant Isolation Leak Proof
 * This script documents the API path to reproduce the isolation leak.
 * 
 * Vulnerability: Admin controllers (Scores, Prizes, Members) do not verify 
 * that the requested companyId matches the logged-in admin's companyId.
 */

async function reproduceLeak() {
    console.log("=== Tenant Isolation Leak Proof ===");

    // 1. Log in as Company A Admin
    console.log("Step 1: Obtain JWT for 'Company A' Admin");

    // 2. Request Company B's data
    const targetCompanyB = "00000000-0000-0000-0000-000000000002"; // Example UUID

    console.log(`Step 2: GET /api/admin/scores/all?companyId=${targetCompanyB}`);
    console.log(`Step 3: GET /api/admin/members?companyId=${targetCompanyB}`);

    console.log("\nEXPECTED (Secure): 403 Forbidden");
    console.log("ACTUAL (Leaking): 200 OK (Returns Company B data)");

    console.log("\n--- Affected Endpoints ---");
    console.log("1. AdminScoresController.getAllScores");
    console.log("2. AdminMembersController.getMembers");
    console.log("3. AdminPrizesController.getAllPrizes (Total leak, no filter at all)");
    console.log("4. ScoresController.submit (Missing cross-check between Slug and JWT CompanyID)");
}

reproduceLeak();
