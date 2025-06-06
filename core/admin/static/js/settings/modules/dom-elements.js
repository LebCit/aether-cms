/**
 * DOM Elements Module
 * Centralizes all DOM element references
 */

export function getDOMElements() {
    return {
        // Form elements
        settingsForm: document.getElementById("settings-form"),
        saveSettingsButton: document.getElementById("save-settings"),
        resetSettingsButton: document.getElementById("reset-settings"),

        // Tab elements
        tabButtons: document.querySelectorAll(".tab-button"),
        tabContents: document.querySelectorAll(".tab-content"),

        // Save modal elements
        saveModal: document.getElementById("save-modal"),
        closeModalButton: document.querySelector("#save-modal .close-modal"),
        closeModalBtn: document.getElementById("close-modal"),

        // Theme elements
        themeSelect: document.getElementById("activeTheme"),
        themePreviewImg: document.querySelector(".theme-preview-img img"),
        themeDescription: document.querySelector(".theme-description"),
        themeVersion: document.querySelector(".theme-version"),
        themeAuthor: document.querySelector(".theme-author"),

        // Media elements
        selectLogoButton: document.getElementById("select-logo"),
        selectIconButton: document.getElementById("select-icon"),
        logoPreview: document.getElementById("logo-preview"),
        iconPreview: document.getElementById("icon-preview"),
        siteLogoInput: document.getElementById("siteLogo"),
        siteIconInput: document.getElementById("siteIcon"),

        // Media modal elements
        mediaModal: document.getElementById("media-selection-modal"),
        mediaModalTitle: document.getElementById("media-modal-title"),
        mediaGrid: document.getElementById("modal-media-grid"),
        mediaSearch: document.getElementById("modal-media-search"),
        mediaFilter: document.getElementById("modal-media-filter"),
        mediaLoading: document.getElementById("modal-loading"),
        mediaEmpty: document.getElementById("modal-empty"),
        cancelMediaButton: document.getElementById("cancel-media-selection"),
        confirmMediaButton: document.getElementById("confirm-media-selection"),

        // Static site generator elements
        generateStaticBtn: document.getElementById("generateStaticBtn"),
        staticOutputDir: document.getElementById("staticOutputDir"),
        staticBaseUrl: document.getElementById("staticBaseUrl"),
        staticCleanUrls: document.getElementById("staticCleanUrls"),
        staticGeneratorStatus: document.getElementById("staticGeneratorStatus"),
        staticGeneratorResult: document.getElementById("staticGeneratorResult"),
    }
}
