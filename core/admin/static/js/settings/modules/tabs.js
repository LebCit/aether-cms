/**
 * Tabs Module
 * Handles tab navigation functionality and form actions visibility
 */

let currentTab = "general"

/**
 * Initialize tab functionality
 * @param {NodeList} tabButtons - Collection of tab button elements
 */
export function initTabs(tabButtons) {
    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const tabId = button.getAttribute("data-tab")
            switchTab(tabId, tabButtons, document.querySelectorAll(".tab-content"))
        })
    })
}

/**
 * Switch to a specific tab
 * @param {string} tabId - ID of the tab to switch to
 * @param {NodeList} tabButtons - Collection of tab button elements
 * @param {NodeList} tabContents - Collection of tab content elements
 */
export function switchTab(tabId, tabButtons, tabContents) {
    currentTab = tabId

    // Update active tab button
    tabButtons.forEach((button) => {
        button.classList.toggle("active", button.getAttribute("data-tab") === tabId)
    })

    // Update active tab content
    tabContents.forEach((content) => {
        content.classList.toggle("active", content.id === `${tabId}-tab`)
    })

    // Handle form actions visibility
    handleFormActionsVisibility(tabId)
}

/**
 * Handle form actions visibility based on active tab
 * @param {string} tabId - Current active tab ID
 */
function handleFormActionsVisibility(tabId) {
    const formActions = document.getElementById("settings-form-actions")

    if (formActions) {
        // Hide form actions for Menu tab, show for all others
        if (tabId === "menu") {
            formActions.style.display = "none"
        } else {
            formActions.style.display = ""
        }
    }
}

/**
 * Get the current active tab
 * @returns {string} Current tab ID
 */
export function getCurrentTab() {
    return currentTab
}
