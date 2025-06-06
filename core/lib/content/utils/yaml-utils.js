/**
 * Serializes a JavaScript object into YAML frontmatter format with proper indentation.
 * Handles nested objects, arrays, dates, and primitive values.
 * Ensures IDs and numeric strings remain as strings in the output.
 *
 * @param {Object} obj - The object to serialize into YAML format
 * @param {string} indent - The current level of indentation (used for recursion)
 * @returns {string} - The serialized YAML string
 */
export function serializeFrontmatter(obj, indent = "") {
    let result = ""

    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
            continue
        }

        // Handle different types of values
        if (typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
            // Nested object
            result += `${indent}${key}:\n`
            result += serializeFrontmatter(value, indent + "  ")
        } else if (Array.isArray(value)) {
            // Array handling
            if (value.length === 0) {
                result += `${indent}${key}: []\n`
            } else if (value.every((item) => typeof item !== "object")) {
                // Simple array of primitives
                const formattedValues = value
                    .map((item) => {
                        if (typeof item === "string") {
                            return `"${item.replace(/"/g, '\\"')}"`
                        }
                        return item
                    })
                    .join(", ")
                result += `${indent}${key}: [${formattedValues}]\n`
            } else {
                // Complex array with objects
                result += `${indent}${key}:\n`
                value.forEach((item) => {
                    if (typeof item === "object") {
                        result += `${indent}- \n`
                        result += serializeFrontmatter(item, indent + "  ")
                    } else {
                        result += `${indent}- ${item}\n`
                    }
                })
            }
        } else if (value instanceof Date) {
            // Date objects
            result += `${indent}${key}: ${value.toISOString()}\n`
        } else if (typeof value === "string") {
            // Special handling for ID field and numeric strings
            if (key === "id" || (value.match(/^\d+$/) && !isNaN(value))) {
                // Force quotes for id and numeric strings to preserve string type
                result += `${indent}${key}: "${value}"\n`
            } else {
                // Regular string handling with quoting as needed
                const needsQuotes = value.includes("\n") || value.includes(":") || value.includes("#") || value === ""
                const formattedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value
                result += `${indent}${key}: ${formattedValue}\n`
            }
        } else {
            // Numbers, booleans, etc.
            result += `${indent}${key}: ${value}\n`
        }
    }

    return result
}
