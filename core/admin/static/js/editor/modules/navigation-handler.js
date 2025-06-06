/**
 * NavigationHandler - Handles navigation with unsaved changes warnings
 */
export class NavigationHandler {
    constructor({ unsavedChangesHandler }) {
        this.unsavedChangesHandler = unsavedChangesHandler
        this.navigationModal = null
        this.pendingNavigation = null
        this.initialized = false

        // Make beforeUnloadHandler accessible to other components
        this.beforeUnloadHandler = null
    }

    /**
     * Initialize the navigation handler
     * This creates a modal dialog and sets up event listeners
     */
    init() {
        if (this.initialized) return

        // Create a modal for the navigation confirmation
        this.createNavigationModal()

        // Intercept link clicks
        this.interceptLinkClicks()

        // We still need the beforeunload handler for browser/tab close actions
        this.setupBeforeUnloadHandler()

        // Make this instance globally accessible
        window.navigationHandler = this

        this.initialized = true
    }

    /**
     * Create the navigation confirmation modal
     */
    createNavigationModal() {
        // Create the modal element
        const modal = document.createElement("div")
        modal.className = "modal navigation-warning-modal"
        modal.id = "navigation-warning-modal"

        // Add modal content
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Unsaved Changes</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>You have unsaved changes that will be lost if you navigate away.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" id="cancel-navigation">Stay on Page</button>
                    <button class="btn btn-danger" id="confirm-navigation">Leave Anyway</button>
                </div>
            </div>
        `

        // Add to document
        document.body.appendChild(modal)

        // Store reference to the modal
        this.navigationModal = modal

        // Add event listeners for the modal buttons
        document.getElementById("cancel-navigation").addEventListener("click", () => {
            this.hideModal()
            this.pendingNavigation = null
        })

        document.getElementById("confirm-navigation").addEventListener("click", () => {
            this.hideModal()
            if (this.pendingNavigation) {
                // Temporarily remove our beforeunload handler to allow navigation
                const tempHandler = this.beforeUnloadHandler
                window.removeEventListener("beforeunload", tempHandler)

                // Execute the navigation
                if (this.pendingNavigation.type === "href") {
                    window.location.href = this.pendingNavigation.target
                } else if (this.pendingNavigation.type === "function") {
                    this.pendingNavigation.target()
                }

                // Reset pending navigation
                this.pendingNavigation = null

                // Restore our beforeunload handler after a short delay
                setTimeout(() => {
                    window.addEventListener("beforeunload", tempHandler)
                }, 100)
            }
        })

        // Close button handler
        modal.querySelector(".close-modal").addEventListener("click", () => {
            this.hideModal()
            this.pendingNavigation = null
        })

        // Click outside the modal to cancel
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                this.hideModal()
                this.pendingNavigation = null
            }
        })
    }

    /**
     * Intercept link clicks to show the modal when there are unsaved changes
     */
    interceptLinkClicks() {
        document.addEventListener("click", (event) => {
            // Find closest anchor element
            const link = event.target.closest("a")

            // If not a link or link has no href, ignore
            if (!link || !link.href) return

            // Check for external links, downloads, or new tabs
            if (
                link.getAttribute("download") ||
                link.getAttribute("target") === "_blank" ||
                link.getAttribute("rel") === "external" ||
                (link.href.startsWith("http") && !link.href.startsWith(window.location.origin))
            ) {
                // Let these pass through without intervention
                return
            }

            // Check if we have unsaved changes
            if (this.unsavedChangesHandler.hasUnsavedChanges) {
                // Prevent the default navigation
                event.preventDefault()

                // Store the target URL
                this.pendingNavigation = {
                    type: "href",
                    target: link.href,
                }

                // Show the confirmation modal
                this.showModal()

                return false
            }
        })
    }

    /**
     * Set up the beforeunload handler for browser tab close, etc.
     */
    setupBeforeUnloadHandler() {
        this.beforeUnloadHandler = (event) => {
            // Check if we're in a saving navigation (handled by ContentService)
            if (window.contentService && window.contentService.isSavingNavigation) {
                return
            }

            if (this.unsavedChangesHandler.hasUnsavedChanges) {
                event.preventDefault()
                event.returnValue = "You have unsaved changes. Are you sure you want to leave?"
                return event.returnValue
            }
        }

        window.addEventListener("beforeunload", this.beforeUnloadHandler)
    }

    /**
     * Enable navigation warning
     */
    enableNavigationWarning() {
        if (this.beforeUnloadHandler) {
            window.addEventListener("beforeunload", this.beforeUnloadHandler)
        }
    }

    /**
     * Disable navigation warning
     */
    disableNavigationWarning() {
        if (this.beforeUnloadHandler) {
            window.removeEventListener("beforeunload", this.beforeUnloadHandler)
        }
    }

    /**
     * Show the navigation warning modal
     */
    showModal() {
        if (this.navigationModal) {
            this.navigationModal.classList.add("show")
        }
    }

    /**
     * Hide the navigation warning modal
     */
    hideModal() {
        if (this.navigationModal) {
            this.navigationModal.classList.remove("show")
        }
    }

    /**
     * Check if navigation should be allowed, and handle accordingly
     * @param {string|Function} target - URL or function to execute
     * @param {string} type - 'href' for URLs, 'function' for callbacks
     * @returns {boolean} - Whether navigation was allowed immediately
     */
    confirmNavigation(target, type = "href") {
        if (!this.unsavedChangesHandler.hasUnsavedChanges) {
            // No unsaved changes, proceed immediately
            if (type === "href") {
                window.location.href = target
            } else if (type === "function" && typeof target === "function") {
                target()
            }
            return true
        }

        // Store the pending navigation
        this.pendingNavigation = { type, target }

        // Show the modal
        this.showModal()

        // Navigation not performed immediately
        return false
    }
}
