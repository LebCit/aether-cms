/**
 * Bulk operations management
 */
import { Toast } from "./toast.js"
import { toggleStatusIndicator } from "./utils.js"

export class BulkActionManager {
    constructor(contentType, table, modalManager, statusIndicator) {
        this.contentType = contentType
        this.table = table
        this.modalManager = modalManager
        this.statusIndicator = statusIndicator

        this.bulkActionSelect = document.getElementById("bulk-action")
        this.applyBulkButton = document.getElementById("apply-bulk")
        this.downloadButton = document.getElementById("download-csv")

        this.bulkOperationIds = []
        this.currentBulkAction = ""

        this.initEvents()
    }

    initEvents() {
        if (this.applyBulkButton) {
            this.applyBulkButton.addEventListener("click", () => this.applyBulkAction())
        }

        if (this.downloadButton) {
            this.downloadButton.addEventListener("click", () => {
                this.table.download("csv", `${this.contentType}.csv`)
            })
        }

        // Set up the modal confirmation callback
        this.modalManager.setBulkConfirmCallback(() => this.performBulkAction())
    }

    applyBulkAction() {
        const action = this.bulkActionSelect.value
        const selectedRows = this.table.getSelectedRows()

        if (!action || selectedRows.length === 0) {
            Toast.create(`Please select ${this.contentType} and an action to apply.`, "warning")
            return
        }

        // Store for confirmation
        this.bulkOperationIds = selectedRows.map((row) => row.getData().id)
        this.currentBulkAction = action

        // Show confirmation modal
        this.modalManager.showBulkModal(action, this.bulkOperationIds.length)
    }

    async performBulkAction() {
        // First hide the modal
        this.modalManager.hideBulkModal()

        // Check if status indicator exists before using it
        if (this.statusIndicator) {
            toggleStatusIndicator(this.statusIndicator, true, `Processing ${this.bulkOperationIds.length} items...`)
        }

        try {
            // Perform the bulk action via API
            const response = await fetch(`/api/bulk/${this.contentType}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: this.currentBulkAction,
                    ids: this.bulkOperationIds,
                }),
            })

            const data = await response.json()

            // Hide status indicator
            if (this.statusIndicator) {
                toggleStatusIndicator(this.statusIndicator, false)
            }

            if (data.success) {
                // Show success notification
                Toast.create(
                    `Successfully ${
                        this.currentBulkAction === "delete"
                            ? "deleted"
                            : this.currentBulkAction === "publish"
                            ? "published"
                            : "set to draft"
                    } ${data.successCount} ${this.contentType}.`,
                    "success"
                )

                // Reload the table data
                this.table.replaceData()

                // Reset bulk action select
                this.bulkActionSelect.value = ""
            } else if (data.results && data.errorCount > 0) {
                // Handle partial success - check if we have any successes
                if (data.successCount > 0) {
                    // Partial success
                    Toast.create(
                        `Completed with issues: ${data.successCount} succeeded, ${data.errorCount} failed.`,
                        "warning"
                    )
                } else {
                    // Total failure
                    Toast.create(
                        `Failed to ${this.currentBulkAction} ${this.contentType}. ${data.errorCount} items failed.`,
                        "error"
                    )
                }

                // Show details of errors in console for debugging
                if (data.errors && data.errors.length) {
                    console.error("Bulk operation errors:", data.errors)
                }

                // Reload the table to show updated state
                this.table.replaceData()

                // Reset bulk action select
                this.bulkActionSelect.value = ""
            } else {
                // Handle case where data.success is false but no specific error info
                Toast.create(`Error: ${data.error || "Failed to perform bulk action."}`, "error")
            }
        } catch (error) {
            console.error("Bulk action error:", error)
            toggleStatusIndicator(this.statusIndicator, false)
            Toast.create("Network error. Please try again.", "error")
        }
    }
}
