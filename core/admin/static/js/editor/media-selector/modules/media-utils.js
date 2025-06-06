/**
 * Media Utilities
 * Helper functions for media operations
 */

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string} File extension without dot
 */
export function getFileExtension(filename) {
    return filename.split(".").pop().toLowerCase()
}

/**
 * Get appropriate icon for a document based on file extension
 * @param {string} filename - The filename
 * @returns {string} Icon emoji for the document type
 */
export function getDocumentIcon(filename) {
    const fileExt = getFileExtension(filename)
    let icon = "📄" // Default document icon

    if (["pdf"].includes(fileExt)) icon = "📕"
    else if (["doc", "docx"].includes(fileExt)) icon = "📘"
    else if (["xls", "xlsx"].includes(fileExt)) icon = "📗"
    else if (["ppt", "pptx"].includes(fileExt)) icon = "📙"

    return icon
}
