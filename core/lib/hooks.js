/**
 * Hook System for extensibility
 * Provides actions (callbacks with no return) and filters (callbacks that transform values)
 */
export class HookSystem {
    constructor() {
        this.actions = {}
        this.filters = {}
    }

    /**
     * Add an action hook
     * @param {string} name - Hook name
     * @param {Function} callback - Callback function
     * @param {number} priority - Priority (lower runs first)
     */
    addAction(name, callback, priority = 10) {
        if (!this.actions[name]) {
            this.actions[name] = []
        }

        this.actions[name].push({ callback, priority })
        this.actions[name].sort((a, b) => a.priority - b.priority)

        return this // For chaining
    }

    /**
     * Execute all registered callbacks for an action
     * @param {string} name - Hook name
     * @param {...any} args - Arguments to pass to callbacks
     */
    doAction(name, ...args) {
        if (!this.actions[name]) {
            return
        }

        for (const hook of this.actions[name]) {
            hook.callback(...args)
        }
    }

    /**
     * Add a filter hook
     * @param {string} name - Hook name
     * @param {Function} callback - Callback function that returns modified value
     * @param {number} priority - Priority (lower runs first)
     */
    addFilter(name, callback, priority = 10) {
        if (!this.filters[name]) {
            this.filters[name] = []
        }

        this.filters[name].push({ callback, priority })
        this.filters[name].sort((a, b) => a.priority - b.priority)

        return this // For chaining
    }

    /**
     * Apply all registered callbacks for a filter
     * @param {string} name - Hook name
     * @param {any} value - Value to filter
     * @param {...any} args - Additional arguments to pass to callbacks
     * @returns {any} - The filtered value
     */
    applyFilters(name, value, ...args) {
        if (!this.filters[name]) {
            return value
        }

        let result = value

        for (const hook of this.filters[name]) {
            result = hook.callback(result, ...args)
        }

        return result
    }

    /**
     * Remove an action hook
     * @param {string} name - Hook name
     * @param {Function} callback - Callback function to remove
     */
    removeAction(name, callback) {
        if (!this.actions[name]) {
            return
        }

        this.actions[name] = this.actions[name].filter((hook) => hook.callback !== callback)
    }

    /**
     * Remove a filter hook
     * @param {string} name - Hook name
     * @param {Function} callback - Callback function to remove
     */
    removeFilter(name, callback) {
        if (!this.filters[name]) {
            return
        }

        this.filters[name] = this.filters[name].filter((hook) => hook.callback !== callback)
    }
}
