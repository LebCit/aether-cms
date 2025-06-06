import { slugify } from "./validation-utils.js"

/**
 * ContentService - Handles API interactions for content management
 * Updated with slug validation to prevent duplicate slugs
 */
export class ContentService {
    constructor({ contentType, itemId, editorUI, editorState, validateContent, editorEnhancements }) {
        this.contentType = contentType
        this.itemId = itemId
        this.editorUI = editorUI
        this.editorState = editorState
        this.validateContent = validateContent
        this.validationUtils = null
        this.editorEnhancements = editorEnhancements

        // Add a flag to track when we're intentionally navigating after save
        this.isSavingNavigation = false
    }

    /**
     * Set validation utilities
     * @param {Object} validationUtils - Validation utility functions and form elements
     */
    setValidationUtils(validationUtils) {
        this.validationUtils = validationUtils
    }

    /**
     * Check if a slug already exists in the system
     * @param {string} slug - The slug to check
     * @param {string} excludeId - Optional ID to exclude from the check (for updates)
     * @returns {Promise<boolean>} True if slug exists, false otherwise
     */
    async checkSlugExists(slug, excludeId = null) {
        try {
            // Fetch all content items of this type
            const response = await fetch(`/api/${this.contentType}?frontmatterOnly=true&properties=id,slug`)
            const data = await response.json()

            if (!data.success) {
                console.error("Error checking slugs:", data.error)
                return false
            }

            // Extract items from response (handling different possible response structures)
            let items = data.data || []

            // Check if the slug exists in any item (excluding the current one)
            return items.some((item) => {
                const itemData = item.frontmatter || item.metadata || item
                const itemId = itemData.id || item.id
                const itemSlug = itemData.slug || item.slug

                // Skip the current item being edited (for updates)
                if (excludeId && itemId === excludeId) {
                    return false
                }

                return itemSlug === slug
            })
        } catch (error) {
            console.error("Error checking if slug exists:", error)
            return false // Assume it doesn't exist on error
        }
    }

    /**
     * Show duplicate slug alert modal
     * @param {string} slug - The duplicate slug
     * @returns {Promise<boolean>} Whether to proceed with saving
     */
    async showDuplicateSlugAlert(slug) {
        return new Promise((resolve) => {
            // Create modal if it doesn't exist
            let modal = document.getElementById("duplicate-slug-modal")

            if (!modal) {
                modal = document.createElement("div")
                modal.id = "duplicate-slug-modal"
                modal.className = "modal navigation-warning-modal"

                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Duplicate Slug Warning</h2>
                            <button class="close-modal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>A ${this.contentType.slice(
                                0,
                                -1
                            )} with the slug "<strong id="duplicate-slug-value"></strong>" already exists.</p>
                            <p>Using the same slug will overwrite the existing content!</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-outline" id="cancel-save">Cancel</button>
                            <button class="btn btn-danger" id="confirm-save">Save Anyway</button>
                        </div>
                    </div>
                `

                document.body.appendChild(modal)
            }

            // Set the slug value in the modal
            const slugElement = modal.querySelector("#duplicate-slug-value")
            if (slugElement) {
                slugElement.textContent = slug
            }

            // Show the modal
            modal.classList.add("show")

            // Handle button clicks
            const cancelBtn = modal.querySelector("#cancel-save")
            const confirmBtn = modal.querySelector("#confirm-save")
            const closeBtn = modal.querySelector(".close-modal")

            // Cleanup function to remove event listeners
            const cleanup = () => {
                modal.classList.remove("show")
                cancelBtn.removeEventListener("click", handleCancel)
                confirmBtn.removeEventListener("click", handleConfirm)
                closeBtn.removeEventListener("click", handleCancel)
                modal.removeEventListener("click", handleModalClick)
            }

            // Event handlers
            const handleCancel = () => {
                cleanup()
                resolve(false)
            }

            const handleConfirm = () => {
                cleanup()
                resolve(true)
            }

            const handleModalClick = (e) => {
                if (e.target === modal) {
                    handleCancel()
                }
            }

            // Add event listeners
            cancelBtn.addEventListener("click", handleCancel)
            confirmBtn.addEventListener("click", handleConfirm)
            closeBtn.addEventListener("click", handleCancel)
            modal.addEventListener("click", handleModalClick)
        })
    }

    /**
     * Save content to the server
     * @param {string} [status] - Optional status override (published/draft)
     */
    async saveContent(status) {
        // Get current content data from UI
        const contentData = this.editorUI.getCurrentContentData()

        // For pages, add the page type to metadata
        if (this.contentType === "pages") {
            const pageTypeSelect = document.getElementById("pageType")
            if (pageTypeSelect) {
                contentData.metadata.pageType = pageTypeSelect.value

                // For custom pages, explicitly get parent page value
                if (pageTypeSelect.value === "custom") {
                    const parentPageSelect = document.getElementById("parentPage")

                    if (parentPageSelect) {
                        contentData.metadata.parentPage = parentPageSelect.value || null
                    }
                }
            }
        }

        // Handle additional fields from the enhancements module
        if (this.editorEnhancements) {
            const enhancementValues = this.editorEnhancements.getCurrentValues()

            // Add publishing date if present
            if (enhancementValues.publishDate) {
                contentData.metadata.publishDate = enhancementValues.publishDate
            }

            // Handle category with explicit removal when needed
            if (enhancementValues.removedCategory) {
                // Category was explicitly removed - set to null
                contentData.metadata.category = null
            } else if (typeof enhancementValues.category === "string" && enhancementValues.category.trim()) {
                // Category is present
                contentData.metadata.category = slugify(enhancementValues.category)
            } else {
                // No explicit removal and no category set
                contentData.metadata.category = null
            }

            // Handle tags with explicit removal when needed
            if (enhancementValues.tags && enhancementValues.tags.length > 0) {
                contentData.metadata.tags = []

                for (const tag of enhancementValues.tags) {
                    const slug = slugify(tag)
                    contentData.metadata.tags.push(slug)
                }
            } else {
                // No tags, set to null
                contentData.metadata.tags = null
            }

            // If there were explicit tag removals, ensure they're not in the tags array
            if (enhancementValues.removedTags && enhancementValues.removedTags.length > 0) {
                if (contentData.metadata.tags && Array.isArray(contentData.metadata.tags)) {
                    contentData.metadata.tags = contentData.metadata.tags.filter(
                        (tag) => !enhancementValues.removedTags.includes(tag)
                    )
                }
            }

            // Add parent page if provided (from enhancements)
            if (enhancementValues.parentPage !== undefined) {
                contentData.metadata.parentPage = enhancementValues.parentPage
            }
        }

        // Add related posts data if module is available
        if (window.relatedPostsManager) {
            const relatedPostsData = window.relatedPostsManager.getCurrentValues()
            if (relatedPostsData.relatedPosts) {
                contentData.metadata.relatedPosts = relatedPostsData.relatedPosts
            }
        }

        // Validate using the validation utilities
        if (this.validationUtils) {
            const { validateContent, showValidationErrors, clearValidationErrors, formElements } = this.validationUtils
            const validation = validateContent(contentData)

            // Show validation errors if any
            if (!validation.isValid) {
                showValidationErrors(validation.errors, formElements)

                // Focus on the first field with an error
                const firstErrorField = Object.keys(validation.errors)[0]
                if (formElements[firstErrorField]) {
                    formElements[firstErrorField].focus()
                }
                return
            }

            // Clear any existing validation errors
            clearValidationErrors(formElements)
        }
        // Fallback to basic validation if validation utils aren't set
        else if (!contentData.metadata.title) {
            alert("Title is required")
            if (this.editorUI.titleInput) {
                this.editorUI.titleInput.focus()
            }
            return
        }

        // Override status if provided
        if (status) {
            contentData.metadata.status = status
        }

        // Determine if this is a create or update operation
        const isCreate = !this.itemId
        const method = isCreate ? "POST" : "PUT"
        const url = isCreate ? `/api/${this.contentType}` : `/api/${this.contentType}/${this.itemId}`

        // Check if the slug already exists
        const slug = contentData.metadata.slug
        const slugExists = await this.checkSlugExists(slug, this.itemId)

        // If slug exists, show warning and ask for confirmation
        if (slugExists) {
            const proceed = await this.showDuplicateSlugAlert(slug)
            if (!proceed) {
                // User chose not to proceed, generate a unique slug suggestion
                if (this.editorUI.slugInput) {
                    // Suggest a unique slug by adding a timestamp
                    const timestamp = Date.now().toString().slice(-5)
                    const suggestedSlug = `${slug}-${timestamp}`
                    this.editorUI.slugInput.value = suggestedSlug
                    this.editorUI.slugInput.focus()
                    this.editorUI.slugInput.select()
                }
                return
            }
        }

        try {
            // For new content, temporarily disable the navigation warning
            if (isCreate && this.editorUI.unsavedChangesHandler) {
                this.isSavingNavigation = true

                // Temporarily remove the beforeunload event listener
                this.removeBeforeUnloadListener()
            }

            // Send API request
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(contentData),
            })

            const data = await response.json()

            if (data.success) {
                // Reset removal tracking after successful save
                if (this.editorEnhancements && typeof this.editorEnhancements.resetRemovalTracking === "function") {
                    this.editorEnhancements.resetRemovalTracking()
                }

                if (isCreate) {
                    // For new content, redirect to edit page with the new ID
                    window.location.href = `/aether/${this.contentType}/edit/${data.id}`
                } else {
                    // For existing content, show success modal and update UI state
                    this.editorUI.showSaveModal()

                    // Always update UI to match the saved status
                    this.editorUI.updateUIForStatus(contentData.metadata.status, true)

                    // Update the editor state with the saved data to ensure consistency
                    this.editorState.updateState(contentData)

                    // Explicitly preserve featured image state after save
                    if (contentData.metadata.featuredImage) {
                        this.editorState.setFeaturedImage(contentData.metadata.featuredImage)
                    }

                    this.editorState.markClean()

                    // If the editorUI has an unsaved changes handler, mark it clean
                    if (this.editorUI.unsavedChangesHandler) {
                        this.editorUI.unsavedChangesHandler.markClean()
                    }

                    // Reset the change indicator in the markdown editor if available
                    if (
                        this.editorUI.markdownEditor &&
                        typeof this.editorUI.markdownEditor.resetChangeIndicator === "function"
                    ) {
                        this.editorUI.markdownEditor.resetChangeIndicator()
                    }
                }
            } else {
                // If save failed, restore navigation warning
                if (isCreate) {
                    this.isSavingNavigation = false
                    this.restoreBeforeUnloadListener()
                }
                alert(`Error: ${data.error || "An unknown error occurred"}`)
            }
        } catch (error) {
            console.error("Save error:", error)
            alert("Failed to save content. Please try again.")
        }
    }

    /**
     * Temporarily remove the beforeunload event listener
     */
    removeBeforeUnloadListener() {
        if (this.editorUI.unsavedChangesHandler && window.navigationHandler) {
            const beforeUnloadHandler = window.navigationHandler.beforeUnloadHandler
            if (beforeUnloadHandler) {
                window.removeEventListener("beforeunload", beforeUnloadHandler)
            }
        }
    }

    /**
     * Restore the beforeunload event listener
     */
    restoreBeforeUnloadListener() {
        if (this.editorUI.unsavedChangesHandler && window.navigationHandler && !this.isSavingNavigation) {
            const beforeUnloadHandler = window.navigationHandler.beforeUnloadHandler
            if (beforeUnloadHandler) {
                window.addEventListener("beforeunload", beforeUnloadHandler)
            }
        }
    }

    /**
     * Load content from the server
     * @returns {Promise<Object>} The loaded content
     */
    async loadContent() {
        if (!this.itemId) return null

        try {
            const response = await fetch(`/api/${this.contentType}/${this.itemId}`)
            const data = await response.json()

            if (data.success) {
                // Format the data for the editor
                const contentData = {
                    metadata: {
                        title: data.data.title,
                        subtitle: data.data.subtitle || "",
                        slug: data.data.slug,
                        status: data.data.status,
                        author: data.data.author,
                        excerpt: data.data.excerpt || "",
                        seoDescription: data.data.seoDescription || "",
                    },
                    content: data.data.content,
                }

                // Add pageType if this is a page
                if (this.contentType === "pages" && data.data.pageType) {
                    contentData.metadata.pageType = data.data.pageType

                    // Update the page type selector UI directly
                    const pageTypeSelect = document.getElementById("pageType")
                    if (pageTypeSelect) {
                        pageTypeSelect.value = data.data.pageType
                    }

                    // Add parent page if it exists
                    if (data.data.parentPage) {
                        contentData.metadata.parentPage = data.data.parentPage

                        // Set up parent page selection after a short delay to ensure the field is shown
                        setTimeout(async () => {
                            const parentPageSelect = document.getElementById("parentPage")
                            if (parentPageSelect && window.editorEnhancements) {
                                // Load parent page options first
                                await window.editorEnhancements.loadParentPageOptions()
                                // Then set the value
                                parentPageSelect.value = data.data.parentPage || ""
                            }
                        }, 100)
                    }
                }

                // Add date if available
                if (data.data.publishDate) {
                    contentData.metadata.publishDate = this.formatDateTimeLocalValue(data.data.publishDate)

                    // Update the date picker field directly
                    const dateInput = document.getElementById("publishDate")
                    if (dateInput) {
                        dateInput.value = contentData.metadata.publishDate
                    }
                }

                // Add tags if available - ensure we normalize the data format
                if (data.data.tags) {
                    if (Array.isArray(data.data.tags)) {
                        contentData.metadata.tags = data.data.tags
                    } else if (typeof data.data.tags === "string") {
                        // Handle tags as a comma-separated string
                        contentData.metadata.tags = data.data.tags
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean)
                    }
                }

                // Add category if available
                if (data.data.category) {
                    contentData.metadata.category = data.data.category
                }

                // Explicitly copy the featured image if present
                if (data.data.featuredImage) {
                    contentData.metadata.featuredImage = data.data.featuredImage
                }

                // Explicitly copy the gallery if present
                if (data.data.gallery) {
                    contentData.metadata.gallery = data.data.gallery
                }

                // Add related posts if available
                if (data.data.relatedPosts) {
                    contentData.metadata.relatedPosts = data.data.relatedPosts
                }

                // Update the editor state
                this.editorState.updateState(contentData)

                // Dispatch an event to notify other modules that content is loaded
                const contentLoadedEvent = new CustomEvent("editor:contentLoaded", {
                    detail: { contentData },
                })
                document.dispatchEvent(contentLoadedEvent)

                return contentData
            } else {
                console.error("Error loading content:", data.error)
                return null
            }
        } catch (error) {
            console.error("Load error:", error)
            return null
        }
    }

    /**
     * Format a date string to be compatible with datetime-local input
     * @param {string} dateString - The date string to format
     * @returns {string} Formatted date string
     */
    formatDateTimeLocalValue(dateString) {
        try {
            const date = new Date(dateString)

            // Check if date is valid
            if (isNaN(date.getTime())) {
                return null
            }

            // Format as YYYY-MM-DDThh:mm
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, "0")
            const day = String(date.getDate()).padStart(2, "0")
            const hours = String(date.getHours()).padStart(2, "0")
            const minutes = String(date.getMinutes()).padStart(2, "0")

            return `${year}-${month}-${day}T${hours}:${minutes}`
        } catch (error) {
            console.error("Error formatting date:", error)
            return null
        }
    }
}
