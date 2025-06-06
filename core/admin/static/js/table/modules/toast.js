/**
 * Toast notification system
 */
export const Toast = {
    container: null,

    init() {
        this.container = document.querySelector(".toast-container")
        return this
    },

    create(message, type = "info", duration = 5000) {
        if (!this.container) return

        const toast = document.createElement("div")
        toast.className = `toast toast-${type}`
        toast.innerHTML = `
          <div class="toast-message">${message}</div>
          <button class="toast-close">&times;</button>
      `

        this.container.appendChild(toast)

        toast.querySelector(".toast-close").addEventListener("click", () => {
            toast.classList.add("toast-hide")
            setTimeout(() => toast.remove(), 300)
        })

        setTimeout(() => {
            toast.classList.add("toast-hide")
            setTimeout(() => toast.remove(), 300)
        }, duration)

        setTimeout(() => toast.classList.add("toast-show"), 10)
    },
}
