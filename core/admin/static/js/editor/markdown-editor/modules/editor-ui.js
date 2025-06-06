/**
 * EditorUI - Manages the editor user interface with pre-defined HTML
 *
 * This module handles:
 * - DOM interactions
 * - UI element references
 * - View changes (tabs, side-by-side)
 * - UI updates
 */

export class EditorUI {
    /**
     * Creates a new editor UI instance
     * @param {Object} config - UI configuration
     * @param {HTMLTextAreaElement} config.textarea - The textarea element
     * @param {HTMLElement} config.container - The editor container element
     * @param {Function} [config.onViewChange] - Callback for view changes
     * @param {Function} [config.onTabChange] - Callback for tab changes
     */
    constructor({ textarea, container, onViewChange, onTabChange }) {
        // Core elements
        this.textarea = textarea
        this.container = container || textarea.closest(".form-group")

        // Callbacks
        this.onViewChange = onViewChange
        this.onTabChange = onTabChange

        // Get references to pre-defined UI elements
        this.initUIElements()
    }

    /**
     * Initialize UI element references
     */
    initUIElements() {
        // Normal mode elements
        this.previewElement = document.getElementById("preview")
        this.previewChangesIndicator = document.getElementById("preview-changes-indicator")
        this.contentContainer = this.container.querySelector(".md-content-container")
        this.editorContent = document.getElementById("editor-content")
        this.previewContent = document.getElementById("preview-content")

        // Tab buttons
        this.editorTab = this.container.querySelector('[data-action="view"][data-tab-content="editor"]')
        this.previewTab = this.container.querySelector('[data-action="view"][data-tab-content="preview"]')
        this.sideBySideBtn = this.container.querySelector('[data-action="side-by-side"]')
        this.fullscreenBtn = this.container.querySelector('[data-action="fullscreen"]')

        // Get all toolbar buttons and tab buttons
        this.toolbarButtons = this.container.querySelectorAll(".md-toolbar button")
        this.tabButtons = this.container.querySelectorAll(".md-tabs button")
    }

    /**
     * Initialize the editor UI and attach event listeners
     */
    init() {
        // Attach event listeners to tab buttons
        this.tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.getAttribute("data-action")
                const target = button.getAttribute("data-tab-content")

                if (action === "fullscreen") {
                    // Let the fullscreen manager handle this
                    return
                }

                if (action === "side-by-side") {
                    // Side-by-side is not supported in normal mode, but handle it for consistency
                    if (this.onViewChange) {
                        this.onViewChange(true)
                    }
                    return
                }

                if (action === "view" && target) {
                    this.setActiveView(target)
                    if (this.onTabChange) {
                        this.onTabChange(target)
                    }
                }
            })
        })
    }

    /**
     * Set active view (editor or preview)
     * @param {string} viewId - View to activate ('editor' or 'preview')
     */
    setActiveView(viewId) {
        if (!viewId) return

        // Update active tab buttons
        this.tabButtons.forEach((btn) => {
            if (btn.getAttribute("data-tab-content") === viewId) {
                btn.classList.add("active")
            } else {
                btn.classList.remove("active")
            }
        })

        // Update content visibility
        if (this.editorContent) {
            this.editorContent.classList.toggle("active", viewId === "editor")
        }
        if (this.previewContent) {
            this.previewContent.classList.toggle("active", viewId === "preview")
        }

        // Resize textarea if showing editor
        if (viewId === "editor" && this.textarea) {
            this.autoResizeTextarea()
        }
    }

    /**
     * Apply side-by-side mode (in normal mode this would be a no-op)
     * @param {boolean} enable - Whether to enable side-by-side view
     */
    applySideBySideMode(enable) {
        // Side-by-side is only for fullscreen mode, so this is a no-op in normal mode
        // But we'll keep this for API consistency

        if (enable && this.sideBySideBtn) {
            this.sideBySideBtn.classList.add("active")
        } else if (this.sideBySideBtn) {
            this.sideBySideBtn.classList.remove("active")
        }
    }

    /**
     * Auto-resize textarea to fit content
     */
    autoResizeTextarea() {
        if (!this.textarea) return

        // Only resize if visible
        if (this.textarea.offsetParent !== null) {
            this.textarea.style.height = "auto"
            this.textarea.style.height = this.textarea.scrollHeight + "px"
        }
    }

    /**
     * Set focus to the editor
     */
    focus() {
        if (!this.textarea) return

        // Make sure editor tab is active
        this.setActiveView("editor")

        // Focus the textarea
        this.textarea.focus()
    }
}
