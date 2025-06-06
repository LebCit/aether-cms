/**
 * Main FileStorage class that coordinates all file storage operations
 */
import { FileManager } from "./modules/file-manager.js"
import { MetadataManager } from "./modules/metadata-manager.js"
import { ImageHandler } from "./modules/image-handler.js"
import { DocumentHandler } from "./modules/document-handler.js"
import { MediaReferenceManager } from "./modules/media-reference-manager.js"

/**
 * Manages file uploads and storage
 */
export class FileStorage {
    /**
     * @param {string} uploadsDir - Directory for storing uploaded files
     */
    constructor(uploadsDir) {
        this.uploadsDir = uploadsDir

        // Initialize managers and handlers
        this.fileManager = new FileManager(uploadsDir)
        this.metadataManager = new MetadataManager(uploadsDir)
        this.imageHandler = new ImageHandler(this.fileManager, this.metadataManager, uploadsDir)
        this.documentHandler = new DocumentHandler(this.fileManager, this.metadataManager, uploadsDir)
        this.referenceManager = new MediaReferenceManager(this)

        // Initialize the storage
        this.initialize()
    }

    /**
     * Initialize the file storage system
     */
    async initialize() {
        try {
            await this.fileManager.initialize()
        } catch (error) {
            console.error("Error initializing file storage:", error)
        }
    }

    /**
     * Save an uploaded file
     * @param {Object} fileData - The file data (Buffer or string)
     * @param {string} filename - Original filename
     * @param {string} type - File type (image or document)
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Saved file information
     */
    async saveFile(fileData, filename, type = "image", metadata = {}) {
        try {
            if (type === "image") {
                return await this.imageHandler.saveImage(fileData, filename, metadata)
            } else {
                return await this.documentHandler.saveDocument(fileData, filename, metadata)
            }
        } catch (error) {
            console.error(`Error saving ${type}:`, error)
            throw new Error(`Failed to save file: ${error.message}`)
        }
    }

    /**
     * Get a list of all uploaded files
     * @param {string} type - File type (image or document)
     * @returns {Array} Array of file information
     */
    async getFiles(type = "image") {
        try {
            if (type === "image") {
                return await this.imageHandler.getImages()
            } else {
                return await this.documentHandler.getDocuments()
            }
        } catch (error) {
            console.error(`Error getting ${type} files:`, error)
            return []
        }
    }

    /**
     * Get a stream for a specific file
     * @param {string} filename - The filename
     * @param {string} type - File type (image or document)
     * @returns {ReadStream} Stream for the file
     */
    getFileStream(filename, type = "image") {
        if (type === "image") {
            return this.imageHandler.getImageStream(filename)
        } else {
            return this.documentHandler.getDocumentStream(filename)
        }
    }

    /**
     * Delete a file
     * @param {string} filename - The filename
     * @param {string} type - File type (image or document)
     * @returns {boolean} Success or failure
     */
    async deleteFile(filename, type = "image") {
        try {
            if (type === "image") {
                return await this.imageHandler.deleteImage(filename)
            } else {
                return await this.documentHandler.deleteDocument(filename)
            }
        } catch (error) {
            console.error(`Error deleting ${type} file:`, error)
            return false
        }
    }

    /**
     * Get a file by its ID
     * @param {string} id - The file ID
     * @returns {Object|null} File information or null if not found
     */
    async getFileById(id) {
        try {
            // Check images first
            const images = await this.getFiles("image")
            let file = images.find((img) => img.id === id)

            if (file) return file

            // Check documents if not found in images
            const documents = await this.getFiles("document")
            file = documents.find((doc) => doc.id === id)

            return file || null
        } catch (error) {
            console.error("Error getting file by ID:", error)
            return null
        }
    }

    /**
     * Update a file's metadata
     * @param {string} id - The file ID
     * @param {Object} metadata - The metadata to update
     * @returns {Object|null} Updated file information or null if not found
     */
    async updateFile(id, metadata) {
        try {
            // First, get the file
            const file = await this.getFileById(id)
            if (!file) return null

            // Update the file based on its type
            if (file.type === "image") {
                return await this.imageHandler.updateImage(file.filename, metadata)
            } else {
                return await this.documentHandler.updateDocument(file.filename, metadata)
            }
        } catch (error) {
            console.error("Error updating file:", error)
            return null
        }
    }

    /**
     * Delete a file by its ID
     * @param {string} id - The file ID to delete
     * @returns {boolean} Success or failure
     */
    async deleteFileById(id) {
        try {
            // First, get the file
            const file = await this.getFileById(id)
            if (!file) return false

            // Delete the file based on its type
            return await this.deleteFile(file.filename, file.type)
        } catch (error) {
            console.error("Error deleting file by ID:", error)
            return false
        }
    }

    /**
     * Check if a media file is referenced in posts or pages
     * @param {string} id - The file ID to check
     * @param {Object} contentManager - The ContentManager instance
     * @returns {Promise<Object>} - Result with referenced flag and list of references
     */
    async checkMediaReferences(id, contentManager) {
        return this.referenceManager.checkMediaReferences(id, contentManager)
    }

    /**
     * Clean references to media in posts/pages
     * @param {string} id - The file ID to clean references for
     * @param {Object} contentManager - The ContentManager instance
     * @returns {Promise<Object>} - Result of the cleaning operation
     */
    async cleanMediaReferences(id, contentManager) {
        return this.referenceManager.cleanMediaReferences(id, contentManager)
    }

    /**
     * Update metadata in content references
     * @param {string} id - The file ID to update references for
     * @param {Object} updates - Object containing metadata changes
     * @param {string} updates.oldAlt - Previous alt text
     * @param {string} updates.newAlt - New alt text
     * @param {string} updates.oldCaption - Previous caption
     * @param {string} updates.newCaption - New caption
     * @param {Object} contentManager - The ContentManager instance
     * @returns {Promise<Object>} - Result of the operation
     */
    async updateMetadataInReferences(id, updates, contentManager) {
        return this.referenceManager.updateMetadataInReferences(id, updates, contentManager)
    }
}
