/**
 * FullscreenManager - Completely fixed implementation that handles all edge cases
 *
 * This module handles:
 * - Toggling between normal and fullscreen modes
 * - Moving the textarea between containers
 * - Syncing state between normal and fullscreen modes
 * - Properly handling side-by-side mode transitions
 */

export class FullscreenManager {
    /**
     * Creates a new fullscreen manager instance
     * @param {Object} config - Fullscreen configuration
     * @param {Object} config.editor - Main editor instance
     * @param {Object} config.state - Editor state instance
     * @param {Object} config.ui - Editor UI instance
     * @param {Object} config.commands - Editor commands instance
     */
    constructor({ editor, state, ui, commands }) {
        this.editor = editor
        this.state = state
        this.ui = ui
        this.commands = commands

        // Fullscreen state
        this.isActive = false

        // Get pre-defined fullscreen container elements
        this.fullscreenContainer = document.getElementById("fullscreen-editor-container")
        this.fullscreenPreview = document.getElementById("fs-preview")
        this.fullscreenPreviewIndicator = document.getElementById("fs-preview-changes-indicator")
        this.fullscreenEditorContent = document.getElementById("fs-editor-content")

        // Internal flags to prevent recursion
        this._updatingTab = false
        this._updatingSideBySide = false

        // Initialize event listeners
        this.initEventListeners()
    }

    /**
     * Initialize fullscreen event listeners
     */
    initEventListeners() {
        // Exit fullscreen button
        const exitButton = this.fullscreenContainer.querySelector(".md-exit-fullscreen")
        if (exitButton) {
            exitButton.addEventListener("click", () => this.deactivate())
        }

        // Fullscreen tab buttons
        const tabButtons = this.fullscreenContainer.querySelectorAll(".md-tabs button")
        tabButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const action = button.getAttribute("data-action")
                const target = button.getAttribute("data-tab-content")

                if (action === "side-by-side") {
                    // Toggle side-by-side mode
                    this.toggleSideBySideView()
                } else if (action === "view" && target) {
                    // Handle tab changes
                    this.setActiveTab(target)
                }
            })
        })

        // Fullscreen toolbar buttons
        const toolbarButtons = this.fullscreenContainer.querySelectorAll(".md-toolbar button")
        toolbarButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const command = button.getAttribute("data-command")
                if (command) {
                    this.commands.execute(command)
                }
            })
        })

        // Handle ESC key
        document.addEventListener("keydown", this.handleEscapeKey.bind(this))
    }

    /**
     * Activate fullscreen mode
     */
    activate() {
        if (this.isActive) return

        // Store the original active tab
        const activeTab = this.state.getActiveTab()

        // Ensure we have a valid tab to activate (defaults to editor)
        const tabToActivate = activeTab === "editor" || activeTab === "preview" ? activeTab : "editor"

        // Always start with side-by-side mode disabled
        this.state.setSideBySideMode(false)

        // Move the textarea to the fullscreen container
        const textarea = this.ui.textarea
        if (textarea && this.fullscreenEditorContent) {
            this.fullscreenEditorContent.appendChild(textarea)
        }

        // Copy preview content
        if (this.ui.previewElement && this.fullscreenPreview) {
            this.fullscreenPreview.innerHTML = this.ui.previewElement.innerHTML
        }

        // Update indicator state
        const hasChanges = this.state.hasContentChanged()
        if (this.fullscreenPreviewIndicator) {
            this.fullscreenPreviewIndicator.classList.toggle("hidden", !hasChanges)
        }

        // Show the fullscreen container and hide the normal editor
        if (this.fullscreenContainer) {
            this.fullscreenContainer.style.display = "flex"
        }
        if (this.ui.container) {
            this.ui.container.style.display = "none"
        }

        // Reset side-by-side UI in fullscreen
        const contentContainer = this.fullscreenContainer.querySelector(".md-content-container")
        if (contentContainer) {
            contentContainer.classList.remove("side-by-side")
        }

        // Explicitly reset side-by-side button
        const sideBySideBtn = this.fullscreenContainer.querySelector('[data-action="side-by-side"]')
        if (sideBySideBtn) {
            sideBySideBtn.classList.remove("active")
        }

        // Explicitly activate the correct tab before updating state
        // This ensures the UI reflects the correct state
        this.activateTab(tabToActivate)

        // Update state to reflect the active tab
        this.state.setActiveTab(tabToActivate)

        // Update isActive state
        this.isActive = true

        // Focus the editor
        if (textarea) {
            textarea.focus()
        }
    }

    /**
     * Deactivate fullscreen mode
     */
    deactivate() {
        if (!this.isActive) return

        // Store the current active tab
        // If in side-by-side mode, use editor tab as default
        let activeTab = this.state.getActiveTab()
        if (this.state.isSideBySideMode() || (activeTab !== "editor" && activeTab !== "preview")) {
            activeTab = "editor"
        }

        // Always disable side-by-side mode when exiting fullscreen
        this.state.setSideBySideMode(false)

        // Move the textarea back to the normal container
        const textarea = this.ui.textarea
        const normalEditorContent = document.getElementById("editor-content")
        if (textarea && normalEditorContent) {
            normalEditorContent.appendChild(textarea)
        }

        // Copy preview content back if needed
        if (this.fullscreenPreview && this.ui.previewElement) {
            this.ui.previewElement.innerHTML = this.fullscreenPreview.innerHTML
        }

        // Hide the fullscreen container and show the normal editor
        if (this.fullscreenContainer) {
            this.fullscreenContainer.style.display = "none"
        }
        if (this.ui.container) {
            this.ui.container.style.display = ""
        }

        // Clear side-by-side mode in normal container
        const normalContentContainer = this.ui.container.querySelector(".md-content-container")
        if (normalContentContainer) {
            normalContentContainer.classList.remove("side-by-side")
        }

        // Update state
        this.isActive = false

        // Set the active tab in normal mode
        this.ui.setActiveView(activeTab)

        // Update state to match
        this.state.setActiveTab(activeTab)

        // Update preview change indicator in normal mode
        if (this.ui.previewChangesIndicator) {
            this.ui.previewChangesIndicator.classList.toggle("hidden", !this.state.hasContentChanged())
        }

        // Auto-resize textarea in normal view
        this.ui.autoResizeTextarea()
    }

    /**
     * Toggle fullscreen mode
     */
    toggle() {
        if (this.isActive) {
            this.deactivate()
        } else {
            this.activate()
        }
    }

    /**
     * Toggle side-by-side view in fullscreen mode
     */
    toggleSideBySideView() {
        if (!this.isActive || this._updatingSideBySide) return

        this._updatingSideBySide = true

        try {
            // Get the new side-by-side state (opposite of current)
            const isSideBySide = !this.state.isSideBySideMode()

            // Update UI directly
            const contentContainer = this.fullscreenContainer.querySelector(".md-content-container")
            const sideBySideBtn = this.fullscreenContainer.querySelector('[data-action="side-by-side"]')
            const tabButtons = this.fullscreenContainer.querySelectorAll('[data-action="view"]')
            const editorContent = this.fullscreenContainer.querySelector("#fs-editor-content")
            const previewContent = this.fullscreenContainer.querySelector("#fs-preview-content")

            // Apply side-by-side mode to container
            if (contentContainer) {
                contentContainer.classList.toggle("side-by-side", isSideBySide)
            }

            // Update side-by-side button
            if (sideBySideBtn) {
                sideBySideBtn.classList.toggle("active", isSideBySide)
            }

            if (isSideBySide) {
                // In side-by-side mode, both editor and preview are visible
                if (editorContent) editorContent.classList.add("active")
                if (previewContent) previewContent.classList.add("active")

                // Remove active from tab buttons
                tabButtons.forEach((btn) => {
                    if (btn.getAttribute("data-action") === "view") {
                        btn.classList.remove("active")
                    }
                })
            } else {
                // When exiting side-by-side, activate the stored tab
                const activeTab = this.state.getActiveTab()
                this.activateTab(activeTab)
            }

            // Update state last
            this.state.setSideBySideMode(isSideBySide)

            // Resize editor for the new layout
            this.ui.autoResizeTextarea()
        } finally {
            this._updatingSideBySide = false
        }
    }

    /**
     * Set active tab in fullscreen mode
     * @param {string} tabId - ID of the active tab
     */
    setActiveTab(tabId) {
        if (!this.isActive || !this.fullscreenContainer || this._updatingTab) return

        this._updatingTab = true

        try {
            // Validate tabId
            if (tabId !== "editor" && tabId !== "preview") {
                console.warn(`Invalid tab ID: "${tabId}", defaulting to "editor"`)
                tabId = "editor"
            }

            // If in side-by-side mode, exit it first
            if (this.state.isSideBySideMode()) {
                // Update UI directly
                const contentContainer = this.fullscreenContainer.querySelector(".md-content-container")
                if (contentContainer) {
                    contentContainer.classList.remove("side-by-side")
                }

                const sideBySideBtn = this.fullscreenContainer.querySelector('[data-action="side-by-side"]')
                if (sideBySideBtn) {
                    sideBySideBtn.classList.remove("active")
                }

                // Update state
                this.state.setSideBySideMode(false)
            }

            // Activate the tab
            this.activateTab(tabId)

            // Update state
            this.state.setActiveTab(tabId)
        } finally {
            this._updatingTab = false
        }
    }

    /**
     * Helper method to activate a tab without side effects
     * @param {string} tabId - ID of the tab to activate
     */
    activateTab(tabId) {
        if (!this.fullscreenContainer) return

        // Default to editor if invalid
        if (tabId !== "editor" && tabId !== "preview") {
            tabId = "editor"
        }

        // Update tab buttons
        const tabButtons = this.fullscreenContainer.querySelectorAll('[data-action="view"]')
        tabButtons.forEach((btn) => {
            const btnTabId = btn.getAttribute("data-tab-content")
            btn.classList.toggle("active", btnTabId === tabId)
        })

        // Update content visibility
        const editorContent = this.fullscreenContainer.querySelector("#fs-editor-content")
        const previewContent = this.fullscreenContainer.querySelector("#fs-preview-content")

        if (editorContent) {
            editorContent.classList.toggle("active", tabId === "editor")
        }
        if (previewContent) {
            previewContent.classList.toggle("active", tabId === "preview")
        }
    }

    /**
     * Handle ESC key for exiting fullscreen
     */
    handleEscapeKey(e) {
        if (e.key === "Escape" && this.isActive) {
            this.deactivate()
        }
    }
}
