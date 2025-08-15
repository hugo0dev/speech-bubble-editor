/**
 * InteractionManager - Handles user interactions (Updated with Group Movement)
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
        
        // NEW: Group drag state (exposed for TextElementManager coordination)
        this.isGroupDrag = false;
        this.groupMembers = [];
        this.relativeOffsets = new Map(); // element -> {x: offsetX, y: offsetY}
        this.draggedElement = null; // The element being directly dragged (exposed for text coordination)
        
        // Resize state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeBubble = null;
        this.resizeStartData = null;
        
        // Rotation state
        this.isRotating = false;
        this.rotationBubble = null;
        this.rotationStartData = null;
        
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
    
    // NEW: Detect if dragged element is part of a group
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
    
    // NEW: Calculate relative positions between dragged element and group members
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
    
    // NEW: Get element position (works for both bubbles and text)
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
    
    // NEW: Update positions for all group members
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
    
    // NEW: Update element position (handles both bubbles and text)
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
    
    // NEW: Constrain element to canvas boundaries
    constrainToCanvas(element, x, y) {
        const elementWidth = element.offsetWidth || 50;
        const elementHeight = element.offsetHeight || 50;
        
        const constrainedX = Math.max(0, Math.min(x, this.canvasContainer.offsetWidth - elementWidth));
        const constrainedY = Math.max(0, Math.min(y, this.canvasContainer.offsetHeight - elementHeight));
        
        return { x: constrainedX, y: constrainedY };
    }
    
    // NEW: Apply visual feedback during group drag
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
    
    // NEW: Clean up group drag state
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
    
    // MODIFIED: Enhanced to support group dragging
    handleBubbleMouseDown(event, bubbleElement) {
        if (event.target.classList.contains('resize-handle') || 
            event.target.classList.contains('rotation-handle') ||
            event.target.classList.contains('control-point-handle')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        this.bubbleManager.selectBubble(bubbleElement);
        
        // NEW: Check for group drag
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
    
    handleResizeMouseDown(event, handlePosition, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
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
        
        bubbleElement.style.opacity = '0.8';
    }
    
    handleRotationMouseDown(event, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
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
        
        bubbleElement.style.opacity = '0.8';
    }
    
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
    
    // MODIFIED: Enhanced to support group dragging
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
        
        // NEW: Handle group vs individual dragging
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
    
    handleResizeMove(event) {
        event.preventDefault();
        
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
    
    handleRotationMove(event) {
        event.preventDefault();
        
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
    
    // MODIFIED: Enhanced to handle group cleanup
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
            // NEW: Handle group drag cleanup
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
            if (this.resizeBubble) {
                this.resizeBubble.style.opacity = '1';
            }
            
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeBubble = null;
            this.resizeStartData = null;
        }
        
        if (this.isRotating) {
            if (this.rotationBubble) {
                this.rotationBubble.style.opacity = '1';
            }
            
            this.isRotating = false;
            this.rotationBubble = null;
            this.rotationStartData = null;
        }
    }
    
    // UPDATED handleKeyDown method for InteractionManager.js:

    handleKeyDown(event) {
        // DON'T PROCESS SHORTCUTS IF USER IS TYPING
        // Check if user is typing in an input field or text editor is active
        const isTyping = event.target.tagName === 'INPUT' || 
                        event.target.tagName === 'TEXTAREA' ||
                        event.target.isContentEditable ||
                        document.querySelector('.text-editor-modal[style*="block"]'); // Text editor modal is visible
        
        if (isTyping) {
            // Allow normal typing behavior, don't process shortcuts
            // Exception: Still allow Escape to work in text editor
            if (event.key === 'Escape') {
                // Let the text editor handle Escape
                return;
            }
            // For all other keys, let them work normally in the input
            return;
        }
        
        const selectedBubble = this.bubbleManager.getSelectedBubble();
        
        // Always intercept Ctrl+R to prevent page refresh (only when not typing)
        if (event.ctrlKey && (event.key === 'r' || event.key === 'R' || event.code === 'KeyR')) {
            event.preventDefault();
            event.stopPropagation();
            
            // Only reset if there's a selected bubble
            if (selectedBubble) {
                this.resetBubbleShape(selectedBubble);
                window.editor?.uiController?.forceUpdateBubbleControls();
            }
            return;
        }
        
        // ===== NEW TEXT SHORTCUTS =====
        
        // Ctrl+T - Add Text
        if (event.ctrlKey && (event.key === 't' || event.key === 'T') && !event.altKey) {
            event.preventDefault();
            window.editor?.addTextElement();
            return;
        }
        
        // Ctrl+L - Group Elements (updated from Link Text)
        if (event.ctrlKey && (event.key === 'l' || event.key === 'L') && !event.altKey) {
            event.preventDefault();
            window.editor?.groupSelectedElements();
            return;
        }
        
        // Ctrl+U - Ungroup Elements (updated from Unlink Text)
        if (event.ctrlKey && (event.key === 'u' || event.key === 'U') && !event.altKey) {
            event.preventDefault();
            window.editor?.ungroupSelectedElements();
            return;
        }
        
        // ===== EXISTING BUBBLE SHORTCUTS (unchanged) =====
        
        // Flip horizontal with H key
        if ((event.key === 'h' || event.key === 'H') && selectedBubble && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            window.editor?.flipSelectedBubbleHorizontal() || this.bubbleManager.flipBubbleHorizontal(selectedBubble);
            window.editor?.uiController?.forceUpdateBubbleControls();
            return;
        }
        
        // Flip vertical with V key
        if ((event.key === 'v' || event.key === 'V') && selectedBubble && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            window.editor?.flipSelectedBubbleVertical() || this.bubbleManager.flipBubbleVertical(selectedBubble);
            window.editor?.uiController?.forceUpdateBubbleControls();
            return;
        }
        
        // Delete key - Delete selected (bubbles or text)
        if (event.key === 'Delete') {
            event.preventDefault();
            
            // Check if text is selected via selection manager
            if (window.editor?.selectionManager) {
                const selectedTexts = window.editor.selectionManager.getSelectedByType('text');
                if (selectedTexts.length > 0) {
                    window.editor.deleteSelectedText();
                    return;
                }
            }
            
            // Fall back to bubble deletion
            if (selectedBubble) {
                window.editor?.deleteSelectedBubble() || this.bubbleManager.deleteBubble(selectedBubble);
            }
            return;
        }
        
        if (event.ctrlKey && event.key === 'd' && selectedBubble) {
            event.preventDefault();
            window.editor?.copySelectedBubble() || this.bubbleManager.copyBubble(selectedBubble);
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