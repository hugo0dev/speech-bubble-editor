/**
 * SelectionManager - Unified selection system with comprehensive grouping functionality (Updated for Ctrl+Click)
 */
class SelectionManager {
    constructor() {
        // Core selection tracking
        this.selectedElements = new Map(); // element -> {type, data, element}
        this.elementRegistry = new Map(); // element -> {type, data}
        
        // Grouping system (NEW)
        this.groups = new Map(); // groupId -> {elements: Set, createdAt: Date, name: string}
        this.elementToGroup = new Map(); // element -> groupId
        this.groupIdCounter = 0;
        
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
     * Handle element click for selection (UPDATED for group behavior and Ctrl+click)
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
        
        // Check if element is part of a group
        const groupId = this.getElementGroup(element);
        
        if (groupId && !event.ctrlKey) {
            // If element is grouped and not multi-selecting, select entire group
            this.selectGroup(groupId);
        } else if (event.ctrlKey) {
            // Multi-selection behavior with Ctrl
            if (groupId) {
                // If ctrl-clicking a grouped element, toggle the entire group
                const groupMembers = this.getGroupMembers(groupId);
                const isGroupSelected = groupMembers.every(member => this.isSelected(member));
                
                if (isGroupSelected) {
                    // Deselect entire group
                    groupMembers.forEach(member => this.removeFromSelection(member));
                } else {
                    // Select entire group
                    groupMembers.forEach(member => {
                        const memberInfo = this.elementRegistry.get(member);
                        if (memberInfo) {
                            this.addToSelection(member, memberInfo.type, memberInfo.data);
                        }
                    });
                }
            } else {
                // Standard multi-selection for ungrouped elements
                this.toggleSelection(element, elementInfo.type, elementInfo.data);
            }
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
    
    // ===== GROUPING SYSTEM METHODS (NEW) =====
    
    /**
     * Create a group from selected elements or merge with existing groups
     * @param {Array} selectedElements - Array of elements to group
     * @returns {string|null} - Group ID or null if failed
     */
    createGroup(selectedElements = null) {
        const elementsToGroup = selectedElements || Array.from(this.selectedElements.keys());
        
        if (elementsToGroup.length < 2) {
            console.warn('Cannot create group: need at least 2 elements');
            return null;
        }
        
        // FIXED: Allow grouping of already grouped elements (merge groups)
        const existingGroups = new Set();
        const ungroupedElements = [];
        
        // Separate grouped and ungrouped elements
        elementsToGroup.forEach(element => {
            const groupId = this.getElementGroup(element);
            if (groupId) {
                existingGroups.add(groupId);
            } else {
                ungroupedElements.push(element);
            }
        });
        
        // Collect all elements from existing groups
        let allGroupMembers = [];
        existingGroups.forEach(groupId => {
            const members = this.getGroupMembers(groupId);
            allGroupMembers = allGroupMembers.concat(members);
        });
        
        // Combine with ungrouped elements
        const finalElementsToGroup = [...new Set([...allGroupMembers, ...ungroupedElements])];
        
        // If we only have elements from one existing group and no new elements, no need to regroup
        if (existingGroups.size === 1 && ungroupedElements.length === 0) {
            console.log('Elements are already in the same group');
            return Array.from(existingGroups)[0];
        }
        
        // Remove existing groups first
        existingGroups.forEach(groupId => {
            this.removeGroup(groupId);
        });
        
        // Create new merged group
        const groupId = `group_${++this.groupIdCounter}`;
        const group = {
            elements: new Set(finalElementsToGroup),
            createdAt: new Date(),
            name: `Group ${this.groupIdCounter}`
        };
        
        this.groups.set(groupId, group);
        
        // Map elements to new group
        finalElementsToGroup.forEach(element => {
            this.elementToGroup.set(element, groupId);
        });
        
        // Update visual indicators
        this.updateGroupVisuals(groupId, true);
        
        // Maintain selection on grouped elements
        this.clearSelection();
        finalElementsToGroup.forEach(element => {
            const elementInfo = this.elementRegistry.get(element);
            if (elementInfo) {
                this.addToSelection(element, elementInfo.type, elementInfo.data);
            }
        });
        
        console.log(`Created/merged group ${groupId} with ${finalElementsToGroup.length} elements`);
        return groupId;
    }
    
    /**
     * Remove/dissolve a group
     * @param {string} groupId - Group ID to remove
     * @returns {boolean} - Success status
     */
    removeGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group) {
            console.warn(`Group ${groupId} not found`);
            return false;
        }
        
        // Remove group visual indicators
        this.updateGroupVisuals(groupId, false);
        
        // Remove element-to-group mappings
        group.elements.forEach(element => {
            this.elementToGroup.delete(element);
        });
        
        // Remove group
        this.groups.delete(groupId);
        
        console.log(`Removed group ${groupId}`);
        return true;
    }
    
    /**
     * Get group ID for an element
     * @param {HTMLElement} element 
     * @returns {string|null}
     */
    getElementGroup(element) {
        return this.elementToGroup.get(element) || null;
    }
    
    /**
     * Get all elements in a group
     * @param {string} groupId 
     * @returns {Array}
     */
    getGroupMembers(groupId) {
        const group = this.groups.get(groupId);
        return group ? Array.from(group.elements) : [];
    }
    
    /**
     * Check if element is part of any group
     * @param {HTMLElement} element 
     * @returns {boolean}
     */
    isElementGrouped(element) {
        return this.elementToGroup.has(element);
    }
    
    /**
     * Select entire group by group ID
     * @param {string} groupId 
     */
    selectGroup(groupId) {
        const groupMembers = this.getGroupMembers(groupId);
        if (groupMembers.length === 0) return;
        
        this.clearSelection();
        
        groupMembers.forEach(element => {
            const elementInfo = this.elementRegistry.get(element);
            if (elementInfo) {
                this.addToSelection(element, elementInfo.type, elementInfo.data);
            }
        });
    }
    
    /**
     * Update visual indicators for group (FIXED - no permanent indicators)
     * @param {string} groupId 
     * @param {boolean} show - Show or hide group indicators
     */
    updateGroupVisuals(groupId, show) {
        const groupMembers = this.getGroupMembers(groupId);
        
        groupMembers.forEach(element => {
            if (show) {
                // Add grouped class for internal tracking only (no visual styling)
                element.classList.add('grouped');
            } else {
                // Remove grouped class and clean up any styling
                element.classList.remove('grouped');
                element.style.boxShadow = '';
                element.style.borderRadius = '';
                element.style.transition = '';
            }
        });
    }
    
    /**
     * Get all selected groups (returns group IDs of groups that have selected members)
     * @returns {Array} - Array of group IDs
     */
    getSelectedGroups() {
        const selectedGroupIds = new Set();
        
        this.selectedElements.forEach((selectionItem, element) => {
            const groupId = this.getElementGroup(element);
            if (groupId) {
                selectedGroupIds.add(groupId);
            }
        });
        
        return Array.from(selectedGroupIds);
    }
    
    /**
     * Check if current selection contains only grouped elements
     * @returns {boolean}
     */
    isSelectionGrouped() {
        if (this.selectedElements.size === 0) return false;
        
        return Array.from(this.selectedElements.keys()).every(element => 
            this.isElementGrouped(element)
        );
    }
    
    /**
     * Check if current selection can be grouped (2+ elements, allowing grouped elements for merging)
     * @returns {boolean}
     */
    canCreateGroup() {
        if (this.selectedElements.size < 2) return false;
        
        // FIXED: Always allow grouping if we have 2+ elements (including already grouped ones for merging)
        return true;
    }
    
    /**
     * Apply visual highlighting to selected element (ENHANCED multi-selection indicators)
     * @param {HTMLElement} element 
     * @param {string} type 
     */
    highlightElement(element, type) {
        element.classList.add('selected');
        
        // Check if this is part of a multi-selection
        const isMultiSelection = this.selectedElements.size > 1;
        const isGrouped = this.isElementGrouped(element);
        
        if (isGrouped) {
            // For grouped elements: show selection indicators for the entire group
            const groupId = this.getElementGroup(element);
            const groupMembers = this.getGroupMembers(groupId);
            groupMembers.forEach(member => {
                member.style.boxShadow = '0 0 0 3px #9C27B0, 0 0 12px rgba(156, 39, 176, 0.6)';
                member.style.transition = 'box-shadow 0.2s ease';
            });
        } else if (isMultiSelection) {
            // For multi-selection: use consistent indicators for both bubbles and text
            element.style.boxShadow = '0 0 0 3px #2196F3, 0 0 8px rgba(33, 150, 243, 0.6)';
            element.style.transition = 'box-shadow 0.2s ease';
        }
        
        // Type-specific highlighting
        if (type === 'bubble') {
            if (!isMultiSelection && !isGrouped) {
                // Single bubble selection: use the bubble manager system (with handles)
                if (window.editor?.appCoordinator) {
                    const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
                    if (bubbleManager) {
                        bubbleManager.selectBubble(element);
                    }
                }
            } else {
                // Multi-selection or grouped: use visual indicators only (no handles)
                if (!isGrouped) {
                    element.style.borderRadius = '4px';
                }
            }
        } else if (type === 'text') {
            // Enhanced text element highlighting
            if (!isGrouped && !isMultiSelection) {
                // Single text selection
                element.style.background = 'rgba(33, 150, 243, 0.1)';
                element.style.borderRadius = '4px';
                element.style.transition = 'all 0.2s ease';
            }
            // Multi-selection and grouped styling handled by boxShadow above
        }
    }
    
    /**
     * Remove visual highlighting from element (ENHANCED cleanup)
     * @param {HTMLElement} element 
     * @param {string} type 
     */
    unhighlightElement(element, type) {
        element.classList.remove('selected');
        
        // Clean up all visual indicators
        element.style.boxShadow = '';
        element.style.borderRadius = '';
        element.style.transition = '';
        element.style.background = '';
        element.style.borderColor = '';
        
        // Type-specific cleanup
        if (type === 'bubble') {
            // For bubbles, check if we need to deselect from bubble manager
            const isMultiSelection = this.selectedElements.size > 1;
            const isGrouped = this.isElementGrouped(element);
            
            if (!isMultiSelection && !isGrouped) {
                // Single bubble deselection: use bubble manager
                if (window.editor?.appCoordinator) {
                    const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
                    if (bubbleManager && bubbleManager.getSelectedBubble() === element) {
                        bubbleManager.deselectBubble();
                    }
                }
            }
        }
        
        // For grouped elements: clean up group selection indicators if no group members are selected
        const isGrouped = this.isElementGrouped(element);
        if (isGrouped) {
            const groupId = this.getElementGroup(element);
            const groupMembers = this.getGroupMembers(groupId);
            
            // Check if any other group members are still selected
            const hasSelectedMembers = groupMembers.some(member => this.isSelected(member));
            
            if (!hasSelectedMembers) {
                // No group members are selected, clean up all group indicators
                groupMembers.forEach(member => {
                    member.style.boxShadow = '';
                    member.style.borderRadius = '';
                    member.style.transition = '';
                });
            }
        }
    }
    
    /**
     * Copy all selected elements (UPDATED for group handling)
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
        
        // If original selection was grouped, group the copies too
        const selectedGroups = this.getSelectedGroups();
        if (selectedGroups.length === 1 && copiedElements.length > 1) {
            // Select the copied elements and group them
            this.clearSelection();
            copiedElements.forEach(item => {
                this.addToSelection(item.element, item.type, item.data);
            });
            
            // Create group for copied elements
            this.createGroup();
        } else {
            // Select the copied elements
            if (copiedElements.length > 0) {
                this.clearSelection();
                copiedElements.forEach(item => {
                    this.addToSelection(item.element, item.type, item.data);
                });
            }
        }
    }
    
    /**
     * Delete all selected elements (UPDATED for group handling)
     */
    deleteSelected() {
        const selectedBubbles = this.getSelectedByType('bubble');
        const selectedTexts = this.getSelectedByType('text');
        
        // Get groups that will be affected
        const affectedGroups = this.getSelectedGroups();
        
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
        
        // Clean up any groups that no longer have members
        affectedGroups.forEach(groupId => {
            const remainingMembers = this.getGroupMembers(groupId);
            if (remainingMembers.length === 0) {
                this.removeGroup(groupId);
            }
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
        
        // Keyboard shortcuts (UPDATED for Ctrl+click behavior)
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    /**
     * Handle keyboard shortcuts (FIXED - removed Ctrl+D to prevent duplicates)
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
        
        // NOTE: Ctrl+D (copy) is handled in InteractionManager to prevent duplicates
        
        // Ctrl+L - Group selected
        if (event.ctrlKey && event.key === 'l' && this.hasSelection()) {
            event.preventDefault();
            if (window.editor?.groupSelectedElements) {
                window.editor.groupSelectedElements();
            }
        }
        
        // Ctrl+U - Ungroup selected
        if (event.ctrlKey && event.key === 'u' && this.hasSelection()) {
            event.preventDefault();
            if (window.editor?.ungroupSelectedElements) {
                window.editor.ungroupSelectedElements();
            }
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
        try {
            if (window.editor?.uiController?.forceUpdateBubbleControls) {
                window.editor.uiController.forceUpdateBubbleControls();
            }
        } catch (error) {
            console.warn('Failed to update UI controls:', error);
        }
    }
    
    /**
     * Clean up when elements are removed (UPDATED for group handling)
     * @param {HTMLElement} element 
     */
    cleanup(element) {
        // Remove from selection
        this.selectedElements.delete(element);
        this.elementRegistry.delete(element);
        
        // Remove from group if grouped
        const groupId = this.getElementGroup(element);
        if (groupId) {
            const group = this.groups.get(groupId);
            if (group) {
                group.elements.delete(element);
                
                // If group becomes empty or has only 1 member, dissolve it
                if (group.elements.size <= 1) {
                    this.removeGroup(groupId);
                }
            }
            
            this.elementToGroup.delete(element);
        }
        
        this.notifySelectionChange();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SelectionManager;
}