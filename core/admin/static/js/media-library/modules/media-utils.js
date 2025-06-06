/**
 * Media Utilities Module
 * Provides utility functions for the media library
 */
export class MediaUtils {
    /**
     * Format file size to human-readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + " B"
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
        else return (bytes / 1048576).toFixed(1) + " MB"
    }

    /**
     * Format date to human-readable format
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    /**
     * Get file extension from filename
     * @param {string} filename - The filename
     * @returns {string} File extension without dot
     */
    getFileExtension(filename) {
        return filename.split(".").pop().toLowerCase()
    }

    /**
     * Get appropriate document icon based on file extension
     * @param {string} fileExt - File extension
     * @returns {string} Document icon emoji
     */
    getDocumentIcon(fileExt) {
        let icon = "📄" // Default document icon

        if (["pdf"].includes(fileExt)) icon = "📕"
        else if (["doc", "docx"].includes(fileExt)) icon = "📘"
        else if (["xls", "xlsx"].includes(fileExt)) icon = "📗"
        else if (["ppt", "pptx"].includes(fileExt)) icon = "📙"

        return icon
    }

    /**
     * Truncate filename if too long
     * @param {string} filename - The filename to truncate
     * @param {number} maxLength - Maximum length before truncation
     * @returns {string} Truncated filename
     */
    truncateFilename(filename, maxLength) {
        if (filename.length <= maxLength) return filename

        const extension = this.getFileExtension(filename)
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf("."))

        if (nameWithoutExt.length <= maxLength - 3) return filename

        return nameWithoutExt.substring(0, maxLength - 3) + "..." + (extension ? "." + extension : "")
    }
}
