import { readFileSync } from "fs"
import { resolve } from "path"
import { URL } from "url"

// Constants for validation rules
const REQUIRED_FIELDS = [
    "title",
    "description",
    "version",
    "author",
    "authorUrl",
    "tags",
    "license",
    "features",
    "screenshot",
]

const OPTIONAL_FIELDS = ["colors"]

const ALLOWED_SCREENSHOT_FORMATS = ["jpg", "jpeg", "png", "webp", "avif", "svg"]
const REQUIRED_LICENSE = "GPL-3.0-or-later"
const VERSION_REGEX = /^\d+\.\d+\.\d+$/

/**
 * Reads and parses a JSON file from the given path
 * @param {string} filePath - The path to the JSON file
 * @returns {Object} - Returns an object with either success and data or error message
 */
function readAndParseJSON(filePath) {
    try {
        const absolutePath = resolve(filePath)
        const content = readFileSync(absolutePath, "utf-8")
        return { success: true, data: JSON.parse(content) }
    } catch (e) {
        return { success: false, error: `Failed to read or parse file: ${e.message}` }
    }
}

/**
 * Checks for missing required fields in the theme object.
 * @param {Object} theme - The theme object to check for missing fields
 * @returns {string[]} - Returns an array of error messages for missing fields
 */
function checkMissingFields(theme) {
    return REQUIRED_FIELDS.filter((field) => !(field in theme)).map((field) => `Missing required field: "${field}"`)
}

/**
 * Validates individual fields according to their specific rules
 * @param {string} field - The name of the field to validate
 * @param {*} value - The value of the field to validate
 * @returns {string[]} - Returns an array of error messages for invalid fields
 */
function validateField(field, value) {
    const errors = []

    switch (field) {
        case "title":
        case "description":
        case "author":
            if (typeof value !== "string" || value.trim() === "") {
                errors.push(`${field} must be a non-empty string.`)
            }
            break

        case "version":
            if (typeof value !== "string" || !VERSION_REGEX.test(value)) {
                errors.push("version must be in X.Y.Z format where X, Y, Z are numbers.")
            }
            break

        case "authorUrl":
            if (typeof value !== "string") {
                errors.push("authorUrl must be a string.")
            } else if (value.trim() !== "") {
                try {
                    const url = new URL(value)
                    if (url.protocol !== "https:") {
                        errors.push("authorUrl must start with 'https://'.")
                    }
                } catch {
                    errors.push("authorUrl must be a valid HTTPS URL.")
                }
            }
            break

        case "tags":
        case "features":
            if (!Array.isArray(value)) {
                errors.push(`${field} must be an array.`)
            } else if (!value.every((item) => typeof item === "string")) {
                errors.push(`${field} array must contain only strings.`)
            }
            break

        case "license":
            if (value !== REQUIRED_LICENSE) {
                errors.push(`license must be '${REQUIRED_LICENSE}'.`)
            }
            break

        case "screenshot":
            if (typeof value !== "string") {
                errors.push("screenshot must be a string.")
            } else if (value.trim() !== "") {
                const extension = value.split(".").pop()?.toLowerCase()
                if (!extension || !ALLOWED_SCREENSHOT_FORMATS.includes(extension)) {
                    errors.push(
                        `screenshot must be one of: ${ALLOWED_SCREENSHOT_FORMATS.map((f) => `screenshot.${f}`).join(
                            ", "
                        )}.`
                    )
                }
            }
            break

        case "colors":
            if (value && !Array.isArray(value)) {
                errors.push("colors must be an array.")
            } else if (value && !value.every((item) => typeof item === "string")) {
                errors.push("colors array must contain only strings.")
            }
            break
    }

    return errors
}

/**
 * Validates a theme.json file by path.
 * Reads the file, parses it as JSON, and checks if it meets the expected structure and constraints.
 * @param {string} filePath - The path to the JSON file
 * @returns {Object} - Returns an object with a boolean 'valid' and an array of 'errors'
 */
export function validateThemeJSON(filePath) {
    const errors = []

    // Step 1: Read and parse the file
    const { success, data: theme, error } = readAndParseJSON(filePath)
    if (!success || !theme) {
        return { valid: false, errors: [error] }
    }

    // Step 2: Check for missing required fields
    errors.push(...checkMissingFields(theme))

    // If there are missing required fields, stop further validation
    if (errors.length > 0) {
        return { valid: false, errors }
    }

    // Step 3: Validate each required field
    REQUIRED_FIELDS.forEach((field) => errors.push(...validateField(field, theme[field])))

    // Step 4: Validate optional fields (e.g., "colors")
    OPTIONAL_FIELDS.forEach((field) => {
        if (field in theme) errors.push(...validateField(field, theme[field]))
    })

    // Final result
    return {
        valid: errors.length === 0,
        errors,
    }
}
