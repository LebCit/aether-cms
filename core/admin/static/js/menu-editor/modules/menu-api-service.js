/**
 * Menu API Service Module
 * Handles all API calls for the menu editor
 */
export class MenuApiService {
    /**
     * Get the active theme
     * @returns {Promise<Object>} Theme data
     */
    async getActiveTheme() {
        try {
            const response = await fetch("/api/themes/active")
            return await response.json()
        } catch (error) {
            console.error("Error fetching active theme:", error)
            return { success: false, error: "Failed to fetch active theme" }
        }
    }

    /**
     * Get menu items
     * @returns {Promise<Object>} Menu items data
     */
    async getMenuItems() {
        try {
            // Use the new global menu endpoint
            const response = await fetch("/api/menu")
            return await response.json()
        } catch (error) {
            console.error("Error fetching menu items:", error)
            return { success: false, error: "Failed to fetch menu items" }
        }
    }

    /**
     * Save menu items
     * @param {Array} menuItems - The menu items to save
     * @returns {Promise<Object>} Response data
     */
    async saveMenuItems(menuItems) {
        try {
            // Use the new global menu endpoint
            const response = await fetch("/api/menu", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(menuItems),
            })

            return await response.json()
        } catch (error) {
            console.error("Error saving menu:", error)
            return { success: false, error: "Failed to save menu" }
        }
    }

    /**
     * Create a menu item
     * @param {Object} menuItem - The menu item to create
     * @returns {Promise<Object>} Response data
     */
    async createMenuItem(menuItem) {
        try {
            const response = await fetch("/api/menu", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(menuItem),
            })

            return await response.json()
        } catch (error) {
            console.error("Error creating menu item:", error)
            return { success: false, error: "Failed to create menu item" }
        }
    }

    /**
     * Update a menu item
     * @param {string} id - The ID of the menu item to update
     * @param {Object} updates - The updates to apply
     * @returns {Promise<Object>} Response data
     */
    async updateMenuItem(id, updates) {
        try {
            const response = await fetch(`/api/menu/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updates),
            })

            return await response.json()
        } catch (error) {
            console.error("Error updating menu item:", error)
            return { success: false, error: "Failed to update menu item" }
        }
    }

    /**
     * Delete a menu item
     * @param {string} id - The ID of the menu item to delete
     * @returns {Promise<Object>} Response data
     */
    async deleteMenuItem(id) {
        try {
            const response = await fetch(`/api/menu/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            return await response.json()
        } catch (error) {
            console.error("Error deleting menu item:", error)
            return { success: false, error: "Failed to delete menu item" }
        }
    }

    /**
     * Reorder menu items
     * @param {Array<string>} orderedIds - The IDs of the menu items in their new order
     * @returns {Promise<Object>} Response data
     */
    async reorderMenuItems(orderedIds) {
        try {
            const response = await fetch("/api/menu/reorder", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ orderedIds }),
            })

            return await response.json()
        } catch (error) {
            console.error("Error reordering menu items:", error)
            return { success: false, error: "Failed to reorder menu items" }
        }
    }
}
