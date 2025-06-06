/**
 * User Manager
 * Main controller that coordinates user-related operations
 */
import { userService } from "./user-api-service.js"
import { uiManager } from "./ui.js"
import { toastManager } from "./toast.js"

class UserManager {
    constructor() {
        // State
        this.users = []
        this.currentUserId = null
        this.currentUserData = null
        this.filterQuery = ""
        this.currentUser = null // The logged in user
    }

    /**
     * Initialize the user manager
     */
    async init() {
        // Initialize current user
        await this.initCurrentUser()

        // Load users
        await this.loadUsers()

        // Set up event listeners
        this.setupEventListeners()
    }

    /**
     * Get current user info
     */
    async initCurrentUser() {
        try {
            this.currentUser = await userService.getCurrentUser()
        } catch (error) {
            console.error("Error fetching current user:", error)
        }
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Add user button
        if (uiManager.addUserButton) {
            uiManager.addUserButton.addEventListener("click", () => this.showUserForm())
        }

        // Close panel button
        if (uiManager.closePanel) {
            uiManager.closePanel.addEventListener("click", () => this.hideUserForm())
        }

        // Cancel form button
        if (uiManager.cancelForm) {
            uiManager.cancelForm.addEventListener("click", () => this.hideUserForm())
        }

        // Form submit
        if (uiManager.userForm) {
            uiManager.userForm.addEventListener("submit", (e) => {
                e.preventDefault()
                this.saveUser()
            })
        }

        // Search input
        if (uiManager.userSearch) {
            uiManager.userSearch.addEventListener("input", () => {
                this.filterQuery = uiManager.userSearch.value.trim().toLowerCase()
                this.renderUsers()
            })
        }

        // Search button
        if (uiManager.searchButton) {
            uiManager.searchButton.addEventListener("click", () => {
                this.filterQuery = uiManager.userSearch.value.trim().toLowerCase()
                this.renderUsers()
            })
        }

        // Modal event listeners
        if (uiManager.deleteUserModal) {
            const closeButtons = uiManager.deleteUserModal.querySelectorAll(".close-modal")
            closeButtons.forEach((btn) => {
                btn.addEventListener("click", () => this.hideDeleteModal())
            })
        }

        // Cancel delete button
        if (uiManager.cancelDeleteUser) {
            uiManager.cancelDeleteUser.addEventListener("click", () => this.hideDeleteModal())
        }

        // Confirm delete button
        if (uiManager.confirmDeleteUser) {
            uiManager.confirmDeleteUser.addEventListener("click", () => this.confirmDeleteUser())
        }

        // Close modal when clicking outside
        window.addEventListener("click", (event) => {
            if (event.target === uiManager.deleteUserModal) {
                this.hideDeleteModal()
            }
        })
    }

    /**
     * Load users from the API
     */
    async loadUsers() {
        try {
            uiManager.showLoading(true)

            this.users = await userService.getUsers()

            // Update UI
            if (this.users.length === 0) {
                uiManager.showEmptyState(true)
            } else {
                uiManager.showEmptyState(false)
                this.renderUsers()
            }
        } catch (error) {
            console.error("Error loading users:", error)
            uiManager.showEmptyState(true)
            toastManager.show("Failed to load users", "error")
        } finally {
            uiManager.showLoading(false)
        }
    }

    /**
     * Render users list
     */
    renderUsers() {
        const filteredUsers = uiManager.renderUsersList(this.users, this.filterQuery)

        if (!filteredUsers || filteredUsers.length === 0) {
            return
        }

        // Render each user
        filteredUsers.forEach((user) => {
            uiManager.addUserRow(
                user,
                (id) => this.editUser(id),
                (id) => this.showDeleteConfirmation(id)
            )
        })
    }

    /**
     * Show user form for creation
     */
    showUserForm(userId = null) {
        if (userId) {
            // Edit existing user
            const user = this.users.find((u) => u.id === userId)
            if (!user) return

            this.currentUserId = userId
            this.currentUserData = user
            uiManager.showUserForm(user)
        } else {
            // Create new user
            this.currentUserId = null
            this.currentUserData = null
            uiManager.showUserForm()
        }
    }

    /**
     * Hide user form
     */
    hideUserForm() {
        uiManager.hideUserForm()
        this.currentUserId = null
        this.currentUserData = null
    }

    /**
     * Edit user
     * @param {string} userId - User ID to edit
     */
    editUser(userId) {
        this.showUserForm(userId)
    }

    /**
     * Save user (create or update)
     */
    async saveUser() {
        try {
            const userData = uiManager.getFormData()

            if (!userData) {
                toastManager.show("Invalid form data", "error")
                return
            }

            // Password is required for new users
            if (!this.currentUserId && !userData.password) {
                toastManager.show("Password is required for new users", "error")
                return
            }

            let result

            if (this.currentUserId) {
                // Update existing user
                result = await userService.updateUser(this.currentUserId, userData)
                toastManager.show("User updated successfully", "success")
            } else {
                // Create new user
                result = await userService.createUser(userData)
                toastManager.show("User created successfully", "success")
            }

            // Reload users
            await this.loadUsers()

            // Hide the form
            this.hideUserForm()
        } catch (error) {
            toastManager.show(`Error: ${error.message || "Failed to save user"}`, "error")
        }
    }

    /**
     * Show delete confirmation modal
     * @param {string} userId - User ID to delete
     */
    showDeleteConfirmation(userId) {
        const user = this.users.find((u) => u.id === userId)
        if (!user) return

        // Store the user to delete
        this.currentUserId = userId
        this.currentUserData = user

        // Check if this is the last admin user
        const adminUsers = this.users.filter((u) => u.role === "admin")
        const isLastAdmin = adminUsers.length === 1 && adminUsers[0].id === userId && user.role === "admin"

        // Check if trying to delete own account
        const isOwnAccount = this.currentUser && this.currentUser.id === userId

        // Show delete confirmation
        uiManager.showDeleteConfirmation(user, isLastAdmin, isOwnAccount)
    }

    /**
     * Hide delete confirmation modal
     */
    hideDeleteModal() {
        uiManager.hideDeleteModal()
        this.currentUserId = null
        this.currentUserData = null
    }

    /**
     * Confirm user deletion
     */
    async confirmDeleteUser() {
        if (!this.currentUserId) return

        try {
            // Show loading state in button
            uiManager.setDeleteButtonLoading(true)

            await userService.deleteUser(this.currentUserId)

            // Show success message
            toastManager.show("User deleted successfully", "success")

            // Reload users
            await this.loadUsers()

            // Hide the modal
            this.hideDeleteModal()
        } catch (error) {
            // Show error message
            toastManager.show(`Error: ${error.message || "Failed to delete user"}`, "error")

            // Reset button
            uiManager.setDeleteButtonLoading(false)
        }
    }
}

// Export a singleton instance
export const userManager = new UserManager()
