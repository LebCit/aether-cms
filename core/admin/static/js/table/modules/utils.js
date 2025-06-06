/**
 * Utility functions for table management
 */

// Format the status badge using the Tabulator formatter
export function statusFormatter(cell) {
    const value = cell.getValue() || "draft"
    const statusClass = value === "published" ? "status-published" : "status-draft"
    return `<span class="status-badge ${statusClass}">${value}</span>`
}

// Format the page type badge
export function pageTypeFormatter(cell) {
    const value = cell.getValue()
    if (!value || value === "normal") {
        return `<span class="page-type-badge page-type-normal">Normal</span>`
    }

    const rowData = cell.getRow().getData()
    const hasParent = rowData.parentPage
    const icon = hasParent ? "📁" : "📄"
    const title = hasParent ? `Custom (nested under ${rowData.parentPage})` : "Custom (root level)"

    return `<span class="page-type-badge page-type-custom" title="${title}">${icon} Custom</span>`
}

// Format the date using the Tabulator formatter
export function dateFormatter(cell) {
    let value = cell.getValue()
    return value ? new Date(value).toLocaleDateString() : ""
}

// Format the action buttons
export function actionButtons(cell, contentType) {
    const rowData = cell.getRow().getData()

    // Use the pre-generated viewUrl if available, otherwise fall back to the old logic
    const viewUrl = rowData.viewUrl || (contentType === "posts" ? `/post/${rowData.slug}` : `/page/${rowData.slug}`)

    return `
      <a href="/aether/${contentType}/edit/${rowData.id}" class="action-button edit-button" title="Edit">✏️</a>
      <a href="${viewUrl}" target="_blank" class="action-button view-button" title="View">👁️</a>
      <button class="action-button delete-button" title="Delete" data-id="${rowData.id}" data-status="${rowData.status}">🗑️</button>
    `
}

// Toggle status indicator
export function toggleStatusIndicator(statusIndicator, show, message = "Processing...") {
    statusIndicator.classList.toggle("hidden", !show)
    if (show) {
        statusIndicator.querySelector(".status-message").textContent = message
    }
}
