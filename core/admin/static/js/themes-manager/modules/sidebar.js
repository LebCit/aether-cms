/**
 * Theme Sidebar class with update functionality
 */
export class ThemeSidebar {
    constructor(manager) {
        this.manager = manager
        this.elements = {
            themeSidebar: null,
            sidebarOverlay: null,
            sidebarContent: null,
            closeSidebar: null,
            sidebarThemeTitle: null,
            sidebarThemeDescription: null,
            sidebarThemeVersion: null,
            sidebarThemeAuthor: null,
            themePreview: null,
            sidebarThemeFeatures: null,
            sidebarThemeTags: null,
            themeStatusMessage: null,
            activateThemeBtn: null,
            updateThemeBtn: null, // New update button
            deleteThemeBtn: null,
        }
        this.currentTheme = null
    }

    /**
     * Initialize the module
     */
    init() {
        // Cache DOM elements
        this.elements.themeSidebar = document.getElementById("theme-sidebar")
        this.elements.sidebarOverlay = document.getElementById("theme-sidebar-overlay")
        this.elements.closeSidebar = document.getElementById("close-sidebar")
        this.elements.sidebarContent = document.getElementById("sidebar-content")
        this.elements.sidebarThemeTitle = document.getElementById("sidebar-theme-title")
        this.elements.sidebarThemeDescription = document.getElementById("sidebar-theme-description")
        this.elements.sidebarThemeVersion = document.getElementById("sidebar-theme-version")
        this.elements.sidebarThemeAuthor = document.getElementById("sidebar-theme-author")
        this.elements.themePreview = document.querySelector(".theme-full-preview")
        this.elements.sidebarThemeFeatures = document.getElementById("sidebar-theme-features")
        this.elements.sidebarThemeTags = document.getElementById("sidebar-theme-tags")
        this.elements.themeStatusMessage = document.getElementById("theme-status-message")
        this.elements.activateThemeBtn = document.getElementById("activate-theme")
        this.elements.updateThemeBtn = document.getElementById("update-theme") // New update button
        this.elements.deleteThemeBtn = document.getElementById("delete-theme")

        // Attach event listeners
        this.attachEventListeners()
    }

    /**
     * Attach event listeners to sidebar elements
     */
    attachEventListeners() {
        // Close sidebar
        if (this.elements.closeSidebar) {
            this.elements.closeSidebar.addEventListener("click", () => {
                this.close()
            })
        }

        // Close sidebar when clicking overlay
        if (this.elements.sidebarOverlay) {
            this.elements.sidebarOverlay.addEventListener("click", () => {
                this.close()
            })
        }

        // Escape key to close sidebar
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.elements.themeSidebar.classList.contains("active")) {
                this.close()
            }
        })

        // Activate theme button
        if (this.elements.activateThemeBtn) {
            this.elements.activateThemeBtn.addEventListener("click", () => {
                if (this.currentTheme) {
                    this.manager.actions.activateTheme(this.currentTheme)
                }
            })
        }

        // Update theme button
        if (this.elements.updateThemeBtn) {
            this.elements.updateThemeBtn.addEventListener("click", () => {
                if (this.currentTheme) {
                    this.manager.updates.showUpdateModal(this.currentTheme)
                }
            })
        }

        // Delete theme button
        if (this.elements.deleteThemeBtn) {
            this.elements.deleteThemeBtn.addEventListener("click", () => {
                if (this.currentTheme) {
                    this.manager.actions.showDeleteConfirmation(this.currentTheme)
                }
            })
        }
    }

    /**
     * Open the theme sidebar with details
     * @param {string} themeName - Name of the theme
     */
    async open(themeName) {
        try {
            // Get theme details from the server
            const response = await fetch(`/api/themes/${themeName}`)
            const data = await response.json()

            if (data.success) {
                this.currentTheme = themeName
                const theme = data.data

                // Reset sidebar content scroll position to top
                this.elements.sidebarContent.scrollTop = 0

                // Update sidebar with theme details
                this.elements.sidebarThemeTitle.textContent = theme.info.title
                this.elements.sidebarThemeDescription.textContent =
                    theme.info.description || "No description available."
                this.elements.sidebarThemeVersion.textContent = theme.info.version || "N/A"
                this.elements.sidebarThemeAuthor.textContent = theme.info.author || "Unknown"

                // Update theme preview
                if (theme.info.screenshot) {
                    this.elements.themePreview.innerHTML = `<img src="/content/themes/${theme.name}/${theme.info.screenshot}" alt="${theme.info.title} screenshot">`
                } else {
                    this.elements.themePreview.innerHTML = `<div class="no-screenshot"><span>No Preview</span></div>`
                }

                // Update features
                if (theme.info.features && theme.info.features.length > 0) {
                    this.elements.sidebarThemeFeatures.innerHTML = theme.info.features
                        .map((feature) => `<span class="feature-badge">${feature}</span>`)
                        .join("")
                } else {
                    this.elements.sidebarThemeFeatures.innerHTML = "<span>No features specified</span>"
                }

                // Update tags
                if (theme.info.tags && theme.info.tags.length > 0) {
                    this.elements.sidebarThemeTags.innerHTML = theme.info.tags
                        .map((tag) => `<span class="tag-badge">${tag}</span>`)
                        .join("")
                } else {
                    this.elements.sidebarThemeTags.innerHTML = "<span>No tags specified</span>"
                }

                // Update status message
                const isActive =
                    theme.name === document.querySelector(".theme-card.active").getAttribute("data-theme-name")

                if (isActive) {
                    this.elements.themeStatusMessage.textContent = "This theme is currently active"
                    this.elements.themeStatusMessage.classList.add("active")
                    this.elements.activateThemeBtn.disabled = true
                } else {
                    this.elements.themeStatusMessage.textContent = ""
                    this.elements.themeStatusMessage.classList.remove("active")
                    this.elements.activateThemeBtn.disabled = false
                }

                // Show the sidebar and overlay
                this.elements.themeSidebar.classList.add("active")
                this.elements.sidebarOverlay.classList.add("active")

                // Prevent body scrolling
                document.body.classList.add("sidebar-open")

                // Check and show update information for this theme
                if (this.manager.updates) {
                    this.manager.updates.updateSidebarForTheme(themeName)
                }
            } else {
                this.manager.utils.showToast("Failed to load theme details", "error")
            }
        } catch (error) {
            console.error("Error fetching theme details:", error)
            this.manager.utils.showToast("Failed to load theme details", "error")
        }
    }

    /**
     * Close the sidebar
     */
    close() {
        this.elements.themeSidebar.classList.remove("active")
        this.elements.sidebarOverlay.classList.remove("active")
        this.currentTheme = null

        // Restore body scrolling
        document.body.classList.remove("sidebar-open")
    }

    /**
     * Update the sidebar status after theme activation
     */
    updateAfterActivation() {
        this.elements.themeStatusMessage.textContent = "This theme is currently active"
        this.elements.themeStatusMessage.classList.add("active")
        this.elements.activateThemeBtn.disabled = true

        // Hide update button if theme becomes active
        if (this.elements.updateThemeBtn) {
            this.elements.updateThemeBtn.style.display = "none"
        }
    }

    /**
     * Get the current theme name
     * @returns {string|null} Current theme name
     */
    getCurrentTheme() {
        return this.currentTheme
    }
}
