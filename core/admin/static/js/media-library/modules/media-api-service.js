/**
 * Media API Service Module
 * Handles all API interactions for the media library
 */
export class MediaApiService {
    /**
     * Get all media items (both images and documents)
     * @returns {Promise<Object>} API response data
     */
    async getMediaItems() {
        try {
            // Fetch images
            const imageResponse = await fetch("/api/media?type=image")
            const imageData = await imageResponse.json()

            // Fetch documents
            const documentResponse = await fetch("/api/media?type=document")
            const documentData = await documentResponse.json()

            // Combine the results
            let combinedData = []

            if (imageData.success && Array.isArray(imageData.data)) {
                combinedData = combinedData.concat(imageData.data)
            }

            if (documentData.success && Array.isArray(documentData.data)) {
                combinedData = combinedData.concat(documentData.data)
            }

            // Ensure each item has a type
            combinedData.forEach((item) => {
                if (!item.type) {
                    const filename = item.filename || ""
                    const ext = filename.split(".").pop().toLowerCase()
                    const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext)
                    item.type = isImage ? "image" : "document"
                }
            })

            return { success: true, data: combinedData }
        } catch (error) {
            console.error("Error fetching media:", error)
            return { success: false, error: "Failed to fetch media items" }
        }
    }

    /**
     * Upload a media file
     * @param {FormData} formData - Form data containing the file and metadata
     * @returns {Promise<Object>} API response data
     */
    async uploadMedia(formData) {
        try {
            // Log information about what we're uploading
            const file = formData.get("file")
            if (file) {
                // Determine if this is an image or document based on MIME type
                const isImage = file.type.startsWith("image/")

                // Add type to formData if not already present
                if (!formData.has("type")) {
                    formData.append("type", isImage ? "image" : "document")
                }
            }

            const response = await fetch("/api/media/upload", {
                method: "POST",
                body: formData,
            })

            const result = await response.json()

            if (result.success && result.data) {
                // Ensure the type property is correctly set
                if (!result.data.type) {
                    // Check if we can determine type from file extension or MIME type
                    const filename = result.data.filename || ""
                    const ext = filename.split(".").pop().toLowerCase()
                    const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp", "ico", "avif"].includes(ext)

                    result.data.type = isImage ? "image" : "document"
                }
            }

            return result
        } catch (error) {
            console.error("Upload error:", error)
            return { success: false, error: "Upload failed" }
        }
    }

    /**
     * Update a media item's metadata
     * @param {string} itemId - ID of the media item to update
     * @param {Object} updates - Object with properties to update
     * @returns {Promise<Object>} API response data
     */
    async updateMediaItem(itemId, updates) {
        try {
            // We need to know the type of this item
            // First, try to find it in the state
            const item = document.dispatchEvent(
                new CustomEvent("get-media-item", {
                    detail: {
                        itemId,
                        callback: (item) => {
                            return item
                        },
                    },
                })
            )

            let type = item?.type || "image" // Default to image if we can't determine

            const response = await fetch(`/api/media/${itemId}?type=${type}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updates),
            })

            return await response.json()
        } catch (error) {
            console.error("Error updating media:", error)
            return { success: false, error: "Update failed" }
        }
    }

    /**
     * Check if a media item has references in posts or pages
     * @param {string} itemId - ID of the media item to check
     * @returns {Promise<Object>} Object with reference information
     */
    async checkMediaReferences(itemId) {
        try {
            // Get the item to determine its type
            const item = document.dispatchEvent(
                new CustomEvent("get-media-item-sync", {
                    detail: { itemId },
                })
            )

            let type = item?.type || "image" // Default to image if we can't determine

            // Make a request to check references with detailed information
            // Use the /references endpoint which is specifically designed for this
            const response = await fetch(`/api/media/${itemId}/references?type=${type}&includeDetails=true`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            })

            const data = await response.json()

            if (data.success) {
                return {
                    success: true,
                    referenced: data.referenced || false,
                    references: data.references || [],
                    file: data.file,
                }
            }

            return { success: false, error: data.error || "Failed to check references" }
        } catch (error) {
            console.error("Error checking media references:", error)
            return { success: false, error: "Failed to check references" }
        }
    }

    /**
     * Delete media items
     * @param {Array} itemIds - Array of item IDs to delete
     * @returns {Promise<Array>} Array of API response data
     */
    async deleteMediaItems(itemIds, options = { cleanReferences: true }) {
        try {
            // For each item, we need to determine the type
            const deletePromises = itemIds.map((itemId) => {
                // Get the item to determine its type
                const item = document.dispatchEvent(
                    new CustomEvent("get-media-item-sync", {
                        detail: { itemId },
                    })
                )

                let type = item?.type || "image" // Default to image if we can't determine
                const cleanParam = options.cleanReferences ? "&clean=true" : ""

                return fetch(`/api/media/${itemId}?type=${type}${cleanParam}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: itemId,
                    }),
                }).then((response) => response.json())
            })

            const results = await Promise.all(deletePromises)

            return results
        } catch (error) {
            console.error("Error deleting media:", error)
            return itemIds.map(() => ({ success: false, error: "Delete failed" }))
        }
    }
}
