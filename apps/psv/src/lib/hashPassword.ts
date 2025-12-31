/**
 * Password hashing utilities for demo mode.
 * Uses SHA-256 via Web Crypto API (browser-native, zero dependencies).
 *
 * NOTE: This is for demo/development only.
 * Production should use bcrypt/argon2 on the backend.
 */

/**
 * Hash a password using SHA-256.
 * @param password - The plaintext password
 * @returns A hex-encoded hash string (64 characters)
 */
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Verify a password against a stored hash.
 * @param password - The plaintext password to verify
 * @param hash - The stored hash to compare against
 * @returns True if the password matches the hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}
