/**
 * Enhanced Admin Bar JavaScript
 * Handles initialization and dynamic behavior of the Aether admin bar with improved animations
 */
document.addEventListener("DOMContentLoaded", function () {
    // Access data from global variable
    const data = window.aetherBarData || {}

    // Initialize admin bar
    initAdminBar()

    /**
     * Initialize the admin bar functionality
     */
    function initAdminBar() {
        const adminBar = document.querySelector(".aether-bar-horizontal")
        if (!adminBar) return

        // Set up role visibility
        setupRoleVisibility()

        // Set up toggle button (for collapsing/expanding)
        setupToggleButton()

        // Set up info panel for content pages
        setupInfoPanel()

        // Add performance metrics
        setupPerformanceMetrics()

        // Set up responsive behavior
        setupResponsiveLayout()

        // Set up inactivity tracking
        setupInactivityTracking()

        // Setup hover effects for buttons
        setupButtonEffects()

        // Add subtle motion effects
        setupMotionEffects()
    }

    /**
     * Set up visibility based on user role
     */
    function setupRoleVisibility() {
        const adminOnlyElements = document.querySelectorAll(".aether-only")
        const userRole = data.user?.role

        if (adminOnlyElements.length > 0) {
            const isAdmin = userRole === "admin"
            adminOnlyElements.forEach((el) => {
                el.style.display = isAdmin ? "flex" : "none"
            })
        }
    }

    /**
     * Add toggle button for collapsing/expanding admin bar with improved animation
     */
    function setupToggleButton() {
        const adminBar = document.querySelector(".aether-bar-horizontal")
        if (!adminBar) return

        // Create toggle button
        const toggleBtn = document.createElement("button")
        toggleBtn.className = "aether-toggle-btn"
        toggleBtn.innerHTML = '<i class="toggle-icon"></i>'
        toggleBtn.setAttribute("title", "Toggle admin bar")

        // Add toggle button to admin bar
        adminBar.appendChild(toggleBtn)

        // Check if the admin bar was previously collapsed
        if (localStorage.getItem("adminBarCollapsed") === "true") {
            adminBar.classList.add("aether-bar-collapsed")
        }

        // Handle toggle button clicks with smooth animation
        toggleBtn.addEventListener("click", function (e) {
            e.stopPropagation() // Prevent event bubbling
            toggleAdminBar()
        })

        // Allow ESC key to toggle the admin bar
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") {
                toggleAdminBar()
            }
        })

        // Helper function to toggle with animation
        function toggleAdminBar() {
            // Add transition class for smoother animation
            adminBar.classList.add("transitioning")

            // Toggle collapsed state
            adminBar.classList.toggle("aether-bar-collapsed")

            // Save state to localStorage
            localStorage.setItem("adminBarCollapsed", adminBar.classList.contains("aether-bar-collapsed"))

            // Remove transition class after animation completes
            setTimeout(() => {
                adminBar.classList.remove("transitioning")
            }, 350) // Match this with the CSS transition time
        }
    }

    /**
     * Set up info panel for content pages with improved animation
     */
    function setupInfoPanel() {
        if (!data.isContentPage) return

        const infoToggle = document.querySelector(".aether-info-toggle")
        const infoPanel = document.querySelector(".aether-info-panel")
        const infoClose = document.querySelector(".aether-info-close")

        if (!infoToggle || !infoPanel || !infoClose) return

        // Toggle info panel on button click with animation
        infoToggle.addEventListener("click", function (e) {
            e.stopPropagation() // Prevent event bubbling
            infoPanel.classList.toggle("active")

            // Add subtle pulse animation to toggle button when panel is open
            if (infoPanel.classList.contains("active")) {
                infoToggle.classList.add("pulse")
                setTimeout(() => {
                    infoToggle.classList.remove("pulse")
                }, 500)
            }
        })

        // Close button
        infoClose.addEventListener("click", function (e) {
            e.stopPropagation() // Prevent event bubbling
            infoPanel.classList.remove("active")
        })

        // Close when clicking outside
        document.addEventListener("click", function (e) {
            if (infoPanel.classList.contains("active") && !infoPanel.contains(e.target) && e.target !== infoToggle) {
                infoPanel.classList.remove("active")
            }
        })

        // Add some dynamic content setup
        if (infoPanel.querySelector("ul")) {
            const items = infoPanel.querySelectorAll("li")
            // Stagger the appearance of list items for a nicer effect
            items.forEach((item, index) => {
                item.style.transitionDelay = `${index * 50}ms`
                item.style.opacity = "0"
                item.style.transform = "translateY(10px)"
            })

            // Observer to trigger animation when panel becomes visible
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.target.classList.contains("active")) {
                        items.forEach((item, index) => {
                            setTimeout(() => {
                                item.style.opacity = "1"
                                item.style.transform = "translateY(0)"
                            }, index * 50)
                        })
                    }
                })
            })

            observer.observe(infoPanel, { attributes: true, attributeFilter: ["class"] })
        }
    }

    /**
     * Set up performance metrics display with improved visualization
     */
    function setupPerformanceMetrics() {
        const perfIndicator = document.querySelector(".bd-perf-indicator")

        if (perfIndicator && window.performance) {
            window.addEventListener("load", function () {
                setTimeout(function () {
                    const [navigationEntry] = performance.getEntriesByType("navigation")

                    if (navigationEntry) {
                        // Get DOMContentLoaded time
                        const loadTime = (navigationEntry.domContentLoadedEventEnd - navigationEntry.startTime) / 1000

                        // Display load time
                        perfIndicator.textContent = `${loadTime.toFixed(2)}s`

                        // Add visual indicator based on performance with animation
                        perfIndicator.style.opacity = "0"
                        perfIndicator.style.transform = "scale(0.8)"

                        setTimeout(() => {
                            if (loadTime < 1) {
                                perfIndicator.classList.add("bd-perf-good")
                                perfIndicator.title = "Page load time (Good): " + loadTime.toFixed(2) + "s"
                            } else if (loadTime < 2.5) {
                                perfIndicator.classList.add("bd-perf-medium")
                                perfIndicator.title = "Page load time (Average): " + loadTime.toFixed(2) + "s"
                            } else {
                                perfIndicator.classList.add("bd-perf-poor")
                                perfIndicator.title = "Page load time (Slow): " + loadTime.toFixed(2) + "s"
                            }

                            perfIndicator.style.opacity = "1"
                            perfIndicator.style.transform = "scale(1)"
                            perfIndicator.style.transition = "all 0.3s ease-out"
                        }, 300)
                    }
                }, 0)
            })
        }
    }

    /**
     * Set up responsive behavior with smoother transitions
     */
    function setupResponsiveLayout() {
        const adminBar = document.querySelector(".aether-bar-horizontal")
        if (!adminBar) return

        const adjustResponsiveBehavior = function () {
            // On smaller screens, initially collapse the bar
            if (window.innerWidth < 768 && !localStorage.getItem("adminBarCollapsed")) {
                adminBar.classList.add("aether-bar-collapsed")
            }

            // Adjust button text visibility on smaller screens
            const adminBtns = document.querySelectorAll(".aether-btn")
            if (window.innerWidth < 576) {
                adminBtns.forEach((btn) => {
                    // Store original text content if we haven't already
                    if (!btn.dataset.originalText) {
                        btn.dataset.originalText = btn.textContent.trim()
                        // Keep only the icon, hide the text
                        const icon = btn.querySelector("i")
                        if (icon) {
                            btn.textContent = ""
                            btn.appendChild(icon)
                            btn.classList.add("icon-only")
                        }
                    }
                })
            } else {
                // Restore original text on larger screens
                adminBtns.forEach((btn) => {
                    if (btn.dataset.originalText && btn.classList.contains("icon-only")) {
                        const icon = btn.querySelector("i")
                        btn.textContent = btn.dataset.originalText
                        if (icon) {
                            btn.insertBefore(icon, btn.firstChild)
                        }
                        btn.classList.remove("icon-only")
                    }
                })
            }
        }

        // Run initially and on resize with debouncing
        let resizeTimer
        adjustResponsiveBehavior()

        window.addEventListener("resize", function () {
            clearTimeout(resizeTimer)
            resizeTimer = setTimeout(adjustResponsiveBehavior, 100)
        })
    }

    /**
     * Set up inactivity tracking with gradual fade
     */
    function setupInactivityTracking() {
        let inactivityTimer
        const adminBar = document.querySelector(".aether-bar-horizontal")
        if (!adminBar) return

        const resetInactivityTimer = function () {
            clearTimeout(inactivityTimer)

            // If the bar was auto-collapsed, restore it with a nice fade-in
            if (adminBar.classList.contains("auto-collapsed") && !adminBar.classList.contains("aether-bar-collapsed")) {
                adminBar.style.opacity = "1"
                adminBar.classList.remove("auto-collapsed")
            }

            inactivityTimer = setTimeout(function () {
                if (
                    !adminBar.classList.contains("aether-bar-collapsed") &&
                    !document.querySelector(".aether-info-panel.active")
                ) {
                    // Add a class to track that this was auto-collapsed
                    adminBar.classList.add("auto-collapsed")

                    // Fade out slightly before collapsing for smoother effect
                    adminBar.style.opacity = "0.8"
                    adminBar.style.transition = "opacity 0.5s ease"

                    setTimeout(() => {
                        adminBar.classList.add("aether-bar-collapsed")
                        localStorage.setItem("adminBarCollapsed", "true")
                    }, 300)
                }
            }, 60000) // Collapse after 1 minute of inactivity
        }

        // Reset timer on user interaction
        ;["mousemove", "mousedown", "keypress", "scroll", "touchstart"].forEach(function (event) {
            document.addEventListener(event, resetInactivityTimer)
        })

        // Start the timer
        resetInactivityTimer()
    }

    /**
     * Setup subtle hover effects for buttons
     */
    function setupButtonEffects() {
        const buttons = document.querySelectorAll(".aether-btn, .aether-logout-btn, .aether-info-toggle")

        buttons.forEach((btn) => {
            // Add subtle hover effect
            btn.addEventListener("mouseenter", function () {
                this.style.transition = "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            })

            // Add subtle click effect
            btn.addEventListener("mousedown", function () {
                this.style.transform = "scale(0.95)"
                this.style.transition = "all 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            })

            btn.addEventListener("mouseup", function () {
                this.style.transform = ""
            })

            btn.addEventListener("mouseleave", function () {
                this.style.transform = ""
            })
        })
    }

    /**
     * Add subtle motion effects to the admin bar
     */
    function setupMotionEffects() {
        const adminBar = document.querySelector(".aether-bar-horizontal")
        if (!adminBar) return

        // Only apply these effects if user hasn't disabled motion
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        if (prefersReducedMotion) return

        // Add subtle parallax effect to the admin bar on mouse move
        document.addEventListener("mousemove", function (e) {
            if (adminBar.classList.contains("aether-bar-collapsed")) return

            // Calculate how far the mouse is from the center of the screen
            const mouseX = e.clientX / window.innerWidth - 0.5
            const mouseY = e.clientY / window.innerHeight - 0.5

            // Apply subtle transform (max 3px movement)
            requestAnimationFrame(function () {
                adminBar.style.transform = `translate(${mouseX * 3}px, ${mouseY * 3}px)`
            })
        })

        // Reset transform when mouse leaves the window
        document.addEventListener("mouseleave", function () {
            adminBar.style.transform = ""
        })
    }
})
