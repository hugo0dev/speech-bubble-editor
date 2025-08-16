/**
 * InteractionManager - Handles user interactions (FIXED: Group Boundary Collision Detection)
 */
class InteractionManager {
    constructor(canvasContainer, bubbleManager, handleManager, controlPointManager) {
        this.canvasContainer = canvasContainer;
        this.bubbleManager = bubbleManager;
        this.handleManager = handleManager;
        this.controlPointManager = controlPointManager;
        
        // Unified drag state (works for both bubbles and text)
        this.isDragging = false;
        this.draggedElement = null; // Can be bubble or text element
        this.dragOffset = { x: 0, y: 0 };
        
        // Group drag state
        this.isGroupDrag = false;
        this.groupMembers = [];
        this.relativeOffsets = new Map();
        
        // Resize state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeBubble = null;
        this.resizeStartData = null;
        
        // Rotation state
        this.isRotating = false;
        this.rotationBubble = null;
        this.rotationStartData = null;
        
        // Group transformation states
        this.isGroupResize = false;
        this.isGroupRotation = false;
        this.groupResizeMembers = [];
        this.groupRotationMembers = [];
        this.groupTransformCenter = null;
        this.groupOriginalBounds = null;
        this.groupOriginalPositions = null;
        this.primaryTransformElement = null;
        
        // Control point state
        this.isControlPointDragging = false;
        this.controlPointBubble = null;
        this.controlPointDirection = null;
        this.controlPointStartData = null;
        
        // Selection preservation state for control point operations
        this.storedSelectionState = null;
        this.isSelectionPreservationActive = false;
        
        // Deformation optimization
        this.deformationThrottle = null;
        this.lastDeformationUpdate = 0;
        this.deformationUpdateInterval = 16; // ~60fps
        
        this.initEventListeners();
    }
    
    // ===== SELECTION PRESERVATION METHODS (NEW) =====
    
    /**
     * Store current selection state before control point operations
     */
    storeSelectionStateForControlPoint() {
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager || !selectionManager.hasSelection()) {
            this.storedSelectionState = null;
            this.isSelectionPreservationActive = false;
            return;
        }
        
        try {
            // Capture current selection state
            const selectedElements = selectionManager.getSelectedElements();
            this.storedSelectionState = [];
            
            selectedElements.forEach((selectionItem, element) => {
                // Store essential data for restoration
                this.storedSelectionState.push({
                    element: element,
                    type: selectionItem.type,
                    data: selectionItem.data
                });
            });
            
            this.isSelectionPreservationActive = true;
            console.log('Stored selection state for control point operation:', this.storedSelectionState.length, 'elements');
            
        } catch (error) {
            console.warn('Failed to store selection state for control point operation:', error);
            this.clearStoredSelectionState();
        }
    }
    
    /**
     * Restore selection state after control point operations
     */
    restoreSelectionStateAfterControlPoint() {
        if (!this.isSelectionPreservationActive || !this.storedSelectionState) {
            return;
        }
        
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            console.warn('SelectionManager not available for selection restoration');
            this.clearStoredSelectionState();
            return;
        }
        
        try {
            console.log('Restoring selection state after control point operation');
            
            // Clear current selection first to avoid conflicts
            selectionManager.clearSelection();
            
            // Restore each element that was previously selected
            let restoredCount = 0;
            this.storedSelectionState.forEach(selectionItem => {
                try {
                    // Verify element still exists and is valid
                    if (selectionItem.element && 
                        document.contains(selectionItem.element) && 
                        selectionManager.elementRegistry.has(selectionItem.element)) {
                        
                        selectionManager.addToSelection(
                            selectionItem.element, 
                            selectionItem.type, 
                            selectionItem.data
                        );
                        restoredCount++;
                    }
                } catch (elementError) {
                    console.warn('Failed to restore selection for individual element:', elementError);
                }
            });
            
            console.log('Successfully restored selection for', restoredCount, 'of', this.storedSelectionState.length, 'elements');
            
        } catch (error) {
            console.warn('Failed to restore selection state after control point operation:', error);
        } finally {
            this.clearStoredSelectionState();
        }
    }
    
    /**
     * Clear stored selection state (cleanup method)
     */
    clearStoredSelectionState() {
        this.storedSelectionState = null;
        this.isSelectionPreservationActive = false;
    }
    
    // ===== GROUP TRANSFORMATION DETECTION FUNCTIONS =====
    
    detectGroupResizeStart(element) {
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            return false;
        }
        
        const groupId = selectionManager.getElementGroup(element);
        if (!groupId) {
            return false;
        }
        
        const groupMembers = selectionManager.getGroupMembers(groupId);
        if (groupMembers.length < 2) {
            return false;
        }
        
        console.log(`Group resize detected: ${groupMembers.length} members`);
        this.initializeGroupResizeState(groupMembers, element);
        return true;
    }
    
    detectGroupRotationStart(element) {
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            return false;
        }
        
        const groupId = selectionManager.getElementGroup(element);
        if (!groupId) {
            return false;
        }
        
        const groupMembers = selectionManager.getGroupMembers(groupId);
        if (groupMembers.length < 2) {
            return false;
        }
        
        console.log(`Group rotation detected: ${groupMembers.length} members`);
        this.initializeGroupRotationState(groupMembers, element);
        return true;
    }
    
    // ===== GROUP BOUNDS CALCULATION FUNCTIONS =====
    
    calculateGroupBounds(groupMembers) {
        if (!groupMembers || groupMembers.length === 0) {
            return null;
        }
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        groupMembers.forEach(element => {
            const bounds = this.getElementBounds(element);
            if (bounds) {
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, bounds.x + bounds.width);
                maxY = Math.max(maxY, bounds.y + bounds.height);
            }
        });
        
        const groupBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
        
        console.log('Calculated group bounds:', groupBounds);
        return groupBounds;
    }
    
    getElementBounds(element) {
        // Try to get bubble data first
        const bubbleData = this.bubbleManager?.getBubbleData(element);
        if (bubbleData) {
            return {
                x: bubbleData.x,
                y: bubbleData.y,
                width: bubbleData.width,
                height: bubbleData.height
            };
        }
        
        // Try to get text data
        const textElementManager = window.editor?.textElementManager;
        if (textElementManager) {
            const textData = textElementManager.getTextDataByElement(element);
            if (textData) {
                return {
                    x: textData.x,
                    y: textData.y,
                    width: element.offsetWidth || 50,
                    height: element.offsetHeight || 20
                };
            }
        }
        
        // Fallback to element style and computed dimensions
        const x = parseFloat(element.style.left) || 0;
        const y = parseFloat(element.style.top) || 0;
        const width = element.offsetWidth || 50;
        const height = element.offsetHeight || 20;
        
        return { x, y, width, height };
    }
    
    // ===== STATE MANAGEMENT FUNCTIONS =====
    
    initializeGroupResizeState(groupMembers, primaryElement) {
        this.isGroupResize = true;
        this.groupResizeMembers = [...groupMembers];
        this.primaryTransformElement = primaryElement;
        
        this.groupOriginalBounds = this.calculateGroupBounds(groupMembers);
        this.groupTransformCenter = {
            x: this.groupOriginalBounds.centerX,
            y: this.groupOriginalBounds.centerY
        };
        
        const memberBounds = new Map();
        groupMembers.forEach(member => {
            const bounds = this.getElementBounds(member);
            memberBounds.set(member, bounds);
        });
        this.groupOriginalPositions = memberBounds;
        
        this.applyGroupTransformationVisualFeedback(groupMembers, true);
        
        console.log('Group resize state initialized:', {
            memberCount: groupMembers.length,
            center: this.groupTransformCenter,
            bounds: this.groupOriginalBounds
        });
    }
    
    initializeGroupRotationState(groupMembers, primaryElement) {
        this.isGroupRotation = true;
        this.groupRotationMembers = [...groupMembers];
        this.primaryTransformElement = primaryElement;
        
        const groupBounds = this.calculateGroupBounds(groupMembers);
        this.groupTransformCenter = {
            x: groupBounds.centerX,
            y: groupBounds.centerY
        };
        
        const memberPositions = new Map();
        groupMembers.forEach(member => {
            const bounds = this.getElementBounds(member);
            const relativePos = {
                x: bounds.x - this.groupTransformCenter.x,
                y: bounds.y - this.groupTransformCenter.y,
                originalBounds: bounds
            };
            memberPositions.set(member, relativePos);
        });
        this.groupOriginalPositions = memberPositions;
        
        this.applyGroupTransformationVisualFeedback(groupMembers, true);
        
        console.log('Group rotation state initialized:', {
            memberCount: groupMembers.length,
            center: this.groupTransformCenter
        });
    }
    
    cleanupGroupTransformationState() {
        if (this.isGroupResize || this.isGroupRotation) {
            console.log('Cleaning up group transformation state');
            
            const allMembers = [...this.groupResizeMembers, ...this.groupRotationMembers];
            if (allMembers.length > 0) {
                this.applyGroupTransformationVisualFeedback(allMembers, false);
            }
            
            allMembers.forEach(member => {
                const bubbleData = this.bubbleManager?.getBubbleData(member);
                if (bubbleData && this.handleManager) {
                    this.handleManager.updateHandlePositions(member);
                }
            });
        }
        
        this.isGroupResize = false;
        this.isGroupRotation = false;
        this.groupResizeMembers = [];
        this.groupRotationMembers = [];
        this.groupTransformCenter = null;
        this.groupOriginalBounds = null;
        this.groupOriginalPositions = null;
        this.primaryTransformElement = null;
    }
    
    applyGroupTransformationVisualFeedback(groupMembers, isActive) {
        groupMembers.forEach(member => {
            if (isActive) {
                member.style.boxShadow = '0 0 0 2px #FF9800, 0 0 12px rgba(255, 152, 0, 0.6)';
                member.style.transition = 'box-shadow 0.2s ease';
                member.style.opacity = '0.9';
            } else {
                member.style.boxShadow = '';
                member.style.transition = '';
                member.style.opacity = '1';
            }
        });
        
        if (isActive) {
            this.canvasContainer.style.cursor = 'crosshair';
        } else {
            this.canvasContainer.style.cursor = '';
        }
    }
    
    // ===== GROUP DRAG FUNCTIONALITY =====
    
    detectGroupDragStart(element) {
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            return false;
        }
        
        const groupId = selectionManager.getElementGroup(element);
        if (!groupId) {
            return false;
        }
        
        const groupMembers = selectionManager.getGroupMembers(groupId);
        if (groupMembers.length < 2) {
            return false;
        }
        
        this.isGroupDrag = true;
        this.groupMembers = groupMembers;
        this.draggedElement = element;
        
        this.relativeOffsets = this.calculateGroupRelativePositions(element, groupMembers);
        this.applyGroupDragVisualFeedback(groupMembers, true);
        
        console.log(`Group drag detected: ${groupMembers.length} members`);
        return true;
    }
    
    calculateGroupRelativePositions(draggedElement, groupMembers) {
        const relativeOffsets = new Map();
        
        const draggedPos = this.getElementPosition(draggedElement);
        if (!draggedPos) {
            return relativeOffsets;
        }
        
        groupMembers.forEach(member => {
            if (member === draggedElement) {
                return;
            }
            
            const memberPos = this.getElementPosition(member);
            if (memberPos) {
                const offset = {
                    x: memberPos.x - draggedPos.x,
                    y: memberPos.y - draggedPos.y
                };
                relativeOffsets.set(member, offset);
            }
        });
        
        return relativeOffsets;
    }
    
    getElementPosition(element) {
        // Try to get bubble data first
        const bubbleData = this.bubbleManager?.getBubbleData(element);
        if (bubbleData) {
            return { x: bubbleData.x, y: bubbleData.y };
        }
        
        // Try to get text data
        const textElementManager = window.editor?.textElementManager;
        if (textElementManager) {
            const textData = textElementManager.getTextDataByElement(element);
            if (textData) {
                return { x: textData.x, y: textData.y };
            }
        }
        
        // Fallback to element style
        const x = parseFloat(element.style.left) || 0;
        const y = parseFloat(element.style.top) || 0;
        return { x, y };
    }
    
    updateGroupPositions(newDraggedX, newDraggedY) {
        /*
        LOGIC PLAN:
        1. Check if we're in group drag mode
        2. Calculate the current group's collective bounding box
        3. Calculate proposed new group bounding box based on drag movement
        4. Check if proposed bounding box exceeds canvas boundaries  
        5. If so, constrain the movement to keep entire group within bounds
        6. Apply the constrained movement to all group members
        */
        
        if (!this.isGroupDrag || !this.draggedElement) {
            return;
        }
        
        // Get current position of dragged element
        const currentDraggedPos = this.getElementPosition(this.draggedElement);
        if (!currentDraggedPos) {
            return;
        }
        
        // Calculate movement delta
        const deltaX = newDraggedX - currentDraggedPos.x;
        const deltaY = newDraggedY - currentDraggedPos.y;
        
        // Calculate current group bounding box
        const currentGroupBounds = this.calculateGroupBounds(this.groupMembers);
        if (!currentGroupBounds) {
            return;
        }
        
        // Calculate proposed new group bounding box
        const proposedGroupBounds = {
            x: currentGroupBounds.x + deltaX,
            y: currentGroupBounds.y + deltaY,
            width: currentGroupBounds.width,
            height: currentGroupBounds.height
        };
        
        // Check canvas boundaries and constrain if needed
        const canvasWidth = this.canvasContainer.offsetWidth;
        const canvasHeight = this.canvasContainer.offsetHeight;
        
        let constrainedDeltaX = deltaX;
        let constrainedDeltaY = deltaY;
        
        // Left boundary check
        if (proposedGroupBounds.x < 0) {
            constrainedDeltaX = deltaX - proposedGroupBounds.x; // Adjust to keep left edge at 0
        }
        
        // Right boundary check  
        if (proposedGroupBounds.x + proposedGroupBounds.width > canvasWidth) {
            const excess = (proposedGroupBounds.x + proposedGroupBounds.width) - canvasWidth;
            constrainedDeltaX = deltaX - excess; // Adjust to keep right edge within canvas
        }
        
        // Top boundary check
        if (proposedGroupBounds.y < 0) {
            constrainedDeltaY = deltaY - proposedGroupBounds.y; // Adjust to keep top edge at 0
        }
        
        // Bottom boundary check
        if (proposedGroupBounds.y + proposedGroupBounds.height > canvasHeight) {
            const excess = (proposedGroupBounds.y + proposedGroupBounds.height) - canvasHeight;
            constrainedDeltaY = deltaY - excess; // Adjust to keep bottom edge within canvas
        }
        
        // Apply constrained movement to dragged element
        const constrainedDraggedX = currentDraggedPos.x + constrainedDeltaX;
        const constrainedDraggedY = currentDraggedPos.y + constrainedDeltaY;
        
        this.updateElementPosition(this.draggedElement, constrainedDraggedX, constrainedDraggedY);
        
        // Apply constrained movement to all other group members
        this.relativeOffsets.forEach((offset, member) => {
            const newX = constrainedDraggedX + offset.x;
            const newY = constrainedDraggedY + offset.y;
            this.updateElementPosition(member, newX, newY);
        });
    }
    
    updateElementPosition(element, newX, newY) {
        // Try to update as bubble first
        const bubbleData = this.bubbleManager?.getBubbleData(element);
        if (bubbleData) {
            bubbleData.x = newX;
            bubbleData.y = newY;
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
            
            if (element === this.draggedElement) {
                this.handleManager?.updateHandlePositions(element);
            }
            return;
        }
        
        // Try to update as text element
        const textElementManager = window.editor?.textElementManager;
        if (textElementManager) {
            const textData = textElementManager.getTextDataByElement(element);
            if (textData) {
                textElementManager.updateTextElementPosition(element, newX, newY);
                return;
            }
        }
        
        // Fallback: update element style directly
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
    }
    
    constrainToCanvas(element, x, y) {
        const elementWidth = element.offsetWidth || 50;
        const elementHeight = element.offsetHeight || 50;
        
        const constrainedX = Math.max(0, Math.min(x, this.canvasContainer.offsetWidth - elementWidth));
        const constrainedY = Math.max(0, Math.min(y, this.canvasContainer.offsetHeight - elementHeight));
        
        return { x: constrainedX, y: constrainedY };
    }
    
    applyGroupDragVisualFeedback(groupMembers, isDragging) {
        groupMembers.forEach(member => {
            if (isDragging) {
                member.style.opacity = '0.8';
                member.style.zIndex = '100';
                member.style.boxShadow = '0 0 0 2px #9C27B0, 0 0 8px rgba(156, 39, 176, 0.4)';
            } else {
                member.style.opacity = '1';
                member.style.zIndex = '';
                member.style.boxShadow = '';
            }
        });
        
        if (isDragging) {
            this.canvasContainer.style.cursor = 'move';
        } else {
            this.canvasContainer.style.cursor = '';
        }
    }
    
    cleanupGroupDrag() {
        if (!this.isGroupDrag) {
            return;
        }
        
        this.applyGroupDragVisualFeedback(this.groupMembers, false);
        
        this.groupMembers.forEach(member => {
            const bubbleData = this.bubbleManager?.getBubbleData(member);
            if (bubbleData && this.handleManager) {
                this.handleManager.updateHandlePositions(member);
            }
        });
        
        this.isGroupDrag = false;
        this.groupMembers = [];
        this.relativeOffsets.clear();
        this.draggedElement = null;
        
        console.log('Group drag cleanup completed');
    }
    
    // ===== EVENT LISTENERS SETUP =====
    
    initEventListeners() {
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        this.canvasContainer.addEventListener('click', (e) => {
            if (e.target === this.canvasContainer || e.target.id === 'background-image') {
                this.bubbleManager.deselectBubble();
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // FIXED: Unified element handling for both bubbles and text
        this.canvasContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.speech-bubble')) {
                this.handleBubbleMouseDown(e, e.target.closest('.speech-bubble'));
            } else if (e.target.closest('.text-element')) {
                this.handleTextMouseDown(e, e.target.closest('.text-element'));
            }
        });
        
        this.canvasContainer.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.speech-bubble')) {
                e.preventDefault();
                this.handleBubbleRightClick(e, e.target.closest('.speech-bubble'));
            }
        });
    }

    handleBubbleRightClick(event, bubbleElement) {
        event.preventDefault();
        
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        if (bubbleData?.isDeformed) {
            if (confirm('Reset bubble to default shape?')) {
                this.resetBubbleShape(bubbleElement);
            }
        }
    }
    
    resetBubbleShape(bubbleElement) {
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        this.controlPointManager.resetControlPoints(bubbleData);
        this.controlPointManager.applyDeformationToBubble(bubbleElement, bubbleData);
        this.handleManager.updateControlPointHandlePositions(bubbleElement);
    }
    
    handleBubbleMouseDown(event, bubbleElement) {
        if (event.target.classList.contains('resize-handle') || 
            event.target.classList.contains('rotation-handle') ||
            event.target.classList.contains('control-point-handle')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        this.bubbleManager.selectBubble(bubbleElement);
        
        // Check for group drag
        const isGroupDrag = this.detectGroupDragStart(bubbleElement);
        
        this.isDragging = true;
        this.draggedElement = bubbleElement; // Store as generic element
        
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        if (bubbleData) {
            const bubbleLeft = bubbleData.x + containerRect.left;
            const bubbleTop = bubbleData.y + containerRect.top;
            
            this.dragOffset.x = event.clientX - bubbleLeft;
            this.dragOffset.y = event.clientY - bubbleTop;
        } else {
            const bubbleRect = bubbleElement.getBoundingClientRect();
            this.dragOffset.x = event.clientX - bubbleRect.left;
            this.dragOffset.y = event.clientY - bubbleRect.top;
        }
        
        // Apply visual feedback
        if (!isGroupDrag) {
            bubbleElement.style.opacity = '0.8';
            bubbleElement.style.zIndex = '100';
        }
    }
    
    // ===== NEW: TEXT ELEMENT HANDLING =====
    
    handleTextMouseDown(event, textElement) {
        // Don't interfere if editing
        if (textElement.classList.contains('editing')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Set dragging state flag for SelectionManager
        textElement.setAttribute('data-dragging', 'true');
        
        // Handle selection first (this triggers SelectionManager)
        this.handleTextSelection(textElement, event);
        
        // Check for group drag
        const isGroupDrag = this.detectGroupDragStart(textElement);
        
        this.isDragging = true;
        this.draggedElement = textElement;
        
        // Calculate drag offset using element bounds
        const elementRect = textElement.getBoundingClientRect();
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        this.dragOffset.x = event.clientX - elementRect.left;
        this.dragOffset.y = event.clientY - elementRect.top;
        
        // Apply visual feedback
        if (!isGroupDrag) {
            textElement.style.opacity = '0.8';
            textElement.style.zIndex = '100';
        }
    }
    
    handleTextSelection(textElement, event) {
        if (!window.selectionManager) return;
        
        const textElementManager = window.editor?.textElementManager;
        if (!textElementManager) return;
        
        const textData = textElementManager.getTextDataByElement(textElement);
        if (!textData) return;
        
        if (event.ctrlKey) {
            window.selectionManager.toggleSelection(textElement, 'text', textData);
        } else {
            window.selectionManager.clearSelection();
            window.selectionManager.addToSelection(textElement, 'text', textData);
        }
    }
    
    // ===== RESIZE HANDLING =====
    
    handleResizeMouseDown(event, handlePosition, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        const isGroupResize = this.detectGroupResizeStart(bubbleElement);
        
        this.isResizing = true;
        this.resizeHandle = handlePosition;
        this.resizeBubble = bubbleElement;
        
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        this.resizeStartData = {
            mouseX: event.clientX,
            mouseY: event.clientY,
            width: bubbleData.width,
            height: bubbleData.height,
            x: bubbleData.x,
            y: bubbleData.y,
            aspectRatio: bubbleData.width / bubbleData.height
        };
        
        if (!isGroupResize) {
            bubbleElement.style.opacity = '0.8';
        }
    }
    
    // ===== ROTATION HANDLING =====
    
    handleRotationMouseDown(event, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        const isGroupRotation = this.detectGroupRotationStart(bubbleElement);
        
        this.isRotating = true;
        this.rotationBubble = bubbleElement;
        
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        const centerX = bubbleData.x + bubbleData.width / 2;
        const centerY = bubbleData.y + bubbleData.height / 2;
        
        this.rotationStartData = {
            centerX,
            centerY,
            startAngle: Math.atan2(
                event.clientY - containerRect.top - centerY,
                event.clientX - containerRect.left - centerX
            ) * 180 / Math.PI,
            startRotation: bubbleData.rotation
        };
        
        if (!isGroupRotation) {
            bubbleElement.style.opacity = '0.8';
        }
    }
    
    // ===== CONTROL POINT HANDLING (UPDATED WITH SELECTION PRESERVATION) =====
    
    handleControlPointMouseDown(event, direction, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        // FIXED: Store selection state before control point operation
        this.storeSelectionStateForControlPoint();
        
        this.isControlPointDragging = true;
        this.controlPointBubble = bubbleElement;
        this.controlPointDirection = direction;
        
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const bubbleCenterX = bubbleData.x + (bubbleData.width / 2);
        const bubbleCenterY = bubbleData.y + (bubbleData.height / 2);
        
        this.controlPointStartData = {
            mouseX: event.clientX,
            mouseY: event.clientY,
            bubbleCenterX,
            bubbleCenterY,
            bubbleWidth: bubbleData.width,
            bubbleHeight: bubbleData.height,
            initialControlPoint: { ...bubbleData.controlPoints[direction] },
            containerRect
        };
        
        this.setControlPointDragVisualState(true, event.target);
    }
    
    // ===== MOUSE MOVE HANDLING =====
    
    handleMouseMove(event) {
        const handlers = [
            [this.isControlPointDragging, () => this.handleControlPointMove(event)],
            [this.isDragging, () => this.handleDragMove(event)],
            [this.isResizing, () => this.handleResizeMove(event)],
            [this.isRotating, () => this.handleRotationMove(event)]
        ];
        handlers.find(([flag, handler]) => flag && handler());
    }
    
    handleControlPointMove(event) {
        event.preventDefault();
        
        if (!this.controlPointStartData || !this.controlPointBubble) return;
        
        const deltaX = event.clientX - this.controlPointStartData.mouseX;
        const deltaY = event.clientY - this.controlPointStartData.mouseY;
        
        const relativeX = deltaX / this.controlPointStartData.bubbleWidth;
        const relativeY = deltaY / this.controlPointStartData.bubbleHeight;
        
        let newControlPointX = this.controlPointStartData.initialControlPoint.x + relativeX;
        let newControlPointY = this.controlPointStartData.initialControlPoint.y + relativeY;
        
        const validatedPosition = this.controlPointManager.validateControlPointPosition(
            this.controlPointDirection, 
            { x: newControlPointX, y: newControlPointY }
        );
        
        const bubbleData = this.bubbleManager.getBubbleData(this.controlPointBubble);
        if (bubbleData) {
            bubbleData.controlPoints[this.controlPointDirection] = validatedPosition;
            bubbleData.isDeformed = this.controlPointManager.checkIfBubbleIsDeformed(bubbleData);
            
            this.applyRealTimeDeformation();
            
            this.handleManager.updateControlPointHandlePosition(
                this.controlPointDirection, 
                this.controlPointBubble, 
                validatedPosition
            );
        }
    }
    
    applyRealTimeDeformation() {
        const now = performance.now();
        
        if (now - this.lastDeformationUpdate < this.deformationUpdateInterval) {
            if (!this.deformationThrottle) {
                this.deformationThrottle = requestAnimationFrame(() => {
                    this.performDeformationUpdate();
                    this.deformationThrottle = null;
                });
            }
            return;
        }
        
        this.performDeformationUpdate();
    }
    
    performDeformationUpdate() {
        if (!this.controlPointBubble) return;
        
        const bubbleData = this.bubbleManager.getBubbleData(this.controlPointBubble);
        if (!bubbleData) return;
        
        this.controlPointManager.applyDeformationToBubble(this.controlPointBubble, bubbleData);
        this.lastDeformationUpdate = performance.now();
    }
    
    handleDragMove(event) {
        event.preventDefault();
        
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        let newX = event.clientX - containerRect.left - this.dragOffset.x;
        let newY = event.clientY - containerRect.top - this.dragOffset.y;
        
        // Apply boundary constraints for the dragged element
        const elementWidth = this.draggedElement.offsetWidth;
        const elementHeight = this.draggedElement.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, this.canvasContainer.offsetWidth - elementWidth));
        newY = Math.max(0, Math.min(newY, this.canvasContainer.offsetHeight - elementHeight));
        
        // Handle group vs individual dragging
        if (this.isGroupDrag) {
            this.updateGroupPositions(newX, newY);
        } else {
            // Update individual element (works for both bubbles and text)
            this.draggedElement.style.left = newX + 'px';
            this.draggedElement.style.top = newY + 'px';
            
            // Update data and handles
            const bubbleData = this.bubbleManager.getBubbleData(this.draggedElement);
            if (bubbleData) {
                // It's a bubble
                bubbleData.x = newX;
                bubbleData.y = newY;
                this.handleManager.updateHandlePositions(this.draggedElement);
            } else {
                // It's a text element
                const textElementManager = window.editor?.textElementManager;
                if (textElementManager) {
                    textElementManager.updateTextElementPosition(this.draggedElement, newX, newY);
                }
            }
        }
    }
    
    // ===== GROUP RESIZE IMPLEMENTATION =====
    
    handleResizeMove(event) {
        event.preventDefault();
        
        if (this.isGroupResize) {
            this.handleGroupResizeMove(event);
        } else {
            this.handleIndividualResizeMove(event);
        }
    }
    
    handleGroupResizeMove(event) {
        if (!this.groupResizeMembers.length || !this.groupTransformCenter || !this.resizeStartData) {
            return;
        }
        
        const deltaX = event.clientX - this.resizeStartData.mouseX;
        const deltaY = event.clientY - this.resizeStartData.mouseY;
        
        let scaleFactor = 1.0;
        const delta = this.resizeHandle.includes('e') ? deltaX : -deltaX;
        const newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width + delta);
        scaleFactor = newWidth / this.resizeStartData.width;
        
        scaleFactor = Math.max(0.3, Math.min(3.0, scaleFactor));
        
        this.updateGroupResize(scaleFactor, this.groupTransformCenter, this.groupOriginalPositions);
        
        if (this.primaryTransformElement && this.handleManager) {
            this.handleManager.updateHandlePositions(this.primaryTransformElement);
        }
    }
    
    handleIndividualResizeMove(event) {
        const deltaX = event.clientX - this.resizeStartData.mouseX;
        const deltaY = event.clientY - this.resizeStartData.mouseY;
        
        let newWidth, newHeight, newX, newY;
        
        const calculateResize = () => {
            const delta = this.resizeHandle.includes('e') ? deltaX : -deltaX;
            newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width + delta);
            newHeight = newWidth / this.resizeStartData.aspectRatio;
            
            newX = this.resizeHandle.includes('w') 
                ? this.resizeStartData.x + (this.resizeStartData.width - newWidth)
                : this.resizeStartData.x;
                
            newY = this.resizeHandle.includes('n')
                ? this.resizeStartData.y + (this.resizeStartData.height - newHeight)
                : this.resizeStartData.y;
        };
        
        calculateResize();
        
        const maxWidth = this.canvasContainer.offsetWidth - newX;
        const maxHeight = this.canvasContainer.offsetHeight - newY;
        
        if (newWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = newWidth / this.resizeStartData.aspectRatio;
        }
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = newHeight * this.resizeStartData.aspectRatio;
        }
        
        newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, newWidth);
        newHeight = Math.max(Constants.MIN_BUBBLE_HEIGHT, newHeight);
        
        Object.assign(this.resizeBubble.style, {
            width: newWidth + 'px',
            height: newHeight + 'px',
            left: newX + 'px',
            top: newY + 'px'
        });
        
        this.handleManager.updateHandlePositions(this.resizeBubble);
        
        const bubbleData = this.bubbleManager.getBubbleData(this.resizeBubble);
        if (bubbleData) {
            Object.assign(bubbleData, { width: newWidth, height: newHeight, x: newX, y: newY });
            
            if (bubbleData.isDeformed || bubbleData.flipX || bubbleData.flipY) {
                this.controlPointManager.applyDeformationToBubble(this.resizeBubble, bubbleData);
            }
        }
    }
    
    updateGroupResize(scaleFactor, groupCenter, originalBounds) {
        if (!originalBounds || !groupCenter) {
            return;
        }
        
        const newBounds = new Map();
        
        originalBounds.forEach((bounds, element) => {
            const relativeCenterX = bounds.x + bounds.width / 2 - groupCenter.x;
            const relativeCenterY = bounds.y + bounds.height / 2 - groupCenter.y;
            
            const newRelativeCenterX = relativeCenterX * scaleFactor;
            const newRelativeCenterY = relativeCenterY * scaleFactor;
            const newWidth = bounds.width * scaleFactor;
            const newHeight = bounds.height * scaleFactor;
            
            const newX = groupCenter.x + newRelativeCenterX - newWidth / 2;
            const newY = groupCenter.y + newRelativeCenterY - newHeight / 2;
            
            const elementBounds = {
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight
            };
            
            newBounds.set(element, elementBounds);
        });
        
        const constrainedBounds = this.constrainGroupToCanvas(newBounds);
        
        constrainedBounds.forEach((bounds, element) => {
            this.applyElementResize(element, bounds);
        });
    }
    
    applyElementResize(element, newBounds) {
        const bubbleData = this.bubbleManager?.getBubbleData(element);
        if (bubbleData) {
            bubbleData.x = newBounds.x;
            bubbleData.y = newBounds.y;
            bubbleData.width = newBounds.width;
            bubbleData.height = newBounds.height;
            
            Object.assign(element.style, {
                left: newBounds.x + 'px',
                top: newBounds.y + 'px',
                width: newBounds.width + 'px',
                height: newBounds.height + 'px'
            });
            
            if (bubbleData.isDeformed || bubbleData.flipX || bubbleData.flipY) {
                this.controlPointManager.applyDeformationToBubble(element, bubbleData);
            }
            
            return;
        }
        
        const textElementManager = window.editor?.textElementManager;
        if (textElementManager) {
            const textData = textElementManager.getTextDataByElement(element);
            if (textData) {
                textElementManager.updateTextElementPosition(element, newBounds.x, newBounds.y);
                return;
            }
        }
        
        Object.assign(element.style, {
            left: newBounds.x + 'px',
            top: newBounds.y + 'px'
        });
    }
    
    constrainGroupToCanvas(elementBounds) {
        if (!elementBounds || elementBounds.size === 0) {
            return elementBounds;
        }
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        elementBounds.forEach((bounds) => {
            minX = Math.min(minX, bounds.x);
            minY = Math.min(minY, bounds.y);
            maxX = Math.max(maxX, bounds.x + bounds.width);
            maxY = Math.max(maxY, bounds.y + bounds.height);
        });
        
        const canvasWidth = this.canvasContainer.offsetWidth;
        const canvasHeight = this.canvasContainer.offsetHeight;
        
        let offsetX = 0;
        let offsetY = 0;
        
        if (minX < 0) {
            offsetX = -minX;
        } else if (maxX > canvasWidth) {
            offsetX = canvasWidth - maxX;
        }
        
        if (minY < 0) {
            offsetY = -minY;
        } else if (maxY > canvasHeight) {
            offsetY = canvasHeight - maxY;
        }
        
        if (offsetX !== 0 || offsetY !== 0) {
            const constrainedBounds = new Map();
            elementBounds.forEach((bounds, element) => {
                constrainedBounds.set(element, {
                    x: bounds.x + offsetX,
                    y: bounds.y + offsetY,
                    width: bounds.width,
                    height: bounds.height
                });
            });
            return constrainedBounds;
        }
        
        return elementBounds;
    }
    
    // ===== ROTATION MOVE =====
    
    handleRotationMove(event) {
        event.preventDefault();
        
        if (this.isGroupRotation) {
            console.log('Group rotation move - placeholder for Increment 3');
        }
        
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        const currentAngle = Math.atan2(
            event.clientY - containerRect.top - this.rotationStartData.centerY,
            event.clientX - containerRect.left - this.rotationStartData.centerX
        ) * 180 / Math.PI;
        
        const angleDiff = currentAngle - this.rotationStartData.startAngle;
        let newRotation = this.rotationStartData.startRotation + angleDiff;
        
        newRotation = ((newRotation % 360) + 360) % 360;
        
        const bubbleData = this.bubbleManager.getBubbleData(this.rotationBubble);
        if (bubbleData) {
            bubbleData.rotation = newRotation;
            
            if (bubbleData.isDeformed || bubbleData.flipX || bubbleData.flipY) {
                this.controlPointManager.applyDeformationToBubble(this.rotationBubble, bubbleData);
            } else {
                this.rotationBubble.style.transform = `rotate(${newRotation}deg)`;
            }
        } else {
            this.rotationBubble.style.transform = `rotate(${newRotation}deg)`;
        }
        
        this.handleManager.updateHandlePositions(this.rotationBubble);
    }
    
    // ===== MOUSE UP HANDLING (UPDATED WITH SELECTION PRESERVATION) =====
    
    handleMouseUp(event) {
        if (this.isControlPointDragging) {
            if (this.controlPointBubble) {
                const bubbleData = this.bubbleManager.getBubbleData(this.controlPointBubble);
                if (bubbleData) {
                    this.controlPointManager.applyDeformationToBubble(this.controlPointBubble, bubbleData);
                }
            }
            
            if (this.controlPointBubble && this.controlPointDirection) {
                const handle = this.controlPointBubble.controlPointHandles?.querySelector(`.control-point-${this.controlPointDirection}`);
                this.setControlPointDragVisualState(false, handle);
            }
            
            if (this.deformationThrottle) {
                cancelAnimationFrame(this.deformationThrottle);
                this.deformationThrottle = null;
            }
            
            // FIXED: Restore selection state after control point operation
            // Add small delay to ensure all cleanup is complete before restoring selection
            setTimeout(() => {
                this.restoreSelectionStateAfterControlPoint();
            }, 10);
            
            this.isControlPointDragging = false;
            this.controlPointBubble = null;
            this.controlPointDirection = null;
            this.controlPointStartData = null;
        }
        
        if (this.isDragging) {
            // Clean up dragging state flag
            if (this.draggedElement) {
                this.draggedElement.removeAttribute('data-dragging');
            }
            
            if (this.isGroupDrag) {
                this.cleanupGroupDrag();
            } else {
                if (this.draggedElement) {
                    this.draggedElement.style.opacity = '1';
                    // Reset z-index based on element type
                    const bubbleData = this.bubbleManager?.getBubbleData(this.draggedElement);
                    if (bubbleData) {
                        this.draggedElement.style.zIndex = Constants.BUBBLE_Z_INDEX;
                    } else {
                        this.draggedElement.style.zIndex = '50'; // Text z-index
                    }
                }
            }
            
            this.isDragging = false;
            this.draggedElement = null;
            this.dragOffset = { x: 0, y: 0 };
        }
        
        if (this.isResizing) {
            if (this.isGroupResize) {
                this.cleanupGroupTransformationState();
            } else {
                if (this.resizeBubble) {
                    this.resizeBubble.style.opacity = '1';
                }
            }
            
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeBubble = null;
            this.resizeStartData = null;
        }
        
        if (this.isRotating) {
            if (this.isGroupRotation) {
                this.cleanupGroupTransformationState();
            } else {
                if (this.rotationBubble) {
                    this.rotationBubble.style.opacity = '1';
                }
            }
            
            this.isRotating = false;
            this.rotationBubble = null;
            this.rotationStartData = null;
        }
    }
    
    // ===== KEYBOARD HANDLING =====
    
    handleKeyDown(event) {
        const isTyping = event.target.tagName === 'INPUT' || 
                        event.target.tagName === 'TEXTAREA' ||
                        event.target.isContentEditable ||
                        document.querySelector('.text-editor-modal[style*="block"]');
        
        if (isTyping) {
            if (event.key === 'Escape') {
                // Add escape handling for control point operations
                if (this.isControlPointDragging) {
                    this.cancelControlPointOperation();
                }
                return;
            }
            return;
        }
        
        const selectedBubble = this.bubbleManager.getSelectedBubble();
        
        if (event.ctrlKey && (event.key === 'r' || event.key === 'R' || event.code === 'KeyR')) {
            event.preventDefault();
            event.stopPropagation();
            
            if (selectedBubble) {
                this.resetBubbleShape(selectedBubble);
                window.editor?.uiController?.forceUpdateBubbleControls();
            }
            return;
        }
        
        if (event.ctrlKey && (event.key === 't' || event.key === 'T') && !event.altKey) {
            event.preventDefault();
            window.editor?.addTextElement();
            return;
        }
        
        if (event.ctrlKey && (event.key === 'l' || event.key === 'L') && !event.altKey) {
            event.preventDefault();
            window.editor?.groupSelectedElements();
            return;
        }
        
        if (event.ctrlKey && (event.key === 'u' || event.key === 'U') && !event.altKey) {
            event.preventDefault();
            window.editor?.ungroupSelectedElements();
            return;
        }
        
        if ((event.key === 'h' || event.key === 'H') && selectedBubble && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            window.editor?.flipSelectedBubbleHorizontal() || this.bubbleManager.flipBubbleHorizontal(selectedBubble);
            window.editor?.uiController?.forceUpdateBubbleControls();
            return;
        }
        
        if ((event.key === 'v' || event.key === 'V') && selectedBubble && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            window.editor?.flipSelectedBubbleVertical() || this.bubbleManager.flipBubbleVertical(selectedBubble);
            window.editor?.uiController?.forceUpdateBubbleControls();
            return;
        }
        
        if (event.key === 'Delete') {
            event.preventDefault();
            
            if (window.editor?.selectionManager) {
                const selectedTexts = window.editor.selectionManager.getSelectedByType('text');
                if (selectedTexts.length > 0) {
                    window.editor.deleteSelectedText();
                    return;
                }
            }
            
            if (selectedBubble) {
                window.editor?.deleteSelectedBubble() || this.bubbleManager.deleteBubble(selectedBubble);
            }
            return;
        }
        
        if (event.key === 'Escape') {
            // Handle escape key for control point operations
            if (this.isControlPointDragging) {
                this.cancelControlPointOperation();
            }
            return;
        }
        
        if (event.ctrlKey && event.key === 'd') {
            event.preventDefault();
            event.stopPropagation();
            
            if (window.editor?.selectionManager) {
                const selectionManager = window.editor.selectionManager;
                if (selectionManager.hasSelection()) {
                    selectionManager.copySelected();
                    return;
                }
            }
            
            if (selectedBubble) {
                window.editor?.copySelectedBubble() || this.bubbleManager.copyBubble(selectedBubble);
            }
            return;
        }
    }
    
    /**
     * Cancel control point operation (e.g., on Escape key)
     */
    cancelControlPointOperation() {
        if (!this.isControlPointDragging) return;
        
        console.log('Cancelling control point operation');
        
        // Clean up visual state
        if (this.controlPointBubble && this.controlPointDirection) {
            const handle = this.controlPointBubble.controlPointHandles?.querySelector(`.control-point-${this.controlPointDirection}`);
            this.setControlPointDragVisualState(false, handle);
        }
        
        // Clean up throttled operations
        if (this.deformationThrottle) {
            cancelAnimationFrame(this.deformationThrottle);
            this.deformationThrottle = null;
        }
        
        // Restore selection state
        this.restoreSelectionStateAfterControlPoint();
        
        // Reset control point state
        this.isControlPointDragging = false;
        this.controlPointBubble = null;
        this.controlPointDirection = null;
        this.controlPointStartData = null;
    }
    
    setControlPointDragVisualState(isDragging, handle) {
        if (!handle) return;
        
        if (isDragging) {
            handle.style.backgroundColor = Constants.CONTROL_POINT_DRAG_COLOR;
            handle.style.transform = handle.style.transform.replace('rotate(45deg)', 'rotate(45deg) scale(1.2)');
            handle.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            handle.style.borderColor = '#FFF';
            handle.style.zIndex = '1000';
            this.canvasContainer.style.cursor = 'move';
        } else {
            handle.style.backgroundColor = Constants.CONTROL_POINT_COLOR;
            handle.style.transform = handle.style.transform.replace('scale(1.2)', '');
            handle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            handle.style.borderColor = '#fff';
            handle.style.zIndex = '';
            this.canvasContainer.style.cursor = '';
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionManager;
}