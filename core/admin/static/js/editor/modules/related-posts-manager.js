/**
 * RelatedPostsManager - Manages the selection and display of related posts
 * Optimized to store only IDs in frontmatter
 */
class RelatedPostsManager {
    constructor() {
        // DOM Elements
        this.relatedPostsContainer = document.getElementById("relatedPostsContainer")
        this.relatedPostsDropdown = document.getElementById("relatedPostsDropdown")
        this.relatedPostsList = document.getElementById("relatedPostsList")
        this.addRelatedPostBtn = document.getElementById("addRelatedPost")
        this.relatedPostsSearch = document.getElementById("relatedPostsSearch")
        this.relatedPostsDropdownList = document.getElementById("relatedPostsDropdownList")

        // State
        this.relatedPostIds = [] // Array of selected related post IDs (stored in frontmatter)
        this.relatedPosts = [] // Array of selected related posts with full details (for UI)
        this.availablePosts = [] // Array of all available posts
        this.maxRelatedPosts = 5 // Maximum number of related posts allowed
        this.isDropdownOpen = false
        this.isInitialized = false
    }

    /**
     * Initialize the related posts manager
     */
    init() {
        // Only initialize if we're on a post edit page and not already initialized
        if (!this.relatedPostsContainer || window.location.pathname.indexOf("/posts/") === -1 || this.isInitialized) {
            return
        }

        this.isInitialized = true

        // Load available posts
        this.loadAvailablePosts()

        // Initialize event listeners
        this.initEventListeners()

        // Load existing related posts if available
        this.loadExistingRelatedPosts()

        // Listen for content loaded event to get existing data
        document.addEventListener("editor:contentLoaded", (event) => {
            this.loadExistingRelatedPosts()
        })
    }

    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Toggle dropdown when clicking the add button
        if (this.addRelatedPostBtn) {
            this.addRelatedPostBtn.addEventListener("click", (e) => {
                this.toggleDropdown()
                e.stopPropagation() // Prevent immediate close
            })
        }

        // Handle search input
        if (this.relatedPostsSearch) {
            this.relatedPostsSearch.addEventListener("input", () => {
                this.filterAvailablePosts()
            })

            // Prevent dropdown from closing when clicking in search field
            this.relatedPostsSearch.addEventListener("click", (e) => {
                e.stopPropagation()
            })
        }

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (this.isDropdownOpen) {
                this.closeDropdown()
            }
        })

        // Prevent dropdown from closing when clicking inside it
        if (this.relatedPostsDropdown) {
            this.relatedPostsDropdown.addEventListener("click", (e) => {
                e.stopPropagation()
            })
        }
    }

    /**
     * Load all available posts to select from
     */
    async loadAvailablePosts() {
        try {
            // Get only specific frontmatter properties
            const response = await fetch(
                "/api/posts?status=published&limit=500&frontmatterOnly=true&properties=id,title,slug,featuredImage"
            )
            const data = await response.json()

            if (data.success) {
                // Store available posts with minimal needed data
                this.availablePosts = data.data.map((post) => {
                    // Handle potential differences in API response structure
                    const postData = post.frontmatter || post.metadata || post

                    return {
                        id: postData.id || post.id,
                        title: postData.title || post.title || "Untitled",
                        slug: postData.slug || post.slug || "",
                        featuredImage: postData.featuredImage || post.featuredImage,
                    }
                })

                // If we already have related post IDs loaded, populate their details
                if (this.relatedPostIds.length > 0) {
                    this.populateRelatedPostsFromIds()
                }

                // Populate dropdown options
                this.populateDropdownOptions()
            } else {
                console.error("Error loading posts:", data.error)
            }
        } catch (error) {
            console.error("Error loading available posts:", error)
        }
    }

    /**
     * Populate dropdown with available posts
     * @param {string} [filter=''] - Optional search filter
     */
    populateDropdownOptions(filter = "") {
        if (!this.relatedPostsDropdownList) {
            console.error("Dropdown list element not found!")
            // Try to find it again, it might have been added dynamically
            this.relatedPostsDropdownList = document.getElementById("relatedPostsDropdownList")

            if (!this.relatedPostsDropdownList) {
                console.error("Still could not find the dropdown list element")
                return
            }
        }

        // Clear current options
        this.relatedPostsDropdownList.innerHTML = ""

        // Get current post ID to exclude from list
        const currentPostId = this.getCurrentPostId()

        // Filter posts by search term and exclude already selected posts and current post
        const filteredPosts = this.availablePosts.filter((post) => {
            // Skip current post and already selected posts
            if (post.id === currentPostId || this.relatedPostIds.includes(post.id)) {
                return false
            }

            // Apply search filter if provided
            if (filter) {
                return post.title.toLowerCase().includes(filter.toLowerCase())
            }

            return true
        })

        // Check if we've reached maximum
        const reachedMaximum = this.relatedPostIds.length >= this.maxRelatedPosts

        if (reachedMaximum) {
            // Show maximum reached message
            const maxMessage = document.createElement("div")
            maxMessage.className = "dropdown-max-reached"
            maxMessage.textContent = `Maximum of ${this.maxRelatedPosts} related posts selected`
            this.relatedPostsDropdownList.appendChild(maxMessage)
            return
        }

        if (filteredPosts.length === 0) {
            // Show no results message
            const noResults = document.createElement("div")
            noResults.className = "dropdown-no-results"
            noResults.textContent = filter ? "No matching posts found" : "No available posts to select"
            this.relatedPostsDropdownList.appendChild(noResults)
            return
        }

        // Add each filtered post as an option
        filteredPosts.forEach((post) => {
            const option = document.createElement("div")
            option.className = "dropdown-option"
            option.setAttribute("data-id", post.id)

            // Create option content with thumbnail if available
            let optionContent = ""
            if (post.featuredImage && post.featuredImage.url) {
                optionContent += `<div class="option-thumbnail">
                    <img src="/content/uploads${post.featuredImage.url}" alt="${post.title}">
                </div>`
            }

            optionContent += `<div class="option-text">${post.title}</div>`
            option.innerHTML = optionContent

            // Add click handler to select this post
            option.addEventListener("click", () => {
                this.addRelatedPost(post)
                this.closeDropdown()
            })

            this.relatedPostsDropdownList.appendChild(option)
        })
    }

    /**
     * Filter available posts based on search term
     */
    filterAvailablePosts() {
        if (!this.relatedPostsSearch) return

        const searchTerm = this.relatedPostsSearch.value.trim()
        this.populateDropdownOptions(searchTerm)
    }

    /**
     * Toggle the dropdown visibility
     */
    toggleDropdown() {
        if (!this.relatedPostsDropdown) return

        if (this.isDropdownOpen) {
            this.closeDropdown()
        } else {
            this.openDropdown()
        }
    }

    /**
     * Open the dropdown
     */
    openDropdown() {
        if (!this.relatedPostsDropdown) return

        this.relatedPostsDropdown.classList.add("open")
        this.isDropdownOpen = true

        // Focus search input
        if (this.relatedPostsSearch) {
            this.relatedPostsSearch.focus()
        }

        // Reset any search filter
        if (this.relatedPostsSearch) {
            this.relatedPostsSearch.value = ""
        }

        // Refresh dropdown options
        this.populateDropdownOptions()
    }

    /**
     * Close the dropdown
     */
    closeDropdown() {
        if (!this.relatedPostsDropdown) return

        this.relatedPostsDropdown.classList.remove("open")
        this.isDropdownOpen = false
    }

    /**
     * Add a related post to the selection
     * @param {Object} post - Post to add
     */
    addRelatedPost(post) {
        // Skip if already selected or we've reached maximum
        if (this.relatedPostIds.includes(post.id) || this.relatedPostIds.length >= this.maxRelatedPosts) {
            return
        }

        // Add to related posts arrays
        this.relatedPostIds.push(post.id)
        this.relatedPosts.push({
            id: post.id,
            title: post.title,
            slug: post.slug,
            featuredImage: post.featuredImage,
        })

        // Update UI
        this.renderRelatedPosts()

        // Mark editor as dirty (unsaved changes)
        this.markEditorDirty()
    }

    /**
     * Remove a related post from the selection
     * @param {string} postId - ID of the post to remove
     */
    removeRelatedPost(postId) {
        // Filter out the post to remove from both arrays
        this.relatedPostIds = this.relatedPostIds.filter((id) => id !== postId)
        this.relatedPosts = this.relatedPosts.filter((post) => post.id !== postId)

        // Update UI
        this.renderRelatedPosts()

        // Mark editor as dirty (unsaved changes)
        this.markEditorDirty()
    }

    /**
     * Render the list of selected related posts
     */
    renderRelatedPosts() {
        if (!this.relatedPostsList) return

        // Clear current list
        this.relatedPostsList.innerHTML = ""

        // Add each selected post
        if (this.relatedPosts.length > 0) {
            this.relatedPosts.forEach((post) => {
                const postElement = document.createElement("div")
                postElement.className = "related-post-item"

                // Create post content with thumbnail if available
                let postContent = ""
                if (post.featuredImage && post.featuredImage.url) {
                    postContent += `<div class="post-thumbnail">
                        <img src="/content/uploads${post.featuredImage.url}" alt="${post.title}">
                    </div>`
                }

                postContent += `
                    <div class="post-details">
                        <span class="post-title">${post.title}</span>
                    </div>
                    <button type="button" class="post-remove" title="Remove related post">×</button>
                `

                postElement.innerHTML = postContent

                // Add remove handler
                postElement.querySelector(".post-remove").addEventListener("click", () => {
                    this.removeRelatedPost(post.id)
                })

                this.relatedPostsList.appendChild(postElement)
            })

            // Add counter
            const counter = document.createElement("div")
            counter.className = "related-posts-counter"
            counter.textContent = `${this.relatedPosts.length}/${this.maxRelatedPosts} selected`
            this.relatedPostsList.appendChild(counter)
        } else {
            // If no related posts, show a placeholder
            this.relatedPostsList.innerHTML = '<p class="related-posts-placeholder">No related posts selected</p>'
        }

        // Update the add button state
        if (this.addRelatedPostBtn) {
            if (this.relatedPosts.length >= this.maxRelatedPosts) {
                this.addRelatedPostBtn.disabled = true
                this.addRelatedPostBtn.title = `Maximum of ${this.maxRelatedPosts} related posts reached`
            } else {
                this.addRelatedPostBtn.disabled = false
                this.addRelatedPostBtn.title = "Add related post"
            }
        }
    }

    /**
     * Populate related posts array from IDs
     * This fills in the details for each ID using the available posts
     */
    populateRelatedPostsFromIds() {
        // Clear current related posts array
        this.relatedPosts = []

        // For each ID, find the corresponding post details and add to relatedPosts
        this.relatedPostIds.forEach((id) => {
            const post = this.availablePosts.find((p) => p.id === id)
            if (post) {
                this.relatedPosts.push({
                    id: post.id,
                    title: post.title,
                    slug: post.slug,
                    featuredImage: post.featuredImage,
                })
            }
        })

        // Update UI with the populated data
        this.renderRelatedPosts()
    }

    /**
     * Load existing related posts from editor state
     */
    loadExistingRelatedPosts() {
        // Get editor state to access content data
        if (!window.editorState) return

        const frontmatter = this.getFrontmatterFromEditorState()

        if (frontmatter && frontmatter.relatedPosts) {
            // Extract the IDs from relatedPosts value
            // If it's already an array of IDs, use it directly
            // If it's an array of objects, extract the IDs
            if (Array.isArray(frontmatter.relatedPosts)) {
                if (frontmatter.relatedPosts.length > 0) {
                    if (typeof frontmatter.relatedPosts[0] === "string") {
                        // It's already an array of IDs
                        this.relatedPostIds = [...frontmatter.relatedPosts]
                    } else if (typeof frontmatter.relatedPosts[0] === "object") {
                        // It's an array of objects, extract IDs
                        this.relatedPostIds = frontmatter.relatedPosts.map((post) => post.id)
                    }
                }
            } else if (typeof frontmatter.relatedPosts === "string") {
                // If it's a comma-separated string
                this.relatedPostIds = frontmatter.relatedPosts.split(",").map((id) => id.trim())
            }

            // If we already have available posts loaded, populate the details
            if (this.availablePosts.length > 0) {
                this.populateRelatedPostsFromIds()
            }
        }
    }

    /**
     * Get frontmatter from editor state
     * @returns {Object|null} Frontmatter or null if not found
     */
    getFrontmatterFromEditorState() {
        if (!window.editorState) return null

        // Check if there's original data in the editor state
        if (window.editorState.originalData && window.editorState.originalData.metadata) {
            return window.editorState.originalData.metadata
        }

        // Check if there's current data in the editor state
        if (window.editorState.currentData && window.editorState.currentData.metadata) {
            return window.editorState.currentData.metadata
        }

        return null
    }

    /**
     * Get the current post ID from the URL
     * @returns {string|null} Current post ID or null if not found
     */
    getCurrentPostId() {
        // Extract the ID from URL pattern /admin/posts/edit/ID
        const matches = window.location.pathname.match(/\/admin\/posts\/edit\/([^\/]+)/)
        return matches && matches[1] ? matches[1] : null
    }

    /**
     * Mark the editor as having unsaved changes
     */
    markEditorDirty() {
        // Use the existing unsaved changes handler if available
        if (window.editorState) {
            if (typeof window.editorState.markDirty === "function") {
                window.editorState.markDirty()
            } else if (window.editorState.isDirty !== undefined) {
                window.editorState.isDirty = true
            }
        }

        // Also notify any unsaved changes handler
        const event = new Event("input", { bubbles: true })
        document.getElementById("content")?.dispatchEvent(event)
    }

    /**
     * Get current values for form submission
     * @returns {Object} Current values with only IDs for related posts
     */
    getCurrentValues() {
        return {
            relatedPosts: this.relatedPostIds.length > 0 ? this.relatedPostIds : null,
        }
    }
}

// Create and export a singleton instance
export const relatedPostsManager = new RelatedPostsManager()
