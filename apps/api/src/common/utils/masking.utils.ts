
/**
 * Masks an email address.
 * Keeps the first 4 characters of the local part (or less if short),
 * and masks the rest up to the '@' symbol.
 * Example: "johndoe@example.com" -> "john****@example.com"
 * Example: "ab@test.com" -> "ab****@test.com"
 */
export function maskEmail(email: string | null | undefined): string {
    if (!email) return '';

    const [local, domain] = email.split('@');
    if (!domain) return email; // Invalid email, return as is (or could mask all)

    const keepLen = Math.min(4, local.length);
    const visiblePart = local.substring(0, keepLen);

    return `${visiblePart}****@${domain}`;
}

/**
 * Masks a phone number.
 * Keeps the last 4 digits visible.
 * Example: "+1234567890" -> "*******7890"
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return '';

    if (phone.length <= 4) return phone; // Too short to mask

    const visiblePart = phone.substring(phone.length - 4);
    const hiddenLen = phone.length - 4;

    // Using fixed length asterisks or matching length? 
    // Matching length gives a hint about length, but is standard.
    // Let's use 7 asterisks + last 4 to standardize display if we want, 
    // but preserving length is usually better for validation feedback visually.
    // Let's restart: user asked "rest is hide it with * mark".
    const maskedPart = '*'.repeat(hiddenLen);

    return `${maskedPart}${visiblePart}`;
}
