/**
 * Menu State Module
 * Manages all state related to the menu editor
 */
export class MenuState {
    constructor() {
        this.menuItems = []
        this.menuHierarchy = []
        this.currentTheme = null
        this.currentMenuItem = null
        this.isDirty = false
        this.sortableInstances = []
    }

    /**
     * Set menu items and build hierarchy
     * @param {Array} items - The flat menu items array
     */
    setMenuItems(items) {
        this.menuItems = items
        this.buildMenuHierarchy()
    }

    /**
     * Build hierarchical menu from flat items
     */
    buildMenuHierarchy() {
        // Create a copy to avoid modifying the original
        const items = JSON.parse(JSON.stringify(this.menuItems))

        // Map for quick item lookup by ID
        const itemMap = new Map()

        // Initialize children arrays
        items.forEach((item) => {
            item.children = []
            itemMap.set(item.id, item)
        })

        // Build the tree
        const rootItems = []

        items.forEach((item) => {
            if (item.parent) {
                // This is a child item
                const parent = itemMap.get(item.parent)
                if (parent) {
                    // Add to parent's children
                    parent.children.push(item)
                } else {
                    // Parent not found, treat as root
                    console.warn(`Parent item "${item.parent}" not found for "${item.title}"`)
                    rootItems.push(item)
                }
            } else {
                // This is a root item
                rootItems.push(item)
            }
        })

        // Sort children arrays by order
        const sortChildren = (items) => {
            items.forEach((item) => {
                if (item.children && item.children.length > 0) {
                    item.children.sort((a, b) => (a.order || 0) - (b.order || 0))
                    sortChildren(item.children) // Recursively sort grandchildren
                }
            })
        }

        sortChildren(rootItems)

        // Store the hierarchy
        this.menuHierarchy = rootItems
    }

    /**
     * Update the flat menu array from the hierarchy
     */
    updateFlatMenu() {
        // Flatten the hierarchy
        this.menuItems = []

        const flatten = (items, parent = null, order = 0) => {
            items.forEach((item, index) => {
                const flatItem = { ...item }
                delete flatItem.children

                // Set parent and order
                flatItem.parent = parent
                flatItem.order = order + index

                // Add to flat array
                this.menuItems.push(flatItem)

                // Process children
                if (item.children && item.children.length > 0) {
                    flatten(item.children, item.id, 0)
                }
            })
        }

        flatten(this.menuHierarchy)
    }

    /**
     * Find a menu item by ID (recursive)
     * @param {string} itemId - ID of the item to find
     * @param {Array} items - Array of items to search (defaults to menuHierarchy)
     * @returns {Object|null} The found item or null
     */
    findMenuItem(itemId, items = this.menuHierarchy) {
        for (const item of items) {
            if (item.id === itemId) {
                return item
            }

            if (item.children && item.children.length > 0) {
                const found = this.findMenuItem(itemId, item.children)
                if (found) return found
            }
        }

        return null
    }

    /**
     * Get siblings of an item (items at the same level)
     * @param {Object} item - The item to find siblings for
     * @returns {Array} Array of sibling items
     */
    getSiblings(item) {
        if (!item) return []

        if (!item.parent) {
            // Top level item
            return this.menuHierarchy
        } else {
            // Find the parent
            const parent = this.findMenuItem(item.parent)
            if (parent && parent.children) {
                return parent.children
            }
        }

        return []
    }

    /**
     * Remove an item and its children from the hierarchy
     * @param {string} itemId - ID of the item to remove
     * @param {Array} items - Array of items to search (defaults to menuHierarchy)
     * @returns {boolean} Whether the item was found and removed
     */
    removeItemFromHierarchy(itemId, items = this.menuHierarchy) {
        for (let i = 0; i < items.length; i++) {
            if (items[i].id === itemId) {
                // Found the item, remove it
                items.splice(i, 1)
                return true
            }

            // Check children
            if (items[i].children && items[i].children.length > 0) {
                const removed = this.removeItemFromHierarchy(itemId, items[i].children)
                if (removed) {
                    return true
                }
            }
        }

        return false
    }

    /**
     * Add a new item to the hierarchy
     * @param {Object} item - The item to add
     */
    addItemToHierarchy(item) {
        if (!item.parent) {
            // Add to root level
            this.menuHierarchy.push(item)
        } else {
            // Find the parent
            const parent = this.findMenuItem(item.parent)

            if (parent) {
                // Ensure parent has a children array
                if (!parent.children) {
                    parent.children = []
                }

                // Add to parent's children
                parent.children.push(item)
            } else {
                // Parent not found, add to root level
                console.warn(`Parent ${item.parent} not found for ${item.title}, adding to root level`)
                item.parent = null
                this.menuHierarchy.push(item)
            }
        }
    }

    /**
     * Mark the menu as dirty (has unsaved changes)
     */
    markAsDirty() {
        this.isDirty = true
        document.getElementById("save-menu").classList.add("active")
    }

    /**
     * Mark the menu as clean (no unsaved changes)
     */
    markAsClean() {
        this.isDirty = false
        document.getElementById("save-menu").classList.remove("active")
    }
}
