/**
 * EditorCommands - Handles editor formatting commands
 *
 * This module handles:
 * - Executing formatting commands (bold, italic, etc.)
 * - Toolbar state management
 * - Text manipulation helpers
 */

export class EditorCommands {
    /**
     * Creates a new editor commands instance
     * @param {Object} config - Command configuration
     * @param {Object} config.state - Editor state instance
     * @param {Object} config.ui - Editor UI instance
     */
    constructor({ state, ui }) {
        this.state = state
        this.ui = ui
    }

    /**
     * Initialize commands
     */
    init() {
        // No initialization needed for now
    }

    /**
     * Execute a formatting command
     * @param {string} command - Command to execute
     */
    execute(command) {
        // Make sure the textarea is visible and accessible
        if (
            !this.ui.textarea ||
            (!this.ui.editorContent.classList.contains("active") &&
                !this.ui.contentContainer.classList.contains("side-by-side"))
        ) {
            return
        }

        this.ui.textarea.focus()

        switch (command) {
            // Inline formatting
            case "bold":
                this.insertFormatting("**", "**")
                break
            case "italic":
                this.insertFormatting("*", "*")
                break
            case "strikethrough":
                this.insertFormatting("~~", "~~")
                break
            case "code":
                this.insertFormatting("`", "`")
                break

            // Headings
            case "h1":
                this.insertLinePrefix("# ")
                break
            case "h2":
                this.insertLinePrefix("## ")
                break
            case "h3":
                this.insertLinePrefix("### ")
                break

            // Lists
            case "ul":
                this.insertLinePrefix("- ")
                break
            case "ol":
                this.insertLinePrefix("1. ")
                break
            case "task":
                this.insertLinePrefix("- [ ] ")
                break

            // Block elements
            case "quote":
                this.insertLinePrefix("> ")
                break
            case "codeblock":
                this.insertCodeBlock()
                break
            case "hr":
                this.insertHorizontalRule()
                break

            // Inline elements with UI
            case "link":
                this.insertLink()
                break
            // Modify the image case to return early - our custom handler will take over
            case "image":
                // Do nothing here - our custom handler in editor-media.js will handle this
                // This effectively prevents the default image insertion behavior
                return
        }

        // Update toolbar state
        this.updateToolbarState()
    }

    /**
     * Get information about the current line (for line operations)
     * @returns {Object} Object with line info (start, end, text)
     */
    getCurrentLineInfo() {
        const textarea = this.ui.textarea
        const text = textarea.value
        const cursorPos = textarea.selectionStart

        // Find the start of the current line
        let lineStart = cursorPos
        while (lineStart > 0 && text.charAt(lineStart - 1) !== "\n") {
            lineStart--
        }

        // Find the end of the current line
        let lineEnd = cursorPos
        while (lineEnd < text.length && text.charAt(lineEnd) !== "\n") {
            lineEnd++
        }

        return {
            start: lineStart,
            end: lineEnd,
            text: text.substring(lineStart, lineEnd),
        }
    }

    /**
     * Insert or toggle formatting markers
     * @param {string} prefix - Starting marker
     * @param {string} suffix - Ending marker
     */
    insertFormatting(prefix, suffix) {
        const textarea = this.ui.textarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)
        let replacement
        let newCursorStart
        let newCursorEnd

        // Check if the selection is already formatted
        if (selectedText.length > 0) {
            // Case 1: User selected the entire formatted text including markers
            if (
                selectedText.startsWith(prefix) &&
                selectedText.endsWith(suffix) &&
                selectedText.length >= prefix.length + suffix.length
            ) {
                // Remove formatting
                const unformattedText = selectedText.substring(prefix.length, selectedText.length - suffix.length)
                replacement = unformattedText
                newCursorStart = start
                newCursorEnd = start + unformattedText.length
            }
            // Case 2: Check surrounding text for formatting markers
            else {
                // Look before and after selection for formatting markers
                const textBefore = textarea.value.substring(Math.max(0, start - prefix.length), start)
                const textAfter = textarea.value.substring(end, Math.min(textarea.value.length, end + suffix.length))

                if (textBefore === prefix && textAfter === suffix) {
                    // Selection is inside formatting markers - remove them
                    replacement = selectedText
                    newCursorStart = start - prefix.length
                    newCursorEnd = end - prefix.length

                    // Need to adjust the textarea value differently for this case
                    textarea.value =
                        textarea.value.substring(0, start - prefix.length) +
                        replacement +
                        textarea.value.substring(end + suffix.length)

                    // Reset focus and selection
                    textarea.focus()
                    textarea.selectionStart = newCursorStart
                    textarea.selectionEnd = newCursorEnd

                    // Update content state
                    this.state.setContent(textarea.value)

                    // Update the preview and trigger input event
                    this.triggerInputEvent()
                    return // Exit early since we've handled the special case
                }

                // Regular formatting - add markers
                replacement = prefix + selectedText + suffix
                newCursorStart = start + prefix.length
                newCursorEnd = end + prefix.length
            }
        } else {
            // No selection - insert markers with cursor positioned between them
            replacement = prefix + suffix
            newCursorStart = start + prefix.length
            newCursorEnd = newCursorStart
        }

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

        // Update content state
        this.state.setContent(textarea.value)

        // Reset focus and selection
        textarea.focus()
        textarea.selectionStart = newCursorStart
        textarea.selectionEnd = newCursorEnd

        // Update the preview and trigger input event
        this.triggerInputEvent()
    }

    /**
     * Insert or toggle line prefixes (headings, lists, etc.)
     * @param {string} prefix - The line prefix to insert
     */
    insertLinePrefix(prefix) {
        const textarea = this.ui.textarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        // If there's a selection spanning multiple lines
        if (start !== end && textarea.value.substring(start, end).includes("\n")) {
            const selectedText = textarea.value.substring(start, end)
            const lines = selectedText.split("\n")

            // Apply or remove the prefix for each line
            const newLines = lines.map((line) => {
                if (line.startsWith(prefix)) {
                    return line.substring(prefix.length) // Remove prefix
                } else {
                    return prefix + line // Add prefix
                }
            })

            const replacement = newLines.join("\n")

            textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

            // Reset focus and selection
            textarea.focus()
            textarea.selectionStart = start
            textarea.selectionEnd = start + replacement.length

            // Update content state
            this.state.setContent(textarea.value)

            // Update the preview and trigger input event
            this.triggerInputEvent()
        } else {
            // Work with the current line
            const lineInfo = this.getCurrentLineInfo()

            // Check if the line already has the prefix
            if (lineInfo.text.startsWith(prefix)) {
                // Remove the prefix
                const newLine = lineInfo.text.substring(prefix.length)
                textarea.value =
                    textarea.value.substring(0, lineInfo.start) + newLine + textarea.value.substring(lineInfo.end)

                // Adjust cursor position
                const newCursorPos = start - prefix.length
                textarea.selectionStart = Math.max(lineInfo.start, newCursorPos)
                textarea.selectionEnd = Math.max(lineInfo.start, newCursorPos)
            } else {
                // Add the prefix
                textarea.value =
                    textarea.value.substring(0, lineInfo.start) +
                    prefix +
                    lineInfo.text +
                    textarea.value.substring(lineInfo.end)

                // Adjust cursor position
                const newCursorPos = start + prefix.length
                textarea.selectionStart = newCursorPos
                textarea.selectionEnd = newCursorPos
            }

            // Update content state
            this.state.setContent(textarea.value)

            // Update the preview and trigger input event
            this.triggerInputEvent()
        }
    }

    /**
     * Insert a code block
     */
    insertCodeBlock() {
        const textarea = this.ui.textarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)

        let replacement
        let newCursorStart
        let newCursorEnd

        if (selectedText.length > 0) {
            // Wrap selected text in code block
            replacement = "```\n" + selectedText + "\n```"
            newCursorStart = start + 4 // After the first ```\n
            newCursorEnd = start + selectedText.length + 4
        } else {
            // Insert empty code block with cursor positioned inside
            replacement = "```\n\n```"
            newCursorStart = start + 4 // Position after ```\n
            newCursorEnd = newCursorStart
        }

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

        // Update content state
        this.state.setContent(textarea.value)

        // Reset focus and selection
        textarea.focus()
        textarea.selectionStart = newCursorStart
        textarea.selectionEnd = newCursorEnd

        // Update the preview and trigger input event
        this.triggerInputEvent()
    }

    /**
     * Insert a link
     */
    insertLink() {
        const textarea = this.ui.textarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)

        let replacement
        let newCursorStart
        let newCursorEnd

        if (selectedText.length > 0) {
            // If there's selected text, use it as the link text
            replacement = "[" + selectedText + "](url)"
            newCursorStart = start + selectedText.length + 3 // Position after '['text']('
            newCursorEnd = start + selectedText.length + 6 // Select 'url'
        } else {
            // Insert empty link structure
            replacement = "[text](url)"
            newCursorStart = start + 1 // Position after '['
            newCursorEnd = start + 5 // Select 'text'
        }

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

        // Update content state
        this.state.setContent(textarea.value)

        // Reset focus and selection
        textarea.focus()
        textarea.selectionStart = newCursorStart
        textarea.selectionEnd = newCursorEnd

        // Update the preview and trigger input event
        this.triggerInputEvent()
    }

    /**
     * Insert an image
     */
    insertImage() {
        const textarea = this.ui.textarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)

        let replacement
        let newCursorStart
        let newCursorEnd

        if (selectedText.length > 0) {
            // If there's selected text, use it as the alt text
            replacement = "![" + selectedText + "](image-url)"
            newCursorStart = start + selectedText.length + 4 // Position after '!['text']('
            newCursorEnd = start + selectedText.length + 13 // Select 'image-url'
        } else {
            // Insert empty image structure
            replacement = "![alt text](image-url)"
            newCursorStart = start + 2 // Position after '!['
            newCursorEnd = start + 10 // Select 'alt text'
        }

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

        // Update content state
        this.state.setContent(textarea.value)

        // Reset focus and selection
        textarea.focus()
        textarea.selectionStart = newCursorStart
        textarea.selectionEnd = newCursorEnd

        // Update the preview and trigger input event
        this.triggerInputEvent()
    }

    /**
     * Insert a horizontal rule
     */
    insertHorizontalRule() {
        const textarea = this.ui.textarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd

        // Insert horizontal rule with proper spacing
        const prevChar = start > 0 ? textarea.value.charAt(start - 1) : ""
        const nextChar = end < textarea.value.length ? textarea.value.charAt(end) : ""

        let prefix = prevChar !== "\n" && start > 0 ? "\n\n" : ""
        let suffix = nextChar !== "\n" && end < textarea.value.length ? "\n\n" : ""

        if (prefix === "\n\n" && start > 1 && textarea.value.charAt(start - 2) === "\n") {
            prefix = "\n" // Avoid too many blank lines
        }

        if (suffix === "\n\n" && end < textarea.value.length - 1 && textarea.value.charAt(end + 1) === "\n") {
            suffix = "\n" // Avoid too many blank lines
        }

        const replacement = prefix + "---" + suffix

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end)

        // Update content state
        this.state.setContent(textarea.value)

        // Reset focus and position cursor after the horizontal rule
        textarea.focus()
        const newCursorPos = start + prefix.length + 3 + suffix.length
        textarea.selectionStart = newCursorPos
        textarea.selectionEnd = newCursorPos

        // Update the preview and trigger input event
        this.triggerInputEvent()
    }

    /**
     * Trigger input event on textarea
     * Useful after programmatic changes
     */
    triggerInputEvent() {
        // Create and dispatch an input event
        const event = new Event("input", { bubbles: true })
        this.ui.textarea.dispatchEvent(event)
    }

    /**
     * Update toolbar state based on current text/selection
     */
    updateToolbarState() {
        // Reset all button states
        this.ui.toolbarButtons.forEach((btn) => {
            btn.classList.remove("active")
        })

        // If there's no selection or cursor position, return
        if (!this.ui.textarea || this.ui.textarea.selectionStart === undefined) return

        // Get current line info to check for line prefixes
        const lineInfo = this.getCurrentLineInfo()

        // Check for headings
        if (lineInfo.text.startsWith("# ")) {
            this.ui.container.querySelector('[data-command="h1"]')?.classList.add("active")
        } else if (lineInfo.text.startsWith("## ")) {
            this.ui.container.querySelector('[data-command="h2"]')?.classList.add("active")
        } else if (lineInfo.text.startsWith("### ")) {
            this.ui.container.querySelector('[data-command="h3"]')?.classList.add("active")
        }

        // Check for lists
        if (lineInfo.text.match(/^- /)) {
            this.ui.container.querySelector('[data-command="ul"]')?.classList.add("active")
        } else if (lineInfo.text.match(/^\d+\. /)) {
            this.ui.container.querySelector('[data-command="ol"]')?.classList.add("active")
        } else if (lineInfo.text.match(/^- \[ \] /)) {
            this.ui.container.querySelector('[data-command="task"]')?.classList.add("active")
        }

        // Check for blockquote
        if (lineInfo.text.startsWith("> ")) {
            this.ui.container.querySelector('[data-command="quote"]')?.classList.add("active")
        }

        // Check inline formatting if there's a selection
        const selectedText = this.ui.textarea.value.substring(
            this.ui.textarea.selectionStart,
            this.ui.textarea.selectionEnd
        )

        if (selectedText) {
            // Check bold
            if (this.isFormattedWith(selectedText, "**", "**")) {
                this.ui.container.querySelector('[data-command="bold"]')?.classList.add("active")
            }

            // Check italic
            if (this.isFormattedWith(selectedText, "*", "*")) {
                this.ui.container.querySelector('[data-command="italic"]')?.classList.add("active")
            }

            // Check strikethrough
            if (this.isFormattedWith(selectedText, "~~", "~~")) {
                this.ui.container.querySelector('[data-command="strikethrough"]')?.classList.add("active")
            }

            // Check code
            if (this.isFormattedWith(selectedText, "`", "`")) {
                this.ui.container.querySelector('[data-command="code"]')?.classList.add("active")
            }
        }
    }

    /**
     * Check if text is formatted with given markers
     * @param {string} text - Text to check
     * @param {string} prefix - Start marker
     * @param {string} suffix - End marker
     * @returns {boolean} True if formatted with markers
     */
    isFormattedWith(text, prefix, suffix) {
        // Check if the text itself has the markers
        if (text.startsWith(prefix) && text.endsWith(suffix) && text.length >= prefix.length + suffix.length) {
            return true
        }

        // Check if the surroundings have the markers
        const start = this.ui.textarea.selectionStart
        const end = this.ui.textarea.selectionEnd
        const textBefore = this.ui.textarea.value.substring(Math.max(0, start - prefix.length), start)
        const textAfter = this.ui.textarea.value.substring(
            end,
            Math.min(this.ui.textarea.value.length, end + suffix.length)
        )

        // For asterisk-based formatting, we need to be more precise
        if ((prefix === "*" && suffix === "*") || (prefix === "**" && suffix === "**")) {
            // For bold (double asterisks)
            if (prefix === "**" && suffix === "**") {
                // Check for exact double asterisks, not just any asterisks
                return textBefore === "**" && textAfter === "**"
            }

            // For italic (single asterisk)
            if (prefix === "*" && suffix === "*") {
                // Check for single asterisks but NOT double asterisks
                return (
                    textBefore === "*" &&
                    textAfter === "*" &&
                    (start < 2 || this.ui.textarea.value.charAt(start - 2) !== "*") &&
                    (end + 1 >= this.ui.textarea.value.length || this.ui.textarea.value.charAt(end + 1) !== "*")
                )
            }
        }

        return textBefore === prefix && textAfter === suffix
    }
}
