/**
 * Main AuthManager class that orchestrates all auth-related modules
 */
import { UserManager } from "./modules/user-manager.js"
import { SessionManager } from "./modules/session-manager.js"
import { PasswordService } from "./modules/password-service.js"
import { RateLimiter } from "./modules/rate-limiter.js"

/**
 * Manages user authentication and permissions
 */
export class AuthManager {
    /**
     * @param {string} dataDir - Directory for storing user data
     */
    constructor(dataDir) {
        this.dataDir = dataDir

        // Initialize services
        this.passwordService = new PasswordService()

        // Initialize managers with dependencies
        this.userManager = new UserManager(dataDir, this.passwordService)
        this.sessionManager = new SessionManager(dataDir)
        this.rateLimiter = new RateLimiter(dataDir)

        // Initialize
        this.initialize()
    }

    /**
     * Initialize the auth manager
     */
    async initialize() {
        try {
            // Initialize all sub-managers
            await this.userManager.initialize()
            await this.sessionManager.initialize()
            await this.rateLimiter.initialize()

            // Create default admin user if no users exist
            const users = await this.userManager.getUsers()
            if (users.length === 0) {
                console.log("Creating default admin user...")
                await this.createUser({
                    username: "admin",
                    password: "admin", // This will be hashed in createUser
                    email: "admin@example.com",
                    role: "admin",
                })
                console.log("Default admin user created. Username: admin, Password: admin")
            }
        } catch (error) {
            console.error("Error initializing auth manager:", error)
        }
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Object} Created user (without password)
     */
    async createUser(userData) {
        return await this.userManager.createUser(userData)
    }

    /**
     * Authenticate a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Object|null} Authentication result or null if failed
     */
    async authenticateUser(username, password) {
        // Check rate limiting first
        const rateLimitCheck = this.rateLimiter.checkRateLimit(username)
        if (rateLimitCheck.isLimited) {
            throw new Error(rateLimitCheck.message)
        }

        // Find the user
        const user = await this.userManager.getUserByUsername(username)
        if (!user) {
            // Increment attempts even for non-existent users to prevent username enumeration
            await this.rateLimiter.recordFailedAttempt(username)
            return null
        }

        // Verify the password
        const isValid = await this.passwordService.verifyPassword(password, user.passwordHash)
        if (!isValid) {
            // Increment failed attempts
            await this.rateLimiter.recordFailedAttempt(username)
            return null
        }

        // Reset login attempts on successful authentication
        await this.rateLimiter.resetAttempts(username)

        // Create a session
        const sessionData = await this.sessionManager.createSession(user.id)

        // Return the session data and user info (without password)
        const { passwordHash, ...safeUser } = user
        return {
            user: safeUser,
            token: sessionData.token,
            expiresAt: sessionData.expiresAt,
        }
    }

    /**
     * Verify an authentication token
     * @param {string} token - Authentication token
     * @returns {boolean} Whether the token is valid
     */
    async verifyToken(token) {
        return await this.sessionManager.verifyToken(token)
    }

    /**
     * Get a user by their token
     * @param {string} token - Authentication token
     * @returns {Object|null} User object or null if not found
     */
    async getUserFromToken(token) {
        const userId = this.sessionManager.getUserIdFromToken(token)
        if (!userId) {
            return null
        }

        return await this.userManager.getUser(userId)
    }

    /**
     * Invalidate a token (logout)
     * @param {string} token - Authentication token
     * @returns {boolean} Success or failure
     */
    async invalidateToken(token) {
        return await this.sessionManager.invalidateToken(token)
    }

    /**
     * Get all users
     * @returns {Array} Array of users (without password data)
     */
    async getUsers() {
        return await this.userManager.getUsers()
    }

    /**
     * Get a user by ID
     * @param {string} id - User ID
     * @returns {Object|null} User object or null if not found
     */
    async getUser(id) {
        return await this.userManager.getUser(id)
    }

    /**
     * Update a user
     * @param {string} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Object|null} Updated user or null if not found
     */
    async updateUser(id, userData) {
        return await this.userManager.updateUser(id, userData)
    }

    /**
     * Delete a user
     * @param {string} id - User ID
     * @returns {boolean} Success or failure
     */
    async deleteUser(id) {
        const success = await this.userManager.deleteUser(id)

        if (success) {
            // Also remove all sessions for this user
            await this.sessionManager.invalidateUserSessions(id)
        }

        return success
    }

    /**
     * Hash a password (utility method exposed for compatibility)
     * @param {string} password - Password to hash
     * @returns {Promise<string>} - Hashed password
     */
    async hashPassword(password) {
        return await this.passwordService.hashPassword(password)
    }

    /**
     * Verify a password (utility method exposed for compatibility)
     * @param {string} password - Password to verify
     * @param {string} hash - Stored hash
     * @returns {Promise<boolean>} - True if password matches
     */
    async verifyPassword(password, hash) {
        return await this.passwordService.verifyPassword(password, hash)
    }

    /**
     * Creates a middleware function that adds edit permission data to the request object
     * @param {Object} signedCookies - The signedCookies utility
     * @returns {Function} Middleware function compatible with LiteNode
     */
    createEditPermissionsMiddleware(signedCookies) {
        return async (req, res) => {
            // Default values
            req.isEditable = false
            req.currentUser = null

            try {
                // Check if user is logged in by retrieving the auth token from cookie
                const token =
                    req.headers.authorization?.split(" ")[1] || (await signedCookies.getCookie(req, "authToken"))

                // Only perform auth checks if a token exists
                if (token) {
                    // Verify token and get user without redirecting or sending error responses
                    const isValidToken = await this.verifyToken(token)
                    if (isValidToken) {
                        req.currentUser = await this.getUserFromToken(token)
                        // User must be admin or editor to edit content
                        req.isEditable =
                            req.currentUser && (req.currentUser.role === "admin" || req.currentUser.role === "editor")
                    }
                }
            } catch (error) {
                // Silent fail - just means the user can't edit
                console.error("Auth check error:", error)
            }
        }
    }
}
