/**
 * Theme UI class for grid management
 */
export class ThemeUI {
    constructor(manager) {
        this.manager = manager
        this.elements = {
            themesGrid: null,
            uploadButton: null,
            emptyUploadButton: null,
        }
    }

    /**
     * Initialize the module
     */
    init() {
        // Cache DOM elements
        this.elements.themesGrid = document.getElementById("themes-grid")
        this.elements.uploadButton = document.getElementById("upload-theme-button")
        this.elements.emptyUploadButton = document.getElementById("empty-upload-button")

        // Attach event listeners
        this.attachEventListeners()
    }

    /**
     * Attach event listeners to theme grid elements
     */
    attachEventListeners() {
        // Theme card click
        if (this.elements.themesGrid) {
            this.elements.themesGrid.addEventListener("click", (e) => {
                const themeCard = e.target.closest(".theme-card")
                if (themeCard) {
                    const themeName = themeCard.getAttribute("data-theme-name")
                    this.manager.sidebar.open(themeName)
                }
            })
        }

        // Upload buttons
        if (this.elements.uploadButton) {
            this.elements.uploadButton.addEventListener("click", () => {
                this.manager.uploader.togglePanel()
            })
        }

        if (this.elements.emptyUploadButton) {
            this.elements.emptyUploadButton.addEventListener("click", () => {
                this.manager.uploader.togglePanel()
            })
        }
    }

    /**
     * Update the theme grid to reflect changes
     * @param {string} activeThemeName - Name of the active theme
     */
    updateActiveTheme(activeThemeName) {
        document.querySelectorAll(".theme-card").forEach((card) => {
            card.classList.remove("active")
            card.querySelector(".theme-badge")?.remove()
        })

        const newActiveCard = document.querySelector(`.theme-card[data-theme-name="${activeThemeName}"]`)
        if (newActiveCard) {
            newActiveCard.classList.add("active")

            // Add the active badge
            const previewDiv = newActiveCard.querySelector(".theme-preview")
            const badge = document.createElement("div")
            badge.className = "theme-badge"
            badge.textContent = "Active"
            previewDiv.appendChild(badge)
        }
    }

    /**
     * Remove a theme card from the grid
     * @param {string} themeName - Name of the theme to remove
     */
    removeThemeCard(themeName) {
        const themeCard = document.querySelector(`.theme-card[data-theme-name="${themeName}"]`)
        if (themeCard) {
            themeCard.remove()
        }

        // If no themes left, show empty state
        if (document.querySelectorAll(".theme-card").length === 0) {
            window.location.reload() // Reload to show empty state
        }
    }
}
