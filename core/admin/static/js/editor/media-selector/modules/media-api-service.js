/**
 * Media Service
 * Handles API interactions for media items
 */
class MediaService {
    /**
     * Load media items from the API
     * @returns {Promise<Array>} Array of media items
     */
    async getMediaItems() {
        try {
            const response = await fetch("/api/media")
            const data = await response.json()

            if (data.success) {
                return data.data
            }
            throw new Error(data.error || "Failed to load media")
        } catch (error) {
            console.error("Error fetching media:", error)
            throw error
        }
    }
}

// Export a singleton instance
export const mediaService = new MediaService()
