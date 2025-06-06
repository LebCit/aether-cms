/**
 * Modal management for table operations
 */
export class ModalManager {
    constructor(contentType) {
        this.contentType = contentType
        this.selectedItemId = null
        this.deleteSuccessful = false
        this.onDeleteComplete = null
        this.onDeleteConfirm = null
        this.onBulkConfirm = null
        this._originalFooter = null
        this._originalBody = null

        // Delete modal elements
        this.deleteModal = document.getElementById("delete-modal")
        this.deleteCloseButton = this.deleteModal?.querySelector(".close-modal")

        // Bulk modal elements
        this.bulkModal = document.getElementById("bulk-modal")
        this.bulkModalTitle = document.getElementById("bulk-modal-title")
        this.bulkModalMessage = document.getElementById("bulk-modal-message")
        this.cancelBulkButton = document.getElementById("cancel-bulk")
        this.confirmBulkButton = document.getElementById("confirm-bulk")

        this.initEvents()
    }

    initEvents() {
        // Close modals when clicking the close button
        if (this.deleteCloseButton) {
            this.deleteCloseButton.addEventListener("click", () => this.hideDeleteModal())
        }

        // Bulk modal events
        if (this.bulkModal) {
            const closeButtons = this.bulkModal.querySelectorAll(".close-modal")
            closeButtons.forEach((button) => {
                button.addEventListener("click", () => this.hideBulkModal())
            })
        }

        if (this.cancelBulkButton) {
            this.cancelBulkButton.addEventListener("click", () => this.hideBulkModal())
        }

        if (this.confirmBulkButton) {
            this.confirmBulkButton.addEventListener("click", () => {
                if (this.onBulkConfirm) this.onBulkConfirm()
            })
        }

        // Close modals when clicking outside
        window.addEventListener("click", (event) => {
            if (event.target.classList.contains("modal")) {
                // If this is the delete modal and deletion was successful
                if (event.target === this.deleteModal && this.deleteSuccessful && this.onDeleteComplete) {
                    this.onDeleteComplete()
                }
                this.hideDeleteModal()
                this.hideBulkModal()
            }
        })

        // Add event listener for Escape key
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                // If delete modal is visible and deletion was successful
                if (this.deleteModal.classList.contains("show") && this.deleteSuccessful && this.onDeleteComplete) {
                    this.onDeleteComplete()
                }
                this.hideDeleteModal()
                this.hideBulkModal()
            }
        })
    }

    showDeleteModal(itemId, itemStatus) {
        this.selectedItemId = itemId
        this.deleteSuccessful = false

        // Get modal elements
        const modalBody = this.deleteModal.querySelector(".modal-body")
        const modalFooter = this.deleteModal.querySelector(".modal-footer")

        // Store original content for potential restoration
        this._originalBody = modalBody.innerHTML
        this._originalFooter = modalFooter.innerHTML

        // Find status of the item being deleted
        const isPublished = itemStatus === "published"

        // Set up the modal content
        this.resetDeleteModalContent(isPublished)

        // Show the modal
        this.deleteModal.classList.add("show")
    }

    resetDeleteModalContent(isPublished) {
        const modalBody = this.deleteModal.querySelector(".modal-body")
        const modalFooter = this.deleteModal.querySelector(".modal-footer")

        // Reset the body content
        const itemType = this.contentType === "posts" ? "post" : "page"
        modalBody.innerHTML = `
            <p>
                Are you sure you want to delete this ${itemType}?
                <br />
                This action cannot be undone!
            </p>
            <div class="delete-warning" ${!isPublished ? "hidden" : ""}>
                <strong>Warning:</strong>
                This ${itemType} is currently
                <span class="status-published">published</span>
                and visible to visitors. Deleting it will remove it from your site immediately.
            </div>
        `

        // Reset the footer with original buttons
        modalFooter.innerHTML = `
            <button id="cancel-delete" class="btn btn-outline">Cancel</button>
            <button id="confirm-delete" class="btn btn-danger">Delete</button>
        `

        // Attach event listeners to the buttons
        this.attachDeleteModalEvents()
    }

    attachDeleteModalEvents() {
        const cancelBtn = document.getElementById("cancel-delete")
        const confirmBtn = document.getElementById("confirm-delete")

        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => this.hideDeleteModal())
        }

        if (confirmBtn) {
            confirmBtn.addEventListener("click", () => {
                if (this.onDeleteConfirm) {
                    // Show loading state immediately
                    this.updateDeleteStatus(true)
                    // Execute the delete operation
                    this.onDeleteConfirm(this.selectedItemId)
                }
            })
        }

        const closeBtn = document.getElementById("close-delete-modal")
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                this.hideDeleteModal()
                if (this.onDeleteComplete) this.onDeleteComplete()
            })
        }
    }

    hideDeleteModal() {
        // Reset tracking variables if not successful
        if (!this.deleteSuccessful) {
            this.selectedItemId = null
        }
        this.deleteModal.classList.remove("show")
    }

    // Add a method to mark deletion as successful
    markDeleteSuccessful() {
        this.deleteSuccessful = true
    }

    showBulkModal(action, count) {
        let title, message

        switch (action) {
            case "delete":
                title = "Confirm Deletion"
                message = `Are you sure you want to delete ${count} ${this.contentType}? This action cannot be undone.`
                break
            case "publish":
                title = "Confirm Publishing"
                message = `Are you sure you want to publish ${count} ${this.contentType}?`
                break
            case "draft":
                title = "Confirm Draft Status"
                message = `Are you sure you want to set ${count} ${this.contentType} to draft?`
                break
            default:
                title = "Confirm Action"
                message = `Are you sure you want to perform this action on ${count} ${this.contentType}?`
        }

        this.bulkModalTitle.textContent = title
        this.bulkModalMessage.textContent = message
        this.bulkModal.classList.add("show")
    }

    hideBulkModal() {
        this.bulkModal.classList.remove("show")
    }

    // Callback setters
    setDeleteConfirmCallback(callback) {
        this.onDeleteConfirm = callback
    }

    setBulkConfirmCallback(callback) {
        this.onBulkConfirm = callback
    }

    updateDeleteStatus(isLoading, success, message) {
        const modalFooter = this.deleteModal.querySelector(".modal-footer")
        const modalBody = this.deleteModal.querySelector(".modal-body")

        if (isLoading) {
            modalFooter.innerHTML = '<div class="delete-status">Deleting...</div>'
        } else if (success) {
            // Mark deletion as successful
            this.deleteSuccessful = true

            modalBody.innerHTML = `<p>${message || "Successfully deleted."}</p>`
            modalFooter.innerHTML = `<button class="btn btn-primary" id="close-delete-modal">OK</button>`

            // Re-attach event listeners
            this.attachDeleteModalEvents()
        } else {
            // Error case - restore original content and update message
            modalBody.innerHTML = `<p class="text-danger">${message || "An error occurred."}</p>`

            // Add back the warning if it was present
            if (this._originalBody && this._originalBody.includes("delete-warning")) {
                const warningDiv = this._originalBody.match(/<div class="delete-warning".*?<\/div>/s)
                if (warningDiv) {
                    modalBody.innerHTML += warningDiv[0]
                }
            }

            // Re-add the original buttons
            if (this._originalFooter) {
                modalFooter.innerHTML = this._originalFooter

                // Re-attach event listeners
                this.attachDeleteModalEvents()
            }
        }
    }
}
