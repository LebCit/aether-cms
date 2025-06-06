/**
 * EditorToolbar - Handles the markdown toolbar functionality
 */
export class EditorToolbar {
    constructor({ buttons, contentTextarea }) {
        this.buttons = buttons
        this.contentTextarea = contentTextarea
    }

    /**
     * Initialize event listeners for toolbar buttons
     */
    initEventListeners() {
        if (!this.buttons || !this.contentTextarea) return

        this.buttons.forEach((button) => {
            button.addEventListener("click", (event) => {
                const command = event.target.getAttribute("data-command")
                this.executeCommand(command)
            })
        })
    }

    /**
     * Execute a toolbar command
     * @param {string} command - The command to execute
     */
    executeCommand(command) {
        if (!this.contentTextarea) return

        const textarea = this.contentTextarea
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textarea.value.substring(start, end)
        let replacement = ""

        switch (command) {
            case "bold":
                replacement = `**${selectedText}**`
                break

            case "italic":
                replacement = `*${selectedText}*`
                break

            case "heading":
                replacement = `\n## ${selectedText}`
                break

            case "link":
                const url = prompt("Enter URL:", "http://")
                if (url) {
                    replacement = `[${selectedText || "Link text"}](${url})`
                } else {
                    return
                }
                break

            case "list":
                if (selectedText) {
                    const lines = selectedText.split("\n")
                    replacement = lines.map((line) => `- ${line}`).join("\n")
                } else {
                    replacement = "- List item"
                }
                break

            case "image":
                const imageUrl = prompt("Enter image URL:", "http://")
                if (imageUrl) {
                    replacement = `![${selectedText || "Image description"}](${imageUrl})`
                } else {
                    return
                }
                break

            default:
                return
        }

        // Insert the markdown
        if (replacement) {
            this.insertTextToEditor(replacement, start, end)
        }
    }

    /**
     * Insert text into the editor and update cursor position
     * @param {string} text - Text to insert
     * @param {number} start - Selection start position
     * @param {number} end - Selection end position
     */
    insertTextToEditor(text, start, end) {
        const textarea = this.contentTextarea

        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end)

        // Set focus back to textarea and adjust cursor position
        textarea.focus()
        const newPosition = start + text.length
        textarea.setSelectionRange(newPosition, newPosition)

        // Dispatch input event to trigger any listeners
        const event = new Event("input", { bubbles: true })
        textarea.dispatchEvent(event)
    }
}
