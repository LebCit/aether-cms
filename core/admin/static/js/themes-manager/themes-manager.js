/**
 * Theme Management System
 * Updated to include theme updates functionality
 */
import { ThemeActions } from "./modules/actions.js"
import { ThemeSidebar } from "./modules/sidebar.js"
import { ThemeUI } from "./modules/ui.js"
import { ThemeUploader } from "./modules/uploader.js"
import { ThemeUtils } from "./modules/utils.js"
import { ThemeMarketplace } from "./modules/marketplace.js"
import { ThemeUpdates } from "./modules/theme-updates.js"

/**
 * Enhanced Theme Manager with marketplace and updates functionality
 */
export class ThemeManager {
    constructor() {
        this.utils = new ThemeUtils()
        this.ui = new ThemeUI(this)
        this.uploader = new ThemeUploader(this)
        this.sidebar = new ThemeSidebar(this)
        this.actions = new ThemeActions(this)
        this.marketplace = new ThemeMarketplace(this)
        this.updates = new ThemeUpdates(this) // New updates module

        // Ready for initialization when called
        this.isInitialized = false

        // Cache notification template
        this.notificationTemplate = null
    }

    /**
     * Initialize all components
     * Should be called after DOM is ready
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn("Theme Manager is already initialized")
            return
        }

        try {
            // Cache the notification template
            this.notificationTemplate = document.getElementById("update-notification-template")

            // Initialize existing components
            this.ui.init()
            this.uploader.init()
            this.sidebar.init()
            this.actions.init()

            // Initialize marketplace functionality
            await this.marketplace.init()

            // Initialize updates functionality
            this.updates.init()

            // Mark as initialized
            this.isInitialized = true

            return true
        } catch (error) {
            console.error("Theme Manager initialization error:", error)
            return false
        }
    }

    /**
     * Check for theme updates in the background
     */
    async checkForUpdates() {
        return this.updates.checkForUpdates()
    }

    /**
     * Show update notification using template
     */
    showUpdateNotification(updates) {
        if (!this.notificationTemplate) {
            console.error("Update notification template not found")
            return
        }

        const updateCount = updates.length
        const message = `${updateCount} theme update${updateCount > 1 ? "s" : ""} available`

        // Clone the template
        const notification = this.notificationTemplate.content.cloneNode(true).firstElementChild

        // Populate the notification
        notification.querySelector(".notification-text").textContent = message

        // Add click handler for the action button
        const actionButton = notification.querySelector(".notification-action")
        actionButton.addEventListener("click", () => {
            // Switch to installed themes tab and show updates
            document.querySelector('.tab-btn[data-tab="installed"]').click()
            notification.remove()
        })

        // Add to page
        document.body.appendChild(notification)

        // Show notification with slight delay for animation
        setTimeout(() => notification.classList.add("show"), 100)

        // Auto-hide after 10 seconds
        setTimeout(() => {
            notification.classList.add("hide")
            setTimeout(() => notification.remove(), 300)
        }, 10000)
    }
}

// Initialize ThemeManager
document.addEventListener("DOMContentLoaded", async function () {
    const themeManager = new ThemeManager()
    const success = await themeManager.initialize()

    if (!success) {
        console.error("Failed to initialize Theme Manager")
    }
})
