/**
 * EditorState - Manages the state of the markdown editor
 *
 * This module handles:
 * - Content management (current and initial content)
 * - Editor view mode state (which tab is active, side-by-side mode)
 * - Change tracking
 */

export class EditorState {
    /**
     * Creates a new editor state instance
     * @param {Object} config - State configuration
     * @param {string} [config.initialContent=''] - Initial content
     */
    constructor({ initialContent = "" }) {
        // Content state
        this.content = initialContent
        this.initialContent = initialContent

        // View state
        this.activeTab = "editor" // 'editor' or 'preview'
        this.sideBySideMode = false

        // Selection state
        this.selectionStart = 0
        this.selectionEnd = 0
    }

    /**
     * Get current content
     * @returns {string} Current content
     */
    getContent() {
        return this.content
    }

    /**
     * Set current content and update state
     * @param {string} content - New content
     */
    setContent(content) {
        this.content = content
    }

    /**
     * Reset the initial content to current content
     * Useful after saving to mark current state as clean
     */
    resetInitialContent() {
        this.initialContent = this.content
    }

    /**
     * Check if content has changed from initial state
     * @returns {boolean} Whether content has changed
     */
    hasContentChanged() {
        return this.content !== this.initialContent
    }

    /**
     * Set active tab
     * @param {string} tabId - ID of the active tab ('editor' or 'preview')
     */
    setActiveTab(tabId) {
        this.activeTab = tabId
    }

    /**
     * Get active tab
     * @returns {string} ID of the active tab
     */
    getActiveTab() {
        return this.activeTab
    }

    /**
     * Set side-by-side mode
     * @param {boolean} isActive - Whether side-by-side mode is active
     */
    setSideBySideMode(isActive) {
        this.sideBySideMode = isActive
    }

    /**
     * Get side-by-side mode state
     * @returns {boolean} Whether side-by-side mode is active
     */
    isSideBySideMode() {
        return this.sideBySideMode
    }

    /**
     * Update selection state
     * @param {number} start - Selection start position
     * @param {number} end - Selection end position
     */
    setSelection(start, end) {
        this.selectionStart = start
        this.selectionEnd = end
    }

    /**
     * Get current selection
     * @returns {Object} Selection state with start and end
     */
    getSelection() {
        return {
            start: this.selectionStart,
            end: this.selectionEnd,
        }
    }
}
