/**
 * Service for password hashing and verification
 */
import argon2 from "argon2"

export class PasswordService {
    /**
     * Hash a password using Argon2
     * @param {string} password - Password to hash
     * @returns {Promise<string>} - Hashed password
     */
    async hashPassword(password) {
        try {
            // Argon2 generates salt internally and includes it in the hash
            const hash = await argon2.hash(password, {
                type: argon2.argon2id, // Hybrid approach, good balance of security
                memoryCost: 65536, // 64 MB in KB
                timeCost: 3, // Number of iterations
                parallelism: 2, // Number of threads
            })

            return hash // This includes salt, memory cost, etc.
        } catch (error) {
            console.error("Error hashing password:", error)
            throw error
        }
    }

    /**
     * Verify a password against a hash
     * @param {string} password - Password to verify
     * @param {string} hash - Stored hash
     * @returns {Promise<boolean>} - True if password matches
     */
    async verifyPassword(password, hash) {
        try {
            return await argon2.verify(hash, password)
        } catch (error) {
            console.error("Error verifying password:", error)
            return false
        }
    }
}
