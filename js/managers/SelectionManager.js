/**
 * SelectionManager - Unified selection system for bubbles and text elements
 */
class SelectionManager {
    constructor() {
        // Core selection tracking
        this.selectedElements = new Map(); // element -> {type, data, element}
        this.elementRegistry = new Map(); // element -> {type, data}
        
        // Event callbacks
        this.onSelectionChange = null;
        
        // Setup global event listeners
        this.setupEventListeners();
    }
    
    /**
     * Register an element for selection tracking
     * @param {HTMLElement} element - The DOM element
     * @param {string} type - 'bubble' or 'text'
     * @param {Object} data - Associated data object
     */
    registerElement(element, type, data) {
        if (!element || !type) return false;
        
        this.elementRegistry.set(element, { type, data });
        
        // Add click handler for selection
        element.addEventListener('click', (e) => {
            this.handleElementClick(element, e);
        });
        
        return true;
    }
    
    /**
     * Handle element click for selection
     * @param {HTMLElement} element - Clicked element
     * @param {Event} event - Click event
     */
    handleElementClick(element, event) {
        // Don't select if clicking on handles or controls
        if (event.target.classList.contains('resize-handle') || 
            event.target.classList.contains('rotation-handle') ||
            event.target.classList.contains('control-point-handle')) {
            return;
        }
        
        event.stopPropagation();
        
        const elementInfo = this.elementRegistry.get(element);
        if (!elementInfo) return;
        
        // Multi-selection with Shift key
        if (event.shiftKey) {
            this.toggleSelection(element, elementInfo.type, elementInfo.data);
        } else {
            // Single selection - clear others first
            this.clearSelection();
            this.addToSelection(element, elementInfo.type, elementInfo.data);
        }
    }
    
    /**
     * Add element to selection
     * @param {HTMLElement} element 
     * @param {string} type 
     * @param {Object} data 
     */
    addToSelection(element, type, data) {
        if (!element) return false;
        
        const selectionItem = { element, type, data };
        this.selectedElements.set(element, selectionItem);
        
        // Apply visual selection
        this.highlightElement(element, type);
        
        // Notify UI of selection change
        this.notifySelectionChange();
        
        return true;
    }
    
    /**
     * Remove element from selection
     * @param {HTMLElement} element 
     */
    removeFromSelection(element) {
        if (!this.selectedElements.has(element)) return false;
        
        const selectionItem = this.selectedElements.get(element);
        this.selectedElements.delete(element);
        
        // Remove visual selection
        this.unhighlightElement(element, selectionItem.type);
        
        // Notify UI of selection change
        this.notifySelectionChange();
        
        return true;
    }
    
    /**
     * Toggle element selection state
     * @param {HTMLElement} element 
     * @param {string} type 
     * @param {Object} data 
     */
    toggleSelection(element, type, data) {
        if (this.isSelected(element)) {
            this.removeFromSelection(element);
        } else {
            this.addToSelection(element, type, data);
        }
    }
    
    /**
     * Clear all selections
     */
    clearSelection() {
        // Remove visual highlighting from all selected elements
        this.selectedElements.forEach((selectionItem, element) => {
            this.unhighlightElement(element, selectionItem.type);
        });
        
        this.selectedElements.clear();
        this.notifySelectionChange();
    }
    
    /**
     * Check if element is selected
     * @param {HTMLElement} element 
     * @returns {boolean}
     */
    isSelected(element) {
        return this.selectedElements.has(element);
    }
    
    /**
     * Get all selected elements
     * @returns {Map}
     */
    getSelectedElements() {
        return this.selectedElements;
    }
    
    /**
     * Get selected elements by type
     * @param {string} type - 'bubble' or 'text'
     * @returns {Array}
     */
    getSelectedByType(type) {
        const results = [];
        this.selectedElements.forEach((selectionItem) => {
            if (selectionItem.type === type) {
                results.push(selectionItem);
            }
        });
        return results;
    }
    
    /**
     * Get selection count
     * @returns {number}
     */
    getSelectionCount() {
        return this.selectedElements.size;
    }
    
    /**
     * Check if any elements are selected
     * @returns {boolean}
     */
    hasSelection() {
        return this.selectedElements.size > 0;
    }
    
    /**
     * Apply visual highlighting to selected element
     * @param {HTMLElement} element 
     * @param {string} type 
     */
    highlightElement(element, type) {
        element.classList.add('selected');
        
        // Type-specific highlighting
        if (type === 'bubble') {
            // For bubbles, use the existing bubble manager selection system
            if (window.editor?.appCoordinator) {
                const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
                if (bubbleManager) {
                    bubbleManager.selectBubble(element);
                }
            }
        } else if (type === 'text') {
            // Text element highlighting
            element.style.borderColor = '#2196F3';
            element.style.background = 'rgba(33, 150, 243, 0.1)';
        }
    }
    
    /**
     * Remove visual highlighting from element
     * @param {HTMLElement} element 
     * @param {string} type 
     */
    unhighlightElement(element, type) {
        element.classList.remove('selected');
        
        // Type-specific unhighlighting
        if (type === 'bubble') {
            // For bubbles, use the existing bubble manager deselection system
            if (window.editor?.appCoordinator) {
                const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
                if (bubbleManager && bubbleManager.getSelectedBubble() === element) {
                    bubbleManager.deselectBubble();
                }
            }
        } else if (type === 'text') {
            element.style.borderColor = '';
            element.style.background = '';
        }
    }
    
    /**
     * Link selected text to selected bubble
     */
    linkSelected() {
        const selectedTexts = this.getSelectedByType('text');
        const selectedBubbles = this.getSelectedByType('bubble');
        
        if (selectedTexts.length === 0 || selectedBubbles.length === 0) {
            console.warn('Cannot link: need both text and bubble selected');
            return false;
        }
        
        // Use first selected bubble for linking
        const targetBubble = selectedBubbles[0];
        
        // Link all selected text elements to the bubble
        selectedTexts.forEach(textItem => {
            if (window.editor?.textElementManager) {
                window.editor.textElementManager.linkTextToBubble(
                    textItem.element, 
                    targetBubble.element
                );
            }
        });
        
        this.notifySelectionChange();
        return true;
    }
    
    /**
     * Unlink selected text elements
     */
    unlinkSelected() {
        const selectedTexts = this.getSelectedByType('text');
        
        selectedTexts.forEach(textItem => {
            if (window.editor?.textElementManager) {
                window.editor.textElementManager.unlinkTextFromBubble(textItem.element);
            }
        });
        
        this.notifySelectionChange();
        return true;
    }
    
    /**
     * Copy all selected elements
     */
    copySelected() {
        const selectedBubbles = this.getSelectedByType('bubble');
        const selectedTexts = this.getSelectedByType('text');
        
        const copiedElements = [];
        
        // Copy bubbles through main editor
        if (selectedBubbles.length > 0 && window.editor) {
            const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
            if (bubbleManager) {
                selectedBubbles.forEach(item => {
                    const newBubble = bubbleManager.copyBubble(item.element);
                    if (newBubble) {
                        // Register the copied bubble
                        this.registerElement(newBubble.element, 'bubble', newBubble);
                        copiedElements.push({element: newBubble.element, type: 'bubble', data: newBubble});
                    }
                });
            }
        }
        
        // Copy text elements
        selectedTexts.forEach(item => {
            if (window.editor?.textElementManager) {
                const newTextElement = window.editor.textElementManager.copyTextElement(item.element);
                if (newTextElement) {
                    const newTextData = window.editor.textElementManager.getTextDataByElement(newTextElement);
                    if (newTextData) {
                        copiedElements.push({element: newTextElement, type: 'text', data: newTextData});
                    }
                }
            }
        });
        
        // Select the copied elements
        if (copiedElements.length > 0) {
            this.clearSelection();
            copiedElements.forEach(item => {
                this.addToSelection(item.element, item.type, item.data);
            });
        }
    }
    
    /**
     * Delete all selected elements
     */
    deleteSelected() {
        const selectedBubbles = this.getSelectedByType('bubble');
        const selectedTexts = this.getSelectedByType('text');
        
        // Store elements to delete to avoid modifying during iteration
        const elementsToDelete = [...this.selectedElements.keys()];
        
        // Clear selection first to avoid UI conflicts
        this.clearSelection();
        
        // Delete bubbles through main editor
        if (selectedBubbles.length > 0 && window.editor) {
            selectedBubbles.forEach(item => {
                // Handle linked text
                if (window.editor.textElementManager) {
                    window.editor.textElementManager.handleBubbleDelete(item.data.id);
                }
                // Delete the bubble
                const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
                if (bubbleManager) {
                    bubbleManager.deleteBubble(item.element);
                }
                // Clean up from selection manager
                this.cleanup(item.element);
            });
        }
        
        // Delete text elements
        selectedTexts.forEach(item => {
            if (window.editor?.textElementManager) {
                window.editor.textElementManager.deleteTextElement(item.element);
            }
            // Clean up from selection manager
            this.cleanup(item.element);
        });
    }
    
    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Clear selection when clicking on canvas background
        document.addEventListener('click', (e) => {
            const canvasContainer = document.getElementById('canvas-container');
            const backgroundImage = document.getElementById('background-image');
            
            if (e.target === canvasContainer || e.target === backgroundImage) {
                this.clearSelection();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event 
     */
    handleKeyboardShortcuts(event) {
        // Don't handle shortcuts if user is typing
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }
        
        // Ctrl+A - Select all
        if (event.ctrlKey && event.key === 'a') {
            event.preventDefault();
            this.selectAll();
        }
        
        // Delete key - Delete selected
        if (event.key === 'Delete' && this.hasSelection()) {
            event.preventDefault();
            this.deleteSelected();
        }
        
        // Ctrl+D - Copy selected
        if (event.ctrlKey && event.key === 'd' && this.hasSelection()) {
            event.preventDefault();
            this.copySelected();
        }
        
        // Ctrl+L - Link selected
        if (event.ctrlKey && event.key === 'l' && this.hasSelection()) {
            event.preventDefault();
            this.linkSelected();
        }
        
        // Ctrl+U - Unlink selected
        if (event.ctrlKey && event.key === 'u' && this.hasSelection()) {
            event.preventDefault();
            this.unlinkSelected();
        }
    }
    
    /**
     * Select all available elements
     */
    selectAll() {
        this.clearSelection();
        
        this.elementRegistry.forEach((elementInfo, element) => {
            this.addToSelection(element, elementInfo.type, elementInfo.data);
        });
    }
    
    /**
     * Notify UI controller of selection changes - FIXED METHOD
     */
    notifySelectionChange() {
        // Call onSelectionChange callback if available
        if (this.onSelectionChange) {
            this.onSelectionChange(this.selectedElements);
        }
        
        // FIXED: Call the correct method that exists in UIController
        // OLD: window.editor.uiController.updateSelectionControls(this.selectedElements);
        // NEW: Use forceUpdateBubbleControls() which actually exists
        try {
            if (window.editor?.uiController?.forceUpdateBubbleControls) {
                window.editor.uiController.forceUpdateBubbleControls();
            }
        } catch (error) {
            console.warn('Failed to update UI controls:', error);
        }
    }
    
    /**
     * Clean up when elements are removed
     * @param {HTMLElement} element 
     */
    cleanup(element) {
        this.selectedElements.delete(element);
        this.elementRegistry.delete(element);
        this.notifySelectionChange();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectionManager;
}