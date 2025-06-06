/**
 * Posts and Pages Management JavaScript with improved bulk actions
 * Entry point that coordinates all table functionality
 */

import { Toast } from "./modules/toast.js"
import { ModalManager } from "./modules/modals.js"
import { BulkActionManager } from "./modules/bulk-actions.js"
import { initializeTable } from "./modules/tabulator.js"

document.addEventListener("DOMContentLoaded", function () {
    // Get the current content type from the URL path
    const path = window.location.pathname
    const contentType = path.split("/").pop() // This will give "posts" or "pages"
    const statusIndicator = document.querySelector(".bulk-status")
    // Initialize toast system
    Toast.init()

    // Initialize modal manager
    const modalManager = new ModalManager(contentType)

    // Initialize tabulator table
    const tabulatorTable = initializeTable(contentType, modalManager)

    // Initialize bulk actions
    const bulkManager = new BulkActionManager(contentType, tabulatorTable, modalManager, statusIndicator)

    // Set up delete functionality
    modalManager.setDeleteConfirmCallback(async function (id) {
        try {
            const response = await fetch(`/api/${contentType}/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: id,
                }),
            })

            const data = await response.json()

            if (data.success) {
                // Success feedback
                modalManager.updateDeleteStatus(false, true, "Successfully deleted.")

                // Table will be reloaded when modal is closed via the onDeleteComplete callback
            } else {
                // Error feedback
                modalManager.updateDeleteStatus(false, false, data.error || "An unknown error occurred.")
            }
        } catch (error) {
            console.error("Delete error:", error)
            modalManager.updateDeleteStatus(false, false, "Network error. Please try again.")
        }
    })

    // Set callback for when delete operation completes
    modalManager.onDeleteComplete = () => {
        // Reload the table data
        tabulatorTable.replaceData()
    }
})
