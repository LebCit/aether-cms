import { slugify } from "./validation-utils.js"

/**
 * Editor Enhancements - Handles tags, categories, and date picker functionality
 */
export class EditorEnhancements {
    constructor() {
        // DOM Elements
        this.tagInput = document.getElementById("tagInput")
        this.tagsList = document.getElementById("tagsList")
        this.addTagBtn = document.getElementById("addTag")

        this.categoryInput = document.getElementById("categoryInput")
        this.categoriesList = document.getElementById("categoriesList")
        this.addCategoryBtn = document.getElementById("addCategory")

        this.publishDateInput = document.getElementById("publishDate")

        // New parent page elements
        this.pageTypeSelect = document.getElementById("pageType")
        this.parentPageGroup = document.getElementById("parentPageGroup")
        this.parentPageSelect = document.getElementById("parentPage")

        // State
        this.tags = []
        this.categories = []
        this.removedTags = new Set() // Track explicitly removed tags
        this.removedCategory = null // Track if category was explicitly removed

        // Initialize
        this.init()
    }

    /**
     * Initialize the enhancements
     */
    init() {
        // Initialize event listeners
        this.initEventListeners()

        // Initialize parent page controls for custom pages
        this.initParentPageControls()

        // Initialize date picker with current value or current date
        this.initDatePicker()

        // Load existing tags and categories if available
        this.loadExistingData()

        // Listen for content loaded event to ensure we get the data
        document.addEventListener("editor:contentLoaded", (event) => {
            // Load categories and tags from the loaded content
            this.loadExistingData()
        })
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Tag events
        if (this.addTagBtn) {
            this.addTagBtn.addEventListener("click", () => this.addTag())
        }

        if (this.tagInput) {
            this.tagInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault()
                    this.addTag()
                }
            })
        }

        // Category events
        if (this.addCategoryBtn) {
            this.addCategoryBtn.addEventListener("click", () => this.addCategory())
        }

        if (this.categoryInput) {
            this.categoryInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault()
                    this.addCategory()
                }
            })
        }
    }

    /**
     * Initialize parent page controls for custom pages
     */
    initParentPageControls() {
        if (!this.pageTypeSelect || !this.parentPageSelect) return

        // Show/hide parent page selection based on page type
        this.pageTypeSelect.addEventListener("change", (e) => {
            const isCustom = e.target.value === "custom"

            if (this.parentPageGroup) {
                this.parentPageGroup.style.display = isCustom ? "block" : "none"
            }

            // Load parent page options when switching to custom
            if (isCustom) {
                this.loadParentPageOptions()
            }
        })

        // Load options if already set to custom
        if (this.pageTypeSelect.value === "custom") {
            this.loadParentPageOptions()
        }
    }

    /**
     * Load available parent pages for selection - Allows child pages as parents
     */
    async loadParentPageOptions() {
        try {
            // Get all published custom pages
            const response = await fetch("/api/pages?status=published")
            const data = await response.json()

            if (!data.success) {
                console.error("Error loading pages:", data.error)
                return
            }

            // Clear existing options (except the default "None")
            while (this.parentPageSelect.children.length > 1) {
                this.parentPageSelect.removeChild(this.parentPageSelect.lastChild)
            }

            // Get current page ID to exclude from parent options
            const currentPageId = this.getCurrentPageId()
            const currentPageData = await this.getCurrentPageData()

            // Filter for custom pages only and exclude current page
            const customPages = data.data.filter((page) => {
                const metadata = page.frontmatter || page.metadata || page

                // Exclude current page
                if (metadata.id === currentPageId) {
                    return false
                }

                // Only include custom pages
                if (metadata.pageType !== "custom") {
                    return false
                }

                // Prevent circular references by checking if the potential parent
                // is actually a descendant of the current page
                if (currentPageData && this.isDescendantOf(currentPageData.slug, metadata, data.data)) {
                    return false
                }

                return true
            })

            // Group pages by hierarchy for better UX
            const rootPages = customPages.filter((page) => {
                const metadata = page.frontmatter || page.metadata || page
                return !metadata.parentPage
            })

            const childPages = customPages.filter((page) => {
                const metadata = page.frontmatter || page.metadata || page
                return metadata.parentPage
            })

            // Add root pages first
            rootPages.forEach((page) => {
                const metadata = page.frontmatter || page.metadata || page
                const option = document.createElement("option")
                option.value = metadata.slug
                option.textContent = metadata.title

                // Select if this is the current parent
                if (metadata.slug === this.getCurrentParentPage()) {
                    option.selected = true
                }

                this.parentPageSelect.appendChild(option)
            })

            // Add child pages with indentation for visual hierarchy
            childPages.forEach((page) => {
                const metadata = page.frontmatter || page.metadata || page
                const option = document.createElement("option")
                option.value = metadata.slug

                // Get parent info for display
                const parentPage = data.data.find((p) => {
                    const pMeta = p.frontmatter || p.metadata || p
                    return pMeta.slug === metadata.parentPage
                })

                const parentTitle = parentPage
                    ? (parentPage.frontmatter || parentPage.metadata || parentPage).title
                    : metadata.parentPage
                option.textContent = `  └─ ${metadata.title} (under ${parentTitle})`

                // Select if this is the current parent
                if (metadata.slug === this.getCurrentParentPage()) {
                    option.selected = true
                }

                this.parentPageSelect.appendChild(option)
            })
        } catch (error) {
            console.error("Error loading parent pages:", error)
        }
    }

    /**
     * Check if a potential parent is actually a descendant of the current page
     * This prevents circular references
     */
    isDescendantOf(currentSlug, potentialParentMetadata, allPages) {
        let checkSlug = potentialParentMetadata.parentPage

        while (checkSlug) {
            if (checkSlug === currentSlug) {
                return true // Found circular reference
            }

            // Find parent page
            const parentPage = allPages.find((page) => {
                const meta = page.frontmatter || page.metadata || page
                return meta.slug === checkSlug
            })

            if (!parentPage) {
                break
            }

            const parentMeta = parentPage.frontmatter || parentPage.metadata || parentPage
            checkSlug = parentMeta.parentPage
        }

        return false
    }

    /**
     * Get current page data for circular reference checking
     */
    async getCurrentPageData() {
        const currentPageId = this.getCurrentPageId()
        if (!currentPageId) return null

        try {
            const response = await fetch(`/api/pages/${currentPageId}`)
            const data = await response.json()

            if (data.success) {
                return data.data.frontmatter || data.data.metadata || data.data
            }
        } catch (error) {
            console.error("Error getting current page data:", error)
        }

        return null
    }

    /**
     * Get current page ID from URL or editor state
     */
    getCurrentPageId() {
        const pathParts = window.location.pathname.split("/")
        return pathParts.length > 4 ? pathParts[4] : null
    }

    /**
     * Get current parent page slug
     */
    getCurrentParentPage() {
        // This should be set when loading existing content
        return window.editorState?.contentData?.metadata?.parentPage || ""
    }

    /**
     * Initialize date picker with the current value or current date/time
     */
    initDatePicker() {
        if (!this.publishDateInput) return

        // If no existing value, set to current date and time
        if (!this.publishDateInput.value) {
            const now = new Date()

            // Format date to YYYY-MM-DDThh:mm
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, "0")
            const day = String(now.getDate()).padStart(2, "0")
            const hours = String(now.getHours()).padStart(2, "0")
            const minutes = String(now.getMinutes()).padStart(2, "0")

            this.publishDateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`
        }
    }

    /**
     * Load existing tags and categories from data
     */
    loadExistingData() {
        // Don't reload data if we've explicitly removed items
        if (this.removedCategory !== null || this.removedTags.size > 0) {
            return
        }

        // Access editor state to get existing tags and categories
        if (window.editorState) {
            const frontmatter = this.getFrontmatterFromEditorState()

            if (frontmatter) {
                // Load tags if not explicitly removed
                if (frontmatter.tags) {
                    // Handle different data formats
                    if (Array.isArray(frontmatter.tags)) {
                        this.tags = [...frontmatter.tags]
                    } else if (typeof frontmatter.tags === "string") {
                        // Split comma-separated string
                        this.tags = frontmatter.tags
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter((tag) => tag)
                    }
                }

                // Load category if not explicitly removed
                if (frontmatter.category) {
                    if (typeof frontmatter.category === "string") {
                        this.categories = [frontmatter.category]
                    } else if (Array.isArray(frontmatter.category) && frontmatter.category.length > 0) {
                        this.categories = [frontmatter.category[0]]
                    }
                }
            }
        }

        // Render the tags and categories
        this.renderTags()
        this.renderCategories()
    }

    /**
     * Get frontmatter from editor state
     * @returns {Object|null} Frontmatter or null if not found
     */
    getFrontmatterFromEditorState() {
        if (!window.editorState) return null

        // Check if there's original data in the editor state
        if (window.editorState.originalData && window.editorState.originalData.metadata) {
            return window.editorState.originalData.metadata
        }

        // Check if there's current data in the editor state
        if (window.editorState.currentData && window.editorState.currentData.metadata) {
            return window.editorState.currentData.metadata
        }

        return null
    }

    /**
     * Add a new tag
     */
    addTag() {
        if (!this.tagInput || !this.tagInput.value.trim()) return

        const tag = slugify(this.tagInput.value)

        // Skip if already exists
        if (this.tags.includes(tag)) {
            this.tagInput.value = ""
            return
        }

        // Remove from removedTags if it was previously removed
        this.removedTags.delete(tag)

        // Add to tags array
        this.tags.push(tag)

        // Clear input
        this.tagInput.value = ""

        // Update UI
        this.renderTags()

        // Mark editor as dirty (unsaved changes)
        this.markEditorDirty()
    }

    /**
     * Remove a tag
     * @param {string} tag - Tag to remove
     */
    removeTag(tag) {
        // Add to explicitly removed tags set
        this.removedTags.add(tag)

        // Remove from tags array
        this.tags = this.tags.filter((t) => t !== tag)

        // Update UI
        this.renderTags()

        // Mark editor as dirty (unsaved changes)
        this.markEditorDirty()
    }

    /**
     * Render tags list
     */
    renderTags() {
        if (!this.tagsList) return

        // Clear current list
        this.tagsList.innerHTML = ""

        // Add each tag
        if (this.tags.length > 0) {
            this.tags.forEach((tag) => {
                const tagElement = document.createElement("div")
                tagElement.className = "tag-item"
                tagElement.innerHTML = `
                    <span class="tag-text">${tag}</span>
                    <button type="button" class="tag-remove" title="Remove tag">×</button>
                `

                // Add remove handler
                tagElement.querySelector(".tag-remove").addEventListener("click", () => this.removeTag(tag))

                this.tagsList.appendChild(tagElement)
            })
        } else {
            // If no tags, show a placeholder
            this.tagsList.innerHTML = '<p class="tags-placeholder">No tags added</p>'
        }
    }

    /**
     * Add a new category
     */
    addCategory() {
        if (!this.categoryInput || !this.categoryInput.value.trim()) return

        const category = slugify(this.categoryInput.value)

        // For simplicity, we'll keep a single category - replace any existing one
        this.categories = [category]

        // Reset removedCategory flag since we've explicitly added one
        this.removedCategory = null

        // Clear input
        this.categoryInput.value = ""

        // Update UI
        this.renderCategories()

        // Mark editor as dirty (unsaved changes)
        this.markEditorDirty()
    }

    /**
     * Remove a category
     * @param {string} category - Category to remove
     */
    removeCategory(category) {
        // Set the removedCategory flag
        this.removedCategory = category

        // Clear the categories array
        this.categories = []

        // Update UI
        this.renderCategories()

        // Mark editor as dirty (unsaved changes)
        this.markEditorDirty()
    }

    /**
     * Render categories list
     */
    renderCategories() {
        if (!this.categoriesList) return

        // Clear current list
        this.categoriesList.innerHTML = ""

        // Add each category
        if (this.categories.length > 0) {
            this.categories.forEach((category) => {
                const categoryElement = document.createElement("div")
                categoryElement.className = "category-item"
                categoryElement.innerHTML = `
                    <span class="category-text">${category}</span>
                    <button type="button" class="category-remove" title="Remove category">×</button>
                `

                // Add remove handler
                categoryElement
                    .querySelector(".category-remove")
                    .addEventListener("click", () => this.removeCategory(category))

                this.categoriesList.appendChild(categoryElement)
            })
        } else {
            // If no category, show a placeholder
            this.categoriesList.innerHTML = '<p class="categories-placeholder">No category set</p>'
        }
    }

    /**
     * Mark the editor as having unsaved changes
     */
    markEditorDirty() {
        // Use the existing unsaved changes handler if available
        if (window.editorState) {
            if (typeof window.editorState.markDirty === "function") {
                window.editorState.markDirty()
            } else if (window.editorState.isDirty !== undefined) {
                window.editorState.isDirty = true
            }
        }

        // Also notify any unsaved changes handler
        const event = new Event("input", { bubbles: true })
        document.getElementById("content")?.dispatchEvent(event)
    }

    /**
     * Get current values for form submission
     * @returns {Object} Current values
     */
    getCurrentValues() {
        const values = {
            publishDate: this.publishDateInput ? this.publishDateInput.value : null,
            tags: this.tags,
            category: this.categories.length > 0 ? this.categories[0] : null,
            // Include removal flags so the ContentService knows these were explicitly removed
            removedTags: Array.from(this.removedTags),
            removedCategory: this.removedCategory,
        }

        // Always include parent page for custom pages (even if null)
        if (this.pageTypeSelect?.value === "custom") {
            values.parentPage = this.parentPageSelect?.value || null
        }

        return values
    }

    /**
     * Reset the removal tracking after save
     */
    resetRemovalTracking() {
        this.removedTags.clear()
        this.removedCategory = null
    }
}
