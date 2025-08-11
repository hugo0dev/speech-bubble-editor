/**
 * HandleManager - Fixed Control Point Positioning Issue
 * FIXES: Issue #2 - Control points now maintain their visual positions when bubble is reselected
 */
class HandleManager {
    constructor(canvasContainer) {
        this.canvasContainer = canvasContainer;
        // Remove interactionManager from constructor to resolve circular dependency
        this.interactionManager = null; // Set later via setter method
        this.bubbleManager = null; // Set later via setter method
        
        console.log('HandleManager constructor completed');
    }
    
    /**
     * Set InteractionManager reference (resolves circular dependency)
     */
    setInteractionManager(interactionManager) {
        if (!interactionManager) {
            throw new Error('InteractionManager is required for HandleManager');
        }
        
        this.interactionManager = interactionManager;
        console.log('✓ InteractionManager reference set in HandleManager');
    }
    
    /**
     * Set BubbleManager reference
     */
    setBubbleManager(bubbleManager) {
        if (!bubbleManager) {
            throw new Error('BubbleManager is required for HandleManager');
        }
        
        this.bubbleManager = bubbleManager;
        console.log('✓ BubbleManager reference set in HandleManager');
    }
    
    /**
     * Verify that required dependencies are available
     */
    verifyDependencies() {
        const missing = [];
        
        if (!this.interactionManager) {
            missing.push('InteractionManager');
        }
        if (!this.bubbleManager) {
            missing.push('BubbleManager');
        }
        
        if (missing.length > 0) {
            console.warn(`⚠️ HandleManager missing dependencies: ${missing.join(', ')}`);
            return false;
        }
        
        return true;
    }
    
    /**
     * Create all handles for a bubble
     */
    createAllHandles(bubbleElement) {
        if (!this.verifyDependencies()) {
            console.error('Cannot create handles - missing dependencies');
            return;
        }
        
        this.createResizeHandles(bubbleElement);
        this.createRotationHandle(bubbleElement);
        this.createControlPointHandles(bubbleElement);
        
        console.log('All handles created for bubble');
    }
    
    /**
     * Remove all handles from a bubble
     */
    removeAllHandles(bubbleElement) {
        this.removeResizeHandles(bubbleElement);
        this.removeRotationHandle(bubbleElement);
        this.removeControlPointHandles(bubbleElement);
        
        console.log('All handles removed from bubble');
    }
    
    /**
     * Create resize handles for a bubble
     */
    createResizeHandles(bubbleElement) {
        // Create resize handle container
        const handleContainer = document.createElement('div');
        handleContainer.className = 'resize-handles';
        handleContainer.style.position = 'absolute';
        handleContainer.style.left = bubbleElement.style.left;
        handleContainer.style.top = bubbleElement.style.top;
        handleContainer.style.width = bubbleElement.style.width;
        handleContainer.style.height = bubbleElement.style.height;
        handleContainer.style.pointerEvents = 'none';
        handleContainer.style.zIndex = Constants.RESIZE_HANDLES_Z_INDEX;
        handleContainer.style.transformOrigin = 'center center';
        
        // Apply same rotation as bubble
        const bubbleData = this.getBubbleData(bubbleElement);
        if (bubbleData) {
            handleContainer.style.transform = `rotate(${bubbleData.rotation}deg)`;
        }
        
        // Create 4 corner handles for proportional resize
        Constants.RESIZE_HANDLE_POSITIONS.forEach(position => {
            const handle = this.createResizeHandle(position, bubbleElement);
            handleContainer.appendChild(handle);
        });
        
        this.canvasContainer.appendChild(handleContainer);
        bubbleElement.resizeHandles = handleContainer;
        
        console.log('Resize handles created');
    }
    
    /**
     * Create a single resize handle with safe event attachment
     */
    createResizeHandle(position, bubbleElement) {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${position}`;
        handle.style.position = 'absolute';
        handle.style.width = Constants.RESIZE_HANDLE_SIZE + 'px';
        handle.style.height = Constants.RESIZE_HANDLE_SIZE + 'px';
        handle.style.backgroundColor = Constants.RESIZE_HANDLE_COLOR;
        handle.style.border = '1px solid #333';
        handle.style.cursor = `${position}-resize`;
        handle.style.pointerEvents = 'all';
        handle.style.borderRadius = '2px';
        handle.style.transition = `background-color ${Constants.HANDLE_TRANSITION_DURATION}, transform 0.1s ease`;
        
        // Position handles
        const halfSize = Constants.RESIZE_HANDLE_SIZE / 2;
        switch(position) {
            case 'nw':
                handle.style.left = -halfSize + 'px';
                handle.style.top = -halfSize + 'px';
                break;
            case 'ne':
                handle.style.right = -halfSize + 'px';
                handle.style.top = -halfSize + 'px';
                break;
            case 'sw':
                handle.style.left = -halfSize + 'px';
                handle.style.bottom = -halfSize + 'px';
                break;
            case 'se':
                handle.style.right = -halfSize + 'px';
                handle.style.bottom = -halfSize + 'px';
                break;
        }
        
        // Add hover effects
        handle.addEventListener('mouseenter', () => {
            handle.style.backgroundColor = '#45a049';
            handle.style.transform = 'scale(1.1)';
        });
        
        handle.addEventListener('mouseleave', () => {
            handle.style.backgroundColor = Constants.RESIZE_HANDLE_COLOR;
            handle.style.transform = 'scale(1)';
        });
        
        // Safe resize event listener attachment
        this.attachResizeEventListener(handle, position, bubbleElement);
        
        return handle;
    }
    
    /**
     * Safely attach resize event listener
     */
    attachResizeEventListener(handle, position, bubbleElement) {
        if (this.interactionManager && this.interactionManager.handleResizeMouseDown) {
            handle.addEventListener('mousedown', (e) => {
                this.interactionManager.handleResizeMouseDown(e, position, bubbleElement);
            });
            console.log(`✓ Resize event listener attached for ${position}`);
        } else {
            console.warn(`⚠️ Cannot attach resize event listener for ${position} - InteractionManager not available`);
        }
    }
    
    /**
     * Create rotation handle for a bubble
     */
    createRotationHandle(bubbleElement) {
        // Create rotation handle container
        const rotationContainer = document.createElement('div');
        rotationContainer.className = 'rotation-handle-container';
        rotationContainer.style.position = 'absolute';
        rotationContainer.style.left = bubbleElement.style.left;
        rotationContainer.style.top = bubbleElement.style.top;
        rotationContainer.style.width = bubbleElement.style.width;
        rotationContainer.style.height = bubbleElement.style.height;
        rotationContainer.style.pointerEvents = 'none';
        rotationContainer.style.zIndex = Constants.ROTATION_HANDLE_Z_INDEX;
        rotationContainer.style.transformOrigin = 'center center';
        
        // Apply same rotation as bubble
        const bubbleData = this.getBubbleData(bubbleElement);
        if (bubbleData) {
            rotationContainer.style.transform = `rotate(${bubbleData.rotation}deg)`;
        }
        
        // Create rotation handle line and circle
        const rotationLine = this.createRotationLine();
        const rotationHandle = this.createRotationHandleCircle(bubbleElement);
        
        rotationContainer.appendChild(rotationLine);
        rotationContainer.appendChild(rotationHandle);
        
        this.canvasContainer.appendChild(rotationContainer);
        bubbleElement.rotationHandle = rotationContainer;
        
        console.log('Rotation handle created');
    }
    
    /**
     * Create rotation line
     */
    createRotationLine() {
        const rotationLine = document.createElement('div');
        rotationLine.className = 'rotation-line';
        rotationLine.style.position = 'absolute';
        rotationLine.style.left = '50%';
        rotationLine.style.top = '-25px';
        rotationLine.style.width = '1px';
        rotationLine.style.height = '20px';
        rotationLine.style.backgroundColor = Constants.RESIZE_HANDLE_COLOR;
        rotationLine.style.transform = 'translateX(-50%)';
        rotationLine.style.pointerEvents = 'none';
        
        return rotationLine;
    }
    
    /**
     * Create rotation handle circle with safe event attachment
     */
    createRotationHandleCircle(bubbleElement) {
        const rotationHandle = document.createElement('div');
        rotationHandle.className = 'rotation-handle';
        rotationHandle.style.position = 'absolute';
        rotationHandle.style.left = '50%';
        rotationHandle.style.top = '-30px';
        rotationHandle.style.width = Constants.ROTATION_HANDLE_SIZE + 'px';
        rotationHandle.style.height = Constants.ROTATION_HANDLE_SIZE + 'px';
        rotationHandle.style.backgroundColor = Constants.ROTATION_HANDLE_COLOR;
        rotationHandle.style.border = '1px solid #333';
        rotationHandle.style.borderRadius = '50%';
        rotationHandle.style.cursor = 'crosshair';
        rotationHandle.style.transform = 'translate(-50%, -50%)';
        rotationHandle.style.pointerEvents = 'all';
        rotationHandle.style.transition = `background-color ${Constants.HANDLE_TRANSITION_DURATION}, transform 0.1s ease`;
        
        // Add hover effects
        rotationHandle.addEventListener('mouseenter', () => {
            rotationHandle.style.backgroundColor = '#FF5252';
            rotationHandle.style.transform = 'translate(-50%, -50%) scale(1.1)';
        });
        
        rotationHandle.addEventListener('mouseleave', () => {
            rotationHandle.style.backgroundColor = Constants.ROTATION_HANDLE_COLOR;
            rotationHandle.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        // Safe rotation event listener attachment
        this.attachRotationEventListener(rotationHandle, bubbleElement);
        
        return rotationHandle;
    }
    
    /**
     * Safely attach rotation event listener
     */
    attachRotationEventListener(handle, bubbleElement) {
        if (this.interactionManager && this.interactionManager.handleRotationMouseDown) {
            handle.addEventListener('mousedown', (e) => {
                this.interactionManager.handleRotationMouseDown(e, bubbleElement);
            });
            console.log('✓ Rotation event listener attached');
        } else {
            console.warn('⚠️ Cannot attach rotation event listener - InteractionManager not available');
        }
    }
    
    /**
     * FIXED: Create control point handles with correct positioning
     */
    createControlPointHandles(bubbleElement) {
        // Create control point handle container
        const controlPointContainer = document.createElement('div');
        controlPointContainer.className = 'control-point-handles';
        controlPointContainer.style.position = 'absolute';
        controlPointContainer.style.left = bubbleElement.style.left;
        controlPointContainer.style.top = bubbleElement.style.top;
        controlPointContainer.style.width = bubbleElement.style.width;
        controlPointContainer.style.height = bubbleElement.style.height;
        controlPointContainer.style.pointerEvents = 'none';
        controlPointContainer.style.zIndex = Constants.CONTROL_POINT_HANDLES_Z_INDEX;
        controlPointContainer.style.transformOrigin = 'center center';
        
        // Apply same rotation as bubble
        const bubbleData = this.getBubbleData(bubbleElement);
        if (bubbleData) {
            controlPointContainer.style.transform = `rotate(${bubbleData.rotation}deg)`;
        }
        
        // Create 4 control point handles at cardinal positions
        Constants.CONTROL_POINT_DIRECTIONS.forEach(direction => {
            const handle = this.createControlPointHandle(direction, bubbleElement);
            controlPointContainer.appendChild(handle);
        });
        
        // CRITICAL: Add to DOM first, then position correctly
        this.canvasContainer.appendChild(controlPointContainer);
        bubbleElement.controlPointHandles = controlPointContainer;
        
        // FIXED: Now position the handles according to the actual control point positions
        // This must happen AFTER the handles are added to the DOM
        if (bubbleData) {
            setTimeout(() => {
                Constants.CONTROL_POINT_DIRECTIONS.forEach(direction => {
                    this.updateControlPointHandlePosition(
                        direction, 
                        bubbleElement, 
                        bubbleData.controlPoints[direction]
                    );
                });
                console.log('✓ Control point handles positioned correctly according to bubble data');
            }, 0); // Use setTimeout to ensure DOM is fully updated
        }
        
        console.log('Control point handles created for bubble');
    }
    
    /**
     * ENHANCED: Create a single control point handle with safe event attachment
     */
    createControlPointHandle(direction, bubbleElement) {
        const handle = document.createElement('div');
        handle.className = `control-point-handle control-point-${direction}`;
        handle.style.position = 'absolute';
        handle.style.width = Constants.CONTROL_POINT_HANDLE_SIZE + 'px';
        handle.style.height = Constants.CONTROL_POINT_HANDLE_SIZE + 'px';
        handle.style.backgroundColor = Constants.CONTROL_POINT_COLOR;
        handle.style.border = '2px solid #fff';
        handle.style.borderRadius = '2px';
        handle.style.cursor = 'move';
        handle.style.pointerEvents = 'all';
        handle.style.transform = 'rotate(45deg)'; // Diamond shape
        handle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        handle.style.transition = `background-color ${Constants.HANDLE_TRANSITION_DURATION}, transform 0.1s ease`;
        
        // TEMPORARY: Position handles at default edge midpoints initially
        // This will be overridden by updateControlPointHandlePosition after DOM insertion
        this.positionControlPointHandleAtDefault(handle, direction);
        
        // Add hover effects
        handle.addEventListener('mouseenter', () => {
            handle.style.backgroundColor = '#1976D2';
            handle.style.transform = handle.style.transform.replace('rotate(45deg)', 'rotate(45deg) scale(1.1)');
        });
        
        handle.addEventListener('mouseleave', () => {
            handle.style.backgroundColor = Constants.CONTROL_POINT_COLOR;
            handle.style.transform = handle.style.transform.replace('scale(1.1)', '');
        });
        
        // Safe control point event listener attachment
        this.attachControlPointEventListener(handle, direction, bubbleElement);
        
        return handle;
    }
    
    /**
     * NEW: Position control point handle at default edge midpoint (temporary positioning)
     */
    positionControlPointHandleAtDefault(handle, direction) {
        const offset = 5; // Handle offset from edge
        
        switch(direction) {
            case 'top':
                handle.style.left = '50%';
                handle.style.top = -offset + 'px';
                handle.style.transform += ' translate(-50%, -50%)';
                break;
            case 'right':
                handle.style.right = -offset + 'px';
                handle.style.top = '50%';
                handle.style.transform += ' translate(50%, -50%)';
                break;
            case 'bottom':
                handle.style.left = '50%';
                handle.style.bottom = -offset + 'px';
                handle.style.transform += ' translate(-50%, 50%)';
                break;
            case 'left':
                handle.style.left = -offset + 'px';
                handle.style.top = '50%';
                handle.style.transform += ' translate(-50%, -50%)';
                break;
        }
    }
    
    /**
     * DEPRECATED: Old positioning method (kept for backward compatibility)
     */
    positionControlPointHandle(handle, direction) {
        console.warn('positionControlPointHandle is deprecated, use positionControlPointHandleAtDefault');
        this.positionControlPointHandleAtDefault(handle, direction);
    }
    
    /**
     * Safely attach control point event listener
     */
    attachControlPointEventListener(handle, direction, bubbleElement) {
        if (this.interactionManager && this.interactionManager.handleControlPointMouseDown) {
            handle.addEventListener('mousedown', (e) => {
                this.interactionManager.handleControlPointMouseDown(e, direction, bubbleElement);
            });
            console.log(`✓ Control point event listener attached for ${direction}`);
        } else {
            console.warn(`⚠️ Cannot attach control point event listener for ${direction} - InteractionManager not available`);
        }
    }
    
    /**
     * Remove resize handles
     */
    removeResizeHandles(bubbleElement) {
        if (bubbleElement && bubbleElement.resizeHandles) {
            bubbleElement.resizeHandles.remove();
            bubbleElement.resizeHandles = null;
        }
    }
    
    /**
     * Remove rotation handle
     */
    removeRotationHandle(bubbleElement) {
        if (bubbleElement && bubbleElement.rotationHandle) {
            bubbleElement.rotationHandle.remove();
            bubbleElement.rotationHandle = null;
        }
    }
    
    /**
     * Remove control point handles
     */
    removeControlPointHandles(bubbleElement) {
        if (bubbleElement && bubbleElement.controlPointHandles) {
            bubbleElement.controlPointHandles.remove();
            bubbleElement.controlPointHandles = null;
            console.log('Control point handles removed');
        }
    }
    
    /**
     * Update all handle positions for a bubble
     */
    updateHandlePositions(bubbleElement) {
        this.updateResizeHandlePositions(bubbleElement);
        this.updateRotationHandlePosition(bubbleElement);
        this.updateControlPointHandlePositions(bubbleElement);
    }
    
    /**
     * Update resize handle positions
     */
    updateResizeHandlePositions(bubbleElement) {
        if (!bubbleElement || !bubbleElement.resizeHandles) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const handles = bubbleElement.resizeHandles;
        handles.style.width = bubbleData.width + 'px';
        handles.style.height = bubbleData.height + 'px';
        handles.style.left = bubbleData.x + 'px';
        handles.style.top = bubbleData.y + 'px';
        handles.style.transform = `rotate(${bubbleData.rotation}deg)`;
    }
    
    /**
     * Update rotation handle position
     */
    updateRotationHandlePosition(bubbleElement) {
        if (!bubbleElement || !bubbleElement.rotationHandle) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const handle = bubbleElement.rotationHandle;
        handle.style.width = bubbleData.width + 'px';
        handle.style.height = bubbleData.height + 'px';
        handle.style.left = bubbleData.x + 'px';
        handle.style.top = bubbleData.y + 'px';
        handle.style.transform = `rotate(${bubbleData.rotation}deg)`;
    }
    
    /**
     * ENHANCED: Update control point handle positions with better logging
     */
    updateControlPointHandlePositions(bubbleElement) {
        if (!bubbleElement || !bubbleElement.controlPointHandles) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const handles = bubbleElement.controlPointHandles;
        handles.style.width = bubbleData.width + 'px';
        handles.style.height = bubbleData.height + 'px';
        handles.style.left = bubbleData.x + 'px';
        handles.style.top = bubbleData.y + 'px';
        handles.style.transform = `rotate(${bubbleData.rotation}deg)`;
        
        // Update individual control point handle positions
        Constants.CONTROL_POINT_DIRECTIONS.forEach(direction => {
            this.updateControlPointHandlePosition(direction, bubbleElement, bubbleData.controlPoints[direction]);
        });
        
        console.log('✓ All control point handle positions updated');
    }
    
    /**
     * ENHANCED: Update specific control point handle position with better error handling
     */
    updateControlPointHandlePosition(direction, bubbleElement, controlPointData) {
        if (!bubbleElement.controlPointHandles) {
            console.warn(`Cannot update control point ${direction} - no handle container`);
            return;
        }
        
        // Find the specific control point handle
        const handle = bubbleElement.controlPointHandles.querySelector(`.control-point-${direction}`);
        if (!handle) {
            console.warn(`Cannot find control point handle for direction: ${direction}`);
            return;
        }
        
        // Get bubble data for calculations
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) {
            console.warn(`Cannot get bubble data for control point positioning`);
            return;
        }
        
        // Convert relative coordinates to absolute pixel positions
        const centerX = bubbleData.width / 2;
        const centerY = bubbleData.height / 2;
        
        // Calculate absolute position within bubble coordinate system
        const absoluteX = centerX + (controlPointData.x * bubbleData.width);
        const absoluteY = centerY + (controlPointData.y * bubbleData.height);
        
        // Clear existing positioning styles
        handle.style.left = '';
        handle.style.right = '';
        handle.style.top = '';
        handle.style.bottom = '';
        
        // Update handle position with proper transforms maintained
        const offset = 5;
        handle.style.left = (absoluteX - offset) + 'px';
        handle.style.top = (absoluteY - offset) + 'px';
        handle.style.transform = 'rotate(45deg) translate(-50%, -50%)';
        
        console.log(`✓ Control point ${direction} positioned at (${absoluteX.toFixed(1)}, ${absoluteY.toFixed(1)})`);
    }
    
    /**
     * Get bubble data (helper method)
     */
    getBubbleData(bubbleElement) {
        return this.bubbleManager ? this.bubbleManager.getBubbleData(bubbleElement) : null;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandleManager;
}