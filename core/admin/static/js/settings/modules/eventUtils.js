/**
 * Event Utilities Module
 * Provides utilities for event handling, particularly for dynamically created elements
 */

/**
 * Add an event listener using event delegation
 * This allows handling events for elements that may be added to the DOM after the initial page load
 *
 * @param {string} eventType - The event type to listen for (e.g., 'click')
 * @param {string} selector - CSS selector to match the target elements
 * @param {Function} callback - The event handler function
 * @param {HTMLElement} [parent=document] - The parent element to attach the event listener to
 */
export function delegateEvent(eventType, selector, callback, parent = document) {
    parent.addEventListener(eventType, function (event) {
        // Find all elements that match the selector
        const matches = parent.querySelectorAll(selector)

        // Check if the event target or any of its parents match the selector
        let target = event.target
        while (target && target !== parent) {
            for (let i = 0; i < matches.length; i++) {
                if (matches[i] === target) {
                    // Call the callback with the matching element as 'this'
                    callback.call(target, event)
                    return
                }
            }
            target = target.parentElement
        }
    })
}

/**
 * Remove event listeners from a collection of elements
 * @param {NodeList|Array} elements - Collection of elements
 * @param {string} eventType - The event type to remove
 * @param {Function} handler - The event handler function to remove
 */
export function removeEventListeners(elements, eventType, handler) {
    elements.forEach((element) => {
        element.removeEventListener(eventType, handler)
    })
}

/**
 * Clone and replace elements to remove all event listeners
 * @param {NodeList|Array} elements - Collection of elements to clone and replace
 */
export function cloneAndReplaceElements(elements) {
    elements.forEach((element) => {
        const clone = element.cloneNode(true)
        element.parentNode.replaceChild(clone, element)
    })
}
