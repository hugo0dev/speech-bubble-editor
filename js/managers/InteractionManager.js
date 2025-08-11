/**
 * InteractionManager - Fixed Ctrl+R and Control Point Positioning Issues
 * FIXES: Issue #1 (Ctrl+R) and Issue #2 (Control point visual positioning)
 */
class InteractionManager {
    constructor(canvasContainer, bubbleManager, handleManager, controlPointManager) {
        this.canvasContainer = canvasContainer;
        this.bubbleManager = bubbleManager;
        this.handleManager = handleManager;
        this.controlPointManager = controlPointManager;
        
        // Drag state
        this.isDragging = false;
        this.draggedBubble = null;
        this.dragOffset = { x: 0, y: 0 };
        
        // Resize state
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeBubble = null;
        this.resizeStartData = null;
        
        // Rotation state
        this.isRotating = false;
        this.rotationBubble = null;
        this.rotationStartData = null;
        
        // Control point state (Phase 9.2 + 9.3)
        this.isControlPointDragging = false;
        this.controlPointBubble = null;
        this.controlPointDirection = null;
        this.controlPointStartData = null;
        
        // Deformation performance optimization
        this.deformationThrottle = null;
        this.lastDeformationUpdate = 0;
        this.deformationUpdateInterval = 16; // ~60fps
        
        this.initEventListeners();
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Global mouse event listeners
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Click outside to deselect
        this.canvasContainer.addEventListener('click', (e) => {
            if (e.target === this.canvasContainer || e.target.classList.contains('background-image')) {
                this.bubbleManager.deselectBubble();
            }
        });
        
        // Keyboard event listeners
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Bubble mouse down events (handled via delegation)
        this.canvasContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.speech-bubble')) {
                this.handleBubbleMouseDown(e, e.target.closest('.speech-bubble'));
            }
        });
        
        // Right-click context menu for reset functionality
        this.canvasContainer.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.speech-bubble')) {
                e.preventDefault();
                this.handleBubbleRightClick(e, e.target.closest('.speech-bubble'));
            }
        });
    }
    
    /**
     * Handle bubble right-click for context menu
     */
    handleBubbleRightClick(event, bubbleElement) {
        event.preventDefault();
        
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        if (bubbleData && bubbleData.isDeformed) {
            // Show context menu or directly reset
            if (confirm('Reset bubble to default shape?')) {
                this.resetBubbleShape(bubbleElement);
            }
        }
    }
    
    /**
     * Reset bubble shape to default
     */
    resetBubbleShape(bubbleElement) {
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        // Reset control points
        this.controlPointManager.resetControlPoints(bubbleData);
        
        // Apply default shape
        this.controlPointManager.applyDeformationToBubble(bubbleElement, bubbleData);
        
        // FIXED: Update handle positions to reflect reset positions
        this.handleManager.updateControlPointHandlePositions(bubbleElement);
        
        console.log('✓ Bubble shape reset to default');
    }
    
    /**
     * Handle bubble mouse down for dragging
     */
    handleBubbleMouseDown(event, bubbleElement) {
        // Don't start drag if clicking on any handle
        if (event.target.classList.contains('resize-handle') || 
            event.target.classList.contains('rotation-handle') ||
            event.target.classList.contains('control-point-handle')) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        // Select the bubble
        this.bubbleManager.selectBubble(bubbleElement);
        
        this.isDragging = true;
        this.draggedBubble = bubbleElement;
        
        // Get mouse position relative to the container
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const bubbleRect = bubbleElement.getBoundingClientRect();
        
        // Calculate offset from mouse to bubble's top-left corner
        this.dragOffset.x = event.clientX - bubbleRect.left;
        this.dragOffset.y = event.clientY - bubbleRect.top;
        
        // Visual feedback
        bubbleElement.style.opacity = '0.8';
        bubbleElement.style.zIndex = '100';
        
        console.log('Started dragging bubble');
    }
    
    /**
     * Handle resize mouse down
     */
    handleResizeMouseDown(event, handlePosition, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        this.isResizing = true;
        this.resizeHandle = handlePosition;
        this.resizeBubble = bubbleElement;
        
        // Store initial resize data
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
        
        // Visual feedback
        bubbleElement.style.opacity = '0.8';
        
        console.log('Started resizing bubble');
    }
    
    /**
     * Handle rotation mouse down
     */
    handleRotationMouseDown(event, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        this.isRotating = true;
        this.rotationBubble = bubbleElement;
        
        // Get bubble center point
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        const centerX = bubbleData.x + bubbleData.width / 2;
        const centerY = bubbleData.y + bubbleData.height / 2;
        
        // Store initial rotation data
        this.rotationStartData = {
            centerX: centerX,
            centerY: centerY,
            startAngle: Math.atan2(
                event.clientY - containerRect.top - centerY,
                event.clientX - containerRect.left - centerX
            ) * 180 / Math.PI,
            startRotation: bubbleData.rotation
        };
        
        // Visual feedback
        bubbleElement.style.opacity = '0.8';
        
        console.log('Started rotating bubble');
    }
    
    /**
     * Handle control point mouse down (Phase 9.2)
     */
    handleControlPointMouseDown(event, direction, bubbleElement) {
        event.preventDefault();
        event.stopPropagation();
        
        // Initialize control point dragging state
        this.isControlPointDragging = true;
        this.controlPointBubble = bubbleElement;
        this.controlPointDirection = direction;
        
        // Get bubble data and current control point position
        const bubbleData = this.bubbleManager.getBubbleData(bubbleElement);
        if (!bubbleData) {
            console.error('Could not find bubble data for control point');
            return;
        }
        
        // Get container and bubble rectangles for coordinate calculations
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        // Calculate bubble center in container coordinates
        const bubbleCenterX = bubbleData.x + (bubbleData.width / 2);
        const bubbleCenterY = bubbleData.y + (bubbleData.height / 2);
        
        // Store initial control point dragging data
        this.controlPointStartData = {
            mouseX: event.clientX,
            mouseY: event.clientY,
            bubbleCenterX: bubbleCenterX,
            bubbleCenterY: bubbleCenterY,
            bubbleWidth: bubbleData.width,
            bubbleHeight: bubbleData.height,
            initialControlPoint: { ...bubbleData.controlPoints[direction] },
            containerRect: containerRect
        };
        
        // Add visual feedback for dragging state
        const handle = event.target;
        this.setControlPointDragVisualState(true, handle);
        
        console.log(`Started dragging control point: ${direction}`);
    }
    
    /**
     * Handle mouse move events
     */
    handleMouseMove(event) {
        if (this.isControlPointDragging && this.controlPointBubble) {
            this.handleControlPointMove(event);
        } else if (this.isDragging && this.draggedBubble) {
            this.handleDragMove(event);
        } else if (this.isResizing && this.resizeBubble) {
            this.handleResizeMove(event);
        } else if (this.isRotating && this.rotationBubble) {
            this.handleRotationMove(event);
        }
    }
    
    /**
     * Handle control point movement with real-time deformation (Phase 9.3)
     */
    handleControlPointMove(event) {
        event.preventDefault();
        
        if (!this.controlPointStartData || !this.controlPointBubble) return;
        
        // Calculate mouse movement delta
        const deltaX = event.clientX - this.controlPointStartData.mouseX;
        const deltaY = event.clientY - this.controlPointStartData.mouseY;
        
        // Convert mouse delta to relative bubble coordinates
        const relativeX = deltaX / this.controlPointStartData.bubbleWidth;
        const relativeY = deltaY / this.controlPointStartData.bubbleHeight;
        
        // Calculate new control point position
        let newControlPointX = this.controlPointStartData.initialControlPoint.x + relativeX;
        let newControlPointY = this.controlPointStartData.initialControlPoint.y + relativeY;
        
        // Apply bounds validation
        const validatedPosition = this.controlPointManager.validateControlPointPosition(
            this.controlPointDirection, 
            { x: newControlPointX, y: newControlPointY }
        );
        
        // Update control point position in bubble data
        const bubbleData = this.bubbleManager.getBubbleData(this.controlPointBubble);
        if (bubbleData) {
            bubbleData.controlPoints[this.controlPointDirection] = validatedPosition;
            
            // Mark bubble as deformed if control point has moved from default position
            bubbleData.isDeformed = this.controlPointManager.checkIfBubbleIsDeformed(bubbleData);
            
            // Apply real-time shape deformation with throttling for performance
            this.applyRealTimeDeformation();
            
            // Update visual position of control point handle
            this.handleManager.updateControlPointHandlePosition(
                this.controlPointDirection, 
                this.controlPointBubble, 
                validatedPosition
            );
        }
    }
    
    /**
     * Apply real-time deformation with performance throttling
     */
    applyRealTimeDeformation() {
        const now = performance.now();
        
        // Throttle deformation updates for performance
        if (now - this.lastDeformationUpdate < this.deformationUpdateInterval) {
            // Schedule update if not already scheduled
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
    
    /**
     * Perform the actual deformation update
     */
    performDeformationUpdate() {
        if (!this.controlPointBubble) return;
        
        const bubbleData = this.bubbleManager.getBubbleData(this.controlPointBubble);
        if (!bubbleData) return;
        
        try {
            // Apply deformation to bubble shape
            this.controlPointManager.applyDeformationToBubble(this.controlPointBubble, bubbleData);
            this.lastDeformationUpdate = performance.now();
            
            console.log('✓ Real-time deformation applied');
            
        } catch (error) {
            console.error('Real-time deformation failed:', error);
        }
    }
    
    /**
     * Handle drag movement
     */
    handleDragMove(event) {
        event.preventDefault();
        
        // Get container position
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        // Calculate new position
        let newX = event.clientX - containerRect.left - this.dragOffset.x;
        let newY = event.clientY - containerRect.top - this.dragOffset.y;
        
        // Apply bounds checking (keep bubble within container)
        const bubbleWidth = this.draggedBubble.offsetWidth;
        const bubbleHeight = this.draggedBubble.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, this.canvasContainer.offsetWidth - bubbleWidth));
        newY = Math.max(0, Math.min(newY, this.canvasContainer.offsetHeight - bubbleHeight));
        
        // Update bubble position
        this.draggedBubble.style.left = newX + 'px';
        this.draggedBubble.style.top = newY + 'px';
        
        // Update all handle positions
        this.handleManager.updateHandlePositions(this.draggedBubble);
        
        // Update stored position
        const bubbleData = this.bubbleManager.getBubbleData(this.draggedBubble);
        if (bubbleData) {
            bubbleData.x = newX;
            bubbleData.y = newY;
        }
    }
    
    /**
     * Handle resize movement with deformation preservation
     */
    handleResizeMove(event) {
        event.preventDefault();
        
        const deltaX = event.clientX - this.resizeStartData.mouseX;
        const deltaY = event.clientY - this.resizeStartData.mouseY;
        
        let newWidth, newHeight, newX, newY;
        
        // Calculate new dimensions based on handle position
        // Maintain aspect ratio for proportional scaling
        switch(this.resizeHandle) {
            case 'se': // Southeast - resize from top-left anchor
                newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width + deltaX);
                newHeight = newWidth / this.resizeStartData.aspectRatio;
                newX = this.resizeStartData.x;
                newY = this.resizeStartData.y;
                break;
                
            case 'sw': // Southwest - resize from top-right anchor
                newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width - deltaX);
                newHeight = newWidth / this.resizeStartData.aspectRatio;
                newX = this.resizeStartData.x + (this.resizeStartData.width - newWidth);
                newY = this.resizeStartData.y;
                break;
                
            case 'ne': // Northeast - resize from bottom-left anchor
                newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width + deltaX);
                newHeight = newWidth / this.resizeStartData.aspectRatio;
                newX = this.resizeStartData.x;
                newY = this.resizeStartData.y + (this.resizeStartData.height - newHeight);
                break;
                
            case 'nw': // Northwest - resize from bottom-right anchor
                newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, this.resizeStartData.width - deltaX);
                newHeight = newWidth / this.resizeStartData.aspectRatio;
                newX = this.resizeStartData.x + (this.resizeStartData.width - newWidth);
                newY = this.resizeStartData.y + (this.resizeStartData.height - newHeight);
                break;
        }
        
        // Apply bounds checking
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
        
        // Ensure minimum size
        newWidth = Math.max(Constants.MIN_BUBBLE_WIDTH, newWidth);
        newHeight = Math.max(Constants.MIN_BUBBLE_HEIGHT, newHeight);
        
        // Update bubble dimensions and position
        this.resizeBubble.style.width = newWidth + 'px';
        this.resizeBubble.style.height = newHeight + 'px';
        this.resizeBubble.style.left = newX + 'px';
        this.resizeBubble.style.top = newY + 'px';
        
        // Update all handle positions
        this.handleManager.updateHandlePositions(this.resizeBubble);
        
        // Update stored data
        const bubbleData = this.bubbleManager.getBubbleData(this.resizeBubble);
        if (bubbleData) {
            bubbleData.width = newWidth;
            bubbleData.height = newHeight;
            bubbleData.x = newX;
            bubbleData.y = newY;
            
            // Reapply deformation after resize
            if (bubbleData.isDeformed) {
                this.controlPointManager.applyDeformationToBubble(this.resizeBubble, bubbleData);
                console.log('✓ Deformation preserved during resize');
            }
        }
    }
    
    /**
     * Handle rotation movement with deformation preservation
     */
    handleRotationMove(event) {
        event.preventDefault();
        
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        // Calculate current angle
        const currentAngle = Math.atan2(
            event.clientY - containerRect.top - this.rotationStartData.centerY,
            event.clientX - containerRect.left - this.rotationStartData.centerX
        ) * 180 / Math.PI;
        
        // Calculate rotation difference
        const angleDiff = currentAngle - this.rotationStartData.startAngle;
        let newRotation = this.rotationStartData.startRotation + angleDiff;
        
        // Normalize angle to 0-360 degrees
        newRotation = ((newRotation % 360) + 360) % 360;
        
        // Apply rotation to bubble
        this.rotationBubble.style.transform = `rotate(${newRotation}deg)`;
        
        // Apply rotation to all handles
        this.handleManager.updateHandlePositions(this.rotationBubble);
        
        // Update stored rotation
        const bubbleData = this.bubbleManager.getBubbleData(this.rotationBubble);
        if (bubbleData) {
            bubbleData.rotation = newRotation;
        }
    }
    
    /**
     * Handle mouse up events with final deformation application
     */
    handleMouseUp(event) {
        if (this.isControlPointDragging) {
            // Final deformation update
            if (this.controlPointBubble) {
                const bubbleData = this.bubbleManager.getBubbleData(this.controlPointBubble);
                if (bubbleData) {
                    // Apply final deformation
                    this.controlPointManager.applyDeformationToBubble(this.controlPointBubble, bubbleData);
                    
                    console.log(`Control point ${this.controlPointDirection} final position:`, 
                               bubbleData.controlPoints[this.controlPointDirection]);
                    console.log(`Bubble deformed: ${bubbleData.isDeformed}`);
                }
            }
            
            // Reset control point visual feedback
            if (this.controlPointBubble && this.controlPointDirection) {
                const handle = this.controlPointBubble.controlPointHandles?.querySelector(`.control-point-${this.controlPointDirection}`);
                this.setControlPointDragVisualState(false, handle);
            }
            
            // Clear any pending deformation updates
            if (this.deformationThrottle) {
                cancelAnimationFrame(this.deformationThrottle);
                this.deformationThrottle = null;
            }
            
            // Reset control point dragging state
            this.isControlPointDragging = false;
            this.controlPointBubble = null;
            this.controlPointDirection = null;
            this.controlPointStartData = null;
            
            console.log('Stopped dragging control point');
        }
        
        if (this.isDragging) {
            // Reset drag visual feedback
            if (this.draggedBubble) {
                this.draggedBubble.style.opacity = '1';
                this.draggedBubble.style.zIndex = Constants.BUBBLE_Z_INDEX;
            }
            
            // Reset drag state
            this.isDragging = false;
            this.draggedBubble = null;
            this.dragOffset = { x: 0, y: 0 };
            
            console.log('Stopped dragging bubble');
        }
        
        if (this.isResizing) {
            // Reset resize visual feedback
            if (this.resizeBubble) {
                this.resizeBubble.style.opacity = '1';
            }
            
            // Reset resize state
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeBubble = null;
            this.resizeStartData = null;
            
            console.log('Stopped resizing bubble');
        }
        
        if (this.isRotating) {
            // Reset rotation visual feedback
            if (this.rotationBubble) {
                this.rotationBubble.style.opacity = '1';
            }
            
            // Reset rotation state
            this.isRotating = false;
            this.rotationBubble = null;
            this.rotationStartData = null;
            
            console.log('Stopped rotating bubble');
        }
    }
    
    /**
     * FIXED: Handle keyboard events with proper Ctrl+R handling
     */
    handleKeyDown(event) {
    const selectedBubble = this.bubbleManager.getSelectedBubble();
    
    // Delete selected bubble with Delete key
    if (event.key === 'Delete' && selectedBubble) {
        event.preventDefault();
        
        // Trigger through main app if available for UI updates
        if (window.editor && window.editor.deleteSelectedBubble) {
            window.editor.deleteSelectedBubble();
        } else {
            // Fallback to direct call (legacy support)
            this.bubbleManager.deleteBubble(selectedBubble);
        }
        return;
    }
    
    // Copy selected bubble with Ctrl+D
    if (event.ctrlKey && event.key === 'd' && selectedBubble) {
        event.preventDefault();
        
        // Trigger through main app if available for UI updates
        if (window.editor && window.editor.copySelectedBubble) {
            window.editor.copySelectedBubble();
        } else {
            // Fallback to direct call (legacy support)
            this.bubbleManager.copyBubble(selectedBubble);
        }
        return;
    }
    
    // FIXED: Reset bubble shape with Ctrl+R - prevent browser refresh
    if (event.ctrlKey && (event.key === 'r' || event.key === 'R') && selectedBubble) {
        event.preventDefault(); // Prevent browser refresh
        event.stopPropagation(); // Stop event from bubbling up
        this.resetBubbleShape(selectedBubble);
        
        // Trigger UI update through main app if available
        if (window.editor && window.editor.uiController) {
            window.editor.uiController.forceUpdateBubbleControls();
        }
        
        console.log('✓ Ctrl+R handled - bubble reset (browser refresh prevented)');
        return;
    }
    
    // FIXED: Also handle lowercase 'r' for different keyboard layouts
    if (event.ctrlKey && event.code === 'KeyR' && selectedBubble) {
        event.preventDefault();
        event.stopPropagation();
        this.resetBubbleShape(selectedBubble);
        
        // Trigger UI update through main app if available
        if (window.editor && window.editor.uiController) {
            window.editor.uiController.forceUpdateBubbleControls();
        }
        
        console.log('✓ Ctrl+R handled via KeyR code - bubble reset');
        return;
    }
}
    
    /**
     * Set visual state for control point dragging (Phase 9.2)
     */
    setControlPointDragVisualState(isDragging, handle) {
        if (!handle) return;
        
        if (isDragging) {
            // Visual feedback for dragging state
            handle.style.backgroundColor = Constants.CONTROL_POINT_DRAG_COLOR;
            handle.style.transform = handle.style.transform.replace('rotate(45deg)', 'rotate(45deg) scale(1.2)');
            handle.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
            handle.style.borderColor = '#FFF';
            handle.style.zIndex = '1000';
            
            // Change cursor for container to indicate dragging
            this.canvasContainer.style.cursor = 'move';
        } else {
            // Reset to normal state
            handle.style.backgroundColor = Constants.CONTROL_POINT_COLOR;
            handle.style.transform = handle.style.transform.replace('scale(1.2)', '');
            handle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            handle.style.borderColor = '#fff';
            handle.style.zIndex = '';
            
            // Reset container cursor
            this.canvasContainer.style.cursor = '';
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InteractionManager;
}