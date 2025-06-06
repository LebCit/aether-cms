/**
 * Theme Menu Editor - Main module
 * Updated to work with the global menu system
 */

import { MenuState } from "./modules/menu-state.js"
import { MenuRenderer } from "./modules/menu-renderer.js"
import { MenuFormHandler } from "./modules/menu-form-handler.js"
import { MenuApiService } from "./modules/menu-api-service.js"
import { NotificationService } from "./modules/notification-service.js"

document.addEventListener("DOMContentLoaded", function () {
    // Create instances of services and modules
    const apiService = new MenuApiService()
    const notification = new NotificationService()
    const state = new MenuState()
    const renderer = new MenuRenderer(state, notification)
    const formHandler = new MenuFormHandler(state, renderer, notification)

    // Initialize the menu editor
    initMenuEditor()

    /**
     * Initialize the menu editor
     */
    async function initMenuEditor() {
        try {
            // Get active theme (for display purposes only)
            const themeData = await apiService.getActiveTheme()

            if (themeData.success) {
                state.currentTheme = themeData.data.name

                // Load menu items (now from the global menu)
                await loadMenuItems()

                // Add event listeners
                addEventListeners()
            } else {
                notification.showError("Failed to load active theme")
            }
        } catch (error) {
            console.error("Error initializing menu editor:", error)
            notification.showError("Failed to initialize menu editor")
        }
    }

    /**
     * Load menu items from the global menu
     */
    async function loadMenuItems() {
        try {
            const data = await apiService.getMenuItems()

            if (data.success) {
                // Store flat menu items and build hierarchy
                state.setMenuItems(data.data)

                // Render the menu
                renderer.renderMenuItems()
            } else {
                notification.showError("Failed to load menu items")
            }
        } catch (error) {
            console.error("Error loading menu items:", error)
            notification.showError("Failed to load menu items")
        }
    }

    /**
     * Add event listeners
     */
    function addEventListeners() {
        // Add new menu item button
        document.getElementById("add-menu-item").addEventListener("click", () => {
            formHandler.openMenuItemForm()
        })

        // Save menu button
        document.getElementById("save-menu").addEventListener("click", saveMenu)

        // Window beforeunload event (unsaved changes warning)
        window.addEventListener("beforeunload", (e) => {
            if (state.isDirty) {
                e.preventDefault()
                e.returnValue = "You have unsaved changes. Are you sure you want to leave?"
                return e.returnValue
            }
        })
    }

    /**
     * Save the current menu
     */
    async function saveMenu() {
        if (!state.isDirty) {
            return
        }

        try {
            // Disable save button while saving
            const saveMenuBtn = document.getElementById("save-menu")
            saveMenuBtn.disabled = true
            saveMenuBtn.innerHTML = '<span class="spinner-small"></span> Saving...'

            // Make the API request with the flat menu items array
            const data = await apiService.saveMenuItems(state.menuItems)

            if (data.success) {
                state.markAsClean()
                notification.showSuccess("Menu saved successfully")
            } else {
                notification.showError(`Failed to save menu: ${data.error || "Unknown error"}`)
            }
        } catch (error) {
            console.error("Error saving menu:", error)
            notification.showError("Failed to save menu. Please try again.")
        } finally {
            // Reset save button
            const saveMenuBtn = document.getElementById("save-menu")
            saveMenuBtn.disabled = false
            saveMenuBtn.textContent = "💾 Save Menu"
        }
    }
})
