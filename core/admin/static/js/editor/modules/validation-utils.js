/**
 * Validation utilities for the editor
 */

/**
 * Validate content form data
 * @param {Object} contentData - The content data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateContent(contentData) {
    const errors = {}

    // Check title (required)
    if (!contentData.metadata.title || contentData.metadata.title.trim() === "") {
        errors.title = "Title is required"
    }

    // Check slug (required and format)
    if (!contentData.metadata.slug || contentData.metadata.slug.trim() === "") {
        errors.slug = "Slug is required"
    } else if (!/^[a-z0-9-]+$/.test(contentData.metadata.slug)) {
        errors.slug = "Slug can only contain lowercase letters, numbers, and hyphens"
    }

    // Check if content is too long (optional based on system limits)
    if (contentData.content && contentData.content.length > 100000) {
        errors.content = "Content is too long (maximum 100,000 characters)"
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    }
}

/**
 * Add visual error indicators to form elements
 * @param {Object} errors - Validation errors object
 * @param {Object} formElements - DOM elements for the form
 */
export function showValidationErrors(errors, formElements) {
    // Clear previous error messages first
    clearValidationErrors(formElements)

    // Add error messages and styles
    Object.keys(errors).forEach((fieldName) => {
        const element = formElements[fieldName]
        if (!element) return

        // Add error class
        element.classList.add("error")

        // Create error message element
        const errorMsg = document.createElement("p")
        errorMsg.className = "error-message"
        errorMsg.textContent = errors[fieldName]

        // Insert error message after the field
        element.parentNode.insertBefore(errorMsg, element.nextSibling)
    })
}

/**
 * Remove validation error indicators
 * @param {Object} formElements - DOM elements for the form
 */
export function clearValidationErrors(formElements) {
    // Remove error classes from all form elements
    Object.values(formElements).forEach((element) => {
        if (element) {
            element.classList.remove("error")
        }
    })

    // Remove all error messages
    document.querySelectorAll(".error-message").forEach((element) => {
        element.remove()
    })
}

/**
 * Generates a URL-friendly slug from a string.
 *
 * This function converts a string to lowercase, replaces spaces and special
 * characters with hyphens, removes diacritics (e.g., é → e), and trims
 * redundant hyphens.
 *
 * @param {string} text - The input text to convert to a slug.
 * @returns {string} A clean, URL-safe slug string.
 */
export function slugify(text) {
    if (typeof text !== "string") return ""

    return text
        .normalize("NFD") // Decompose accents (e.g., é → e +  ́)
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .toLowerCase()
        .trim()
        .replace(/&/g, "-and-") // Replace ampersand with 'and'
        .replace(/_/g, "-") // Replace underscores with hyphens
        .replace(/[^a-z0-9\- ]/g, "") // Remove non-alphanumeric (preserve space and hyphen)
        .replace(/\s+/g, "-") // Replace spaces with hyphen
        .replace(/\-+/g, "-") // Collapse multiple hyphens
        .replace(/^-+|-+$/g, "") // Trim leading/trailing hyphens
}
