/**
 * Form Handler Module
 * Handles form submission, reset, and related functionality
 */

let originalFormData = null

/**
 * Initialize form handling functionality
 * @param {Object} elements - DOM elements for form handling
 * @param {Function} updateThemePreviewFn - Function to update theme preview
 * @param {Function} addRemoveMediaListenersFn - Function to add remove media listeners
 * @param {Function} openMediaSelectorFn - Function to open media selector
 */
export function initFormHandling(elements, updateThemePreviewFn, addRemoveMediaListenersFn, openMediaSelectorFn) {
    const { settingsForm, saveSettingsButton, resetSettingsButton, saveModal, closeModalButton, closeModalBtn } =
        elements

    if (settingsForm) {
        // Store original form data for reset functionality
        captureFormState(settingsForm)

        // Form submission
        settingsForm.addEventListener("submit", async function (e) {
            e.preventDefault()
            await handleFormSubmission(e, elements, showSaveModal)
        })
    }

    // Reset form to original values
    if (resetSettingsButton) {
        resetSettingsButton.addEventListener("click", function () {
            if (confirm("Are you sure you want to reset all changes?")) {
                resetFormToOriginal(
                    settingsForm,
                    elements,
                    updateThemePreviewFn,
                    addRemoveMediaListenersFn,
                    openMediaSelectorFn
                )
            }
        })
    }

    // Save modal functionality
    if (closeModalButton) {
        closeModalButton.addEventListener("click", () => {
            saveModal.classList.remove("show")
        })
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            saveModal.classList.remove("show")
        })
    }

    // Close modal when clicking outside
    if (saveModal) {
        saveModal.addEventListener("click", (e) => {
            if (e.target === saveModal) {
                saveModal.classList.remove("show")
            }
        })
    }

    // Initialize dependent fields
    handleDependentFields()
}

/**
 * Handle form submission
 * @param {Event} e - Form submission event
 * @param {Object} elements - DOM elements for form handling
 * @param {Function} showSaveModalFn - Function to show save modal
 */
async function handleFormSubmission(e, elements, showSaveModalFn) {
    const { settingsForm, saveSettingsButton } = elements

    // Show loading state on the button
    saveSettingsButton.innerHTML = `<span class="spinner-small"></span> Saving...`
    saveSettingsButton.disabled = true

    // Get form data
    const formData = new FormData(settingsForm)
    const settings = {}

    // Define menu editor field names to exclude from site settings
    const menuEditorFields = [
        "menu-item-id",
        "menu-item-parent",
        "menu-item-title",
        "menu-item-url",
        "menu-item-target",
        "menu-item-class",
        "parent-select",
        "target",
        "class",
    ]

    // Convert FormData to object, excluding menu editor fields
    for (const [key, value] of formData.entries()) {
        // Skip menu editor fields
        if (menuEditorFields.includes(key)) {
            continue
        }

        // Handle checkboxes properly
        if (key === "enableComments" || key === "enableCaching") {
            settings[key] = value === "on"
        } else {
            settings[key] = value
        }
    }

    // Add any missing checkbox values that are unchecked
    if (!formData.has("enableComments")) settings.enableComments = false
    if (!formData.has("enableCaching")) settings.enableCaching = false

    try {
        const response = await fetch("/api/settings", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(settings),
        })

        const result = await response.json()

        if (result.success) {
            // Show success modal
            showSaveModalFn(elements.saveModal)

            // Update original form state for reset functionality
            captureFormState(settingsForm)
        } else {
            // Show error
            alert(`Error saving settings: ${result.error || "Unknown error"}`)
        }
    } catch (error) {
        console.error("Error saving settings:", error)
        alert("Network error while saving settings. Please try again.")
    } finally {
        // Reset button state
        saveSettingsButton.innerHTML = "Save Settings"
        saveSettingsButton.disabled = false
    }
}

/**
 * Show save success modal
 * @param {HTMLElement} saveModal - Save modal element
 */
export function showSaveModal(saveModal) {
    if (saveModal) {
        saveModal.classList.add("show")
    }
}

/**
 * Capture the original form state for reset functionality
 * @param {HTMLFormElement} form - The form element
 */
export function captureFormState(form) {
    originalFormData = new FormData(form)

    // Store checkbox states separately since unchecked boxes don't appear in FormData
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        originalFormData.set(`${checkbox.id}_checked`, checkbox.checked)
    })
}

/**
 * Reset form to its original state
 * @param {HTMLFormElement} form - The form element
 * @param {Object} elements - DOM elements for form handling
 * @param {Function} updateThemePreviewFn - Function to update theme preview
 * @param {Function} addRemoveMediaListenersFn - Function to add media listeners
 * @param {Function} openMediaSelectorFn - Function to open media selector
 */
export function resetFormToOriginal(
    form,
    elements,
    updateThemePreviewFn,
    addRemoveMediaListenersFn,
    openMediaSelectorFn
) {
    if (!originalFormData) return

    // Reset text inputs, selects, and textareas
    for (const [key, value] of originalFormData.entries()) {
        if (key.endsWith("_checked")) continue // Skip our special checkbox markers

        const element = document.getElementById(key)
        if (element) {
            element.value = value
        }
    }

    // Reset checkboxes
    document.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
        const originalState = originalFormData.get(`${checkbox.id}_checked`) === "true"
        checkbox.checked = originalState
    })

    // Reset media previews
    const mediaUpdated = updateMediaPreviews(elements, openMediaSelectorFn)

    // Update theme preview
    updateThemePreviewFn(elements)

    // Always re-add media listeners after reset
    addRemoveMediaListenersFn(elements, openMediaSelectorFn)

    // Re-add select button listeners if media was updated
    if (mediaUpdated) {
        const selectLogoButton = document.getElementById("select-logo")
        if (selectLogoButton) {
            selectLogoButton.addEventListener("click", () => {
                openMediaSelectorFn("Select Logo Image")
            })
        }

        const selectIconButton = document.getElementById("select-icon")
        if (selectIconButton) {
            selectIconButton.addEventListener("click", () => {
                openMediaSelectorFn("Select Site Icon")
            })
        }
    }
}

/**
 * Update media previews based on input values
 * @param {Object} elements - DOM elements for form handling
 * @param {Function} openMediaSelectorFn - Function to open media selector
 * @returns {boolean} True if media previews were updated
 */
export function updateMediaPreviews(elements, openMediaSelectorFn) {
    const { logoPreview, siteLogoInput, iconPreview, siteIconInput } = elements
    let mediaUpdated = false

    // Update logo preview
    if (logoPreview && siteLogoInput) {
        const logoUrl = siteLogoInput.value
        const currentLogoImg = logoPreview.querySelector("img")
        const currentLogoImgSrc = currentLogoImg ? currentLogoImg.getAttribute("src") : null
        const newLogoImgSrc = logoUrl ? `/content/uploads${logoUrl}` : null

        // Only update if there's a change
        if ((logoUrl && !currentLogoImg) || (!logoUrl && currentLogoImg) || currentLogoImgSrc !== newLogoImgSrc) {
            if (logoUrl) {
                logoPreview.innerHTML = `
                    <img src="/content/uploads${logoUrl}" alt="Site Logo">
                    <button type="button" class="remove-media">Remove</button>
                `
            } else {
                logoPreview.innerHTML = `<button type="button" id="select-logo" class="select-media">Select Logo</button>`
            }
            mediaUpdated = true
        }
    }

    // Update icon preview
    if (iconPreview && siteIconInput) {
        const iconUrl = siteIconInput.value
        const currentIconImg = iconPreview.querySelector("img")
        const currentIconImgSrc = currentIconImg ? currentIconImg.getAttribute("src") : null
        const newIconImgSrc = iconUrl ? `/content/uploads${iconUrl}` : null

        // Only update if there's a change
        if ((iconUrl && !currentIconImg) || (!iconUrl && currentIconImg) || currentIconImgSrc !== newIconImgSrc) {
            if (iconUrl) {
                iconPreview.innerHTML = `
                    <img src="/content/uploads${iconUrl}" alt="Site Icon">
                    <button type="button" class="remove-media">Remove</button>
                `
            } else {
                iconPreview.innerHTML = `<button type="button" id="select-icon" class="select-media">Select Icon</button>`
            }
            mediaUpdated = true
        }
    }

    return mediaUpdated
}

/**
 * Handle dependent form fields based on parent field values
 */
export function handleDependentFields() {
    // Cache duration is only relevant if caching is enabled
    const cachingEnabled = document.getElementById("enableCaching")
    const cacheDurationField = document.getElementById("cacheDuration")?.closest(".form-group")

    if (cachingEnabled && cacheDurationField) {
        cachingEnabled.addEventListener("change", function () {
            cacheDurationField.style.opacity = this.checked ? "1" : "0.5"
            cacheDurationField.style.pointerEvents = this.checked ? "auto" : "none"
            document.getElementById("cacheDuration").disabled = !this.checked
        })

        // Initial state
        cacheDurationField.style.opacity = cachingEnabled.checked ? "1" : "0.5"
        cacheDurationField.style.pointerEvents = cachingEnabled.checked ? "auto" : "none"
        document.getElementById("cacheDuration").disabled = !cachingEnabled.checked
    }

    // Comment moderation is only relevant if comments are enabled
    const commentsEnabled = document.getElementById("enableComments")
    const commentModField = document.getElementById("commentModeration")?.closest(".form-group")

    if (commentsEnabled && commentModField) {
        commentsEnabled.addEventListener("change", function () {
            commentModField.style.opacity = this.checked ? "1" : "0.5"
            commentModField.style.pointerEvents = this.checked ? "auto" : "none"
            document.getElementById("commentModeration").disabled = !this.checked
        })

        // Initial state
        commentModField.style.opacity = commentsEnabled.checked ? "1" : "0.5"
        commentModField.style.pointerEvents = commentsEnabled.checked ? "auto" : "none"
        document.getElementById("commentModeration").disabled = !commentsEnabled.checked
    }
}
