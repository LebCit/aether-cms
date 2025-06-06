/**
 * UI Manager
 * Handles UI state and DOM manipulations for the user management interface
 */
import { formatDate } from "./utils.js"

class UIManager {
    constructor() {
        // DOM Elements
        this.addUserButton = document.getElementById("add-user-button")
        this.userFormPanel = document.getElementById("user-form-panel")
        this.closePanel = document.getElementById("close-panel")
        this.userForm = document.getElementById("user-form")
        this.panelTitle = document.getElementById("panel-title")
        this.cancelForm = document.getElementById("cancel-form")
        this.userSearch = document.getElementById("user-search")
        this.searchButton = document.getElementById("search-button")
        this.usersTableBody = document.getElementById("users-table-body")
        this.loadingState = document.getElementById("loading-state")
        this.emptyState = document.getElementById("empty-state")
        this.deleteUserModal = document.getElementById("delete-user-modal")
        this.cancelDeleteUser = document.getElementById("cancel-delete-user")
        this.confirmDeleteUser = document.getElementById("confirm-delete-user")
        this.deleteWarning = document.getElementById("delete-warning")
        this.passwordField = document.getElementById("password")
        this.passwordHelp = document.getElementById("password-help")
    }

    /**
     * Render the users list in the table
     * @param {Array} users - Array of user objects to render
     * @param {string} filterQuery - Filter query to apply (optional)
     */
    renderUsersList(users, filterQuery = "") {
        if (!this.usersTableBody) return

        // Clear the table
        this.usersTableBody.innerHTML = ""

        // Filter users if search query exists
        const filteredUsers = users.filter((user) => {
            if (!filterQuery) return true

            return (
                user.username.toLowerCase().includes(filterQuery) ||
                user.email.toLowerCase().includes(filterQuery) ||
                user.role.toLowerCase().includes(filterQuery)
            )
        })

        if (filteredUsers.length === 0) {
            const noResults = document.createElement("tr")
            noResults.innerHTML = `
                <td colspan="5" class="no-results">No users found matching your search.</td>
            `
            this.usersTableBody.appendChild(noResults)
            return
        }

        // Return empty array if no users to render
        return filteredUsers
    }

    /**
     * Add a user row to the table
     * @param {Object} user - User data to render
     * @param {Function} onEdit - Edit callback function
     * @param {Function} onDelete - Delete callback function
     */
    addUserRow(user, onEdit, onDelete) {
        if (!this.usersTableBody) return

        const row = document.createElement("tr")
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${user.role}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="user-actions">
                    <button class="action-button edit-button" data-id="${user.id}" title="Edit">✏️</button>
                    <button class="action-button delete-button" data-id="${user.id}" title="Delete">🗑️</button>
                </div>
            </td>
        `

        // Add event listeners to action buttons
        const editButton = row.querySelector(".edit-button")
        const deleteButton = row.querySelector(".delete-button")

        if (editButton && onEdit) {
            editButton.addEventListener("click", () => onEdit(user.id))
        }

        if (deleteButton && onDelete) {
            deleteButton.addEventListener("click", () => onDelete(user.id))
        }

        this.usersTableBody.appendChild(row)
    }

    /**
     * Show the user form for creation or editing
     * @param {Object} userData - User data for editing (null for creation)
     */
    showUserForm(userData = null) {
        if (!this.userFormPanel || !this.userForm) return

        // Reset form
        this.userForm.reset()

        const userIdField = document.getElementById("user-id")
        const usernameField = document.getElementById("username")
        const emailField = document.getElementById("email")
        const roleField = document.getElementById("role")

        if (userData) {
            // Edit existing user
            userIdField.value = userData.id
            usernameField.value = userData.username
            emailField.value = userData.email
            roleField.value = userData.role

            // Disable username for existing users
            usernameField.disabled = true

            // Update password field help text
            this.passwordHelp.textContent = "Leave blank to keep current password."
            this.passwordField.required = false

            // Update panel title
            this.panelTitle.textContent = "Edit User"
        } else {
            // Create new user
            userIdField.value = ""

            // Enable username for new users
            usernameField.disabled = false

            // Update password field help text
            this.passwordHelp.textContent = "Password for the new user."
            this.passwordField.required = true

            // Update panel title
            this.panelTitle.textContent = "Add New User"
        }

        // Show the form panel
        this.userFormPanel.classList.add("active")

        // Focus on the first field
        usernameField.focus()
    }

    /**
     * Hide the user form
     */
    hideUserForm() {
        if (!this.userFormPanel) return
        this.userFormPanel.classList.remove("active")
    }

    /**
     * Show delete confirmation modal
     * @param {Object} userData - User data to delete
     * @param {boolean} isLastAdmin - Is this the last admin user
     * @param {boolean} isOwnAccount - Is this the current user's account
     */
    showDeleteConfirmation(userData, isLastAdmin, isOwnAccount) {
        if (!this.deleteUserModal || !userData) return

        // Show warning if necessary
        if (isLastAdmin || isOwnAccount) {
            this.deleteWarning.classList.remove("hidden")
            this.confirmDeleteUser.disabled = true
        } else {
            this.deleteWarning.classList.add("hidden")
            this.confirmDeleteUser.disabled = false
        }

        // Show the modal
        this.deleteUserModal.classList.add("show")
    }

    /**
     * Hide delete confirmation modal
     */
    hideDeleteModal() {
        if (!this.deleteUserModal) return
        this.deleteUserModal.classList.remove("show")
    }

    /**
     * Set delete button state to loading
     * @param {boolean} isLoading - Whether the delete is in progress
     */
    setDeleteButtonLoading(isLoading) {
        if (!this.confirmDeleteUser) return

        if (isLoading) {
            this.confirmDeleteUser.innerHTML = '<span class="spinner-sm"></span> Deleting...'
            this.confirmDeleteUser.disabled = true
        } else {
            this.confirmDeleteUser.innerHTML = "Delete"
            this.confirmDeleteUser.disabled = false
        }
    }

    /**
     * Show or hide the loading state
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        if (this.loadingState) {
            this.loadingState.classList.toggle("hidden", !show)
        }
    }

    /**
     * Show or hide the empty state
     * @param {boolean} show - Whether to show empty state
     */
    showEmptyState(show) {
        if (this.emptyState) {
            this.emptyState.classList.toggle("hidden", !show)
        }

        // Also show/hide the table
        const table = document.querySelector(".users-table")
        if (table) {
            table.style.display = show ? "none" : "table"
        }
    }

    /**
     * Get form data as an object
     * @returns {Object} Form data object
     */
    getFormData() {
        if (!this.userForm) return null

        const formData = new FormData(this.userForm)
        const userData = {
            username: formData.get("username"),
            email: formData.get("email"),
            role: formData.get("role"),
        }

        // Only include password if it's not empty
        const password = formData.get("password")
        if (password) {
            userData.password = password
        }

        return userData
    }
}

// Export a singleton instance
export const uiManager = new UIManager()
