/**
 * Rate limiter for login attempts
 */
import { join } from "node:path"
import { readJsonFile, writeJsonFile } from "../utils/storage-utils.js"

export class RateLimiter {
    /**
     * @param {string} dataDir - Directory for storing rate limit data
     */
    constructor(dataDir) {
        this.loginAttemptsPath = join(dataDir, "login-attempts.json")
        this.loginAttempts = new Map()

        // Configuration
        this.maxAttempts = 5 // Maximum login attempts before lockout
        this.lockoutPeriod = 15 * 60 * 1000 // 15 minutes in milliseconds
    }

    /**
     * Initialize the rate limiter
     */
    async initialize() {
        await this.loadLoginAttempts()
    }

    /**
     * Load login attempts from file
     */
    async loadLoginAttempts() {
        try {
            const attemptsArray = await readJsonFile(this.loginAttemptsPath, [])

            // Convert array to Map
            this.loginAttempts = new Map()
            for (const item of attemptsArray) {
                this.loginAttempts.set(item.key, item.value)
            }

            // Clean up expired attempts
            this.cleanupLoginAttempts()
        } catch (error) {
            console.error("Error loading login attempts:", error)
            this.loginAttempts = new Map()
        }
    }

    /**
     * Save login attempts to file
     */
    async saveLoginAttempts() {
        try {
            // Convert Map to array for serialization
            const attemptsArray = Array.from(this.loginAttempts.entries()).map(([key, value]) => ({
                key,
                value,
            }))

            return await writeJsonFile(this.loginAttemptsPath, attemptsArray)
        } catch (error) {
            console.error("Error saving login attempts:", error)
            return false
        }
    }

    /**
     * Clean up expired login attempts
     */
    cleanupLoginAttempts() {
        const now = Date.now()
        for (const [key, value] of this.loginAttempts.entries()) {
            // If this is a timestamp key and it's older than lockout period, remove it and its counter
            if (key.endsWith("_time") && now - value > this.lockoutPeriod) {
                const username = key.replace("_time", "")
                this.loginAttempts.delete(username)
                this.loginAttempts.delete(key)
            }
        }
    }

    /**
     * Check if a username is currently rate limited
     * @param {string} username - Username to check
     * @returns {Object} Result with isLimited and timeRemaining properties
     */
    checkRateLimit(username) {
        const attempts = this.loginAttempts.get(username) || 0

        if (attempts >= this.maxAttempts) {
            const lastAttemptTime = this.loginAttempts.get(`${username}_time`) || 0

            if (Date.now() - lastAttemptTime < this.lockoutPeriod) {
                // Calculate time remaining in minutes
                const timeRemaining = Math.ceil((this.lockoutPeriod - (Date.now() - lastAttemptTime)) / 60000)

                return {
                    isLimited: true,
                    timeRemaining,
                    message: `Account temporarily locked. Try again in ${timeRemaining} minutes.`,
                }
            } else {
                // Reset after lockout period
                this.loginAttempts.set(username, 0)
                this.saveLoginAttempts()
            }
        }

        return { isLimited: false }
    }

    /**
     * Record a failed login attempt
     * @param {string} username - Username to record attempt for
     */
    async recordFailedAttempt(username) {
        const attempts = this.loginAttempts.get(username) || 0
        this.loginAttempts.set(username, attempts + 1)
        this.loginAttempts.set(`${username}_time`, Date.now())
        await this.saveLoginAttempts()
    }

    /**
     * Reset login attempts for a username (on successful login)
     * @param {string} username - Username to reset
     */
    async resetAttempts(username) {
        this.loginAttempts.set(username, 0)
        await this.saveLoginAttempts()
    }
}
