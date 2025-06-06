/**
 * Default Theme JavaScript
 * - Enhanced with mobile support for multi-level dropdown menus
 * - Uses data-parent attribute for parent links
 */

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
    // Add active class to current navigation item
    const currentPath = window.location.pathname
    const navigationLinks = document.querySelectorAll(".main-navigation a")

    navigationLinks.forEach((link) => {
        const linkPath = link.getAttribute("href")

        // Skip empty href or data-parent links when adding active class
        if (!linkPath || link.getAttribute("data-parent") === "true") {
            return
        }

        // Check if the current path starts with the link path
        // Special case for homepage
        if (linkPath === "/" && currentPath === "/") {
            link.classList.add("active")
        } else if (linkPath !== "/" && currentPath.startsWith(linkPath)) {
            link.classList.add("active")
        }
    })

    // Mobile menu functionality
    setupMobileMenu()

    // Set up click/tap functionality for submenu toggles
    setupSubmenuToggles()

    // Handle parent links
    handleParentLinks()
})

/**
 * Sets up mobile menu functionality
 */
function setupMobileMenu() {
    const nav = document.querySelector(".site-navigation")
    if (!nav) return

    // Create mobile toggle button
    const toggleButton = document.createElement("button")
    toggleButton.className = "menu-toggle"
    toggleButton.setAttribute("aria-expanded", "false")
    toggleButton.innerHTML = "<span>Menu</span>"

    nav.parentNode.insertBefore(toggleButton, nav)

    // Toggle mobile navigation
    toggleButton.addEventListener("click", function () {
        const expanded = this.getAttribute("aria-expanded") === "true"
        this.setAttribute("aria-expanded", !expanded)
        nav.classList.toggle("toggled")
    })
}

/**
 * Sets up submenu toggle functionality for all levels
 * - Handles all nested submenus at any depth
 * - On desktop, submenus open on hover (handled by CSS)
 * - On mobile/touch devices, submenus toggle on click/tap
 */
function setupSubmenuToggles() {
    // Get all menu items with children at any level
    const menuItemsWithChildren = document.querySelectorAll(".site-navigation .menu-item-has-children")

    // Check if touch device (rough detection)
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0

    // Add submenu toggle buttons for mobile
    if (isTouchDevice || window.innerWidth <= 768) {
        menuItemsWithChildren.forEach(function (item) {
            const link = item.querySelector(":scope > a")
            const subMenu = item.querySelector(":scope > .sub-menu")

            // Create a toggle button
            const toggleBtn = document.createElement("button")
            toggleBtn.className = "submenu-toggle"
            toggleBtn.setAttribute("aria-expanded", "false")
            toggleBtn.innerHTML = "+"

            // Insert toggle after the link
            link.parentNode.insertBefore(toggleBtn, link.nextSibling)

            // Toggle submenu on button click
            toggleBtn.addEventListener("click", function (e) {
                e.preventDefault()
                e.stopPropagation()

                const expanded = this.getAttribute("aria-expanded") === "true"
                this.setAttribute("aria-expanded", !expanded)
                this.innerHTML = expanded ? "+" : "-"

                // Toggle the submenu
                if (subMenu) {
                    subMenu.classList.toggle("submenu-active")
                }

                // Toggle parent class
                item.classList.toggle("submenu-open")
            })
        })
    } else {
        // Desktop behavior - rely on CSS hover
    }

    // Close submenus when clicking outside
    document.addEventListener("click", function (e) {
        // Only process if we're in mobile view
        if (window.innerWidth <= 768 || isTouchDevice) {
            // Check if click is outside any menu item
            const isOutsideMenu = !e.target.closest(".site-navigation")

            if (isOutsideMenu) {
                // Close all submenus
                document.querySelectorAll(".submenu-active").forEach(function (subMenu) {
                    subMenu.classList.remove("submenu-active")
                })

                document.querySelectorAll(".submenu-open").forEach(function (item) {
                    item.classList.remove("submenu-open")
                })

                // Reset all toggle buttons
                document.querySelectorAll(".submenu-toggle").forEach(function (btn) {
                    btn.setAttribute("aria-expanded", "false")
                    btn.innerHTML = "+"
                })
            }
        }
    })

    // Handle window resize
    window.addEventListener("resize", function () {
        if (window.innerWidth > 768) {
            // Clean up mobile-specific classes on desktop
            document.querySelectorAll(".submenu-active").forEach(function (subMenu) {
                subMenu.classList.remove("submenu-active")
            })

            document.querySelectorAll(".submenu-open").forEach(function (item) {
                item.classList.remove("submenu-open")
            })

            // Remove any toggle buttons if they were added
            document.querySelectorAll(".submenu-toggle").forEach(function (btn) {
                btn.remove()
            })
        } else {
            // If we resized from desktop to mobile, add toggle buttons if they don't exist
            if (document.querySelectorAll(".submenu-toggle").length === 0) {
                setupSubmenuToggles()
            }
        }
    })
}

/**
 * Handle parent menu items (items with data-parent attribute or with empty href)
 * and sets up appropriate behaviors
 */
function handleParentLinks() {
    // Find all parent menu item links - either with data-parent attribute or with empty href
    // or with # as href
    const parentLinks = document.querySelectorAll(".site-navigation .menu-item-has-children > a")

    parentLinks.forEach(function (link) {
        // Check if it's a parent link (has data-parent attribute or empty href or # href)
        const isParentLink =
            link.getAttribute("data-parent") === "true" ||
            !link.getAttribute("href") ||
            link.getAttribute("href") === "#"

        if (isParentLink) {
            // If not already set, set the data-parent attribute
            if (link.getAttribute("data-parent") !== "true") {
                link.setAttribute("data-parent", "true")
            }

            // Clear the href attribute entirely to prevent any navigation
            if (link.getAttribute("href") === "#") {
                link.removeAttribute("href")
            }

            // Add a click event listener
            link.addEventListener("click", function (e) {
                e.preventDefault()

                // On mobile, toggle the submenu
                if (window.innerWidth <= 768) {
                    // Find the toggle button and click it
                    const toggleBtn = this.nextElementSibling
                    if (toggleBtn && toggleBtn.classList.contains("submenu-toggle")) {
                        toggleBtn.click()
                    } else {
                        // If no toggle button (shouldn't happen), toggle the submenu directly
                        const subMenu = this.parentNode.querySelector(".sub-menu")
                        if (subMenu) {
                            subMenu.classList.toggle("submenu-active")
                            this.parentNode.classList.toggle("submenu-open")
                        }
                    }
                }
            })

            // Add a specific class for styling
            link.classList.add("parent-link")

            // Add ARIA attributes for accessibility
            link.setAttribute("role", "button")
            link.setAttribute("aria-haspopup", "true")
            link.setAttribute("aria-expanded", "false")

            // When submenu is toggled, update aria-expanded
            const menuItem = link.parentNode
            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.attributeName === "class") {
                        const isOpen = menuItem.classList.contains("submenu-open")
                        link.setAttribute("aria-expanded", isOpen ? "true" : "false")
                    }
                })
            })

            observer.observe(menuItem, { attributes: true })
        }
    })
}
