/**
 * Notification Service Module
 * Manages toast notifications for the media library
 */
export class NotificationService {
    /**
     * Create and show a toast notification
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
     * Show a success toast
     * @param {string} message - The message to display
     */
    showSuccess(message) {
        this.showToast(message, "success")
    }

    /**
     * Show an error toast
     * @param {string} message - The message to display
     */
    showError(message) {
        this.showToast(message, "error")
    }

    /**
     * Show a warning toast
     * @param {string} message - The message to display
     */
    showWarning(message) {
        this.showToast(message, "warning")
    }

    /**
     * Show an info toast
     * @param {string} message - The message to display
     */
    showInfo(message) {
        this.showToast(message, "info")
    }
}
