/**
 * Settings Page Main Script
 * Initializes and coordinates all modules
 */

import { getDOMElements } from "./modules/dom-elements.js"
import { initTabs, switchTab } from "./modules/tabs.js"
import { fetchThemes, updateThemePreview } from "./modules/themes.js"
import {
    addMediaListeners,
    addRemoveMediaListeners,
    openMediaSelector,
    setupMediaModalEvents,
} from "./modules/mediaSelector.js"
import { initFormHandling, updateMediaPreviews } from "./modules/formHandler.js"
import { delegateEvent } from "./modules/eventUtils.js"
import { initStaticGenerator } from "./modules/static-generator.js"

document.addEventListener("DOMContentLoaded", function () {
    // Get all DOM elements
    const elements = getDOMElements()

    // Initialize tabs
    initTabs(elements.tabButtons)

    // Initialize theme functionality
    fetchThemes(() => {
        updateThemePreview(elements)

        // Add event listener for theme selection
        if (elements.themeSelect) {
            elements.themeSelect.addEventListener("change", () => {
                updateThemePreview(elements)
            })
        }
    })

    // Initialize media selector functionality
    const openMediaSelectorWrapper = (title) => {
        const modalElements = openMediaSelector(title, elements)
        // Pass the addRemoveMediaListeners function to properly handle button attachments
        setupMediaModalEvents(modalElements, elements, addRemoveMediaListeners, openMediaSelectorWrapper)
    }

    // Use event delegation for select and remove media buttons
    // This handles dynamically added buttons without needing to reattach listeners each time
    delegateEvent("click", ".select-media", function () {
        const isLogo = this.id === "select-logo"
        if (isLogo) {
            openMediaSelectorWrapper("Select Logo Image")
        } else {
            openMediaSelectorWrapper("Select Site Icon")
        }
    })

    delegateEvent("click", ".remove-media", function () {
        const parentPreview = this.closest(".media-preview")
        const isLogo = parentPreview.id === "logo-preview"

        if (isLogo) {
            elements.siteLogoInput.value = ""
            elements.logoPreview.innerHTML = `<button type="button" id="select-logo" class="select-media">Select Logo</button>`
        } else {
            elements.siteIconInput.value = ""
            elements.iconPreview.innerHTML = `<button type="button" id="select-icon" class="select-media">Select Icon</button>`
        }
    })

    // Still add regular listeners for init
    addMediaListeners(elements, openMediaSelectorWrapper)
    addRemoveMediaListeners(elements, openMediaSelectorWrapper)

    // Initialize form handling
    initFormHandling(
        elements,
        () => updateThemePreview(elements),
        (els, openFn) => addRemoveMediaListeners(els, openFn),
        openMediaSelectorWrapper
    )

    // Initialize static site generator
    initStaticGenerator()
})
