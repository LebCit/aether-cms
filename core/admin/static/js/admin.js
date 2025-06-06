/**
 * Admin Interface JavaScript
 */

document.addEventListener("DOMContentLoaded", function () {
    // Set active navigation item
    const currentPath = window.location.pathname
    const navLinks = document.querySelectorAll(".sidebar-nav a")

    navLinks.forEach((link) => {
        const linkPath = link.getAttribute("href")

        // Check if the current path matches the link path
        if (currentPath === linkPath) {
            // Find parent li and add active class
            link.parentElement.classList.add("active")
        } else if (linkPath !== "/aether" && currentPath.startsWith(linkPath)) {
            // For subpaths (like /admin/posts/edit matching /admin/posts)
            link.parentElement.classList.add("active")
        }
    })

    const sidebar = document.querySelector(".admin-sidebar")
    const sidebarToggle = document.querySelector(".sidebar-toggle")

    // Only proceed if sidebar and toggle button exist
    if (sidebar && sidebarToggle) {
        // Toggle sidebar on button click
        sidebarToggle.addEventListener("click", function () {
            sidebar.classList.toggle("open")
            // Update aria-expanded attribute for accessibility
            const isExpanded = sidebar.classList.contains("open")
            this.setAttribute("aria-expanded", isExpanded)
            // Change toggle icon based on state
            this.innerHTML = isExpanded ? "✕" : "☰"
        })

        // Close sidebar when clicking outside on mobile
        document.addEventListener("click", function (event) {
            const isClickInsideSidebar = sidebar.contains(event.target)
            const isClickOnToggle = sidebarToggle.contains(event.target)
            if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains("open")) {
                sidebar.classList.remove("open")
                sidebarToggle.setAttribute("aria-expanded", false)
                sidebarToggle.innerHTML = "☰"
            }
        })

        // Close sidebar when navigation link is clicked (on mobile)
        const navLinks = sidebar.querySelectorAll(".sidebar-nav a")
        navLinks.forEach((link) => {
            link.addEventListener("click", function () {
                if (window.innerWidth <= 992) {
                    sidebar.classList.remove("open")
                    sidebarToggle.setAttribute("aria-expanded", false)
                    sidebarToggle.innerHTML = "☰"
                }
            })
        })

        // Handle resize events to reset sidebar state
        let resizeTimer
        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer)
            resizeTimer = setTimeout(function () {
                if (window.innerWidth > 992) {
                    // Reset sidebar for desktop
                    sidebar.classList.remove("open")
                    sidebarToggle.setAttribute("aria-expanded", false)
                    sidebarToggle.innerHTML = "☰"
                }
            }, 250)
        })
    }

    // Generic form submission with validation
    const forms = document.querySelectorAll("form")

    forms.forEach((form) => {
        form.addEventListener("submit", function (event) {
            // Reset any previous error messages
            const errorMessages = form.querySelectorAll(".error-message")
            errorMessages.forEach((el) => el.remove())

            // Check required fields
            const requiredFields = form.querySelectorAll("[required]")
            let hasError = false

            requiredFields.forEach((field) => {
                if (!field.value.trim()) {
                    hasError = true

                    // Create error message
                    const errorEl = document.createElement("div")
                    errorEl.className = "error-message"
                    errorEl.textContent = "This field is required"

                    // Insert after field
                    field.parentNode.insertBefore(errorEl, field.nextSibling)

                    // Highlight field
                    field.classList.add("error")
                }
            })

            if (hasError) {
                event.preventDefault()
            }
        })
    })
})
