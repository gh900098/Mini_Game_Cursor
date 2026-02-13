/**
 * Simple parser for User Agent strings to extract Browser and OS.
 */
export function parseUserAgent(ua: string): { browser: string; os: string; isMobile: boolean } {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', isMobile: false };

    let browser = 'Unknown Browser';
    let os = 'Unknown OS';
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);

    // Detect OS
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Linux/i.test(ua)) os = 'Linux';

    // Detect Browser
    if (/Edg/i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/MSIE|Trident/i.test(ua)) browser = 'Internet Explorer';

    return { browser, os, isMobile };
}

/**
 * Returns a friendly string representation of the User Agent.
 */
export function getFriendlyUA(ua: string): string {
    const { browser, os, isMobile } = parseUserAgent(ua);
    if (browser === 'Unknown' && os === 'Unknown') return 'Unknown';

    const deviceType = isMobile ? 'Mobile' : 'Desktop';
    return `${browser} on ${os} (${deviceType})`;
}
