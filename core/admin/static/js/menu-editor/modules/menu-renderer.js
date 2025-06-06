/**
 * Menu Renderer Module
 * Handles all UI rendering for the menu editor
 */
export class MenuRenderer {
    /**
     * @param {Object} state - The MenuState instance
     * @param {Object} notification - The NotificationService instance
     */
    constructor(state, notification) {
        this.state = state
        this.notification = notification
        this.menuList = document.getElementById("menu-items-list")
    }

    /**
     * Render the menu items list hierarchically
     */
    renderMenuItems() {
        // Clear the list
        this.menuList.innerHTML = ""

        // Render placeholder if no items
        if (this.state.menuHierarchy.length === 0) {
            this.menuList.innerHTML =
                '<li class="menu-item-placeholder">No menu items found. Add one using the button above.</li>'
            return
        }

        // Render the menu hierarchy
        this.renderMenuLevel(this.state.menuHierarchy, this.menuList)

        // After everything is rendered, update indent/outdent buttons
        this.updateIndentOutdentButtons()

        // Initialize sortable on all lists
        this.initSortable()

        // Update parent select options
        this.updateParentSelectOptions()
    }

    /**
     * Render a level of menu items
     * @param {Array} items - Menu items at this level
     * @param {HTMLElement} container - Container element
     */
    renderMenuLevel(items, container) {
        const template = document.getElementById("menu-item-template")

        items.forEach((item) => {
            const clone = document.importNode(template.content, true)
            const menuItem = clone.querySelector(".menu-item")

            // Set data attributes
            menuItem.dataset.id = item.id
            menuItem.dataset.parent = item.parent || ""

            // Set content
            menuItem.querySelector(".menu-item-title").textContent = item.title
            menuItem.querySelector(".menu-item-url").textContent = item.url

            // Handle indent/outdent buttons
            const indentBtn = menuItem.querySelector(".menu-item-indent")
            const outdentBtn = menuItem.querySelector(".menu-item-outdent")

            // Disable outdent for top-level items
            if (!item.parent) {
                outdentBtn.disabled = true
            }

            // Add event listeners for indent/outdent
            indentBtn.addEventListener("click", (e) => {
                e.stopPropagation()
                this.indentMenuItem(item.id)
            })

            outdentBtn.addEventListener("click", (e) => {
                e.stopPropagation()
                this.outdentMenuItem(item.id)
            })

            // Add event listeners for actions
            menuItem.querySelector(".menu-item-edit").addEventListener("click", (e) => {
                e.stopPropagation()
                // We need to access the form handler from here - will be handled by events
                document.dispatchEvent(new CustomEvent("edit-menu-item", { detail: { itemId: item.id } }))
            })

            menuItem.querySelector(".menu-item-delete").addEventListener("click", (e) => {
                e.stopPropagation()
                document.dispatchEvent(new CustomEvent("confirm-delete-menu-item", { detail: { itemId: item.id } }))
            })

            // Add click event to edit item
            menuItem.addEventListener("click", () => {
                document.dispatchEvent(new CustomEvent("edit-menu-item", { detail: { itemId: item.id } }))
            })

            // Add to list
            container.appendChild(menuItem)

            // Render children if any
            if (item.children && item.children.length > 0) {
                // Create a sub-list
                const subTemplate = document.getElementById("submenu-template")
                const subList = document.importNode(subTemplate.content, true).querySelector(".menu-items-sub-list")

                // Add the sub-list to the parent menu item
                menuItem.appendChild(subList)

                // Add a container div around the item content
                this.wrapContentInDiv(menuItem, "menu-item-container")

                // Render child items into the sub-list
                this.renderMenuLevel(item.children, subList)
            }
        })
    }

    /**
     * Wraps all child nodes of a given DOM element inside a new <div> element.
     *
     * @param {HTMLElement} element - The DOM element whose contents should be wrapped.
     * @param {string} [className='container'] - Optional class name to add to the new wrapper div.
     */
    wrapContentInDiv(element, className = "container") {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn("Invalid element provided.")
            return
        }

        // Create the new wrapper div
        const wrapper = document.createElement("div")
        if (className) wrapper.classList.add(className)

        // Move all child nodes into the wrapper
        while (element.firstChild) {
            wrapper.appendChild(element.firstChild)
        }

        // Append the wrapper into the original element
        element.appendChild(wrapper)
    }

    /**
     * Initialize sortable.js for drag and drop
     */
    initSortable() {
        // Destroy existing sortable instances
        this.state.sortableInstances.forEach((instance) => {
            instance.destroy()
        })

        this.state.sortableInstances = []

        // Initialize sortable on the main list
        const mainSortable = this.createSortableInstance(this.menuList)
        this.state.sortableInstances.push(mainSortable)

        // Initialize sortable on all sub-lists
        const subLists = document.querySelectorAll(".menu-items-sub-list")
        subLists.forEach((subList) => {
            const subSortable = this.createSortableInstance(subList)
            this.state.sortableInstances.push(subSortable)
        })
    }

    /**
     * Create a Sortable instance for a list
     * @param {HTMLElement} list - The list element
     * @returns {Sortable} The Sortable instance
     */
    createSortableInstance(list) {
        return new Sortable(list, {
            group: "menu-items",
            animation: 150,
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            handle: ".menu-item-handle",
            draggable: ".menu-item", // Ensure proper draggable selector
            onEnd: (evt) => {
                // Handle new nested structure
                if (evt.to !== evt.from || evt.newIndex !== evt.oldIndex) {
                    this.handleSortableEnd(evt)
                }
            },
        })
    }

    /**
     * Handle the end of a sortable drag and drop operation
     * @param {Event} evt - The sortable end event
     */
    handleSortableEnd(evt) {
        const { from, to, item, newIndex, oldIndex } = evt

        // Get item ID
        const itemId = item.dataset.id

        // Get new parent ID (null for top level, or ID of parent for nested)
        const newParent = to.classList.contains("menu-items-sub-list") ? to.previousElementSibling.dataset.id : null

        // Find the item
        const menuItem = this.state.findMenuItem(itemId)
        if (!menuItem) return

        // Update parent
        menuItem.parent = newParent

        // Update the hierarchy
        this.rebuildHierarchyFromDOM()

        // Update indent/outdent buttons to match the new structure
        this.updateIndentOutdentButtons()

        // Mark as dirty
        this.state.markAsDirty()
    }

    /**
     * Rebuild the menu hierarchy from the current DOM structure
     */
    rebuildHierarchyFromDOM() {
        // Create new hierarchy
        this.state.menuHierarchy = []

        // Process the main list
        this.processListItems(this.menuList, this.state.menuHierarchy)

        // Update the flat menu
        this.state.updateFlatMenu()
    }

    /**
     * Process a list's items into the hierarchy.
     * Recursively processes a nested menu structure in the DOM,
     * constructing a hierarchical data model that matches visual nesting.
     *
     * @param {HTMLElement} list - The root list (<ul>) containing .menu-item elements.
     * @param {Array} container - The array to populate with structured menu item data.
     */
    processListItems(list, container) {
        // Get all child elements of the list
        const children = Array.from(list.children)

        // Determine parent ID from the DOM context
        let parentId = null
        if (list.classList.contains("menu-items-sub-list")) {
            // Sub-list is nested *inside* a menu-item, so we find the parent .menu-item
            const parentItem = list.closest(".menu-item")
            if (parentItem) {
                parentId = parentItem.dataset.id
            }
        }

        // Iterate through all children of this list
        children.forEach((itemElement, index) => {
            if (!itemElement.classList.contains("menu-item")) return

            const itemId = itemElement.dataset.id

            // Find original data
            const originalItem = this.state.menuItems.find((item) => item.id === itemId)
            if (!originalItem) {
                console.warn(`Could not find data for item ${itemId}`)
                return
            }

            // Destructure to exclude original children (avoids accidental reuse)
            const { children: originalChildren, ...itemData } = originalItem

            // Construct new item with metadata
            const newItem = {
                ...itemData,
                order: container.length,
                parent: parentId,
                children: [],
            }

            // Sync DOM with model: Set data-parent in the HTML
            itemElement.dataset.parent = parentId || ""

            // Add item to container
            container.push(newItem)

            // Look for nested sublist *inside* the current .menu-item
            const subList = itemElement.querySelector(".menu-items-sub-list")
            if (subList && subList.children.length > 0) {
                this.processListItems(subList, newItem.children)
            }
        })
    }

    /**
     * Function to update indent/outdent button states for all menu items
     * Call this after any changes to the menu structure
     */
    updateIndentOutdentButtons() {
        // Get all menu items in the DOM
        const menuItemElements = document.querySelectorAll(".menu-item")

        menuItemElements.forEach((itemElement) => {
            const itemId = itemElement.dataset.id
            const indentBtn = itemElement.querySelector(".menu-item-indent")
            const outdentBtn = itemElement.querySelector(".menu-item-outdent")

            // Skip if buttons are not found
            if (!indentBtn || !outdentBtn) {
                console.warn(`Indent/outdent buttons not found for item ${itemId}`)
                return
            }

            // IMPORTANT: Find the current item directly in our flat menu items array
            // This ensures we get the latest parent value from the data model
            const flatMenuItem = this.state.menuItems.find((item) => item.id === itemId)

            if (!flatMenuItem) {
                console.warn(`Item ${itemId} not found in flat menu items`)
                return
            }

            // Double check: also check the DOM containment
            const isInSublist = itemElement.parentNode.classList.contains("menu-items-sub-list")

            // OUTDENT BUTTON LOGIC
            // Use both data model and DOM position to determine if this is a top-level item
            const hasParent = !!flatMenuItem.parent || isInSublist
            outdentBtn.disabled = !hasParent

            // INDENT BUTTON LOGIC - Use DOM siblings
            const container = itemElement.parentNode
            const domSiblings = Array.from(container.children).filter(
                (child) => child.classList && child.classList.contains("menu-item")
            )
            const domIndex = domSiblings.indexOf(itemElement)
            const canIndent = domIndex > 0
            indentBtn.disabled = !canIndent
        })
    }

    /**
     * Indent a menu item (make it a child of the previous item)
     * @param {string} itemId - ID of the item to indent
     */
    indentMenuItem(itemId) {
        // Find the item
        const item = this.state.findMenuItem(itemId)
        if (!item) return

        // We can only indent if there's a previous sibling to become the parent
        const siblings = this.state.getSiblings(item)
        const itemIndex = siblings.findIndex((sibling) => sibling.id === itemId)

        // Cannot indent the first item in a list
        if (itemIndex <= 0) return

        // Get the previous sibling to become the new parent
        const newParent = siblings[itemIndex - 1]

        // Update the parent reference
        item.parent = newParent.id

        // Ensure the new parent has a children array
        if (!newParent.children) {
            newParent.children = []
        }

        // Add to the end of the new parent's children
        newParent.children.push(item)

        // Remove from the original list
        siblings.splice(itemIndex, 1)

        // Rebuild the hierarchy and re-render
        this.state.updateFlatMenu()
        this.renderMenuItems()

        // After updating the structure, update the button states
        this.updateIndentOutdentButtons()

        // Mark as dirty
        this.state.markAsDirty()
    }

    /**
     * Outdent a menu item (move it up one level)
     * @param {string} itemId - ID of the item to outdent
     */
    outdentMenuItem(itemId) {
        // Find the item
        const item = this.state.findMenuItem(itemId)
        if (!item) return

        // Cannot outdent top-level items
        if (!item.parent) return

        // Find the parent
        const parent = this.state.findMenuItem(item.parent)
        if (!parent) return

        // Find the parent's parent (new parent for the item)
        const newParent = parent.parent

        // Find siblings at the parent level
        const parentSiblings = this.state.getSiblings(parent)

        // Find the index of the parent in its siblings array
        const parentIndex = parentSiblings.findIndex((sibling) => sibling.id === parent.id)

        // Remove the item from its current parent's children
        parent.children = parent.children.filter((child) => child.id !== itemId)

        // Update the item's parent reference
        item.parent = newParent

        // Insert after the parent in the parent's siblings array
        parentSiblings.splice(parentIndex + 1, 0, item)

        // Rebuild the hierarchy and re-render
        this.state.updateFlatMenu()
        this.renderMenuItems()

        // After updating the structure, update the button states
        this.updateIndentOutdentButtons()

        // Mark as dirty
        this.state.markAsDirty()
    }

    /**
     * Update the parent select dropdown with all possible parent options
     */
    updateParentSelectOptions() {
        const parentSelect = document.getElementById("menu-item-parent-select")
        const parentHiddenInput = document.getElementById("menu-item-parent")

        // Clear existing options except the "None" option
        while (parentSelect.options.length > 1) {
            parentSelect.remove(1)
        }

        // Add all items except the current one and its descendants
        const currentItemId = document.getElementById("menu-item-id").value

        const addItemOption = (item, level = 0) => {
            // Skip if this is the current item or its child
            if (item.id === currentItemId) return false

            // Create the option with indentation
            const option = document.createElement("option")
            option.value = item.id
            option.textContent = "—".repeat(level) + " " + item.title
            parentSelect.appendChild(option)

            // Mark if this option should be selected
            if (item.id === parentHiddenInput.value) {
                option.selected = true
            }

            // Track if this item or any descendants match the current item
            let containsCurrentItem = false

            // Add child options
            if (item.children && item.children.length > 0) {
                item.children.forEach((child) => {
                    const childContainsCurrentItem = addItemOption(child, level + 1)
                    if (childContainsCurrentItem) {
                        containsCurrentItem = true
                    }
                })
            }

            return containsCurrentItem
        }

        // Add all top-level items
        this.state.menuHierarchy.forEach((item) => {
            addItemOption(item)
        })
    }
}
