/**
 * UnsavedChangesHandler - Warns users about unsaved changes
 * This is an enhancement not present in the original code
 */
export class UnsavedChangesHandler {
    constructor({ editorState, formElements }) {
        this.editorState = editorState
        this.formElements = formElements
        this.hasUnsavedChanges = false
        this.originalFormValues = {}

        // Store the original form values
        this.captureOriginalValues()
    }

    /**
     * Store the original values of form elements to detect changes
     */
    captureOriginalValues() {
        this.originalFormValues = {}

        // Only track elements that exist
        Object.entries(this.formElements).forEach(([key, element]) => {
            if (!element) return

            if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
                this.originalFormValues[key] = element.value
            } else if (element.tagName === "SELECT") {
                this.originalFormValues[key] = element.value
            }
        })

        // Also capture tags, categories and date for change detection
        if (window.editorEnhancements) {
            const enhancementValues = window.editorEnhancements.getCurrentValues()
            this.originalFormValues.tags = JSON.stringify(enhancementValues.tags || [])
            this.originalFormValues.category = enhancementValues.category || ""
            this.originalFormValues.publishDate = enhancementValues.publishDate || ""
        }
    }

    /**
     * Initialize event listeners for tracking changes and navigation
     */
    initEventListeners() {
        // Add input event listeners to form elements
        Object.entries(this.formElements).forEach(([key, element]) => {
            if (!element) return

            // For all input elements, textareas, and selects
            if (element.tagName === "TEXTAREA" || element.tagName === "INPUT" || element.tagName === "SELECT") {
                element.addEventListener("input", () => this.checkForChanges())
                element.addEventListener("change", () => this.checkForChanges())
            }
        })

        // Add listener for our custom fields
        document.addEventListener("input", (event) => {
            // Check if the input is from our tags or categories
            if (event.target.closest(".tags-input-wrapper, .category-input-wrapper")) {
                this.checkForChanges()
            }
        })

        // We don't set up the beforeunload event here anymore
        // The NavigationHandler will handle this
    }

    /**
     * Check if form values have changed from original
     */
    checkForChanges() {
        let hasChanges = false

        // Check standard form elements
        Object.entries(this.formElements).forEach(([key, element]) => {
            if (!element) return

            const originalValue = this.originalFormValues[key]
            const currentValue = element.value

            if (originalValue !== currentValue) {
                hasChanges = true
            }
        })

        // Also check tags, categories and date if available
        if (window.editorEnhancements && !hasChanges) {
            const enhancementValues = window.editorEnhancements.getCurrentValues()

            const currentTags = JSON.stringify(enhancementValues.tags || [])
            const currentCategory = enhancementValues.category || ""
            const currentPublishDate = enhancementValues.publishDate || ""

            if (
                this.originalFormValues.tags !== currentTags ||
                this.originalFormValues.category !== currentCategory ||
                this.originalFormValues.publishDate !== currentPublishDate
            ) {
                hasChanges = true
            }
        }

        this.hasUnsavedChanges = hasChanges
        this.editorState.markDirty(hasChanges)
    }

    /**
     * Mark the form as clean (no unsaved changes)
     */
    markClean() {
        this.hasUnsavedChanges = false

        // Re-capture the current values as the new baseline
        this.captureOriginalValues()
    }
}
