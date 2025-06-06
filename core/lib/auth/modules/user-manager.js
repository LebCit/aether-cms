/**
 * Manages user accounts
 */
import { join } from "node:path"
import { randomBytes } from "node:crypto"
import { readJsonFile, writeJsonFile } from "../utils/storage-utils.js"

export class UserManager {
    /**
     * @param {string} dataDir - Directory for storing user data
     * @param {Object} passwordService - Password service for hashing and verification
     */
    constructor(dataDir, passwordService) {
        this.dataDir = dataDir
        this.usersPath = join(dataDir, "users.json")
        this.passwordService = passwordService
        this.users = null
    }

    /**
     * Initialize the user manager
     */
    async initialize() {
        await this.loadUsers()
    }

    /**
     * Load users from file
     */
    async loadUsers() {
        try {
            this.users = await readJsonFile(this.usersPath, [])
        } catch (error) {
            console.error("Error loading users:", error)
            this.users = []
        }
    }

    /**
     * Save users to file
     */
    async saveUsers() {
        try {
            return await writeJsonFile(this.usersPath, this.users)
        } catch (error) {
            console.error("Error saving users:", error)
            return false
        }
    }

    /**
     * Create a new user
     * @param {Object} userData - User data
     * @returns {Object} Created user (without password)
     */
    async createUser(userData) {
        if (!this.users) {
            await this.loadUsers()
        }

        // Check if username or email already exists
        const existingUser = this.users.find(
            (user) => user.username === userData.username || user.email === userData.email
        )

        if (existingUser) {
            throw new Error("Username or email already exists")
        }

        // Hash the password with Argon2
        const passwordHash = await this.passwordService.hashPassword(userData.password)

        // Create the user
        const id = randomBytes(16).toString("hex")
        const createdAt = new Date().toISOString()

        const user = {
            id,
            username: userData.username,
            email: userData.email,
            passwordHash,
            role: userData.role || "editor",
            createdAt,
            updatedAt: createdAt,
        }

        this.users.push(user)
        await this.saveUsers()

        // Return the user without sensitive data
        const { passwordHash: ph, ...safeUser } = user
        return safeUser
    }

    /**
     * Get a user by their credentials
     * @param {string} username - Username
     * @returns {Object|null} User object or null if not found
     */
    async getUserByUsername(username) {
        if (!this.users) {
            await this.loadUsers()
        }

        return this.users.find((user) => user.username === username) || null
    }

    /**
     * Get all users
     * @returns {Array} Array of users (without password data)
     */
    async getUsers() {
        if (!this.users) {
            await this.loadUsers()
        }

        // Return users without sensitive data
        return this.users.map((user) => {
            const { passwordHash, ...safeUser } = user
            return safeUser
        })
    }

    /**
     * Get a user by ID
     * @param {string} id - User ID
     * @returns {Object|null} User object or null if not found
     */
    async getUser(id) {
        if (!this.users) {
            await this.loadUsers()
        }

        const user = this.users.find((user) => user.id === id)
        if (!user) {
            return null
        }

        // Return the user without sensitive data
        const { passwordHash, ...safeUser } = user
        return safeUser
    }

    /**
     * Update a user
     * @param {string} id - User ID
     * @param {Object} userData - Updated user data
     * @returns {Object|null} Updated user or null if not found
     */
    async updateUser(id, userData) {
        if (!this.users) {
            await this.loadUsers()
        }

        const index = this.users.findIndex((user) => user.id === id)
        if (index === -1) {
            return null
        }

        const user = this.users[index]

        // Check if username or email is being changed and if it conflicts
        if (
            (userData.username && userData.username !== user.username) ||
            (userData.email && userData.email !== user.email)
        ) {
            const existingUser = this.users.find(
                (u) =>
                    u.id !== id &&
                    ((userData.username && u.username === userData.username) ||
                        (userData.email && u.email === userData.email))
            )

            if (existingUser) {
                throw new Error("Username or email already exists")
            }
        }

        // Handle password change if provided
        let passwordHash = user.passwordHash

        if (userData.password) {
            passwordHash = await this.passwordService.hashPassword(userData.password)
        }

        // Update the user
        const updatedUser = {
            ...user,
            username: userData.username || user.username,
            email: userData.email || user.email,
            passwordHash,
            role: userData.role || user.role,
            updatedAt: new Date().toISOString(),
        }

        this.users[index] = updatedUser
        await this.saveUsers()

        // Return the user without sensitive data
        const { passwordHash: ph, ...safeUser } = updatedUser
        return safeUser
    }

    /**
     * Delete a user
     * @param {string} id - User ID
     * @returns {boolean} Success or failure
     */
    async deleteUser(id) {
        if (!this.users) {
            await this.loadUsers()
        }

        // Don't allow deleting the last admin
        const adminUsers = this.users.filter((user) => user.role === "admin")
        if (adminUsers.length === 1 && adminUsers[0].id === id) {
            throw new Error("Cannot delete the last admin user")
        }

        const initialLength = this.users.length
        this.users = this.users.filter((user) => user.id !== id)

        if (this.users.length === initialLength) {
            return false // User not found
        }

        await this.saveUsers()
        return true
    }
}
