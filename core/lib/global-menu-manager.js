/**
 * Global Menu Manager Module
 * Centralized menu management across all themes
 */
import { join } from "node:path"
import { readJsonFile, writeJsonFile } from "./theme/utils/file-utils.js"

export class GlobalMenuManager {
    /**
     * @param {string} dataDir - Directory containing site data
     */
    constructor(dataDir) {
        this.dataDir = dataDir
        this.menuPath = join(dataDir, "menu.json")
        this.menuItems = []
    }

    /**
     * Initialize the menu manager
     * @returns {Promise<boolean>} Success or failure
     */
    async initialize() {
        try {
            // Load the menu or create default
            await this.loadMenu()
            return true
        } catch (error) {
            console.error("Error initializing global menu manager:", error)
            return false
        }
    }

    /**
     * Load the menu from the data directory
     * @returns {Promise<Array>} Menu items
     */
    async loadMenu() {
        try {
            const menu = await readJsonFile(this.menuPath, { menu: this.getDefaultMenu() })
            this.menuItems = Array.isArray(menu.menu) ? menu.menu : this.getDefaultMenu()

            // Sort top-level items by order
            this.menuItems.sort((a, b) => (a.order || 0) - (b.order || 0))

            return this.menuItems
        } catch (error) {
            console.error("Error loading menu:", error)
            // Return default menu if loading fails
            this.menuItems = this.getDefaultMenu()
            return this.menuItems
        }
    }

    /**
     * Save the menu to the data directory
     * @param {Array} menuItems - The menu items to save
     * @returns {Promise<boolean>} Success or failure
     */
    async saveMenu(menuItems) {
        try {
            this.menuItems = menuItems
            return await writeJsonFile(this.menuPath, { menu: menuItems })
        } catch (error) {
            console.error("Error saving menu:", error)
            return false
        }
    }

    /**
     * Get the menu items
     * @returns {Array} Menu items
     */
    getMenuItems() {
        return this.menuItems
    }

    /**
     * Build a hierarchical menu structure from flat menu items
     * @param {Array} menuItems - Flat array of menu items with parent references
     * @returns {Array} Hierarchical menu structure
     */
    buildMenuHierarchy(menuItems) {
        // Exit early if no items
        if (!menuItems || !menuItems.length) return []

        // Create a copy to avoid modifying the original
        const items = JSON.parse(JSON.stringify(menuItems))

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
        return rootItems
    }

    /**
     * Flatten a hierarchical menu structure for storage
     * @param {Array} hierarchicalItems - Hierarchical menu structure
     * @returns {Array} Flat array of menu items with parent references
     */
    flattenMenuHierarchy(hierarchicalItems) {
        const flatItems = []

        // Recursive function to add items to the flat array
        const addToFlatItems = (items, parentId = null) => {
            items.forEach((item, index) => {
                // Create a copy without the children array
                const { children, ...flatItem } = item
                flatItem.order = index + 1
                flatItem.parent = parentId

                // Add to flat array
                flatItems.push(flatItem)

                // Process children
                if (children && children.length > 0) {
                    addToFlatItems(children, item.id)
                }
            })
        }

        addToFlatItems(hierarchicalItems)
        return flatItems
    }

    /**
     * Create a new menu item
     * @param {Object} menuItem - The menu item to create
     * @returns {Promise<boolean>} Success or failure
     */
    async createMenuItem(menuItem) {
        try {
            // Get current menu
            const currentMenu = await this.loadMenu()

            // Check if ID already exists
            if (currentMenu.some((item) => item.id === menuItem.id)) {
                throw new Error(`Menu item with ID "${menuItem.id}" already exists`)
            }

            // Add new item (with highest order + 1)
            const highestOrder = currentMenu.reduce((max, item) => Math.max(max, item.order || 0), 0)

            const newItem = {
                ...menuItem,
                order: highestOrder + 1,
            }

            // Add to menu and save
            currentMenu.push(newItem)
            return this.saveMenu(currentMenu)
        } catch (error) {
            console.error("Error creating menu item:", error)
            return false
        }
    }

    /**
     * Update a menu item
     * @param {string} id - ID of the menu item to update
     * @param {Object} updates - Properties to update
     * @returns {Promise<boolean>} Success or failure
     */
    async updateMenuItem(id, updates) {
        try {
            // Get current menu
            const currentMenu = await this.loadMenu()

            // Find and update the item
            const updatedMenu = currentMenu.map((item) => {
                if (item.id === id) {
                    return { ...item, ...updates }
                }
                return item
            })

            // Save updated menu
            return this.saveMenu(updatedMenu)
        } catch (error) {
            console.error("Error updating menu item:", error)
            return false
        }
    }

    /**
     * Delete a menu item
     * @param {string} id - ID of the menu item to delete
     * @returns {Promise<boolean>} Success or failure
     */
    async deleteMenuItem(id) {
        try {
            // Get current menu
            const currentMenu = await this.loadMenu()

            // Filter out the item to delete
            const updatedMenu = currentMenu.filter((item) => item.id !== id)

            // Check if anything was actually removed
            if (updatedMenu.length === currentMenu.length) {
                throw new Error(`Menu item with ID "${id}" not found`)
            }

            // Update children that reference this parent
            for (const item of updatedMenu) {
                if (item.parent === id) {
                    item.parent = null
                }
            }

            // Save updated menu
            return this.saveMenu(updatedMenu)
        } catch (error) {
            console.error("Error deleting menu item:", error)
            return false
        }
    }

    /**
     * Reorder menu items
     * @param {Array<string>} orderedIds - Array of menu item IDs in the new order
     * @returns {Promise<boolean>} Success or failure
     */
    async reorderMenuItems(orderedIds) {
        try {
            // Get current menu
            const currentMenu = await this.loadMenu()

            // Create a map for quick lookups
            const menuMap = new Map()
            currentMenu.forEach((item) => menuMap.set(item.id, item))

            // Create new ordered array
            const orderedMenu = orderedIds.map((id, index) => {
                const item = menuMap.get(id)
                if (!item) {
                    throw new Error(`Menu item with ID "${id}" not found`)
                }
                return {
                    ...item,
                    order: index + 1,
                }
            })

            // Add any items not in the ordered list (at the end)
            currentMenu.forEach((item) => {
                if (!orderedIds.includes(item.id)) {
                    orderedMenu.push(item)
                }
            })

            // Save the reordered menu
            return this.saveMenu(orderedMenu)
        } catch (error) {
            console.error("Error reordering menu items:", error)
            return false
        }
    }

    /**
     * Generate HTML for the menu
     * @returns {Promise<string>} HTML for the menu
     */
    async generateMenuHtml() {
        try {
            // Get the menu items
            const menuItems = await this.loadMenu()

            if (!menuItems || menuItems.length === 0) {
                return "<!-- No menu items defined -->"
            }

            // Build hierarchical structure
            const hierarchicalMenu = this.buildMenuHierarchy(menuItems)

            // Generate HTML recursively
            const generateMenuItemsHtml = (items, level = 0) => {
                if (!items || items.length === 0) return ""

                let html = level === 0 ? '<ul class="nav-menu">\n' : '<ul class="sub-menu">\n'

                for (const item of items) {
                    const target = item.target === "_blank" ? ' target="_blank" rel="noopener"' : ""
                    const cssClass = item.class ? ` ${item.class}` : ""
                    const hasChildren = item.children && item.children.length > 0
                    const itemClass = hasChildren ? `menu-item-has-children${cssClass}` : `menu-item${cssClass}`

                    html += `  <li id="menu-item-${item.id}" class="${itemClass}">\n`
                    html += `    <a href="${item.url}"${target}>${item.title}</a>\n`

                    // Recursively add children
                    if (hasChildren) {
                        html += generateMenuItemsHtml(item.children, level + 1)
                    }

                    html += "  </li>\n"
                }

                html += "</ul>\n"
                return html
            }

            // Generate navigation HTML
            let html = '<nav class="site-navigation">\n'
            html += generateMenuItemsHtml(hierarchicalMenu)
            html += "</nav>"

            return html
        } catch (error) {
            console.error("Error generating menu HTML:", error)
            return "<!-- Error generating menu -->"
        }
    }

    /**
     * Add the menu to the template data
     * @param {Object} templateData - The template data object
     * @returns {Promise<Object>} The updated template data
     */
    async addMenuToTemplateData(templateData) {
        try {
            // Generate the menu HTML
            const menuHtml = await this.generateMenuHtml()

            // Add to template data
            return {
                ...templateData,
                html_menu: menuHtml,
                menuItems: await this.loadMenu(),
            }
        } catch (error) {
            console.error("Error adding menu to template data:", error)
            return templateData
        }
    }

    /**
     * Enhances menu data by adding depth and hasChildren properties
     * @param {Array} menuItems - Flat array of menu items
     * @returns {Array} Enhanced menu items with depth and hasChildren properties
     */
    enhanceMenuItems(menuItems) {
        if (!menuItems || !menuItems.length) return []

        // First, create a map for quick lookups
        const itemMap = new Map()
        menuItems.forEach((item) => {
            itemMap.set(item.id, { ...item, hasChildren: false })
        })

        // Set hasChildren flag on parent items
        menuItems.forEach((item) => {
            if (item.parent && itemMap.has(item.parent)) {
                itemMap.get(item.parent).hasChildren = true
            }
        })

        // Calculate depth for each item
        const calculateDepth = (itemId, visited = new Set()) => {
            // Prevent circular references
            if (visited.has(itemId)) return 0
            visited.add(itemId)

            const item = itemMap.get(itemId)
            if (!item.parent) return 0

            // Parent exists, get its depth and add 1
            const parentItem = itemMap.get(item.parent)
            if (!parentItem) return 0

            return 1 + calculateDepth(item.parent, visited)
        }

        // Apply depth to all items
        const result = []
        menuItems.forEach((item) => {
            const enhancedItem = itemMap.get(item.id)
            enhancedItem.depth = calculateDepth(item.id)
            result.push(enhancedItem)
        })

        return result
    }

    /**
     * Get a default menu structure
     * @returns {Array} Default menu structure
     */
    getDefaultMenu() {
        return [
            {
                id: "home",
                title: "Home",
                url: "/",
                order: 1,
                parent: null,
            },
            {
                id: "blog",
                title: "Blog",
                url: "/",
                order: 2,
                parent: null,
            },
        ]
    }
}
