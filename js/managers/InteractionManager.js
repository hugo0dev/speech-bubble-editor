/**
 * InteractionManager - Handles user interactions (Updated with Group Transformation - Phase 1)
 */
class InteractionManager {
    constructor(canvasContainer, bubbleManager, handleManager, controlPointManager) {
        this.canvasContainer = canvasContainer;
        this.bubbleManager = bubbleManager;
        this.handleManager = handleManager;
        this.controlPointManager = controlPointManager;
        
        // Existing drag state
        this.isDragging = false;
        this.draggedBubble = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Existing group drag state (from Phase 3)
        this.isGroupDrag = false;
        this.groupMembers = [];
        this.relativeOffsets = new Map();
        this.draggedElement = null;
        
        // Existing resize state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeBubble = null;
        this.resizeStartData = null;
        
        // Existing rotation state
        this.isRotating = false;
        this.rotationBubble = null;
        this.rotationStartData = null;
        
        // NEW: Group transformation states (Phase 4 - Increment 1)
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
        
        // Deformation optimization
        this.deformationThrottle = null;
        this.lastDeformationUpdate = 0;
        this.deformationUpdateInterval = 16; // ~60fps
        
        this.initEventListeners();
    }
    
    // ===== NEW: GROUP TRANSFORMATION DETECTION FUNCTIONS (Phase 4 - Increment 1) =====
    
    /**
     * Detect if resize operation should be handled as group transformation
     * @param {HTMLElement} element - Element being resized
     * @returns {boolean} - True if group resize should be handled
     */
    detectGroupResizeStart(element) {
        // Get SelectionManager from global reference
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            return false;
        }
        
        // Check if element is part of a group
        const groupId = selectionManager.getElementGroup(element);
        if (!groupId) {
            return false;
        }
        
        // Get all group members
        const groupMembers = selectionManager.getGroupMembers(groupId);
        if (groupMembers.length < 2) {
            return false; // Not really a group anymore
        }
        
        console.log(`Group resize detected: ${groupMembers.length} members`);
        
        // Initialize group resize state
        this.initializeGroupResizeState(groupMembers, element);
        
        return true;
    }
    
    /**
     * Detect if rotation operation should be handled as group transformation
     * @param {HTMLElement} element - Element being rotated
     * @returns {boolean} - True if group rotation should be handled
     */
    detectGroupRotationStart(element) {
        // Get SelectionManager from global reference
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            return false;
        }
        
        // Check if element is part of a group
        const groupId = selectionManager.getElementGroup(element);
        if (!groupId) {
            return false;
        }
        
        // Get all group members
        const groupMembers = selectionManager.getGroupMembers(groupId);
        if (groupMembers.length < 2) {
            return false; // Not really a group anymore
        }
        
        console.log(`Group rotation detected: ${groupMembers.length} members`);
        
        // Initialize group rotation state
        this.initializeGroupRotationState(groupMembers, element);
        
        return true;
    }
    
    // ===== NEW: GROUP BOUNDS CALCULATION FUNCTIONS (Phase 4 - Increment 1) =====
    
    /**
     * Calculate overall bounds of a group of elements
     * @param {Array} groupMembers - Array of DOM elements in the group
     * @returns {Object} - Bounds object with center point
     */
    calculateGroupBounds(groupMembers) {
        if (!groupMembers || groupMembers.length === 0) {
            return null;
        }
        
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        // Iterate through all group members to find overall bounds
        groupMembers.forEach(element => {
            const bounds = this.getElementBounds(element);
            if (bounds) {
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, bounds.x + bounds.width);
                maxY = Math.max(maxY, bounds.y + bounds.height);
            }
        });
        
        // Calculate group bounds and center
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
    
    /**
     * Get bounds for any element type (bubble or text)
     * @param {HTMLElement} element - DOM element
     * @returns {Object} - Bounds object {x, y, width, height}
     */
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
    
    // ===== NEW: STATE MANAGEMENT FUNCTIONS (Phase 4 - Increment 1) =====
    
    /**
     * Initialize state for group resize operation
     * @param {Array} groupMembers - Elements in the group
     * @param {HTMLElement} primaryElement - Element being directly manipulated
     */
    initializeGroupResizeState(groupMembers, primaryElement) {
        this.isGroupResize = true;
        this.groupResizeMembers = [...groupMembers];
        this.primaryTransformElement = primaryElement;
        
        // Calculate initial group bounds and center
        this.groupOriginalBounds = this.calculateGroupBounds(groupMembers);
        this.groupTransformCenter = {
            x: this.groupOriginalBounds.centerX,
            y: this.groupOriginalBounds.centerY
        };
        
        // Store original bounds for each group member
        const memberBounds = new Map();
        groupMembers.forEach(member => {
            const bounds = this.getElementBounds(member);
            memberBounds.set(member, bounds);
        });
        this.groupOriginalPositions = memberBounds;
        
        // Apply visual feedback
        this.applyGroupTransformationVisualFeedback(groupMembers, true);
        
        console.log('Group resize state initialized:', {
            memberCount: groupMembers.length,
            center: this.groupTransformCenter,
            bounds: this.groupOriginalBounds
        });
    }
    
    /**
     * Initialize state for group rotation operation
     * @param {Array} groupMembers - Elements in the group
     * @param {HTMLElement} primaryElement - Element being directly manipulated
     */
    initializeGroupRotationState(groupMembers, primaryElement) {
        this.isGroupRotation = true;
        this.groupRotationMembers = [...groupMembers];
        this.primaryTransformElement = primaryElement;
        
        // Calculate initial group center
        const groupBounds = this.calculateGroupBounds(groupMembers);
        this.groupTransformCenter = {
            x: groupBounds.centerX,
            y: groupBounds.centerY
        };
        
        // Store original positions relative to group center
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
        
        // Apply visual feedback
        this.applyGroupTransformationVisualFeedback(groupMembers, true);
        
        console.log('Group rotation state initialized:', {
            memberCount: groupMembers.length,
            center: this.groupTransformCenter
        });
    }
    
    /**
     * Clean up group transformation state
     */
    cleanupGroupTransformationState() {
        if (this.isGroupResize || this.isGroupRotation) {
            console.log('Cleaning up group transformation state');
            
            // Remove visual feedback
            const allMembers = [...this.groupResizeMembers, ...this.groupRotationMembers];
            if (allMembers.length > 0) {
                this.applyGroupTransformationVisualFeedback(allMembers, false);
            }
            
            // Update handles for any bubbles in the group
            allMembers.forEach(member => {
                const bubbleData = this.bubbleManager?.getBubbleData(member);
                if (bubbleData && this.handleManager) {
                    this.handleManager.updateHandlePositions(member);
                }
            });
        }
        
        // Reset group transformation state
        this.isGroupResize = false;
        this.isGroupRotation = false;
        this.groupResizeMembers = [];
        this.groupRotationMembers = [];
        this.groupTransformCenter = null;
        this.groupOriginalBounds = null;
        this.groupOriginalPositions = null;
        this.primaryTransformElement = null;
    }
    
    // ===== NEW: VISUAL FEEDBACK FUNCTIONS (Phase 4 - Increment 1) =====
    
    /**
     * Apply visual feedback during group transformations
     * @param {Array} groupMembers - Elements in the group
     * @param {boolean} isActive - Whether to show or hide feedback
     */
    applyGroupTransformationVisualFeedback(groupMembers, isActive) {
        groupMembers.forEach(member => {
            if (isActive) {
                // Apply transformation visual feedback (different from group movement)
                member.style.boxShadow = '0 0 0 2px #FF9800, 0 0 12px rgba(255, 152, 0, 0.6)';
                member.style.transition = 'box-shadow 0.2s ease';
                member.style.opacity = '0.9';
            } else {
                // Remove transformation visual feedback
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
    
    // ===== EXISTING GROUP DRAG FUNCTIONALITY (Phase 3 - preserved) =====
    
    detectGroupDragStart(element) {
        // Get SelectionManager from global reference
        const selectionManager = window.selectionManager || window.editor?.selectionManager;
        if (!selectionManager) {
            return false;
        }
        
        // Check if element is part of a group
        const groupId = selectionManager.getElementGroup(element);
        if (!groupId) {
            return false;
        }
        
        // Get all group members
        const groupMembers = selectionManager.getGroupMembers(groupId);
        if (groupMembers.length < 2) {
            return false; // Not really a group anymore
        }
        
        // Store group drag state
        this.isGroupDrag = true;
        this.groupMembers = groupMembers;
        this.draggedElement = element;
        
        // Calculate relative positions
        this.relativeOffsets = this.calculateGroupRelativePositions(element, groupMembers);
        
        // Apply visual feedback
        this.applyGroupDragVisualFeedback(groupMembers, true);
        
        console.log(`Group drag detected: ${groupMembers.length} members`);
        return true;
    }
    
    calculateGroupRelativePositions(draggedElement, groupMembers) {
        const relativeOffsets = new Map();
        
        // Get dragged element position
        const draggedPos = this.getElementPosition(draggedElement);
        if (!draggedPos) {
            return relativeOffsets;
        }
        
        // Calculate relative offsets for each group member
        groupMembers.forEach(member => {
            if (member === draggedElement) {
                return; // Skip the dragged element itself
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
        
        // Fallback to element style (less reliable)
        const x = parseFloat(element.style.left) || 0;
        const y = parseFloat(element.style.top) || 0;
        return { x, y };
    }
    
    updateGroupPositions(newDraggedX, newDraggedY) {
        if (!this.isGroupDrag || !this.draggedElement) {
            return;
        }
        
        // Update dragged element position first
        this.updateElementPosition(this.draggedElement, newDraggedX, newDraggedY);
        
        // Update other group members using relative offsets
        this.relativeOffsets.forEach((offset, member) => {
            const newX = newDraggedX + offset.x;
            const newY = newDraggedY + offset.y;
            
            // Apply boundary constraints
            const constrainedPos = this.constrainToCanvas(member, newX, newY);
            this.updateElementPosition(member, constrainedPos.x, constrainedPos.y);
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
            
            // Update handles if this is the main dragged element
            if (element === this.draggedBubble || element === this.draggedElement) {
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
        
        // Remove visual feedback
        this.applyGroupDragVisualFeedback(this.groupMembers, false);
        
        // Update handles for any bubbles in the group
        this.groupMembers.forEach(member => {
            const bubbleData = this.bubbleManager?.getBubbleData(member);
            if (bubbleData && this.handleManager) {
                this.handleManager.updateHandlePositions(member);
            }
        });
        
        // Reset group drag state
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
            // Fix: Check for ID 'background-image' not class, and also check if clicking on container itself
            if (e.target === this.canvasContainer || e.target.id === 'background-image') {
                this.bubbleManager.deselectBubble();
            }
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        this.canvasContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.speech-bubble')) {
                this.handleBubbleMouseDown(e, e.target.closest('.speech-bubble'));
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
        this.draggedBubble = bubbleElement;
        
        // Get the bubble data to use stored position instead of visual position
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        if (bubbleData) {
            // Calculate offset from the stored position, not the transformed visual position
            // This prevents jumping when dragging deformed bubbles
            const bubbleLeft = bubbleData.x + containerRect.left;
            const bubbleTop = bubbleData.y + containerRect.top;
            
            this.dragOffset.x = event.clientX - bubbleLeft;
            this.dragOffset.y = event.clientY - bubbleTop;
        } else {
            // Fallback to old method if no bubble data
            const bubbleRect = bubbleElement.getBoundingClientRect();
            this.dragOffset.x = event.clientX - bubbleRect.left;
            this.dragOffset.y = event.clientY - bubbleRect.top;
        }
        
        // Apply visual feedback (already handled in group detection if it's a group)
        if (!isGroupDrag) {
            bubbleElement.style.opacity = '0.8';
            bubbleElement.style.zIndex = '100';
        }
    }
    
    // ===== MODIFIED: RESIZE HANDLING WITH GROUP DETECTION (Phase 4 - Increment 1) =====
    
    handleResizeMouseDown(event, handlePosition, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        // NEW: Check for group resize first
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
        
        // Apply visual feedback (group feedback already applied if group resize)
        if (!isGroupResize) {
            bubbleElement.style.opacity = '0.8';
        }
    }
    
    // ===== MODIFIED: ROTATION HANDLING WITH GROUP DETECTION (Phase 4 - Increment 1) =====
    
    handleRotationMouseDown(event, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        // NEW: Check for group rotation first
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
        
        // Apply visual feedback (group feedback already applied if group rotation)
        if (!isGroupRotation) {
            bubbleElement.style.opacity = '0.8';
        }
    }
    
    // ===== EXISTING CONTROL POINT HANDLING (unchanged) =====
    
    handleControlPointMouseDown(event, direction, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
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
            
            // Apply deformation which will now preserve rotation
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
        const bubbleWidth = this.draggedBubble.offsetWidth;
        const bubbleHeight = this.draggedBubble.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, this.canvasContainer.offsetWidth - bubbleWidth));
        newY = Math.max(0, Math.min(newY, this.canvasContainer.offsetHeight - bubbleHeight));
        
        // Handle group vs individual dragging
        if (this.isGroupDrag) {
            // Update entire group
            this.updateGroupPositions(newX, newY);
        } else {
            // Update individual element
            this.draggedBubble.style.left = newX + 'px';
            this.draggedBubble.style.top = newY + 'px';
            
            this.handleManager.updateHandlePositions(this.draggedBubble);
            
            const bubbleData = this.bubbleManager.getBubbleData(this.draggedBubble);
            if (bubbleData) {
                bubbleData.x = newX;
                bubbleData.y = newY;
            }
        }
    }
    
    // ===== GROUP RESIZE IMPLEMENTATION (Phase 4 - Increment 2) =====
    
    handleResizeMove(event) {
        event.preventDefault();
        
        if (this.isGroupResize) {
            // Handle group resize operation
            this.handleGroupResizeMove(event);
        } else {
            // Handle individual resize operation
            this.handleIndividualResizeMove(event);
        }
    }
    
    /**
     * Handle group resize movement
     * @param {MouseEvent} event - Mouse move event
     */
    handleGroupResizeMove(event) {
        if (!this.groupResizeMembers.length || !this.groupTransformCenter || !this.resizeStartData) {
            return;
        }
        
        // Calculate scale factor based on primary element's resize
        const deltaX = event.clientX - this.resizeStartData.mouseX;
        const deltaY = event.clientY - this.resizeStartData.mouseY;
        
        // Determine scale factor based on resize handle direction
        let scaleFactor = 1.0;
        const delta = this.resizeHandle.includes('e') ? deltaX : -deltaX;
        const newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width + delta);
        scaleFactor = newWidth / this.resizeStartData.width;
        
        // Constrain scale factor to reasonable limits
        scaleFactor = Math.max(0.3, Math.min(3.0, scaleFactor));
        
        // Apply group resize transformation
        this.updateGroupResize(scaleFactor, this.groupTransformCenter, this.groupOriginalPositions);
        
        // Update handles for the primary element only
        if (this.primaryTransformElement && this.handleManager) {
            this.handleManager.updateHandlePositions(this.primaryTransformElement);
        }
    }
    
    /**
     * Handle individual resize movement (existing logic)
     * @param {MouseEvent} event - Mouse move event
     */
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
    
    /**
     * Update all group members during resize operation
     * @param {number} scaleFactor - Scale factor for the resize
     * @param {Object} groupCenter - Center point of the group {x, y}
     * @param {Map} originalBounds - Original bounds of group members
     */
    updateGroupResize(scaleFactor, groupCenter, originalBounds) {
        if (!originalBounds || !groupCenter) {
            return;
        }
        
        // Calculate new bounds for all group members
        const newBounds = new Map();
        
        originalBounds.forEach((bounds, element) => {
            // Calculate new position relative to group center
            const relativeCenterX = bounds.x + bounds.width / 2 - groupCenter.x;
            const relativeCenterY = bounds.y + bounds.height / 2 - groupCenter.y;
            
            // Scale the relative position and size
            const newRelativeCenterX = relativeCenterX * scaleFactor;
            const newRelativeCenterY = relativeCenterY * scaleFactor;
            const newWidth = bounds.width * scaleFactor;
            const newHeight = bounds.height * scaleFactor;
            
            // Calculate new absolute position
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
        
        // Apply boundary constraints to the entire group
        const constrainedBounds = this.constrainGroupToCanvas(newBounds);
        
        // Apply new bounds to all group members
        constrainedBounds.forEach((bounds, element) => {
            this.applyElementResize(element, bounds);
        });
    }
    
    /**
     * Apply resize to individual element within group
     * @param {HTMLElement} element - Element to resize
     * @param {Object} newBounds - New bounds {x, y, width, height}
     */
    applyElementResize(element, newBounds) {
        // Try to apply as bubble first
        const bubbleData = this.bubbleManager?.getBubbleData(element);
        if (bubbleData) {
            // Update bubble data
            bubbleData.x = newBounds.x;
            bubbleData.y = newBounds.y;
            bubbleData.width = newBounds.width;
            bubbleData.height = newBounds.height;
            
            // Update element styles
            Object.assign(element.style, {
                left: newBounds.x + 'px',
                top: newBounds.y + 'px',
                width: newBounds.width + 'px',
                height: newBounds.height + 'px'
            });
            
            // Apply deformation if needed
            if (bubbleData.isDeformed || bubbleData.flipX || bubbleData.flipY) {
                this.controlPointManager.applyDeformationToBubble(element, bubbleData);
            }
            
            return;
        }
        
        // Try to apply as text element
        const textElementManager = window.editor?.textElementManager;
        if (textElementManager) {
            const textData = textElementManager.getTextDataByElement(element);
            if (textData) {
                // For text elements, scale position but keep font size for now
                // Future enhancement could scale font size proportionally
                textElementManager.updateTextElementPosition(element, newBounds.x, newBounds.y);
                return;
            }
        }
        
        // Fallback: update element style directly
        Object.assign(element.style, {
            left: newBounds.x + 'px',
            top: newBounds.y + 'px'
        });
    }
    
    /**
     * Apply boundary constraints to group during transformation
     * @param {Map} elementBounds - Map of element to bounds
     * @returns {Map} - Constrained bounds
     */
    constrainGroupToCanvas(elementBounds) {
        if (!elementBounds || elementBounds.size === 0) {
            return elementBounds;
        }
        
        // Find the overall bounds of the transformed group
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
        
        // Calculate how much the group exceeds canvas boundaries
        const canvasWidth = this.canvasContainer.offsetWidth;
        const canvasHeight = this.canvasContainer.offsetHeight;
        
        let offsetX = 0;
        let offsetY = 0;
        
        // Check left boundary
        if (minX < 0) {
            offsetX = -minX;
        }
        // Check right boundary
        else if (maxX > canvasWidth) {
            offsetX = canvasWidth - maxX;
        }
        
        // Check top boundary
        if (minY < 0) {
            offsetY = -minY;
        }
        // Check bottom boundary
        else if (maxY > canvasHeight) {
            offsetY = canvasHeight - maxY;
        }
        
        // Apply offset to all elements if needed
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
    
    // ===== ROTATION MOVE - WILL BE ENHANCED IN NEXT INCREMENT =====
    
    handleRotationMove(event) {
        event.preventDefault();
        
        // TODO: Phase 4 - Increment 3 will add group rotation logic here
        // For now, handle individual rotation only
        if (this.isGroupRotation) {
            console.log('Group rotation move - placeholder for Increment 3');
            // Placeholder: Individual rotation behavior for now
        }
        
        // Existing individual rotation logic
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        const currentAngle = Math.atan2(
            event.clientY - containerRect.top - this.rotationStartData.centerY,
            event.clientX - containerRect.left - this.rotationStartData.centerX
        ) * 180 / Math.PI;
        
        const angleDiff = currentAngle - this.rotationStartData.startAngle;
        let newRotation = this.rotationStartData.startRotation + angleDiff;
        
        newRotation = ((newRotation % 360) + 360) % 360;
        
        // Get bubble data to check if deformed or flipped
        const bubbleData = this.bubbleManager.getBubbleData(this.rotationBubble);
        if (bubbleData) {
            // Update rotation in data
            bubbleData.rotation = newRotation;
            
            if (bubbleData.isDeformed || bubbleData.flipX || bubbleData.flipY) {
                // If deformed or flipped, let ControlPointManager handle the combined transform
                this.controlPointManager.applyDeformationToBubble(this.rotationBubble, bubbleData);
            } else {
                // If not deformed or flipped, apply rotation directly
                this.rotationBubble.style.transform = `rotate(${newRotation}deg)`;
            }
        } else {
            // Fallback if no bubble data
            this.rotationBubble.style.transform = `rotate(${newRotation}deg)`;
        }
        
        this.handleManager.updateHandlePositions(this.rotationBubble);
    }
    
    // ===== MODIFIED: MOUSE UP WITH GROUP TRANSFORMATION CLEANUP (Phase 4 - Increment 1) =====
    
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
            
            this.isControlPointDragging = false;
            this.controlPointBubble = null;
            this.controlPointDirection = null;
            this.controlPointStartData = null;
        }
        
        if (this.isDragging) {
            // Handle group drag cleanup
            if (this.isGroupDrag) {
                this.cleanupGroupDrag();
            } else {
                // Individual bubble cleanup
                if (this.draggedBubble) {
                    this.draggedBubble.style.opacity = '1';
                    this.draggedBubble.style.zIndex = Constants.BUBBLE_Z_INDEX;
                }
            }
            
            this.isDragging = false;
            this.draggedBubble = null;
            this.dragOffset = { x: 0, y: 0 };
        }
        
        if (this.isResizing) {
            // NEW: Clean up group resize state
            if (this.isGroupResize) {
                this.cleanupGroupTransformationState();
            } else {
                // Individual resize cleanup
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
            // NEW: Clean up group rotation state
            if (this.isGroupRotation) {
                this.cleanupGroupTransformationState();
            } else {
                // Individual rotation cleanup
                if (this.rotationBubble) {
                    this.rotationBubble.style.opacity = '1';
                }
            }
            
            this.isRotating = false;
            this.rotationBubble = null;
            this.rotationStartData = null;
        }
    }
    
    // ===== KEYBOARD HANDLING (unchanged) =====
    
    handleKeyDown(event) {
        // DON'T PROCESS SHORTCUTS IF USER IS TYPING
        const isTyping = event.target.tagName === 'INPUT' || 
                        event.target.tagName === 'TEXTAREA' ||
                        event.target.isContentEditable ||
                        document.querySelector('.text-editor-modal[style*="block"]');
        
        if (isTyping) {
            if (event.key === 'Escape') {
                return;
            }
            return;
        }
        
        const selectedBubble = this.bubbleManager.getSelectedBubble();
        
        // Always intercept Ctrl+R to prevent page refresh
        if (event.ctrlKey && (event.key === 'r' || event.key === 'R' || event.code === 'KeyR')) {
            event.preventDefault();
            event.stopPropagation();
            
            if (selectedBubble) {
                this.resetBubbleShape(selectedBubble);
                window.editor?.uiController?.forceUpdateBubbleControls();
            }
            return;
        }
        
        // Text shortcuts
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
        
        // Flip shortcuts
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
        
        // Delete key
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
        
        // Ctrl+D - Copy
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