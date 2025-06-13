/**
 * Editor Off-Canvas Sidebar
 * Implementation using existing HTML elements
 */
class EditorOffCanvasSidebar {
    constructor() {
        this.sidebar = document.querySelector(".editor-sidebar")
        this.overlay = document.querySelector(".editor-sidebar-overlay")
        this.toggleButtons = document.querySelectorAll(".editor-sidebar-toggle-btn")
        this.closeButton = document.querySelector(".editor-sidebar-close-btn")
        this.isOpen = false
    }

    init() {
        this.attachEventListeners()
    }

    attachEventListeners() {
        // Toggle buttons
        this.toggleButtons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.preventDefault()
                this.toggleSidebar()
            })
        })

        // Overlay click to close
        if (this.overlay) {
            this.overlay.addEventListener("click", () => this.closeSidebar())
        }

        // Add event listener to the close button
        this.closeButton.addEventListener("click", () => this.closeSidebar())

        // Keyboard shortcuts
        document.addEventListener("keydown", (e) => {
            // ESC key to close
            if (e.key === "Escape" && this.isOpen) {
                this.closeSidebar()
            }

            // Ctrl/Cmd + Shift + S to toggle
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
                e.preventDefault()
                this.toggleSidebar()
            }
        })
    }

    toggleSidebar() {
        if (this.isOpen) {
            this.closeSidebar()
        } else {
            this.openSidebar()
        }
    }

    openSidebar() {
        this.sidebar.classList.add("open")
        if (this.overlay) {
            this.overlay.classList.add("active")
        }

        // Update all toggle buttons
        this.updateToggleButtons(true)

        // Prevent body scroll
        document.body.classList.add("editor-sidebar-open")

        this.isOpen = true

        // Reset sidebar content scroll position to top
        this.sidebar.scrollTop = 0

        // Focus first input after animation
        setTimeout(() => {
            const firstInput = this.sidebar.querySelector('input:not([type="hidden"]), select, textarea')
            if (firstInput) {
                firstInput.focus()
            }
        }, 300)

        // Dispatch custom event
        document.dispatchEvent(new CustomEvent("sidebarOpened"))
    }

    closeSidebar() {
        this.sidebar.classList.remove("open")
        if (this.overlay) {
            this.overlay.classList.remove("active")
        }

        // Update all toggle buttons
        this.updateToggleButtons(false)

        // Restore body scroll
        document.body.classList.remove("editor-sidebar-open")

        this.isOpen = false

        // Dispatch custom event
        document.dispatchEvent(new CustomEvent("sidebarClosed"))
    }

    updateToggleButtons(isOpen) {
        this.toggleButtons.forEach((btn) => {
            if (isOpen) {
                btn.classList.add("active")
                btn.title = "Close Sidebar"
            } else {
                btn.classList.remove("active")
                btn.title = "Toggle Sidebar (Ctrl+Shift+S)"
            }
        })
    }

    // Public API methods
    getState() {
        return { isOpen: this.isOpen }
    }

    open() {
        if (!this.isOpen) this.openSidebar()
    }

    close() {
        if (this.isOpen) this.closeSidebar()
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    const offCanvasSidebar = new EditorOffCanvasSidebar()
    offCanvasSidebar.init()

    // Make globally accessible
    window.offCanvasSidebar = offCanvasSidebar
})
