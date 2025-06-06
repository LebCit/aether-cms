/**
 * Enhanced Theme Marketplace with Update Functionality
 */
export class ThemeMarketplace {
    constructor(manager) {
        this.manager = manager
        this.themes = []
        this.filteredThemes = []
        this.categories = []
        this.currentSearch = ""
        this.currentCategory = ""
        this.currentSort = "date"
        this.isLoading = false

        // Track installation status
        this.installedThemes = new Map() // themeName -> version
        this.updateData = new Map() // themeName -> update info

        this.elements = {
            content: null,
            loadingState: null,
            searchInput: null,
            categorySelect: null,
            sortSelect: null,
            themesGrid: null,
            refreshBtn: null,

            // Modal elements
            modal: null,
            modalStatusIndicator: null,
            modalInstallationStatus: null,
            modalVersionInfo: null,
            modalCurrentVersionInfo: null,
            modalUpdateBtn: null,
            changelogPreviewContainer: null,
            changelogPreviewList: null,
            toggleChangelogBtn: null,

            // Checking updates overlay
            checkingUpdatesOverlay: null,
        }

        this.themeCardTemplate = null
        this.currentModalTheme = null
    }

    /**
     * Initialize marketplace functionality
     */
    async init() {
        // Cache template elements - they're now already in the DOM
        this.cacheElements()

        // Load categories
        await this.loadCategories()

        // Get the theme card template
        this.themeCardTemplate = document.getElementById("marketplace-theme-card-template")

        // Add event listeners
        this.attachEventListeners()

        // Load initial data and check for updates
        await this.refreshInstalledThemes()
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Existing elements
        this.elements.content = document.getElementById("marketplace-content")
        this.elements.loadingState = document.getElementById("marketplace-loading")
        this.elements.searchInput = document.getElementById("marketplace-search")
        this.elements.categorySelect = document.getElementById("marketplace-category")
        this.elements.sortSelect = document.getElementById("marketplace-sort")
        this.elements.themesGrid = document.getElementById("marketplace-themes-grid")
        this.elements.refreshBtn = document.getElementById("refresh-marketplace")
        this.elements.errorState = document.getElementById("marketplace-error")
        this.elements.emptyState = document.getElementById("marketplace-empty")
        this.elements.themesCount = document.getElementById("themes-count")

        // Modal elements
        this.elements.modal = document.getElementById("marketplace-theme-modal")
        this.elements.modalStatusIndicator = document.getElementById("modal-status-indicator")
        this.elements.modalInstallationStatus = document.getElementById("modal-installation-status")
        this.elements.modalVersionInfo = document.getElementById("modal-version-info")
        this.elements.modalCurrentVersionInfo = document.getElementById("modal-current-version-info")
        this.elements.modalUpdateBtn = document.getElementById("marketplace-modal-update-btn")
        this.elements.changelogPreviewContainer = document.getElementById("changelog-preview-container")
        this.elements.changelogPreviewList = document.getElementById("changelog-preview-list")
        this.elements.toggleChangelogBtn = document.getElementById("toggle-full-changelog")

        // Checking updates overlay
        this.elements.checkingUpdatesOverlay = document.getElementById("marketplace-checking-updates")

        // Original modal elements
        this.elements.modalTitle = document.getElementById("modal-theme-title")
        this.elements.modalInstallBtn = document.getElementById("modal-install-btn")
        this.elements.modalCloseBtn = document.getElementById("modal-close-btn")
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Existing event listeners
        this.elements.searchInput.addEventListener("input", (e) => {
            clearTimeout(this.searchTimeout)
            this.searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value
                this.searchThemes()
            }, 300)
        })

        // Category filter
        this.elements.categorySelect.addEventListener("change", (e) => {
            this.currentCategory = e.target.value
            this.searchThemes()
        })

        // Sort select
        this.elements.sortSelect.addEventListener("change", (e) => {
            this.currentSort = e.target.value
            this.sortThemes()
        })

        // Refresh button
        this.elements.refreshBtn.addEventListener("click", () => {
            this.loadThemes(true)
        })

        // Retry button
        document.querySelector(".retry-btn")?.addEventListener("click", () => {
            this.loadThemes()
        })

        // Theme grid clicks
        this.elements.themesGrid.addEventListener("click", (e) => {
            const themeCard = e.target.closest(".marketplace-theme-card")
            if (themeCard) {
                const themeName = themeCard.dataset.themeName
                this.showThemeDetails(themeName)
            }
        })

        // Modal events
        this.elements.modal.querySelector(".close-modal").addEventListener("click", () => {
            this.closeModal()
        })

        this.elements.modalCloseBtn.addEventListener("click", () => {
            this.closeModal()
        })

        this.elements.modalInstallBtn.addEventListener("click", () => {
            this.installTheme(this.elements.modalInstallBtn.dataset.themeName)
        })

        // New: Update button event listener
        this.elements.modalUpdateBtn.addEventListener("click", () => {
            this.updateTheme(this.currentModalTheme)
        })

        // New: Changelog toggle
        this.elements.toggleChangelogBtn?.addEventListener("click", () => {
            this.toggleFullChangelog()
        })

        this.elements.modal.addEventListener("click", (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal()
            }
        })

        // Tab switching
        document.querySelector(".themes-tab-nav").addEventListener("click", (e) => {
            if (e.target.classList.contains("tab-btn")) {
                this.handleTabSwitch(e.target.dataset.tab)
            }
        })
    }

    /**
     * Handle tab switching between installed and marketplace
     */
    async handleTabSwitch(tab) {
        const tabButtons = document.querySelectorAll(".tab-btn")
        const installedContent = document.getElementById("installed-themes-content")
        const marketplaceContent = document.getElementById("marketplace-content")

        // Update tab buttons
        tabButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tab)
        })

        // Show/hide content
        if (tab === "marketplace") {
            installedContent.classList.add("hidden")
            marketplaceContent.classList.remove("hidden")
            await this.loadThemes()
            // Check for updates when switching to marketplace
            await this.refreshInstalledThemes()
        } else {
            installedContent.classList.remove("hidden")
            marketplaceContent.classList.add("hidden")
        }
    }

    /**
     * Refresh installed themes data
     */
    async refreshInstalledThemes() {
        try {
            const response = await fetch("/api/themes")
            const result = await response.json()

            if (result.success) {
                this.installedThemes.clear()
                result.data.forEach((theme) => {
                    this.installedThemes.set(theme.name, theme.info.version)
                })

                // Check for updates
                await this.checkMarketplaceUpdates()
            }
        } catch (error) {
            console.error("Error refreshing installed themes:", error)
        }
    }

    /**
     * Check for updates on marketplace themes
     */
    async checkMarketplaceUpdates() {
        if (this.themes.length === 0) return

        this.showCheckingUpdates(true)

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

                // Update theme cards to show update indicators
                this.updateThemeCards()
            }
        } catch (error) {
            console.error("Error checking marketplace updates:", error)
        } finally {
            this.showCheckingUpdates(false)
        }
    }

    /**
     * Show/hide checking updates overlay
     */
    showCheckingUpdates(show) {
        if (this.elements.checkingUpdatesOverlay) {
            this.elements.checkingUpdatesOverlay.classList.toggle("active", show)
        }
    }

    /**
     * Create a theme card from template with update indicators
     */
    createThemeCard(theme, index) {
        // Clone the template
        const card = this.themeCardTemplate.content.cloneNode(true).firstElementChild

        // Set animation delay for staggered effect
        card.style.setProperty("--index", index)

        // Populate the card
        card.dataset.themeName = theme.marketplaceName

        const img = card.querySelector(".theme-preview img")
        img.src = theme.screenshotUrl || "/core/admin/static/images/theme-placeholder.svg"
        img.alt = `${theme.title} preview`

        card.querySelector(".theme-title").textContent = theme.title
        card.querySelector(".theme-description").textContent = this.truncateText(theme.description, 100)

        const meta = card.querySelector(".theme-meta")
        meta.querySelector(".version").textContent = `v${theme.version}`
        meta.querySelector(".author").textContent = `by ${theme.author}`
        meta.querySelector(".updated").textContent = this.formatDate(theme.lastUpdated)

        // Check installation status
        const isInstalled = this.installedThemes.has(theme.marketplaceName)
        const installedBadge = card.querySelector(".marketplace-installed-badge")

        if (isInstalled) {
            installedBadge.style.display = "block"

            // Check for updates
            const installedVersion = this.installedThemes.get(theme.marketplaceName)
            const update = this.updateData.get(theme.marketplaceName)

            if (update) {
                // Show update badge and version info
                const updateBadge = card.querySelector(".marketplace-update-badge")
                const versionUpdate = card.querySelector(".theme-version-update")
                const currentVersionSpan = card.querySelector(".current-version")

                updateBadge.style.display = "block"
                versionUpdate.style.display = "inline"
                currentVersionSpan.textContent = installedVersion

                // Add update indicator class for styling
                card.classList.add("has-update")
            }
        }

        // Add tags
        const tagsContainer = card.querySelector(".theme-tags")
        tagsContainer.innerHTML = theme.tags
            .slice(0, 3)
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join("")

        return card
    }

    /**
     * Show theme details modal with update functionality
     */
    async showThemeDetails(themeName) {
        try {
            const response = await fetch(`/api/themes/marketplace/${themeName}`)
            const result = await response.json()

            if (result.success) {
                const theme = result.data
                this.currentModalTheme = themeName

                // Update modal header
                this.elements.modalTitle.textContent = theme.title

                // Update theme details
                document.getElementById("modal-theme-screenshot").src =
                    theme.screenshotUrl || "/core/admin/static/images/theme-placeholder.svg"
                document.getElementById("modal-theme-description").textContent = theme.description
                document.getElementById("modal-theme-version").textContent = theme.version
                document.getElementById("modal-theme-author").textContent = theme.author
                document.getElementById("modal-theme-updated").textContent = this.formatDate(theme.lastUpdated)
                document.getElementById("modal-theme-license").textContent = theme.license

                // Features and tags
                document.getElementById("modal-theme-features").innerHTML =
                    theme.features?.map((feature) => `<span class="feature">${feature}</span>`).join("") ||
                    "No features listed"
                document.getElementById("modal-theme-tags").innerHTML =
                    theme.tags?.map((tag) => `<span class="tag">${tag}</span>`).join("") || "No tags"

                // Update status bar
                await this.updateModalStatus(themeName, theme)

                // Show modal
                this.elements.modal.classList.add("show")
            }
        } catch (error) {
            console.error("Error loading theme details:", error)
            this.manager.utils.showToast("Failed to load theme details", "error")
        }
    }

    /**
     * Update modal status bar and buttons
     */
    async updateModalStatus(themeName, theme) {
        const isInstalled = this.installedThemes.has(themeName)
        const update = this.updateData.get(themeName)

        // Update status indicator
        this.elements.modalStatusIndicator.className = "status-indicator"

        // Set the latest version info
        document.getElementById("modal-latest-version").textContent = theme.version

        if (isInstalled) {
            this.elements.modalInstallationStatus.textContent = "Installed"
            this.elements.modalStatusIndicator.classList.add("installed")

            // Show installed version info
            const installedVersion = this.installedThemes.get(themeName)
            this.elements.modalCurrentVersionInfo.style.display = "inline"
            document.getElementById("modal-current-version").textContent = installedVersion

            if (update) {
                // Update available
                this.elements.modalStatusIndicator.classList.add("update-available")
                this.elements.modalInstallationStatus.textContent = "Update Available"

                // Show update button, hide install button
                this.elements.modalInstallBtn.style.display = "none"
                this.elements.modalUpdateBtn.style.display = "inline-block"
                this.elements.modalUpdateBtn.dataset.themeName = themeName

                // Show version comparison
                const versionComparison = document.getElementById("modal-version-comparison")
                versionComparison.style.display = "block"
                document.getElementById("modal-from-version").textContent = installedVersion
                document.getElementById("modal-to-version").textContent = theme.version

                // Load and show changelog preview
                await this.loadChangelogPreview(themeName, installedVersion, theme.version)
            } else {
                // Already up to date
                this.elements.modalInstallBtn.textContent = "Already Installed"
                this.elements.modalInstallBtn.disabled = true
                this.elements.modalUpdateBtn.style.display = "none"
            }
        } else {
            // Not installed
            this.elements.modalInstallationStatus.textContent = "Not Installed"
            this.elements.modalCurrentVersionInfo.style.display = "none"
            this.elements.modalInstallBtn.style.display = "inline-block"
            this.elements.modalInstallBtn.textContent = "Install Theme"
            this.elements.modalInstallBtn.disabled = false
            this.elements.modalInstallBtn.dataset.themeName = themeName
            this.elements.modalUpdateBtn.style.display = "none"
            document.getElementById("modal-version-comparison").style.display = "none"
            this.elements.changelogPreviewContainer.style.display = "none"
        }
    }

    /**
     * Load changelog preview for updates
     */
    async loadChangelogPreview(themeName, currentVersion, latestVersion) {
        try {
            const response = await fetch(`/api/themes/marketplace/changelog/${encodeURIComponent(themeName)}`)
            const result = await response.json()

            if (result.success && result.data && result.data.fullChangelog && result.data.fullChangelog.length > 0) {
                // Show changelog preview
                this.elements.changelogPreviewContainer.style.display = "block"

                // Get first few items from the latest version
                const latestChanges = result.data.fullChangelog[0].changes.slice(0, 3)

                this.elements.changelogPreviewList.innerHTML = latestChanges
                    .map((change) => `<li>${change}</li>`)
                    .join("")

                // Show "Show More" if there are more changes
                const hasMoreChanges =
                    result.data.fullChangelog[0].changes.length > 3 || result.data.fullChangelog.length > 1

                this.elements.toggleChangelogBtn.style.display = hasMoreChanges ? "inline" : "none"
                this.elements.toggleChangelogBtn.dataset.expanded = "false"
                this.elements.toggleChangelogBtn.textContent = "Show More"

                // Store full changelog for expansion
                this.currentChangelog = result.data
            } else {
                this.elements.changelogPreviewContainer.style.display = "none"
            }
        } catch (error) {
            console.error("Error loading changelog:", error)
            this.elements.changelogPreviewContainer.style.display = "none"
        }
    }

    /**
     * Toggle full changelog display
     */
    toggleFullChangelog() {
        const isExpanded = this.elements.toggleChangelogBtn.dataset.expanded === "true"

        if (isExpanded) {
            // Collapse to preview
            const latestChanges = this.currentChangelog.fullChangelog[0].changes.slice(0, 3)
            this.elements.changelogPreviewList.innerHTML = latestChanges.map((change) => `<li>${change}</li>`).join("")
            this.elements.toggleChangelogBtn.textContent = "Show More"
            this.elements.toggleChangelogBtn.dataset.expanded = "false"
        } else {
            // Expand to show all
            let fullHtml = ""
            this.currentChangelog.fullChangelog.forEach((version) => {
                fullHtml += `<li><strong>v${version.version}:</strong></li>`
                version.changes.forEach((change) => {
                    fullHtml += `<li style="margin-left: 1rem;">• ${change}</li>`
                })
            })
            this.elements.changelogPreviewList.innerHTML = fullHtml
            this.elements.toggleChangelogBtn.textContent = "Show Less"
            this.elements.toggleChangelogBtn.dataset.expanded = "true"
        }
    }

    /**
     * Update a theme from marketplace
     */
    async updateTheme(themeName) {
        if (!themeName) return

        try {
            this.elements.modalUpdateBtn.disabled = true
            this.elements.modalUpdateBtn.innerHTML = '<span class="spinner-sm"></span> Updating...'

            const response = await fetch("/api/themes/marketplace/update", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ themeName }),
            })

            const result = await response.json()

            if (result.success) {
                this.manager.utils.showToast(`Theme updated successfully to v${result.data.info.version}`, "success")
                this.closeModal()

                // Important: Notify the updates module that a theme was updated
                if (this.manager.updates) {
                    await this.manager.updates.onThemeUpdated()
                }

                // Refresh installed themes and theme list
                await this.refreshInstalledThemes()
                await this.loadThemes(true)

                // Switch to installed themes tab to show the updated theme
                document.querySelector('.tab-btn[data-tab="installed"]').click()

                // Fallback: Reload if theme doesn't show updated status (edge case handling)
                setTimeout(() => {
                    const updatedTheme = document.querySelector(`.theme-card[data-theme-name="${themeName}"]`)
                    const version = updatedTheme?.querySelector(".theme-version")?.textContent
                    const hasUpdateBadge = updatedTheme?.querySelector('.theme-update-badge[style*="display: block"]')

                    if (!version || !version.includes(result.data.info.version) || hasUpdateBadge) {
                        console.warn(`Theme ${themeName} not showing updated status properly, reloading...`)
                        window.location.reload()
                    }
                }, 2000) // Increased timeout to allow for all updates to complete
            } else {
                this.manager.utils.showToast(`Update failed: ${result.error}`, "error")

                // Reset button state
                this.elements.modalUpdateBtn.disabled = false
                this.elements.modalUpdateBtn.innerHTML = "Update Theme"
            }
        } catch (error) {
            console.error("Theme update error:", error)
            this.manager.utils.showToast("Failed to update theme", "error")

            // Reset button state
            this.elements.modalUpdateBtn.disabled = false
            this.elements.modalUpdateBtn.innerHTML = "Update Theme"
        }
    }

    /**
     * Install theme from marketplace with update checks
     */
    async installTheme(themeName) {
        if (!themeName) return

        try {
            this.elements.modalInstallBtn.disabled = true
            this.elements.modalInstallBtn.innerHTML = '<span class="spinner-sm"></span> Installing...'

            const response = await fetch("/api/themes/marketplace/install", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ themeName }),
            })

            const result = await response.json()

            if (result.success) {
                this.manager.utils.showToast("Theme installed successfully", "success")
                this.closeModal()

                // Refresh installed themes and update marketplace display
                await this.refreshInstalledThemes()
                await this.loadThemes(true)

                // Switch to installed themes tab
                document.querySelector('.tab-btn[data-tab="installed"]').click()

                // Fallback: Reload if theme doesn't appear (edge case handling)
                setTimeout(() => {
                    if (!this.isThemeVisible(themeName)) {
                        console.warn(`Theme ${themeName} not visible after installation, reloading...`)
                        window.location.reload()
                    }
                }, 1500) // Increased timeout to allow for async operations
            } else {
                this.manager.utils.showToast(`Installation failed: ${result.error}`, "error")
                this.elements.modalInstallBtn.disabled = false
                this.elements.modalInstallBtn.textContent = "Install Theme"
            }
        } catch (error) {
            console.error("Installation error:", error)
            this.manager.utils.showToast("Installation failed", "error")
            this.elements.modalInstallBtn.disabled = false
            this.elements.modalInstallBtn.textContent = "Install Theme"
        }
    }

    /**
     * Load themes from marketplace with update awareness
     */
    async loadThemes(forceRefresh = false) {
        if (this.isLoading) return

        this.isLoading = true
        this.showLoadingState()

        try {
            const params = new URLSearchParams({
                search: this.currentSearch,
                category: this.currentCategory,
                sort: this.currentSort,
            })

            const response = await fetch(`/api/themes/marketplace?${params}`)
            const result = await response.json()

            if (result.success) {
                this.themes = result.data

                // Refresh installed themes data if forced or not available
                if (forceRefresh || this.installedThemes.size === 0) {
                    await this.refreshInstalledThemes()
                }

                this.renderThemes()
                this.updateStats()
            } else {
                this.showError()
            }
        } catch (error) {
            console.error("Error loading themes:", error)
            this.showError()
        } finally {
            this.isLoading = false
        }
    }

    /**
     * Update theme cards to reflect installation status and updates
     */
    updateThemeCards() {
        const cards = document.querySelectorAll(".marketplace-theme-card")

        cards.forEach((card) => {
            const themeName = card.dataset.themeName
            const isInstalled = this.installedThemes.has(themeName)
            const update = this.updateData.get(themeName)

            const installedBadge = card.querySelector(".marketplace-installed-badge")
            const updateBadge = card.querySelector(".marketplace-update-badge")
            const versionUpdate = card.querySelector(".theme-version-update")
            const currentVersionSpan = card.querySelector(".current-version")

            // Update installed status
            if (installedBadge) {
                installedBadge.style.display = isInstalled ? "block" : "none"
            }

            // Update version update indicators
            if (isInstalled && update) {
                if (updateBadge) updateBadge.style.display = "block"
                if (versionUpdate) {
                    versionUpdate.style.display = "inline"
                    if (currentVersionSpan) {
                        currentVersionSpan.textContent = this.installedThemes.get(themeName)
                    }
                }
                card.classList.add("has-update")
            } else {
                if (updateBadge) updateBadge.style.display = "none"
                if (versionUpdate) versionUpdate.style.display = "none"
                card.classList.remove("has-update")
            }
        })
    }

    /**
     * Render themes with update indicators
     */
    renderThemes() {
        if (this.themes.length === 0) {
            this.showEmptyState()
            return
        }

        // Clear existing themes
        this.elements.themesGrid.innerHTML = ""

        // Create a document fragment for better performance
        const fragment = document.createDocumentFragment()

        // Render each theme using template
        this.themes.forEach((theme, index) => {
            const card = this.createThemeCard(theme, index)
            fragment.appendChild(card)
        })

        // Add all cards at once
        this.elements.themesGrid.appendChild(fragment)

        this.hideLoadingState()
        this.hideEmptyState()
        this.hideError()
    }

    /**
     * Close theme details modal
     */
    closeModal() {
        this.elements.modal.classList.remove("show")
        this.currentModalTheme = null
        this.currentChangelog = null
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        this.elements.loadingState.classList.remove("hidden")
        this.elements.themesGrid.classList.add("hidden")
        this.elements.errorState.classList.add("hidden")
        this.elements.emptyState.classList.add("hidden")
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        this.elements.loadingState.classList.add("hidden")
        this.elements.themesGrid.classList.remove("hidden")
    }

    /**
     * Show error state
     */
    showError() {
        this.elements.errorState.classList.remove("hidden")
        this.elements.loadingState.classList.add("hidden")
        this.elements.themesGrid.classList.add("hidden")
        this.elements.emptyState.classList.add("hidden")
    }

    /**
     * Hide error state
     */
    hideError() {
        this.elements.errorState.classList.add("hidden")
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        this.elements.emptyState.classList.remove("hidden")
        this.elements.loadingState.classList.add("hidden")
        this.elements.themesGrid.classList.add("hidden")
        this.elements.errorState.classList.add("hidden")
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        this.elements.emptyState.classList.add("hidden")
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const count = this.themes.length
        const filtered = this.currentSearch || this.currentCategory
        const updateCount = Array.from(this.updateData.values()).length

        let text = `${count} theme${count !== 1 ? "s" : ""}`
        if (filtered) {
            text += " found"
        } else {
            text += " available"
        }

        if (updateCount > 0) {
            text += ` • ${updateCount} update${updateCount !== 1 ? "s" : ""} available`
        }

        this.elements.themesCount.textContent = text
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text
        return text.substr(0, maxLength) + "..."
    }

    /**
     * Check if a theme is visible in the installed themes list
     * @param {string} themeName - Name of the theme to check
     * @returns {boolean} True if theme is visible
     */
    isThemeVisible(themeName) {
        const installedContent = document.getElementById("installed-themes-content")
        if (!installedContent) return false

        const themeCards = installedContent.querySelectorAll(".theme-card")
        for (const card of themeCards) {
            if (card.dataset.themeName === themeName) {
                return true
            }
        }

        return false
    }

    /**
     * Search themes based on current filters
     */
    searchThemes() {
        this.loadThemes()
    }

    /**
     * Sort themes based on current selection
     */
    sortThemes() {
        this.loadThemes()
    }

    /**
     * Load categories from marketplace
     */
    async loadCategories() {
        try {
            const response = await fetch("/api/themes/marketplace/categories")
            const result = await response.json()

            if (result.success) {
                this.categories = result.data
                this.updateCategorySelect()
            }
        } catch (error) {
            console.error("Error loading categories:", error)
        }
    }

    /**
     * Update category select options
     */
    updateCategorySelect() {
        const select = this.elements.categorySelect

        // Clear existing options except first
        while (select.options.length > 1) {
            select.remove(1)
        }

        // Add category options
        this.categories.forEach((category) => {
            const option = document.createElement("option")
            option.value = category
            option.textContent = category
            select.appendChild(option)
        })
    }
}
