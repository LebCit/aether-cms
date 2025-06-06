/**
 * Manages authentication sessions
 */
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import { readJsonFile, writeJsonFile } from "../utils/storage-utils.js"

export class SessionManager {
    /**
     * @param {string} dataDir - Directory for storing session data
     */
    constructor(dataDir) {
        this.sessionsPath = join(dataDir, "sessions.json")
        this.sessions = null
    }

    /**
     * Initialize the session manager
     */
    async initialize() {
        await this.loadSessions()
    }

    /**
     * Load sessions from file
     */
    async loadSessions() {
        try {
            this.sessions = await readJsonFile(this.sessionsPath, [])

            // Clean up expired sessions
            const now = Date.now()
            this.sessions = this.sessions.filter((session) => session.expiresAt > now)

            await this.saveSessions()
        } catch (error) {
            console.error("Error loading sessions:", error)
            this.sessions = []
        }
    }

    /**
     * Save sessions to file
     */
    async saveSessions() {
        try {
            return await writeJsonFile(this.sessionsPath, this.sessions)
        } catch (error) {
            console.error("Error saving sessions:", error)
            return false
        }
    }

    /**
     * Create a new session for a user
     * @param {string} userId - User ID
     * @param {number} expiresInMs - Session expiration time in milliseconds (default: 24 hours)
     * @returns {Object} Session data with token and expiration
     */
    async createSession(userId, expiresInMs = 24 * 60 * 60 * 1000) {
        const token = randomBytes(32).toString("hex")
        const now = Date.now()
        const expiresAt = now + expiresInMs

        const session = {
            token,
            userId,
            createdAt: now,
            expiresAt,
        }

        this.sessions.push(session)
        await this.saveSessions()

        return {
            token,
            expiresAt,
        }
    }

    /**
     * Verify a session token
     * @param {string} token - Session token to verify
     * @returns {boolean} Whether the token is valid
     */
    async verifyToken(token) {
        if (!this.sessions) {
            await this.loadSessions()
        }

        // Find the session
        const session = this.sessions.find((session) => session.token === token)
        if (!session) {
            return false
        }

        // Check if the session has expired
        if (session.expiresAt < Date.now()) {
            // Remove expired session
            this.sessions = this.sessions.filter((s) => s.token !== token)
            await this.saveSessions()
            return false
        }

        return true
    }

    /**
     * Get user ID from a token
     * @param {string} token - Session token
     * @returns {string|null} User ID or null if token is invalid
     */
    getUserIdFromToken(token) {
        const session = this.sessions.find((session) => session.token === token)
        return session ? session.userId : null
    }

    /**
     * Invalidate a token (logout)
     * @param {string} token - Session token to invalidate
     * @returns {boolean} Success or failure
     */
    async invalidateToken(token) {
        const initialLength = this.sessions.length
        this.sessions = this.sessions.filter((session) => session.token !== token)

        if (this.sessions.length === initialLength) {
            return false // Session not found
        }

        await this.saveSessions()
        return true
    }

    /**
     * Invalidate all sessions for a specific user
     * @param {string} userId - User ID
     * @returns {boolean} Success or failure
     */
    async invalidateUserSessions(userId) {
        const initialLength = this.sessions.length
        this.sessions = this.sessions.filter((session) => session.userId !== userId)

        if (this.sessions.length === initialLength) {
            return false // No sessions for this user
        }

        await this.saveSessions()
        return true
    }
}
