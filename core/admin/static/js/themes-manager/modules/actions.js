/**
 * Theme Actions class for activation and deletion
 */
export class ThemeActions {
    constructor(manager) {
        this.manager = manager
        this.elements = {
            activateThemeBtn: null,
            deleteThemeModal: null,
            deleteThemeWarning: null,
            cancelDeleteTheme: null,
            confirmDeleteTheme: null,
        }
        this.themeToDelete = null
    }

    /**
     * Initialize the module
     */
    init() {
        // Cache DOM elements
        this.elements.activateThemeBtn = document.getElementById("activate-theme")
        this.elements.deleteThemeModal = document.getElementById("delete-theme-modal")
        this.elements.deleteThemeWarning = document.getElementById("delete-theme-warning")
        this.elements.cancelDeleteTheme = document.getElementById("cancel-delete-theme")
        this.elements.confirmDeleteTheme = document.getElementById("confirm-delete-theme")

        // Attach event listeners
        this.attachEventListeners()
    }

    /**
     * Attach event listeners to action elements
     */
    attachEventListeners() {
        // Delete confirmation modal events
        if (this.elements.deleteThemeModal) {
            const closeButtons = this.elements.deleteThemeModal.querySelectorAll(".close-modal")
            closeButtons.forEach((btn) => {
                btn.addEventListener("click", () => this.hideDeleteModal())
            })
        }

        if (this.elements.cancelDeleteTheme) {
            this.elements.cancelDeleteTheme.addEventListener("click", () => this.hideDeleteModal())
        }

        if (this.elements.confirmDeleteTheme) {
            this.elements.confirmDeleteTheme.addEventListener("click", () => this.confirmDeleteThemeAction())
        }

        // Close modals when clicking outside
        window.addEventListener("click", (event) => {
            if (event.target === this.elements.deleteThemeModal) {
                this.hideDeleteModal()
            }
        })
    }

    /**
     * Activate a theme
     * @param {string} themeName - Name of the theme to activate
     */
    async activateTheme(themeName) {
        try {
            this.elements.activateThemeBtn.disabled = true
            this.elements.activateThemeBtn.innerHTML = '<span class="spinner-sm"></span> Activating...'

            const response = await fetch(`/api/themes/switch/${themeName}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(themeName),
            })

            const data = await response.json()

            if (data.success) {
                this.manager.utils.showToast(`Theme "${data.data.info.title}" activated successfully`, "success")

                // Update the UI to reflect the change
                this.manager.ui.updateActiveTheme(themeName)

                // Update the sidebar
                this.manager.sidebar.updateAfterActivation()

                // Optionally, reload the page after a short delay to apply theme changes
                setTimeout(() => {
                    window.location.reload()
                }, 1500)
            } else {
                this.manager.utils.showToast(`Failed to activate theme: ${data.error}`, "error")
                this.elements.activateThemeBtn.disabled = false
            }
        } catch (error) {
            console.error("Theme activation error:", error)
            this.manager.utils.showToast("Failed to activate theme", "error")
            this.elements.activateThemeBtn.disabled = false
        } finally {
            this.elements.activateThemeBtn.innerHTML = "Activate Theme"
        }
    }

    /**
     * Show delete confirmation modal
     * @param {string} themeName - The theme name to delete
     */
    showDeleteConfirmation(themeName) {
        this.themeToDelete = themeName

        // Check if it's the active theme
        const isActiveTheme = document
            .querySelector(`.theme-card[data-theme-name="${themeName}"]`)
            .classList.contains("active")

        // Update warning message
        if (isActiveTheme) {
            this.elements.deleteThemeWarning.innerHTML = `
                <div class="delete-theme-warning">
                    <strong>Warning:</strong> You cannot delete the active theme. 
                    Please activate another theme first.
                </div>
            `
            this.elements.confirmDeleteTheme.disabled = true
        } else {
            this.elements.deleteThemeWarning.innerHTML = ""
            this.elements.confirmDeleteTheme.disabled = false
        }

        // Show modal
        this.elements.deleteThemeModal.classList.add("show")
    }

    /**
     * Hide delete confirmation modal
     */
    hideDeleteModal() {
        this.elements.deleteThemeModal.classList.remove("show")
        this.themeToDelete = null
    }

    /**
     * Confirm theme deletion
     */
    async confirmDeleteThemeAction() {
        if (!this.themeToDelete) return

        try {
            this.elements.confirmDeleteTheme.disabled = true
            this.elements.confirmDeleteTheme.innerHTML = '<span class="spinner-sm"></span> Deleting...'

            const response = await fetch(`/api/themes/${this.themeToDelete}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.themeToDelete),
            })

            const data = await response.json()

            if (data.success) {
                this.manager.utils.showToast("Theme deleted successfully", "success")

                // Remove the theme card from the grid
                this.manager.ui.removeThemeCard(this.themeToDelete)

                // Close modals
                this.hideDeleteModal()
                this.manager.sidebar.close()
            } else {
                this.manager.utils.showToast(`Failed to delete theme: ${data.error}`, "error")
            }
        } catch (error) {
            console.error("Theme deletion error:", error)
            this.manager.utils.showToast("Failed to delete theme", "error")
        } finally {
            this.elements.confirmDeleteTheme.disabled = false
            this.elements.confirmDeleteTheme.innerHTML = "Delete"
        }
    }
}
