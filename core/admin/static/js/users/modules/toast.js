/**
 * Toast notification manager
 * Handles displaying and managing toast notifications
 */
class ToastManager {
    constructor() {
        this.container = null
    }

    /**
     * Initialize the toast container
     */
    init() {
        // Create toast container if it doesn't exist
        if (!this.container) {
            this.container = document.querySelector(".toast-container")

            if (!this.container) {
                this.container = document.createElement("div")
                this.container.className = "toast-container"
                document.body.appendChild(this.container)
            }
        }
    }

    /**
     * Show a toast notification
     * @param {string} message - The message to display
     * @param {string} type - The type of toast (success, error, info)
     */
    show(message, type = "info") {
        this.init()

        // Create toast
        const toast = document.createElement("div")
        toast.className = `toast toast-${type}`
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `

        this.container.appendChild(toast)

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
}

// Export a singleton instance
export const toastManager = new ToastManager()
