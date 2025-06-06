/**
 * Themes Module
 * Handles theme selection and preview functionality
 */

let themes = []

/**
 * Fetch available themes from the API
 * @param {Function} callback - Function to call after themes are fetched
 */
export function fetchThemes(callback) {
    fetch("/api/themes")
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                themes = data.data
                if (callback) callback()
            }
        })
        .catch((error) => {
            console.error("Error fetching themes:", error)
        })
}

/**
 * Update the theme preview based on the currently selected theme
 * @param {Object} elements - DOM elements for theme preview
 */
export function updateThemePreview(elements) {
    const { themeSelect, themeDescription, themeVersion, themeAuthor } = elements

    if (!themeSelect || themes.length === 0) return

    const selectedThemeName = themeSelect.value
    const selectedTheme = themes.find((theme) => theme.name === selectedThemeName)

    if (selectedTheme) {
        // Update theme info
        themeDescription.textContent = selectedTheme.info.description || ""
        themeVersion.textContent = `Version: ${selectedTheme.info.version || "1.0.0"}`

        const authorText = selectedTheme.info.author || "Unknown"
        const authorUrl = selectedTheme.info.authorUrl || "#"
        themeAuthor.innerHTML = `By: <a href="${authorUrl}" target="_blank">${authorText}</a>`
    }
}

/**
 * Get the list of available themes
 * @returns {Array} List of theme objects
 */
export function getThemes() {
    return themes
}
