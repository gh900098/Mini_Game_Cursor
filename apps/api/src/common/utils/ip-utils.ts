import { Request } from 'express';

/**
 * Gets the actual client IP address, handling proxies and load balancers.
 * Priority: X-Forwarded-For > X-Real-IP > req.ip > socket.remoteAddress
 */
export function getClientIp(req: Request): string {
    // 1. Check X-Forwarded-For (standard for most proxies/load balancers)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
        const ip = ips[0].trim();
        if (ip) return normalizeIp(ip);
    }

    // 2. Check X-Real-IP (often used by Nginx)
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
        const ip = Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
        if (ip) return normalizeIp(ip);
    }

    // 3. Fallback to NestJS/Express default req.ip
    if (req.ip) {
        return normalizeIp(req.ip);
    }

    // 4. Final fallback to socket address
    const remoteAddress = req.socket?.remoteAddress;
    if (remoteAddress) {
        return normalizeIp(remoteAddress);
    }

    return 'unknown';
}

/**
 * Normalizes IP addresses, specifically stripping IPv6-mapped IPv4 prefixes.
 * Example: ::ffff:127.0.0.1 -> 127.0.0.1
 */
function normalizeIp(ip: string): string {
    if (!ip) return ip;

    // Handle IPv6-mapped IPv4 addresses
    if (ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }

    // Clean up any potential bracketed IPv6 addresses
    return ip.replace(/^\[|\]$/g, '');
}
