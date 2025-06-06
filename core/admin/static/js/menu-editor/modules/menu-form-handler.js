/**
 * Menu Form Handler Module
 * Handles form operations for the menu editor
 */
export class MenuFormHandler {
    /**
     * @param {Object} state - The MenuState instance
     * @param {Object} renderer - The MenuRenderer instance
     * @param {Object} notification - The NotificationService instance
     */
    constructor(state, renderer, notification) {
        this.state = state
        this.renderer = renderer
        this.notification = notification

        // DOM Elements
        this.menuItemFormPanel = document.getElementById("menu-item-form-panel")
        this.menuFormTitle = document.getElementById("menu-form-title")
        this.deleteMenuItemBtn = document.getElementById("delete-menu-item")
        this.backdrop = document.getElementById("menu-editor-backdrop")
        this.parentSelect = document.getElementById("menu-item-parent-select")
        this.parentHiddenInput = document.getElementById("menu-item-parent")

        // Delete confirmation modal elements
        this.deleteModal = document.getElementById("delete-menu-item-modal")
        this.deleteWarning = document.querySelector(".delete-warning")

        this.initEventListeners()
    }

    /**
     * Initialize event listeners for the form
     */
    initEventListeners() {
        // Form close/cancel buttons
        document.getElementById("close-menu-form").addEventListener("click", () => this.closeMenuItemForm())
        document.getElementById("cancel-menu-form").addEventListener("click", () => this.closeMenuItemForm())

        // Delete confirmation modal
        document.getElementById("cancel-delete-menu-item").addEventListener("click", () => {
            this.deleteModal.classList.remove("show")
            this.backdrop.classList.remove("active")
        })

        document.getElementById("confirm-delete-menu-item").addEventListener("click", () => this.deleteMenuItem())

        // Close modal on outside click
        this.deleteModal.addEventListener("click", (e) => {
            if (e.target === this.deleteModal) {
                this.deleteModal.classList.remove("show")
                this.backdrop.classList.remove("active")
            }
        })

        // Delete button in form
        this.deleteMenuItemBtn.addEventListener("click", () => {
            if (this.state.currentMenuItem) {
                this.confirmDeleteMenuItem(this.state.currentMenuItem.id)
            }
        })

        // Parent select change
        this.parentSelect.addEventListener("change", () => {
            this.parentHiddenInput.value = this.parentSelect.value
        })

        // Form submission
        document.getElementById("save-menu-item").addEventListener("click", () => this.saveMenuItemForm())

        // Backdrop click
        this.backdrop.addEventListener("click", () => this.closeMenuItemForm())

        // Custom events for menu item editing and deletion
        document.addEventListener("edit-menu-item", (e) => this.openMenuItemForm(e.detail.itemId))
        document.addEventListener("confirm-delete-menu-item", (e) => this.confirmDeleteMenuItem(e.detail.itemId))
    }

    /**
     * Reset the form fields
     */
    resetForm() {
        document.getElementById("menu-item-title").value = ""
        document.getElementById("menu-item-url").value = ""
        document.getElementById("menu-item-target").value = "_self"
        document.getElementById("menu-item-class").value = ""
    }

    /**
     * Open the menu item form for editing or creation
     * @param {string|null} itemId - ID of the item to edit, or null for new item
     */
    openMenuItemForm(itemId = null) {
        // Set form title based on edit/create
        this.menuFormTitle.textContent = itemId ? "Edit Menu Item" : "Add Menu Item"

        // Find the menu item if editing
        this.state.currentMenuItem = itemId ? this.state.findMenuItem(itemId) : null

        // Reset form
        this.resetForm()

        // Fill form fields if editing
        if (this.state.currentMenuItem) {
            document.getElementById("menu-item-id").value = this.state.currentMenuItem.id
            document.getElementById("menu-item-title").value = this.state.currentMenuItem.title || ""
            document.getElementById("menu-item-url").value = this.state.currentMenuItem.url || ""
            document.getElementById("menu-item-target").value = this.state.currentMenuItem.target || "_self"
            document.getElementById("menu-item-class").value = this.state.currentMenuItem.class || ""
            document.getElementById("menu-item-parent").value = this.state.currentMenuItem.parent || ""

            // Show delete button for existing items
            this.deleteMenuItemBtn.style.display = "block"
        } else {
            // Generate a unique ID for new items
            document.getElementById("menu-item-id").value = "menu_" + Date.now()
            document.getElementById("menu-item-parent").value = ""

            // Hide delete button for new items
            this.deleteMenuItemBtn.style.display = "none"
        }

        // Update parent options
        this.renderer.updateParentSelectOptions()

        // Show the form
        this.menuItemFormPanel.classList.add("active")
        // Show the backdrop
        this.backdrop.classList.add("active")

        // Reset scroll position
        this.menuItemFormPanel.scrollTop = 0
    }

    /**
     * Close the menu item form
     */
    closeMenuItemForm() {
        this.menuItemFormPanel.classList.remove("active")
        this.backdrop.classList.remove("active")
        this.state.currentMenuItem = null
    }

    /**
     * Save the menu item form
     */
    saveMenuItemForm() {
        // Get form data
        const id = document.getElementById("menu-item-id").value
        const title = document.getElementById("menu-item-title").value
        const url = document.getElementById("menu-item-url").value
        const parent = document.getElementById("menu-item-parent").value
        const target = document.getElementById("menu-item-target").value
        const cssClass = document.getElementById("menu-item-class").value

        // Validate required fields
        if (!title || !url) {
            this.notification.showError("Title and URL are required")
            return
        }

        // Create menu item object
        const menuItem = {
            id,
            title,
            url,
            parent: parent || null,
            target,
            class: cssClass,
        }

        // Check if editing or creating
        const existingItem = this.state.findMenuItem(id)

        if (existingItem) {
            // Store the original parent before updating
            const originalParent = existingItem.parent

            // Update existing item's properties
            Object.assign(existingItem, menuItem)

            // The hierarchy might need to be updated if parent changed
            // Compare with the original parent value
            if (menuItem.parent !== originalParent) {
                // Remove the item from its current position in the hierarchy
                this.state.removeItemFromHierarchy(id)

                // Add it back in the new position
                this.state.addItemToHierarchy(menuItem)
            }
        } else {
            // Add new item to the hierarchy
            this.state.addItemToHierarchy(menuItem)
        }

        // Update the flat menu
        this.state.updateFlatMenu()

        // Update the UI
        this.renderer.renderMenuItems()

        // Mark as dirty
        this.state.markAsDirty()

        // Close the form
        this.closeMenuItemForm()

        // Show success message
        this.notification.showSuccess(existingItem ? "Menu item updated successfully" : "Menu item added successfully")
    }

    /**
     * Confirm deletion of a menu item
     * @param {string} itemId - ID of the item to delete
     */
    confirmDeleteMenuItem(itemId) {
        // Find the menu item
        const menuItem = this.state.findMenuItem(itemId)

        if (!menuItem) {
            return
        }

        // Set the current menu item to delete
        this.state.currentMenuItem = menuItem

        // Check if item has children and show warning if needed
        const hasChildren = menuItem.children && menuItem.children.length > 0

        this.deleteWarning.hidden = !hasChildren

        // Show the confirmation modal
        this.deleteModal.classList.add("show")
        this.backdrop.classList.add("active")
    }

    /**
     * Delete the current menu item and its children
     */
    deleteMenuItem() {
        if (!this.state.currentMenuItem) {
            return
        }

        // Remove the item and its children from the hierarchical structure
        this.state.removeItemFromHierarchy(this.state.currentMenuItem.id)

        // Update the flat menu array
        this.state.updateFlatMenu()

        // Update the UI
        this.renderer.renderMenuItems()

        // Mark as dirty
        this.state.markAsDirty()

        // Close forms/modals
        this.closeMenuItemForm()
        this.deleteModal.classList.remove("show")
        this.backdrop.classList.remove("active")

        // Show success message
        this.notification.showSuccess("Menu item deleted successfully")
    }
}
