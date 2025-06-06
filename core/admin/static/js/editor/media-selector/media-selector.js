/**
 * Media Selector
 * Main controller for media selection functionality
 */
import { mediaService } from "./modules/media-api-service.js"
import { uiMediaManager } from "./modules/media-ui-manager.js"
import { editorIntegration } from "./modules/editor-integration.js"

export class MediaSelector {
    constructor() {
        // State
        this.mediaItems = []
        this.selectedItems = new Set()
        this.selectionMode = "single" // 'single' or 'multiple'
        this.filterType = "image"
        this.searchQuery = ""
        this.selectionCallback = null
    }

    /**
     * Initialize the media selector
     */
    async init() {
        // Try to get editor state reference from the global scope
        const editorState = window.editorState

        if (!editorState) {
            this.waitForEditorState()
            return
        }

        // Initialize editor integration
        editorIntegration.init(editorState)

        // Set up button click handlers
        this.setupEventListeners()

        // Initialize the image toolbar button
        editorIntegration.initImageToolbarButton(() => this.openImageSelector())

        // Initialize featured image from editor state
        this.initExistingFeaturedImage()
    }

    /**
     * Wait for the editor state to become available
     */
    waitForEditorState() {
        const checkInterval = setInterval(() => {
            if (window.editorState) {
                clearInterval(checkInterval)

                // Initialize editor integration
                editorIntegration.init(window.editorState)

                // Complete initialization
                this.setupEventListeners()

                // Initialize featured image
                this.initExistingFeaturedImage()

                // Initialize the image toolbar button
                editorIntegration.initImageToolbarButton(() => this.openImageSelector())
            }
        }, 100) // Check every 100ms

        // Set a timeout to stop checking after 5 seconds to prevent infinite checking
        setTimeout(() => {
            clearInterval(checkInterval)
            console.warn("Timed out waiting for editor state")
        }, 5000)
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Featured image button
        if (uiMediaManager.featuredImageButton) {
            uiMediaManager.featuredImageButton.addEventListener("click", () => this.openFeaturedImageSelector())
        }

        // Modal cancel button
        if (uiMediaManager.cancelButton) {
            uiMediaManager.cancelButton.addEventListener("click", () => this.closeModal())
        }

        // Modal confirm button
        if (uiMediaManager.confirmButton) {
            uiMediaManager.confirmButton.addEventListener("click", () => this.confirmSelection())
        }

        // Modal close buttons
        if (uiMediaManager.modal) {
            uiMediaManager.modal.querySelectorAll(".close-modal").forEach((btn) => {
                btn.addEventListener("click", () => this.closeModal())
            })

            // Close modal when clicking outside
            uiMediaManager.modal.addEventListener("click", (e) => {
                if (e.target === uiMediaManager.modal) {
                    this.closeModal()
                }
            })
        }

        // Search input
        if (uiMediaManager.modalSearch) {
            uiMediaManager.modalSearch.addEventListener("input", () => {
                this.searchQuery = uiMediaManager.modalSearch.value.trim().toLowerCase()
                this.renderMediaGrid()
            })
        }

        // Filter dropdown
        if (uiMediaManager.modalFilter) {
            uiMediaManager.modalFilter.addEventListener("change", () => {
                this.filterType = uiMediaManager.modalFilter.value
                this.renderMediaGrid()
            })
        }

        // Initialize Remove Featured Image button if it exists
        if (uiMediaManager.featuredImagePreview) {
            const removeButton = uiMediaManager.featuredImagePreview.querySelector(".remove-featured-image")
            if (removeButton) {
                removeButton.addEventListener("click", () => this.removeFeaturedImage())
            }
        }
    }

    /**
     * Initialize existing featured image if present
     */
    initExistingFeaturedImage() {
        const featuredImage = editorIntegration.getFeaturedImage()
        if (featuredImage) {
            uiMediaManager.updateFeaturedImagePreview(
                featuredImage,
                () => this.openFeaturedImageSelector(),
                () => this.removeFeaturedImage()
            )
        }
    }

    /**
     * Open image selector for inserting images into the editor
     */
    openImageSelector() {
        this.selectionMode = "single"
        this.filterType = "image"
        this.selectedItems.clear()

        this.selectionCallback = (selectedIds) => {
            if (selectedIds.length > 0) {
                const mediaItem = this.mediaItems.find((item) => item.id === selectedIds[0])
                if (mediaItem) {
                    editorIntegration.insertImage(mediaItem)
                }
            }
        }

        uiMediaManager.showModal("Select Image to Insert", "image", true)
        this.openModal()
    }

    /**
     * Open featured image selector
     */
    openFeaturedImageSelector() {
        this.selectionMode = "single"
        this.selectedItems.clear()

        // Pre-select current featured image if exists
        const currentFeaturedImage = editorIntegration.getFeaturedImage()
        if (currentFeaturedImage) {
            this.selectedItems.add(currentFeaturedImage.id)
        }

        this.selectionCallback = (selectedIds) => {
            if (selectedIds.length > 0) {
                this.setFeaturedImage(selectedIds[0])
            }
        }

        // Load only image files and disable the filter dropdown since featured images must be images
        uiMediaManager.showModal("Select Featured Image", "image", true)
        this.openModal()
    }

    /**
     * Open the media selection modal and load media items
     */
    async openModal() {
        // Reset search query
        this.searchQuery = ""
        this.filterType = "image"

        // Load media items
        await this.loadMediaItems()

        // Render the media grid
        this.renderMediaGrid()
    }

    /**
     * Close the media selection modal
     */
    closeModal() {
        uiMediaManager.hideModal()
        this.selectedItems.clear()
        this.selectionCallback = null
    }

    /**
     * Confirm the current selection
     */
    confirmSelection() {
        if (this.selectionCallback) {
            this.selectionCallback(Array.from(this.selectedItems))
        }

        this.closeModal()
    }

    /**
     * Handle media item click
     * @param {Object} item - Media item that was clicked
     * @param {HTMLElement} element - DOM element representing the item
     */
    handleItemClick(item, element) {
        if (this.selectionMode === "single") {
            // Single selection mode
            this.selectedItems.clear()
            this.selectedItems.add(item.id)

            // Update UI
            uiMediaManager.modalGrid.querySelectorAll(".modal-media-item").forEach((el) => {
                el.classList.toggle("selected", el.dataset.id === item.id)
            })
        } else {
            // Multiple selection mode
            if (this.selectedItems.has(item.id)) {
                this.selectedItems.delete(item.id)
                element.classList.remove("selected")
            } else {
                this.selectedItems.add(item.id)
                element.classList.add("selected")
            }
        }
    }

    /**
     * Load media items from the API
     */
    async loadMediaItems() {
        try {
            uiMediaManager.showLoading(true)

            this.mediaItems = await mediaService.getMediaItems()

            // Update UI based on result
            if (this.mediaItems.length === 0) {
                uiMediaManager.showEmptyState(true)
            } else {
                uiMediaManager.showEmptyState(false)
            }
        } catch (error) {
            console.error("Error loading media:", error)
            uiMediaManager.showEmptyState(true)
        } finally {
            uiMediaManager.showLoading(false)
        }
    }

    /**
     * Render the media grid with current filters
     */
    renderMediaGrid() {
        uiMediaManager.renderMediaGrid(
            this.mediaItems,
            this.selectedItems,
            this.selectionMode,
            this.filterType,
            this.searchQuery,
            (item, element) => this.handleItemClick(item, element)
        )
    }

    /**
     * Set featured image
     * @param {string|Object} mediaItem - Media item ID or object
     */
    setFeaturedImage(mediaItem) {
        // If mediaItem is null, we're removing the featured image
        if (!mediaItem) {
            editorIntegration.setFeaturedImage(null)

            // Update the preview
            uiMediaManager.updateFeaturedImagePreview(
                null,
                () => this.openFeaturedImageSelector(),
                () => this.removeFeaturedImage()
            )

            return
        }

        // Get the media item from the array if we received an ID
        let imageData = mediaItem
        if (typeof mediaItem === "string") {
            const item = this.mediaItems.find((item) => item.id === mediaItem)
            if (!item) return
            imageData = item
        }

        // Update editor state
        const featuredImage = editorIntegration.setFeaturedImage(imageData)

        // Update the preview
        uiMediaManager.updateFeaturedImagePreview(
            featuredImage,
            () => this.openFeaturedImageSelector(),
            () => this.removeFeaturedImage()
        )
    }

    /**
     * Remove featured image
     */
    removeFeaturedImage() {
        this.setFeaturedImage(null)
    }
}
