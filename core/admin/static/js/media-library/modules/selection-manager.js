/**
 * Selection Manager Module
 * Manages item selection and bulk actions
 */
export class SelectionManager {
    /**
     * @param {Object} state - The MediaState instance
     * @param {Object} renderer - The MediaRenderer instance
     * @param {Object} notification - The NotificationService instance
     */
    constructor(state, renderer, notification) {
        this.state = state
        this.renderer = renderer
        this.notification = notification

        this.initEventListeners()
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Bulk selection events
        document.getElementById("deselect-all").addEventListener("click", () => {
            this.clearSelection()
        })

        document.getElementById("delete-selected").addEventListener("click", () => {
            if (this.state.selectedItems.size > 0) {
                const itemIds = [...this.state.selectedItems]

                // Directly use the media form handler's showDeleteConfirmation
                document.dispatchEvent(
                    new CustomEvent("open-delete-modal", {
                        detail: { itemIds: itemIds },
                    })
                )
            }
        })

        // Item selection event
        document.addEventListener("toggle-item-selection", (e) => {
            this.toggleItemSelection(e.detail.itemId)
        })
    }

    /**
     * Toggle selection state of a media item
     * @param {string} itemId - ID of the item to toggle
     */
    toggleItemSelection(itemId) {
        const isSelected = this.state.toggleItemSelection(itemId)

        this.updateItemSelectionUI(itemId, isSelected)
        this.updateBulkActionsUI()
    }

    /**
     * Update UI for a single item's selection state
     * @param {string} itemId - ID of the item
     * @param {boolean} isSelected - Whether the item is selected
     */
    updateItemSelectionUI(itemId, isSelected) {
        const mediaItem = document.querySelector(`.media-item[data-id="${itemId}"]`)
        if (mediaItem) {
            mediaItem.classList.toggle("selected", isSelected)

            const selectButton = mediaItem.querySelector(".media-item-select")
            selectButton.innerHTML = isSelected ? "✓" : ""
            selectButton.title = isSelected ? "Deselect" : "Select"
        }
    }

    /**
     * Update bulk actions UI based on selection state
     */
    updateBulkActionsUI() {
        document.getElementById("selected-items").textContent = this.state.selectedItems.size

        const bulkActions = document.getElementById("bulk-actions")
        if (this.state.selectedItems.size > 0) {
            bulkActions.classList.remove("hidden")
        } else {
            bulkActions.classList.add("hidden")
        }
    }

    /**
     * Clear all selected items
     */
    clearSelection() {
        // Get currently selected items for UI update
        const selectedItemIds = [...this.state.selectedItems]

        // Clear selection in state
        this.state.clearSelection()

        // Update UI for each previously selected item
        selectedItemIds.forEach((itemId) => {
            this.updateItemSelectionUI(itemId, false)
        })

        // Update bulk actions UI
        this.updateBulkActionsUI()
    }
}
