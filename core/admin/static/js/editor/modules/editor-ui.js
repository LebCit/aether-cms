/**
 * EditorUI - Manages the editor user interface
 */
export class EditorUI {
    constructor({
        titleInput,
        slugInput,
        contentTextarea,
        excerptTextarea,
        authorInput,
        statusSelect,
        publishDateInput,
        saveModal,
        closeModalButton,
        closeModalBtn,
        editorActions,
        saveDraftButton,
        publishButton,
        updateButton,
        unpublishButton,
        slugManager,
        validateContent,
        showValidationErrors,
        clearValidationErrors,
        formElements,
        markdownEditor, // Parameter to receive the markdown editor instance
        subtitleInput,
        seoDescriptionTextarea,
        pageTypeSelect,
        parentPageSelect,
    }) {
        // Form elements
        this.titleInput = titleInput
        this.slugInput = slugInput
        this.contentTextarea = contentTextarea
        this.excerptTextarea = excerptTextarea
        this.authorInput = authorInput
        this.statusSelect = statusSelect
        this.publishDateInput = publishDateInput // Store the publish date input
        this.subtitleInput = subtitleInput
        this.seoDescriptionTextarea = seoDescriptionTextarea
        this.pageTypeSelect = pageTypeSelect
        this.parentPageSelect = parentPageSelect
        this.formElements = formElements

        // Modal elements
        this.saveModal = saveModal
        this.closeModalButton = closeModalButton
        this.closeModalBtn = closeModalBtn

        // Action elements
        this.editorActions = editorActions
        this.saveDraftButton = saveDraftButton
        this.publishButton = publishButton
        this.updateButton = updateButton
        this.unpublishButton = unpublishButton

        // Helpers
        this.slugManager = slugManager
        this.contentService = null
        this.unsavedChangesHandler = null
        this.markdownEditor = markdownEditor // Store the markdown editor reference

        // Validation
        this.validateContent = validateContent
        this.showValidationErrors = showValidationErrors
        this.clearValidationErrors = clearValidationErrors
    }

    /**
     * Set the content service for saving content
     * @param {Object} contentService - The content service instance
     */
    setContentService(contentService) {
        this.contentService = contentService
    }

    /**
     * Set the unsaved changes handler
     * @param {Object} unsavedChangesHandler - The unsaved changes handler instance
     */
    setUnsavedChangesHandler(unsavedChangesHandler) {
        this.unsavedChangesHandler = unsavedChangesHandler
    }

    /**
     * Initialize event listeners for UI elements
     */
    initEventListeners() {
        // Title input events for slug generation
        if (this.titleInput) {
            this.titleInput.addEventListener("input", () => this.slugManager.updateSlug())
            this.titleInput.addEventListener("blur", () => this.slugManager.updateSlug())
        }

        // Button event listeners
        if (this.saveDraftButton) {
            this.saveDraftButton.addEventListener("click", () => {
                this.contentService.saveContent("draft")
            })
        }

        if (this.publishButton) {
            this.publishButton.addEventListener("click", () => {
                this.contentService.saveContent("published")
            })
        }

        if (this.updateButton) {
            this.updateButton.addEventListener("click", () => {
                this.contentService.saveContent()
            })
        }

        if (this.unpublishButton) {
            this.unpublishButton.addEventListener("click", () => {
                this.contentService.saveContent("draft")
            })
        }

        // Modal events
        if (this.closeModalButton) {
            this.closeModalButton.addEventListener("click", () => this.hideSaveModal())
        }

        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener("click", () => this.hideSaveModal())
        }

        // Close modal when clicking outside
        window.addEventListener("click", (event) => {
            if (event.target === this.saveModal) {
                this.hideSaveModal()
            }
        })

        // Status select changes
        if (this.statusSelect) {
            this.statusSelect.addEventListener("change", () => {
                this.addStatusChangeHint()
            })
        }

        // Date picker changes
        if (this.publishDateInput) {
            this.publishDateInput.addEventListener("change", () => {
                if (this.unsavedChangesHandler) {
                    this.unsavedChangesHandler.checkForChanges()
                }
            })
        }

        // SEO Description changes
        const seoDescriptionCount = document.getElementById("seoDescriptionCount")
        if (this.seoDescriptionTextarea && seoDescriptionCount) {
            // Update on load
            seoDescriptionCount.textContent = this.seoDescriptionTextarea.value.length

            // Update on input
            this.seoDescriptionTextarea.addEventListener("input", () => {
                seoDescriptionCount.textContent = this.seoDescriptionTextarea.value.length

                // Add color feedback
                if (this.seoDescriptionTextarea.value.length > 160) {
                    seoDescriptionCount.style.color = "#dc3545" // red
                } else if (seoDescription.value.length > 140) {
                    this.seoDescriptionTextarea.style.color = "#ffc107" // yellow/warning
                    this.seoDescriptionTextarea.style.background = "#000000" // black for contrast
                } else {
                    this.seoDescriptionTextarea.style.color = "inherit" // original color
                    this.seoDescriptionTextarea.style.background = "inherit" // original background
                    seoDescriptionCount.style.color = "#28a745" // green/success
                }
            })
        }
    }

    /**
     * Show a hint when status is changed but not yet saved
     */
    addStatusChangeHint() {
        const hintText = "Click 'Update' to save status change"
        let hintElement = document.querySelector(".status-change-hint")

        if (!hintElement && this.statusSelect) {
            hintElement = document.createElement("p")
            hintElement.className = "status-change-hint help-text"
            this.statusSelect.parentNode.appendChild(hintElement)
        }

        if (hintElement) {
            hintElement.textContent = hintText
            hintElement.style.color = "#0066cc" // Highlight color

            // Fade out after a few seconds
            setTimeout(() => {
                hintElement.style.color = ""
            }, 3000)
        }
    }

    /**
     * Show the save success modal
     */
    showSaveModal() {
        if (this.saveModal) {
            this.saveModal.classList.add("show")
        }
    }

    /**
     * Hide the save success modal
     */
    hideSaveModal() {
        if (this.saveModal) {
            this.saveModal.classList.remove("show")
        }
    }

    /**
     * Updates the UI to reflect the current content status
     * @param {string} status - The current content status ("published" or "draft")
     * @param {boolean} isEdit - Whether this is an edit operation
     */
    updateUIForStatus(status, isEdit) {
        // Update status dropdown
        if (this.statusSelect) {
            this.statusSelect.value = status
        }

        // Update action buttons
        if (isEdit && this.editorActions) {
            // First clear the current action buttons
            const actionButtonsHTML =
                status === "published"
                    ? `<button id="update" class="btn btn-primary">Update</button>
                   <button id="unpublish" class="btn btn-outline">Revert to Draft</button>`
                    : `<button id="update" class="btn btn-primary">Update</button>
                   <button id="publish" class="btn btn-success">Publish</button>`

            this.editorActions.innerHTML = actionButtonsHTML

            // Re-attach event listeners to the new buttons
            const newUpdateButton = document.getElementById("update")
            if (newUpdateButton) {
                newUpdateButton.addEventListener("click", () => {
                    this.contentService.saveContent()
                })
            }

            const newPublishButton = document.getElementById("publish")
            if (newPublishButton) {
                newPublishButton.addEventListener("click", () => {
                    this.contentService.saveContent("published")
                })
            }

            const newUnpublishButton = document.getElementById("unpublish")
            if (newUnpublishButton) {
                newUnpublishButton.addEventListener("click", () => {
                    this.contentService.saveContent("draft")
                })
            }
        }

        // Clear any status change hint
        const hintElement = document.querySelector(".status-change-hint")
        if (hintElement) {
            hintElement.textContent = ""
        }
    }

    /**
     * Get the current content data from the form
     * @returns {Object} The current content data
     */
    getCurrentContentData() {
        // If using the enhanced markdown editor, get content from it
        const content = this.markdownEditor
            ? this.markdownEditor.getContent()
            : this.contentTextarea
            ? this.contentTextarea.value.trim()
            : ""

        // Get media data from editorState with proper checks
        let featuredImage = null
        let gallery = null

        if (window.editorState) {
            featuredImage = window.editorState.getFeaturedImage()
            gallery = window.editorState.getGallery()
        }

        // Get the publish date value
        const publishDate = this.publishDateInput ? this.publishDateInput.value : null

        // Create the base metadata object
        const metadata = {
            title: this.titleInput ? this.titleInput.value.trim() : "",
            subtitle: this.subtitleInput ? this.subtitleInput.value.trim() : "",
            slug: this.slugManager.getCurrentSlug(),
            status: this.statusSelect ? this.statusSelect.value : "draft",
            author: this.authorInput ? this.authorInput.value.trim() : "",
            excerpt: this.excerptTextarea ? this.excerptTextarea.value.trim() : "",
            seoDescription: this.seoDescriptionTextarea ? this.seoDescriptionTextarea.value.trim() : "",
        }

        // Add publish date to metadata if it exists
        if (publishDate) {
            metadata.publishDate = publishDate
        }

        // Add page type and parent page for pages
        if (this.pageTypeSelect) {
            metadata.pageType = this.pageTypeSelect.value

            // Add parent page if this is a custom page
            if (this.pageTypeSelect.value === "custom" && this.parentPageSelect) {
                const parentPageValue = this.parentPageSelect.value
                metadata.parentPage = parentPageValue || null
            }
        }

        // Add featured image to metadata if it exists
        if (featuredImage) {
            // Make sure the URL property is correctly formatted
            if (featuredImage.url && !featuredImage.url.startsWith("/")) {
                // Ensure URL starts with / for proper path resolution
                featuredImage.url = "/" + featuredImage.url.replace(/^\/+/, "")
            }
            metadata.featuredImage = featuredImage
        } else {
            // Explicitly set featuredImage to null to ensure it's removed
            metadata.featuredImage = null
        }

        // Add gallery to metadata if it exists and has items
        if (gallery && gallery.length > 0) {
            metadata.gallery = gallery
        }

        return {
            metadata,
            content: content,
        }
    }
}
