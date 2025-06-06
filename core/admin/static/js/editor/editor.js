/**
 * Content Editor - Main Entry Point
 * Coordinates the different modules of the editor
 */

import { EditorState } from "./modules/editor-state.js"
import { EditorUI } from "./modules/editor-ui.js"
import { ContentService } from "./modules/content-service.js"
import { SlugManager } from "./modules/slug-manager.js"
import { validateContent, showValidationErrors, clearValidationErrors } from "./modules/validation-utils.js"
import { UnsavedChangesHandler } from "./modules/unsaved-changes-handler.js"
import { NavigationHandler } from "./modules/navigation-handler.js"
import { MarkdownEditor } from "./markdown-editor/markdown-editor.js"
import { MediaSelector } from "./media-selector/media-selector.js"
import { EditorEnhancements } from "./modules/editor-enhancements.js"
import { relatedPostsManager } from "./modules/related-posts-manager.js"

document.addEventListener("DOMContentLoaded", function () {
    // Get content type and item ID from URL
    const pathParts = window.location.pathname.split("/")
    const contentType = pathParts[2] // "posts" or "pages"
    const isEdit = pathParts[3] === "edit" && pathParts[4]
    const itemId = isEdit ? pathParts[4] : null

    // Get form elements
    const formElements = {
        title: document.getElementById("title"),
        subtitle: document.getElementById("subtitle"),
        slug: document.getElementById("slug"),
        content: document.getElementById("content"),
        excerpt: document.getElementById("excerpt"),
        author: document.getElementById("author"),
        status: document.getElementById("status"),
        publishDate: document.getElementById("publishDate"),
        seoDescription: document.getElementById("seoDescription"),
    }

    // Initialize all modules and connect them
    const editorState = new EditorState({
        contentType,
        isEdit,
        itemId,
    })

    // Make the editor state accessible globally for media-selector.js
    window.editorState = editorState

    // Create the media selector instance
    const mediaSelector = new MediaSelector()

    // Initialize the media selector
    mediaSelector.init()

    // Expose it to the global scope for debugging
    window.mediaSelector = mediaSelector

    // Initialize related posts manager
    relatedPostsManager.init()

    // Make it accessible globally for debugging, like mediaSelector
    window.relatedPostsManager = relatedPostsManager

    const slugManager = new SlugManager({
        titleInput: formElements.title,
        slugInput: formElements.slug,
    })

    // Initialize the enhanced Markdown editor
    let markdownEditor = null
    if (formElements.content) {
        markdownEditor = new MarkdownEditor({
            textarea: formElements.content,
            options: {
                autoResize: true,
                previewChangesIndicator: true,
                initialContent: formElements.content.value,
                onChange: (content) => {
                    // Update state when content changes
                    if (unsavedChangesHandler) {
                        unsavedChangesHandler.checkForChanges()
                    }
                },
            },
        })
    }

    const editorUI = new EditorUI({
        titleInput: formElements.title,
        subtitleInput: formElements.subtitle,
        slugInput: formElements.slug,
        contentTextarea: formElements.content,
        excerptTextarea: formElements.excerpt,
        authorInput: formElements.author,
        statusSelect: formElements.status,
        publishDateInput: formElements.publishDate,
        seoDescriptionTextarea: formElements.seoDescription,
        saveModal: document.getElementById("save-modal"),
        closeModalButton: document.querySelector(".close-modal"),
        closeModalBtn: document.getElementById("close-modal"),
        editorActions: document.querySelector(".editor-actions"),
        saveDraftButton: document.getElementById("save-draft"),
        publishButton: document.getElementById("publish"),
        updateButton: document.getElementById("update"),
        unpublishButton: document.getElementById("unpublish"),
        slugManager,
        validateContent,
        showValidationErrors,
        clearValidationErrors,
        formElements,
        markdownEditor, // Pass the markdown editor reference
        pageTypeSelect: document.getElementById("pageType"),
        parentPageSelect: document.getElementById("parentPage"),
    })

    // Initialize EditorEnhancements module
    const editorEnhancements = new EditorEnhancements()

    // Store it for future reference
    window.editorEnhancements = editorEnhancements

    // Initialize content service with validation
    const contentService = new ContentService({
        contentType,
        itemId,
        editorUI,
        editorState,
        validateContent,
        editorEnhancements, // Pass enhancements module
    })

    // Make ContentService globally accessible for navigation coordination
    window.contentService = contentService

    // Note: With the new Markdown editor, we don't need EditorToolbar from the original code
    // since that functionality is now handled by the MarkdownEditor class

    // Initialize unsaved changes handler
    const unsavedChangesHandler = new UnsavedChangesHandler({
        editorState,
        formElements,
    })

    // Initialize navigation handler with custom modal
    const navigationHandler = new NavigationHandler({
        unsavedChangesHandler,
    })

    // Connect modules with each other
    editorUI.setContentService(contentService)
    editorUI.setUnsavedChangesHandler(unsavedChangesHandler)

    // Initialize event listeners
    editorUI.initEventListeners()
    unsavedChangesHandler.initEventListeners()

    // Initialize navigation handler
    navigationHandler.init()

    // Update content service to handle form validation
    contentService.setValidationUtils({
        validateContent,
        showValidationErrors,
        clearValidationErrors,
        formElements,
    })

    // If editing an existing item, load the content and initialize state
    if (editorState.isEdit) {
        contentService.loadContent().then((loadedContent) => {
            // Ensure the featured image is properly initialized
            if (loadedContent && loadedContent.metadata && loadedContent.metadata.featuredImage) {
                editorState.setFeaturedImage(loadedContent.metadata.featuredImage)
            }
        })
    }

    // Add notification for custom pages
    const pageTypeSelect = document.getElementById("pageType")
    if (pageTypeSelect) {
        const showCustomPageInfo = () => {
            // Check if notification already exists
            let notification = document.getElementById("custom-page-notification")

            // If changing to custom page, show notification
            if (pageTypeSelect.value === "custom") {
                if (!notification) {
                    notification = document.createElement("div")
                    notification.id = "custom-page-notification"
                    notification.className = "notification info"
                    notification.innerHTML = `
                            <h4>About Custom Pages</h4>
                            <p>Custom pages use template files from your theme's "custom" directory.</p>
                            <p>This page will be accessible <strong>only</strong> at: <strong>/${
                                formElements.slug.value || "[slug]"
                            }</strong></p>
                            <p>Important: You must create a template file named <strong>${
                                formElements.slug.value || "[slug]"
                            }.html</strong> in your theme's custom directory.</p>
                            <div class="notification-notes">
                                <p>Note: If this is a special template page like "blog" or "categories", it will inherit the template's functionality.</p>
                                <p>Custom pages cannot be accessed via the standard <code>/page/[slug]</code> URL pattern.</p>
                            </div>
                            <button class="close-notification">×</button>
                        `

                    // Add to sidebar after the page type field
                    const sidebar = pageTypeSelect.closest(".sidebar-section")
                    if (sidebar) {
                        sidebar.appendChild(notification)

                        // Add event listener to close button
                        notification.querySelector(".close-notification").addEventListener("click", () => {
                            notification.remove()
                        })
                    }
                } else {
                    // Update the URL and filename in the notification
                    const urlElement = notification.querySelector("strong:nth-of-type(2)")
                    const fileElement = notification.querySelector("strong:last-of-type")

                    if (urlElement) {
                        urlElement.textContent = `/${formElements.slug.value || "[slug]"}`
                    }

                    if (fileElement) {
                        fileElement.textContent = `${formElements.slug.value || "[slug]"}.html`
                    }

                    // Make sure it's visible
                    notification.style.display = "block"
                }
            } else if (notification) {
                // Hide notification when switching back to normal page
                notification.style.display = "none"
            }
        }
        // Listen for changes to page type
        pageTypeSelect.addEventListener("change", showCustomPageInfo)

        // Check initial state
        if (pageTypeSelect.value === "custom") {
            // Delay to ensure form elements are fully initialized
            setTimeout(showCustomPageInfo, 100)
        }

        // Update notification when slug changes
        if (formElements.slug) {
            formElements.slug.addEventListener("input", () => {
                if (pageTypeSelect.value === "custom") {
                    showCustomPageInfo()
                }
            })
        }
    }
})
