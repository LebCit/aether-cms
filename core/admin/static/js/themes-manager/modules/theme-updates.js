/**
 * Theme Updates Module
 * Handles update checking, displaying, and updating themes
 */
export class ThemeUpdates {
    constructor(manager) {
        this.manager = manager
        this.updateData = new Map() // Store update information
        this.checkingUpdates = false
        this.installing = false
        this.recentlyUpdated = false // Flag to prevent notifications after updates

        // Cache DOM elements
        this.elements = {
            updateModal: null,
            updateModalContent: null,
            updateModalTitle: null,
            updateModalBody: null,
            updateModalClose: null,
            confirmUpdate: null,
            cancelUpdate: null,
            currentVersion: null,
            newVersion: null,
            changelogSection: null,
        }
    }

    /**
     * Initialize the updates module
     */
    init() {
        this.createUpdateModal()
        this.checkForUpdatesOnLoad()

        // Check for updates every 30 minutes
        setInterval(() => {
            this.checkForUpdates()
        }, 30 * 60 * 1000)
    }

    /**
     * Create update confirmation modal
     */
    createUpdateModal() {
        const modalHtml = `
            <div id="theme-update-modal" class="update-confirmation-modal">
                <div class="update-modal-content">
                    <div class="update-modal-header">
                        <h2 id="update-modal-title">Update Theme</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="update-modal-body">
                        <p>A new version of this theme is available.</p>
                        <div class="version-comparison">
                            <span>Current: v<span id="current-version"></span></span>
                            <span class="version-arrow">→</span>
                            <span>New: v<span id="new-version"></span></span>
                        </div>
                        <div class="changelog-section">
                            <h4>What's New</h4>
                            <p>View the latest features and improvements in this update.</p>
                        </div>
                    </div>
                    <div class="update-modal-footer">
                        <button id="cancel-update" class="btn btn-outline">Cancel</button>
                        <button id="confirm-update" class="btn btn-success">Update Theme</button>
                    </div>
                </div>
            </div>
        `

        // Add modal to body
        document.body.insertAdjacentHTML("beforeend", modalHtml)

        // Cache elements
        this.elements.updateModal = document.getElementById("theme-update-modal")
        this.elements.updateModalContent = this.elements.updateModal.querySelector(".update-modal-content")
        this.elements.updateModalTitle = document.getElementById("update-modal-title")
        this.elements.updateModalBody = this.elements.updateModal.querySelector(".update-modal-body")
        this.elements.updateModalClose = this.elements.updateModal.querySelector(".close-modal")
        this.elements.confirmUpdate = document.getElementById("confirm-update")
        this.elements.cancelUpdate = document.getElementById("cancel-update")
        this.elements.currentVersion = document.getElementById("current-version")
        this.elements.newVersion = document.getElementById("new-version")
        this.elements.changelogSection = this.elements.updateModal.querySelector(".changelog-section")

        // Attach event listeners
        this.attachModalListeners()
    }

    /**
     * Attach event listeners to modal elements
     */
    attachModalListeners() {
        // Close modal buttons
        this.elements.updateModalClose.addEventListener("click", () => this.hideUpdateModal())
        this.elements.cancelUpdate.addEventListener("click", () => this.hideUpdateModal())

        // Close modal on outside click
        this.elements.updateModal.addEventListener("click", (e) => {
            if (e.target === this.elements.updateModal) {
                this.hideUpdateModal()
            }
        })

        // Confirm update button
        this.elements.confirmUpdate.addEventListener("click", () => {
            this.updateTheme(this.currentThemeForUpdate)
        })
    }

    /**
     * Check for updates on initial load
     */
    async checkForUpdatesOnLoad() {
        await this.checkForUpdates()
    }

    /**
     * Check for updates for all installed themes
     */
    async checkForUpdates() {
        if (this.checkingUpdates) return

        this.checkingUpdates = true

        try {
            const response = await fetch("/api/themes/marketplace/check-updates")
            const result = await response.json()

            if (result.success && result.data) {
                // Clear previous update data
                this.updateData.clear()

                // Store update information
                result.data.forEach((update) => {
                    this.updateData.set(update.name, update)
                })

                // Update UI for each theme with updates
                this.updateThemeCards()

                // If sidebar is open, update it
                if (this.manager.sidebar && this.manager.sidebar.currentTheme) {
                    this.updateSidebarForTheme(this.manager.sidebar.currentTheme)
                }

                // Show global notification if there are updates
                if (result.data.length > 0) {
                    this.manager.showUpdateNotification(result.data)
                }
            }
        } catch (error) {
            console.error("Error checking for updates:", error)
        } finally {
            this.checkingUpdates = false
        }
    }

    /**
     * Update theme cards to show update indicators
     */
    updateThemeCards() {
        const themeCards = document.querySelectorAll(".theme-card")

        themeCards.forEach((card) => {
            const themeName = card.dataset.themeName
            const update = this.updateData.get(themeName)

            // Get elements
            const updateBadge = card.querySelector(".theme-update-badge")
            const versionUpdate = card.querySelector(".theme-version-update")
            const newVersionSpan = card.querySelector(".new-version")

            if (update) {
                // Show update badge
                if (updateBadge) updateBadge.style.display = "block"

                // Show version update indicator
                if (versionUpdate && newVersionSpan) {
                    newVersionSpan.textContent = update.latestVersion
                    versionUpdate.style.display = "inline"
                }
            } else {
                // Hide update indicators
                if (updateBadge) updateBadge.style.display = "none"
                if (versionUpdate) versionUpdate.style.display = "none"
            }
        })
    }

    /**
     * Update sidebar to show update information for a specific theme
     * @param {string} themeName - Name of the theme
     */
    updateSidebarForTheme(themeName) {
        const update = this.updateData.get(themeName)
        const updateInfo = document.getElementById("sidebar-update-available")
        const newVersionSpan = document.getElementById("sidebar-new-version")
        const updateButton = document.getElementById("update-theme")

        if (update) {
            // Show update information
            if (updateInfo && newVersionSpan) {
                newVersionSpan.textContent = update.latestVersion
                updateInfo.style.display = "inline-block"
            }

            // Show update button
            if (updateButton) {
                updateButton.style.display = "inline-block"
                updateButton.dataset.themeName = themeName

                // Prevent updating active theme
                const isActive = document
                    .querySelector(`.theme-card[data-theme-name="${themeName}"]`)
                    .classList.contains("active")
                updateButton.disabled = isActive

                if (isActive) {
                    updateButton.title = "Cannot update active theme. Switch to another theme first."
                }
            }
        } else {
            // Hide update information
            if (updateInfo) updateInfo.style.display = "none"
            if (updateButton) updateButton.style.display = "none"
        }
    }

    /**
     * Show update confirmation modal
     * @param {string} themeName - Name of theme to update
     */
    async showUpdateModal(themeName) {
        const update = this.updateData.get(themeName)
        if (!update) return

        // Update modal content
        this.elements.updateModalTitle.textContent = `Update ${update.title || themeName}`
        this.elements.currentVersion.textContent = update.currentVersion
        this.elements.newVersion.textContent = update.latestVersion

        // Store theme name for update
        this.currentThemeForUpdate = themeName

        // Load and display changelog
        await this.loadChangelog(themeName, update.currentVersion, update.latestVersion)

        // Show modal
        this.elements.updateModal.classList.add("show")
    }

    /**
     * Load and display changelog for a theme update
     * @param {string} themeName - Name of the theme
     * @param {string} currentVersion - Current installed version
     * @param {string} latestVersion - Latest available version
     */
    async loadChangelog(themeName, currentVersion, latestVersion) {
        const changelogSection = this.elements.changelogSection

        // Show loading state
        changelogSection.innerHTML = `
            <h4>What's New</h4>
            <div class="loading-changelog">
                <div class="spinner-sm"></div>
                <span>Loading changelog...</span>
            </div>
        `

        try {
            // Use the marketplace name if available, fallback to theme name
            const searchName = this.updateData.get(themeName)?.marketplaceName || themeName
            const response = await fetch(`/api/themes/marketplace/changelog/${encodeURIComponent(searchName)}`)
            const result = await response.json()

            if (result.success && result.data) {
                let changelogHtml = "<h4>What's New</h4>"

                if (result.data.fullChangelog && result.data.fullChangelog.length > 0) {
                    // Show all changes since the installed version
                    changelogHtml += '<div class="changelog-versions">'

                    for (const versionInfo of result.data.fullChangelog) {
                        changelogHtml += `
                            <div class="changelog-version">
                                <h5>Version ${versionInfo.version}</h5>
                                ${
                                    versionInfo.releaseDate
                                        ? `<span class="release-date">${new Date(
                                              versionInfo.releaseDate
                                          ).toLocaleDateString()}</span>`
                                        : ""
                                }
                                <ul class="changelog-items">
                                    ${versionInfo.changes.map((change) => `<li>${change}</li>`).join("")}
                                </ul>
                            </div>
                        `
                    }

                    changelogHtml += "</div>"
                } else if (result.data.latestChanges && result.data.latestChanges.length > 0) {
                    // Fallback to just latest version changes
                    changelogHtml += `
                        <div class="changelog-version">
                            <h5>Version ${latestVersion}</h5>
                            <ul class="changelog-items">
                                ${result.data.latestChanges.map((change) => `<li>${change}</li>`).join("")}
                            </ul>
                        </div>
                    `
                } else {
                    // No changelog available
                    changelogHtml += '<p class="no-changelog">No changelog available for this update.</p>'
                }

                changelogSection.innerHTML = changelogHtml
            } else {
                // Error loading changelog
                changelogSection.innerHTML = `
                    <h4>What's New</h4>
                    <p class="changelog-error">Unable to load changelog. ${result.error || ""}</p>
                `
            }
        } catch (error) {
            console.error("Error loading changelog:", error)
            changelogSection.innerHTML = `
                <h4>What's New</h4>
                <p class="changelog-error">Unable to load changelog at this time.</p>
            `
        }
    }

    /**
     * Hide update confirmation modal
     */
    hideUpdateModal() {
        this.elements.updateModal.classList.remove("show")
        this.currentThemeForUpdate = null
    }

    /**
     * Update a theme
     * @param {string} themeName - Name of theme to update
     */
    async updateTheme(themeName) {
        if (this.installing) return

        this.installing = true
        const confirmButton = this.elements.confirmUpdate

        try {
            // Show loading state with spinner
            confirmButton.classList.add("loading")
            confirmButton.disabled = true
            confirmButton.innerHTML = '<span class="spinner-sm"></span> Updating...'

            // Make update request
            const response = await fetch("/api/themes/marketplace/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ themeName }),
            })

            const result = await response.json()

            if (result.success) {
                // Hide modal
                this.hideUpdateModal()

                // Show success message
                this.manager.utils.showToast(`Theme updated successfully to v${result.data.info.version}`, "success")

                // Force refresh the update data
                await this.checkForUpdates()

                // Refresh theme list
                setTimeout(() => {
                    window.location.reload()
                }, 1500)
            } else {
                this.manager.utils.showToast(`Update failed: ${result.error}`, "error")
            }
        } catch (error) {
            console.error("Error updating theme:", error)
            this.manager.utils.showToast("Update failed. Please try again.", "error")
        } finally {
            this.installing = false
            confirmButton.classList.remove("loading")
            confirmButton.disabled = false
            confirmButton.innerHTML = "Update Theme"
        }
    }

    /**
     * Force refresh updates
     */
    async refreshUpdates() {
        // Set flag to prevent unwanted notification after update
        this.recentlyUpdated = true

        await this.checkForUpdates()
        this.manager.utils.showToast("Updates refreshed", "info")
    }

    /**
     * Called after a successful update to refresh all states
     */
    async onThemeUpdated() {
        // Set flag to prevent notification
        this.recentlyUpdated = true

        // Force refresh update data
        await this.checkForUpdates()

        // Also notify marketplace to refresh its state
        if (this.manager.marketplace) {
            await this.manager.marketplace.refreshInstalledThemes()
            await this.manager.marketplace.loadThemes(true)
        }
    }
}
