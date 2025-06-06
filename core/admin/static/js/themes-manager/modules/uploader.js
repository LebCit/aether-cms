/**
 * Theme Uploader class for file uploads
 */
export class ThemeUploader {
    constructor(manager) {
        this.manager = manager
        this.elements = {
            uploadPanel: null,
            closeUpload: null,
            cancelUpload: null,
            startUpload: null,
            fileInput: null,
            uploadPreview: null,
            uploadArea: null,
        }
        this.selectedFile = null
    }

    /**
     * Initialize the module
     */
    init() {
        // Cache DOM elements
        this.elements.uploadPanel = document.getElementById("upload-theme-panel")
        this.elements.closeUpload = document.getElementById("close-upload")
        this.elements.cancelUpload = document.getElementById("cancel-upload")
        this.elements.startUpload = document.getElementById("start-upload")
        this.elements.fileInput = document.getElementById("theme-file-input")
        this.elements.uploadPreview = document.getElementById("upload-preview")
        this.elements.uploadArea = document.querySelector(".upload-area")

        // Attach event listeners
        this.attachEventListeners()
    }

    /**
     * Attach event listeners to upload elements
     */
    attachEventListeners() {
        // Close/cancel buttons
        if (this.elements.closeUpload) {
            this.elements.closeUpload.addEventListener("click", () => this.togglePanel())
        }

        if (this.elements.cancelUpload) {
            this.elements.cancelUpload.addEventListener("click", () => this.togglePanel())
        }

        // File Input Change
        if (this.elements.fileInput) {
            this.elements.fileInput.addEventListener("change", (event) => {
                this.handleFileSelection(event.target.files)
            })
        }

        // Start upload button
        if (this.elements.startUpload) {
            this.elements.startUpload.addEventListener("click", () => {
                if (this.selectedFile) {
                    this.uploadTheme()
                } else {
                    this.manager.utils.showToast("Please select a theme package", "warning")
                }
            })
        }

        // Set up drag and drop functionality
        this.setupDragAndDrop()
    }

    /**
     * Set up drag and drop functionality for upload area
     */
    setupDragAndDrop() {
        if (!this.elements.uploadArea) return
        ;["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
            this.elements.uploadArea.addEventListener(eventName, this.preventDefaults, false)
        })
        ;["dragenter", "dragover"].forEach((eventName) => {
            this.elements.uploadArea.addEventListener(eventName, () => this.highlight(), false)
        })
        ;["dragleave", "drop"].forEach((eventName) => {
            this.elements.uploadArea.addEventListener(eventName, () => this.unhighlight(), false)
        })

        this.elements.uploadArea.addEventListener(
            "drop",
            (e) => {
                const dt = e.dataTransfer
                const files = dt.files
                this.handleFileSelection(files)
            },
            false
        )
    }

    /**
     * Prevent default drag/drop behaviors
     */
    preventDefaults(e) {
        e.preventDefault()
        e.stopPropagation()
    }

    /**
     * Highlight drop area
     */
    highlight() {
        this.elements.uploadArea.classList.add("highlight")
    }

    /**
     * Remove highlight from drop area
     */
    unhighlight() {
        this.elements.uploadArea.classList.remove("highlight")
    }

    /**
     * Toggle the upload panel
     */
    togglePanel() {
        this.elements.uploadPanel.classList.toggle("active")

        // Reset file input and preview when closing
        if (!this.elements.uploadPanel.classList.contains("active")) {
            this.elements.fileInput.value = ""
            this.selectedFile = null
            this.updateUploadPreview()
        }
    }

    /**
     * Handle file selection from input or drag & drop
     * @param {FileList} files - The selected files
     */
    handleFileSelection(files) {
        if (files.length === 0) return

        const file = files[0] // Only use the first file

        // Check if it's a zip file
        if (file.type !== "application/zip" && !file.name.endsWith(".zip")) {
            this.manager.utils.showToast("Only zip files are allowed", "error")
            return
        }

        this.selectedFile = file
        this.updateUploadPreview()
    }

    /**
     * Update the upload preview with the selected file
     */
    updateUploadPreview() {
        if (!this.elements.uploadPreview) return

        if (!this.selectedFile) {
            this.elements.uploadPreview.innerHTML = "<p>No theme package selected</p>"
            return
        }

        this.elements.uploadPreview.innerHTML = `
            <div class="theme-package-preview">
                <div class="package-icon">📦</div>
                <div class="package-details">
                    <div class="package-name">${this.selectedFile.name}</div>
                    <div class="package-size">${this.manager.utils.formatFileSize(this.selectedFile.size)}</div>
                </div>
            </div>
        `
    }

    /**
     * Upload the selected theme package
     */
    async uploadTheme() {
        if (!this.selectedFile) return

        // Show progress UI
        this.elements.uploadPreview.innerHTML =
            '<div class="upload-progress"><div class="spinner"></div><p>Uploading theme package...</p></div>'
        this.elements.startUpload.disabled = true

        try {
            // Create FormData
            const formData = new FormData()
            formData.append("theme", this.selectedFile)

            // Send the file to the server
            const response = await fetch("/api/themes/upload", {
                method: "POST",
                body: formData,
            })

            const result = await response.json()

            if (result.success) {
                this.manager.utils.showToast("Theme uploaded successfully", "success")
                // Close upload panel and reload page to show the new theme
                this.togglePanel()
                setTimeout(() => {
                    window.location.reload()
                }, 1000)
            } else {
                console.error("Upload error:", result)

                // Check if we have an array of validation errors
                if (result.validationErrors && Array.isArray(result.validationErrors)) {
                    // Display each validation error as a separate toast
                    result.validationErrors.forEach((errorMsg) => {
                        this.manager.utils.showToast(`Validation error: ${errorMsg}`, "error")
                    })
                } else {
                    // Fall back to showing a single error toast
                    const errorMessage = result.message || result.error || "Unknown error"
                    this.manager.utils.showToast(`Failed to upload theme: ${errorMessage}`, "error")
                }

                this.updateUploadPreview() // Reset upload preview
            }
        } catch (error) {
            console.error("Upload error:", error)
            this.manager.utils.showToast("Failed to upload theme", "error")
            this.updateUploadPreview() // Reset upload preview
        } finally {
            this.elements.startUpload.disabled = false
        }
    }
}
