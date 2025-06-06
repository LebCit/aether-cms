/**
 * Tabulator configuration and initialization
 */
import { statusFormatter, dateFormatter, actionButtons, pageTypeFormatter } from "./utils.js"

export function initializeTable(contentType, modalManager) {
    // Base columns that are common to both posts and pages
    const baseColumns = [
        {
            formatter: "rowSelection",
            titleFormatter: "rowSelection",
            hozAlign: "center",
            headerSort: false,
            width: 30,
        },
        {
            title: "Title",
            field: "title",
            sorter: "string",
            headerFilter: "input",
            headerFilterPlaceholder: "Search titles...",
            widthGrow: 3,
            formatter: function (cell) {
                return `<a href="/aether/${contentType}/edit/${cell.getRow().getData().id}">${cell.getValue()}</a>`
            },
            responsive: 0,
            minWidth: 200,
        },
        {
            title: "Author",
            field: "author",
            sorter: "string",
            headerFilter: "input",
            headerFilterPlaceholder: "Filter author...",
            responsive: 4,
            minWidth: 150,
        },
        {
            title: "Status",
            field: "status",
            sorter: "string",
            formatter: statusFormatter,
            headerFilter: "list",
            headerFilterParams: {
                values: { "": "All", published: "Published", draft: "Draft" },
            },
            headerFilterPlaceholder: "Filter status...",
            responsive: 3,
            minWidth: 100,
        },
        {
            title: "Date",
            field: "updatedAt",
            formatter: dateFormatter,
            responsive: 5,
            minWidth: 100,
        },
        {
            title: "Actions",
            formatter: (cell) => actionButtons(cell, contentType),
            headerSort: false,
            responsive: 1,
            minWidth: 200,
        },
    ]

    // Add page-specific columns if this is a pages table
    if (contentType === "pages") {
        // Insert page type column before the Actions column
        baseColumns.splice(-1, 0, {
            title: "Type",
            field: "pageType",
            sorter: "string",
            formatter: pageTypeFormatter,
            headerFilter: "list",
            headerFilterParams: {
                values: { "": "All", normal: "Normal", custom: "Custom" },
            },
            headerFilterPlaceholder: "Filter type...",
            width: 100,
            responsive: 3,
        })
    }

    // Initialize Tabulator
    const mdFilesTable = new Tabulator("#md-files-table", {
        ajaxURL: `/aether/table/${contentType}`,
        ajaxConfig: {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
        },
        ajaxParams: {
            format: "json",
        },
        pagination: true,
        paginationMode: "remote",
        paginationSize: 10,
        paginationSizeSelector: [5, 10, 20, 50, 100],
        paginationCounter: "rows",
        responsiveLayout: "hide",
        layout: "fitColumns",
        selectable: true,
        placeholder: `No ${contentType} found!`,
        initialSort: [{ column: "updatedAt", dir: "desc" }],
        columns: baseColumns,
    })

    // Add event listeners for delete buttons
    mdFilesTable.on("dataProcessed", function () {
        document.querySelectorAll(".delete-button").forEach((button) => {
            button.addEventListener("click", function (e) {
                e.stopPropagation() // Prevent row selection
                const id = this.getAttribute("data-id")
                const status = this.getAttribute("data-status")
                modalManager.showDeleteModal(id, status)
            })
        })
    })

    return mdFilesTable
}
