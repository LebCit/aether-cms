/**
 * Upload Handler Module
 * Manages file uploads and the upload UI
 */
export class UploadHandler {
    /**
     * @param {Object} state - The MediaState instance
     * @param {Object} apiService - The MediaApiService instance
     * @param {Object} renderer - The MediaRenderer instance
     * @param {Object} utils - The MediaUtils instance
     * @param {Object} notification - The NotificationService instance
     */
    constructor(state, apiService, renderer, utils, notification) {
        this.state = state
        this.apiService = apiService
        this.renderer = renderer
        this.utils = utils
        this.notification = notification

        // DOM elements
        this.uploadPanel = document.getElementById("upload-panel")
        this.uploadPreview = document.getElementById("upload-preview")
        this.fileInput = document.getElementById("media-file-input")
        this.startUpload = document.getElementById("start-upload")

        this.initEventListeners()
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Toggle upload panel
        document.getElementById("upload-button").addEventListener("click", () => this.toggleUploadPanel())
        document.getElementById("empty-upload-button").addEventListener("click", () => this.toggleUploadPanel())
        document.getElementById("close-upload").addEventListener("click", () => this.toggleUploadPanel())
        document.getElementById("cancel-upload").addEventListener("click", () => this.toggleUploadPanel())

        // File input change
        this.fileInput.addEventListener("change", (event) => {
            this.handleFileSelection(event.target.files)
        })

        // Start upload button
        this.startUpload.addEventListener("click", () => {
            if (this.state.filesToUpload.length > 0) {
                this.uploadFiles()
            } else {
                this.notification.showToast("Please select files to upload", "warning")
            }
        })

        // Set up drag and drop
        this.setupDragAndDrop()
    }

    /**
     * Set up drag and drop on the upload area
     */
    setupDragAndDrop() {
        const uploadArea = document.querySelector(".upload-area")

        if (uploadArea) {
            // Prevent default drag behaviors
            ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
                uploadArea.addEventListener(eventName, this.preventDefaults, false)
            })

            // Highlight drop area when item is dragged over it
            ;["dragenter", "dragover"].forEach((eventName) => {
                uploadArea.addEventListener(
                    eventName,
                    () => {
                        uploadArea.classList.add("highlight")
                    },
                    false
                )
            })

            // Remove highlight when item is dragged out or dropped
            ;["dragleave", "drop"].forEach((eventName) => {
                uploadArea.addEventListener(
                    eventName,
                    () => {
                        uploadArea.classList.remove("highlight")
                    },
                    false
                )
            })

            // Handle dropped files
            uploadArea.addEventListener(
                "drop",
                (e) => {
                    const dt = e.dataTransfer
                    const files = dt.files
                    this.handleFileSelection(files)
                },
                false
            )
        }
    }

    /**
     * Prevent default events
     * @param {Event} e - The event to prevent defaults for
     */
    preventDefaults(e) {
        e.preventDefault()
        e.stopPropagation()
    }

    /**
     * Toggle the upload panel
     */
    toggleUploadPanel() {
        this.uploadPanel.classList.toggle("active")

        // Reset file input and preview when closing
        if (!this.uploadPanel.classList.contains("active")) {
            this.fileInput.value = ""
            this.state.clearUploadQueue()
            this.updateUploadPreview()
        }
    }

    /**
     * Handle file selection from input or drag & drop
     * @param {FileList} files - The selected files
     */
    handleFileSelection(files) {
        // Convert FileList to array and append to existing files
        const newFiles = Array.from(files)
        this.state.addFilesToUpload(newFiles)
        this.updateUploadPreview()
    }

    /**
     * Update the upload preview area with selected files
     */
    updateUploadPreview() {
        // Clear the existing preview content
        this.uploadPreview.innerHTML = ""

        // If no files are selected, show a message
        if (this.state.filesToUpload.length === 0) {
            this.uploadPreview.innerHTML = "<p>No files selected</p>"
            return
        }

        // Create a preview for each file
        this.state.filesToUpload.forEach((file, index) => {
            const isImage = file.type.startsWith("image/") // Check if the file is an image
            const previewItem = document.createElement("div")
            previewItem.className = "upload-preview-item"
            previewItem.dataset.index = index // Add index as a data attribute for later use

            if (isImage) {
                // Create image preview for image files
                this.createImagePreview(file, index, previewItem)
            } else {
                // For non-image files, create a document preview icon
                this.createDocumentPreview(file, index, previewItem)
            }

            // Append the preview item to the upload preview container
            this.uploadPreview.appendChild(previewItem)
        })

        // Add a summary of the selected files
        const summary = document.createElement("div")
        summary.className = "upload-summary"
        summary.textContent = `${this.state.filesToUpload.length} file${
            this.state.filesToUpload.length !== 1 ? "s" : ""
        } selected`
        this.uploadPreview.appendChild(summary)
    }

    /**
     * Create an image preview for a file
     * @param {File} file - The file to preview
     * @param {number} index - The index of the file
     * @param {HTMLElement} previewItem - The preview item element
     */
    createImagePreview(file, index, previewItem) {
        const reader = new FileReader()

        // When the file is loaded, create an Image object to get the dimensions
        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                const width = img.width
                const height = img.height

                // Attach width and height to the file object
                file.width = width
                file.height = height

                // Update the preview item with image, filename, size, and dimensions
                previewItem.innerHTML = `
                    <div class="preview-image">
                        <img src="${e.target.result}" alt="Preview">
                    </div>
                    <div class="preview-info">
                        <span class="preview-filename">${this.utils.truncateFilename(file.name, 20)}</span>
                        <span class="preview-size">${this.utils.formatFileSize(
                            file.size
                        )}</span>                            
                    </div>
                    <button class="remove-file" data-index="${index}" title="Remove">&times;</button>
                `

                // Add event listener directly to the remove button
                this.addRemoveButtonListener(previewItem)
            }

            // Set the image source to the data URL from the FileReader
            img.src = e.target.result // This will trigger the onload event to get image dimensions
        }

        // Read the file as a data URL (needed for image preview and dimensions)
        reader.readAsDataURL(file)
    }

    /**
     * Create a document preview for a file
     * @param {File} file - The file to preview
     * @param {number} index - The index of the file
     * @param {HTMLElement} previewItem - The preview item element
     */
    createDocumentPreview(file, index, previewItem) {
        const fileExt = this.utils.getFileExtension(file.name)
        const icon = this.utils.getDocumentIcon(fileExt)

        // Update the preview item with document icon, filename, and size
        previewItem.innerHTML = `
            <div class="preview-document">
                <span class="document-icon">${icon}</span>
            </div>
            <div class="preview-info">
                <span class="preview-filename">${this.utils.truncateFilename(file.name, 20)}</span>
                <span class="preview-size">${this.utils.formatFileSize(file.size)}</span>
            </div>
            <button class="remove-file" data-index="${index}" title="Remove">&times;</button>
        `

        // Add event listener to the remove button
        this.addRemoveButtonListener(previewItem)
    }

    /**
     * Add event listener to remove button
     * @param {HTMLElement} previewItem - The preview item containing the remove button
     */
    addRemoveButtonListener(previewItem) {
        const removeButton = previewItem.querySelector(".remove-file")
        if (removeButton) {
            removeButton.addEventListener("click", (e) => {
                e.stopPropagation() // Prevent event bubbling
                const index = parseInt(e.target.dataset.index)
                this.state.removeFileFromUpload(index) // Remove the file from the list
                this.updateUploadPreview() // Update the preview
            })
        }
    }

    /**
     * Upload the selected files
     */
    async uploadFiles() {
        if (this.state.filesToUpload.length === 0) return

        // Show progress UI
        this.uploadPreview.innerHTML =
            '<div class="upload-progress"><div class="spinner"></div><p>Uploading files...</p></div>'
        this.startUpload.disabled = true

        // Get alt text if provided
        const altText = document.getElementById("alt-text-default")

        // Track successful uploads
        let successCount = 0
        let errorCount = 0

        // Process each file
        for (let i = 0; i < this.state.filesToUpload.length; i++) {
            const file = this.state.filesToUpload[i]

            try {
                // Update progress for multiple files
                if (this.state.filesToUpload.length > 1) {
                    this.uploadPreview.querySelector(".upload-progress p").textContent = `Uploading file ${i + 1} of ${
                        this.state.filesToUpload.length
                    }...`
                }

                // Create FormData
                const formData = new FormData()
                formData.append("file", file)

                // Append alternate text to form data if available
                if (altText) {
                    formData.append("alt", altText.value || "")
                }

                // If it's an image and has dimensions, add them to formData
                if (file.type.startsWith("image/") && file.width && file.height) {
                    formData.append("width", file.width)
                    formData.append("height", file.height)
                }

                // Send the file to the server
                const result = await this.apiService.uploadMedia(formData)

                if (result.success) {
                    // Add the new media to the state
                    this.state.addMediaItem(result.data)
                    successCount++
                } else {
                    console.error("Upload error:", result.error)
                    errorCount++
                }
            } catch (error) {
                console.error("Upload error:", error)
                errorCount++
            }
        }

        // Reset state
        this.state.clearUploadQueue()
        this.fileInput.value = ""
        this.startUpload.disabled = false

        // Reset alt text
        if (altText) {
            altText.value = ""
        }

        // Show upload result
        let message
        let type

        if (successCount > 0 && errorCount === 0) {
            message = `Successfully uploaded ${successCount} file${successCount !== 1 ? "s" : ""}`
            type = "success"
            this.toggleUploadPanel() // Close the panel on success

            // Reset to first page to ensure uploaded files are visible
            this.state.currentPage = 1

            // Trigger an event to completely refresh the grid
            document.dispatchEvent(new CustomEvent("apply-filters-and-render"))

            // Update total count
            document.getElementById("total-items").textContent = this.state.mediaItems.length

            // Hide empty state if there are items
            if (this.state.mediaItems.length > 0) {
                this.renderer.showEmptyState(false)
            }
        } else if (successCount > 0 && errorCount > 0) {
            message = `Uploaded ${successCount} file${successCount !== 1 ? "s" : ""} with ${errorCount} error${
                errorCount !== 1 ? "s" : ""
            }`
            type = "warning"

            // Still update the grid with successfully uploaded files
            this.state.currentPage = 1
            document.dispatchEvent(new CustomEvent("apply-filters-and-render"))
        } else {
            message = `Failed to upload files`
            type = "error"
            // Keep panel open on failure, update preview to show no files
            this.updateUploadPreview()
        }

        this.notification.showToast(message, type)
    }
}
