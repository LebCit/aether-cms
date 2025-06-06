/**
 * Editor Integration
 * Handles the interaction between media selector and text editor
 */
class EditorIntegration {
    constructor() {
        this.editorState = null
        this.editorElement = document.getElementById("content")
    }

    /**
     * Initialize the editor integration
     * @param {Object} editorState - Reference to the editor state
     */
    init(editorState) {
        this.editorState = editorState
    }

    /**
     * Insert image into the editor at current cursor position
     * @param {Object} mediaItem - Media item to insert
     */
    insertImage(mediaItem) {
        if (!this.editorElement || !mediaItem || mediaItem.type !== "image") return

        // Create markdown image syntax
        const imageUrl = `/content/uploads${mediaItem.url}`
        const altText = mediaItem.alt || "Image"
        const markdownImage = `![${altText}](${imageUrl})`

        // Get current cursor position
        const start = this.editorElement.selectionStart
        const end = this.editorElement.selectionEnd

        // Insert the markdown at cursor position
        this.editorElement.value =
            this.editorElement.value.substring(0, start) + markdownImage + this.editorElement.value.substring(end)

        // Update cursor position after the inserted text
        this.editorElement.selectionStart = start + markdownImage.length
        this.editorElement.selectionEnd = start + markdownImage.length

        // Focus back on the editor
        this.editorElement.focus()

        // Trigger input event to update preview
        const event = new Event("input", { bubbles: true })
        this.editorElement.dispatchEvent(event)
    }

    /**
     * Set or update the featured image in the editor state
     * @param {Object|null} mediaItem - Media item to set as featured image, or null to remove
     * @returns {Object|null} The processed featured image data or null
     */
    setFeaturedImage(mediaItem) {
        if (!this.editorState) return null

        if (!mediaItem) {
            this.editorState.setFeaturedImage(null)
            return null
        }

        // Create a clean featured image object with only the needed properties
        const featuredImage = {
            id: mediaItem.id,
            url: mediaItem.url,
            alt: mediaItem.alt || "",
        }

        // Update editor state
        this.editorState.setFeaturedImage(featuredImage)
        return featuredImage
    }

    /**
     * Get the current featured image from editor state
     * @returns {Object|null} Featured image data or null
     */
    getFeaturedImage() {
        if (!this.editorState) return null
        return this.editorState.getFeaturedImage()
    }

    /**
     * Initialize the toolbar image button to override default behavior
     * @param {Function} openImageSelector - Function to open image selector
     */
    initImageToolbarButton(openImageSelector) {
        // Find all image buttons in the markdown toolbar (normal and fullscreen modes)
        const imageButtons = document.querySelectorAll('.md-toolbar [data-command="image"]')

        imageButtons.forEach((button) => {
            // Override the default click behavior
            button.addEventListener(
                "click",
                (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    openImageSelector()
                },
                true
            ) // Use capture to ensure our handler runs first
        })
    }
}

// Export a singleton instance
export const editorIntegration = new EditorIntegration()
