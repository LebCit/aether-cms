/**
 * User Service
 * Handles all API interactions for user management
 */
class UserService {
    /**
     * Get the currently logged in user
     * @returns {Promise<Object>} Current user data
     */
    async getCurrentUser() {
        try {
            const response = await fetch("/api/users/me")
            const data = await response.json()

            if (data.success) {
                return data.data
            }
            throw new Error(data.error || "Failed to fetch current user")
        } catch (error) {
            console.error("Error fetching current user:", error)
            throw error
        }
    }

    /**
     * Get all users
     * @returns {Promise<Array>} Array of users
     */
    async getUsers() {
        try {
            const response = await fetch("/api/users")
            const data = await response.json()

            if (data.success) {
                return data.data
            }
            throw new Error(data.error || "Failed to fetch users")
        } catch (error) {
            console.error("Error fetching users:", error)
            throw error
        }
    }

    /**
     * Create a new user
     * @param {Object} userData - User data to create
     * @returns {Promise<Object>} Created user data
     */
    async createUser(userData) {
        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })

            const data = await response.json()

            if (data.success) {
                return data.data
            }
            throw new Error(data.error || "Failed to create user")
        } catch (error) {
            console.error("Error creating user:", error)
            throw error
        }
    }

    /**
     * Update an existing user
     * @param {string} userId - ID of the user to update
     * @param {Object} userData - User data to update
     * @returns {Promise<Object>} Updated user data
     */
    async updateUser(userId, userData) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            })

            const data = await response.json()

            if (data.success) {
                return data.data
            }
            throw new Error(data.error || "Failed to update user")
        } catch (error) {
            console.error("Error updating user:", error)
            throw error
        }
    }

    /**
     * Delete a user
     * @param {string} userId - ID of the user to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteUser(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userId),
            })

            const data = await response.json()

            if (data.success) {
                return true
            }
            throw new Error(data.error || "Failed to delete user")
        } catch (error) {
            console.error("Error deleting user:", error)
            throw error
        }
    }
}

// Export a singleton instance
export const userService = new UserService()
