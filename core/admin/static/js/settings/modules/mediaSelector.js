/**
 * Media Selector Module
 * Handles media selection functionality for logo and icon
 */

// State variables
let mediaItems = []
let selectedMediaId = null
let mediaTarget = null // 'logo' or 'icon'

/**
 * Add event listeners to media selection buttons
 * @param {Object} elements - DOM elements for media selection
 * @param {Function} openMediaSelectorFn - Function to call when media selection is opened
 */
export function addMediaListeners(elements, openMediaSelectorFn) {
    const { selectLogoButton, selectIconButton } = elements

    // Logo button
    if (selectLogoButton) {
        selectLogoButton.addEventListener("click", () => {
            mediaTarget = "logo"
            openMediaSelectorFn("Select Logo Image")
        })
    }

    // Icon button
    if (selectIconButton) {
        selectIconButton.addEventListener("click", () => {
            mediaTarget = "icon"
            openMediaSelectorFn("Select Site Icon")
        })
    }
}

/**
 * Add event listeners to media removal buttons
 * @param {Object} elements - DOM elements for media selection
 * @param {Function} openMediaSelectorFn - Function to call when media selection is opened
 */
export function addRemoveMediaListeners(elements, openMediaSelectorFn) {
    const { logoPreview, iconPreview, siteLogoInput, siteIconInput } = elements

    // First, remove any existing event listeners by cloning and replacing
    const removeButtons = document.querySelectorAll(".remove-media")
    removeButtons.forEach((button) => {
        const newButton = button.cloneNode(true)
        button.parentNode.replaceChild(newButton, button)
    })

    // Add listeners to any existing remove buttons
    document.querySelectorAll(".remove-media").forEach((button) => {
        button.addEventListener("click", function () {
            const parentPreview = this.closest(".media-preview")
            const isLogo = parentPreview.id === "logo-preview"

            if (isLogo) {
                siteLogoInput.value = ""
                logoPreview.innerHTML = `<button type="button" id="select-logo" class="select-media">Select Logo</button>`
                // Re-add the listener to the new button
                document.getElementById("select-logo").addEventListener("click", () => {
                    mediaTarget = "logo"
                    openMediaSelectorFn("Select Logo Image")
                })
            } else {
                siteIconInput.value = ""
                iconPreview.innerHTML = `<button type="button" id="select-icon" class="select-media">Select Icon</button>`
                // Re-add the listener to the new button
                document.getElementById("select-icon").addEventListener("click", () => {
                    mediaTarget = "icon"
                    openMediaSelectorFn("Select Site Icon")
                })
            }
        })
    })

    // Add listeners to select buttons
    addMediaListeners(elements, openMediaSelectorFn)
}

/**
 * Ensure the media modal exists in the DOM
 * @returns {Object} Updated references to media modal elements
 */
export function ensureMediaModalExists() {
    if (!document.getElementById("media-selection-modal")) {
        const modalHtml = `
        <div id="media-selection-modal" class="modal">
            <div class="modal-content media-modal-content">
                <div class="modal-header">
                    <h2 id="media-modal-title">Select Media</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="media-modal-filters">
                        <input type="text" id="modal-media-search" placeholder="Search media..." />
                        <select id="modal-media-filter">
                            <option value="image">Images</option>
                        </select>
                    </div>

                    <div id="modal-media-grid" class="media-modal-grid"></div>

                    <div id="modal-loading" class="modal-loading">
                        <div class="spinner"></div>
                        <p>Loading media...</p>
                    </div>

                    <div id="modal-empty" class="modal-empty hidden">
                        <p>No media found. Upload media files in the Media Library.</p>
                        <a href="/aether/media" class="btn btn-sm btn-primary">Go to Media Library</a>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancel-media-selection" class="btn btn-outline">Cancel</button>
                    <button id="confirm-media-selection" class="btn btn-primary">Select</button>
                </div>
            </div>
        </div>`

        // Append the modal to the body
        const modalContainer = document.createElement("div")
        modalContainer.innerHTML = modalHtml
        document.body.appendChild(modalContainer.firstElementChild)
    }

    return {
        mediaModal: document.getElementById("media-selection-modal"),
        mediaModalTitle: document.getElementById("media-modal-title"),
        mediaGrid: document.getElementById("modal-media-grid"),
        mediaSearch: document.getElementById("modal-media-search"),
        mediaFilter: document.getElementById("modal-media-filter"),
        mediaLoading: document.getElementById("modal-loading"),
        mediaEmpty: document.getElementById("modal-empty"),
        cancelMediaButton: document.getElementById("cancel-media-selection"),
        confirmMediaButton: document.getElementById("confirm-media-selection"),
    }
}

/**
 * Open the media selector modal
 * @param {string} title - Title to display in the modal
 * @param {Object} elements - DOM elements for media selection
 */
export function openMediaSelector(title, elements) {
    const modalElements = ensureMediaModalExists()
    const { mediaModal, mediaModalTitle, mediaGrid, mediaLoading, mediaEmpty } = modalElements

    mediaModalTitle.textContent = title
    selectedMediaId = null

    // Show loading state
    mediaLoading.classList.remove("hidden")
    mediaGrid.innerHTML = ""
    mediaEmpty.classList.add("hidden")

    // Show the modal
    mediaModal.classList.add("show")

    // Load media items
    loadMediaItems(modalElements)

    // Return updated elements
    return modalElements
}

/**
 * Load media items from the API
 * @param {Object} elements - DOM elements for media selection
 */
export function loadMediaItems(elements) {
    const { mediaLoading, mediaEmpty } = elements

    fetch("/api/media?type=image")
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                mediaItems = data.data

                // Hide loading
                mediaLoading.classList.add("hidden")

                // Show empty state if no items
                if (mediaItems.length === 0) {
                    mediaEmpty.classList.remove("hidden")
                } else {
                    mediaEmpty.classList.add("hidden")
                    renderMediaGrid(elements)
                }
            } else {
                console.error("Error loading media:", data.error)
                mediaLoading.classList.add("hidden")
                mediaEmpty.classList.remove("hidden")
            }
        })
        .catch((error) => {
            console.error("Error fetching media:", error)
            mediaLoading.classList.add("hidden")
            mediaEmpty.classList.remove("hidden")
        })
}

/**
 * Render the media grid with filtered items
 * @param {Object} elements - DOM elements for media selection
 */
export function renderMediaGrid(elements) {
    const { mediaGrid, mediaSearch } = elements

    mediaGrid.innerHTML = ""

    // Apply filters if search text exists
    const searchText = mediaSearch.value.trim().toLowerCase()
    let filteredItems = mediaItems

    if (searchText) {
        filteredItems = mediaItems.filter(
            (item) =>
                item.filename.toLowerCase().includes(searchText) ||
                (item.alt && item.alt.toLowerCase().includes(searchText))
        )
    }

    // Sort by newest first
    filteredItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    // Render items
    filteredItems.forEach((item) => {
        const isSelected = selectedMediaId === item.id
        const mediaItem = document.createElement("div")
        mediaItem.className = `modal-media-item ${isSelected ? "selected" : ""}`
        mediaItem.dataset.id = item.id

        if (item.type === "image") {
            mediaItem.innerHTML = `<img src="/content/uploads${item.url}" alt="${item.alt || ""}">`
        }

        // Add click handler for selection
        mediaItem.addEventListener("click", () => {
            // Toggle selection of this item
            selectedMediaId = isSelected ? null : item.id

            // Update UI to reflect selection
            document.querySelectorAll(".modal-media-item").forEach((el) => {
                el.classList.toggle("selected", el.dataset.id === selectedMediaId)
            })
        })

        mediaGrid.appendChild(mediaItem)
    })
}

/**
 * Set up media modal events
 * @param {Object} elements - DOM elements for media selection
 * @param {Object} formElements - DOM elements for form handling
 * @param {Function} addRemoveMediaListenersFn - Function to add remove media listeners
 * @param {Function} openMediaSelectorFn - Function to open media selector
 */
export function setupMediaModalEvents(elements, formElements, addRemoveMediaListenersFn, openMediaSelectorFn) {
    const { mediaModal, mediaSearch, cancelMediaButton, confirmMediaButton } = elements

    const { siteLogoInput, siteIconInput, logoPreview, iconPreview } = formElements

    // Search input event
    if (mediaSearch) {
        mediaSearch.addEventListener("input", () => renderMediaGrid(elements))
    }

    // Cancel button
    if (cancelMediaButton) {
        cancelMediaButton.addEventListener("click", () => {
            mediaModal.classList.remove("show")
        })
    }

    // Confirm button
    if (confirmMediaButton) {
        confirmMediaButton.addEventListener("click", () => {
            if (selectedMediaId) {
                const selectedMedia = mediaItems.find((item) => item.id === selectedMediaId)

                if (selectedMedia) {
                    if (mediaTarget === "logo") {
                        siteLogoInput.value = selectedMedia.url
                        logoPreview.innerHTML = `
                            <img src="/content/uploads${selectedMedia.url}" alt="Site Logo">
                            <button type="button" class="remove-media">Remove</button>
                        `
                    } else if (mediaTarget === "icon") {
                        siteIconInput.value = selectedMedia.url
                        iconPreview.innerHTML = `
                            <img src="/content/uploads${selectedMedia.url}" alt="Site Icon">
                            <button type="button" class="remove-media">Remove</button>
                        `
                    }

                    // Important: Re-attach remove button event listeners
                    addRemoveMediaListenersFn(formElements, openMediaSelectorFn)
                }
            }

            mediaModal.classList.remove("show")
        })
    }

    // Close modal when clicking outside
    mediaModal.addEventListener("click", (e) => {
        if (e.target === mediaModal) {
            mediaModal.classList.remove("show")
        }
    })

    // Close buttons for media modal
    document.querySelectorAll("#media-selection-modal .close-modal").forEach((button) => {
        button.addEventListener("click", () => {
            mediaModal.classList.remove("show")
        })
    })
}

/**
 * Get the current media target ('logo' or 'icon')
 * @returns {string} Current media target
 */
export function getMediaTarget() {
    return mediaTarget
}

/**
 * Get the currently selected media ID
 * @returns {string} Selected media ID
 */
export function getSelectedMediaId() {
    return selectedMediaId
}

/**
 * Get the list of media items
 * @returns {Array} List of media items
 */
export function getMediaItems() {
    return mediaItems
}
