/**
 * Utility class for common functions
 */
export class ThemeUtils {
    /**
     * Create and show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, info)
     */
    showToast(message, type = "info") {
        // Check if toast container exists, create if not
        let toastContainer = document.querySelector(".toast-container")

        if (!toastContainer) {
            toastContainer = document.createElement("div")
            toastContainer.className = "toast-container"
            document.body.appendChild(toastContainer)
        }

        // Create toast
        const toast = document.createElement("div")
        toast.className = `toast toast-${type}`
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `

        toastContainer.appendChild(toast)

        // Add show class after a small delay (for animation)
        setTimeout(() => toast.classList.add("toast-show"), 10)

        // Add close button functionality
        toast.querySelector(".toast-close").addEventListener("click", () => {
            toast.classList.add("toast-hide")
            setTimeout(() => toast.remove(), 300)
        })

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add("toast-hide")
                setTimeout(() => toast.remove(), 300)
            }
        }, 5000)
    }

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
}
