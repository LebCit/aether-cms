/**
 * Notification Service Module
 * Handles all notifications/toasts for the menu editor
 */
export class NotificationService {
    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, warning, info)
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
     * Show an error message
     * @param {string} message - The error message
     */
    showError(message) {
        this.showToast(message, "error")
    }

    /**
     * Show a success message
     * @param {string} message - The success message
     */
    showSuccess(message) {
        this.showToast(message, "success")
    }

    /**
     * Show a warning message
     * @param {string} message - The warning message
     */
    showWarning(message) {
        this.showToast(message, "warning")
    }

    /**
     * Show an info message
     * @param {string} message - The info message
     */
    showInfo(message) {
        this.showToast(message, "info")
    }
}
