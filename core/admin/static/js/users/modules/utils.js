/**
 * Utility functions for the user management system
 */

/**
 * Format date to human-readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    if (!dateString) return "N/A"

    const date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) return "N/A"

    return date.toLocaleDateString()
}
