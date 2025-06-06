import { slugify } from "./validation-utils.js"

/**
 * SlugManager - Handles the generation and management of URL slugs
 */
export class SlugManager {
    constructor({ titleInput, slugInput }) {
        this.titleInput = titleInput
        this.slugInput = slugInput

        // Store initial title value for comparison
        if (this.titleInput) {
            this.titleInput.dataset.previousTitle = this.titleInput.value
        }
    }

    /**
     * Generate a URL-friendly slug from a title
     * @param {string} title - The title to convert to a slug
     * @returns {string} The generated slug
     */
    generateSlug(title) {
        return slugify(title)
    }

    /**
     * Update the slug input based on the title
     */
    updateSlug() {
        if (!this.titleInput || !this.slugInput) return

        const title = this.titleInput.value
        const currentSlug = this.slugInput.value

        // If slug is empty or matches what would be generated from the previous title
        if (!currentSlug || currentSlug === this.generateSlug(this.titleInput.dataset.previousTitle || "")) {
            this.slugInput.value = this.generateSlug(title)
        }

        // Update editor header heading
        const editorHeading = document.querySelector(".editor-header > h1")
        if (editorHeading) {
            const editorHeadingParts = editorHeading.textContent.split(":")
            const editorHeadingStart = editorHeadingParts[0]

            editorHeading.textContent = `${editorHeadingStart}: ${title}`

            // Update document title
            const pageType = editorHeadingParts[0].includes("Post") ? "Post" : "Page"
            document.title = `Edit ${pageType}: ${title} | Aether`
        }

        // Store current title for future comparison
        this.titleInput.dataset.previousTitle = title
    }

    /**
     * Get the current slug from the input or generate one from the title
     * @returns {string} The current slug
     */
    getCurrentSlug() {
        if (!this.slugInput || !this.titleInput) return ""

        const title = this.titleInput.value.trim()
        let slug = this.slugInput.value.trim()

        // If slug is empty, generate one from the title
        if (!slug) {
            slug = this.generateSlug(title)
            this.slugInput.value = slug
        }

        return slug
    }
}
