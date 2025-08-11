/**
 * BubbleManager - CSS Transform Integration Fix
 * FIXES: Copy bubble feature broken by missing CSS transform integration
 */
class BubbleManager {
    constructor(canvasContainer, handleManager) {
        this.canvasContainer = canvasContainer;
        this.handleManager = handleManager;
        this.bubbles = [];
        this.selectedBubble = null;
        this.bubbleIdCounter = 0;
        
        // Control point manager reference (set later)
        this.controlPointManager = null;
        
        // UI update callback for selection change notifications
        this.uiUpdateCallback = null;
    }
    
    /**
     * Set control point manager reference
     */
    setControlPointManager(controlPointManager) {
        this.controlPointManager = controlPointManager;
        console.log('✓ ControlPointManager reference set in BubbleManager');
    }
    
    /**
     * Set UI update callback for selection change notifications
     */
    setUIUpdateCallback(callback) {
        if (typeof callback === 'function') {
            this.uiUpdateCallback = callback;
            console.log('✓ BubbleManager UI callback connected');
        } else {
            console.warn('⚠️ Invalid UI callback provided to BubbleManager');
        }
    }
    
    /**
     * Trigger UI update if callback is available
     */
    triggerUIUpdate() {
        if (this.uiUpdateCallback) {
            try {
                this.uiUpdateCallback();
                console.log('✓ UI update triggered by bubble selection change');
            } catch (error) {
                console.error('❌ UI update callback failed:', error);
            }
        }
    }
    
    /**
     * Create bubble data structure with control points
     */
    createBubbleData(x, y, width, height, rotation = 0) {
        return {
            id: ++this.bubbleIdCounter,
            x: x,
            y: y,
            width: width,
            height: height,
            rotation: rotation,
            controlPoints: { ...Constants.DEFAULT_CONTROL_POINTS },
            isDeformed: false,
            deformationMatrix: null
        };
    }
    
    /**
     * Add a new speech bubble with deformation support
     */
    addBubble(x = null, y = null, width = null, height = null) {
        try {
            // Use defaults if not specified
            const bubbleWidth = width || Constants.DEFAULT_BUBBLE_WIDTH;
            const bubbleHeight = height || Constants.DEFAULT_BUBBLE_HEIGHT;
            const bubbleRotation = Constants.DEFAULT_BUBBLE_ROTATION;
            
            // Calculate smart positioning if not specified
            let bubbleX = x;
            let bubbleY = y;
            
            if (bubbleX === null || bubbleY === null) {
                const position = this.calculateBubblePosition(bubbleWidth, bubbleHeight);
                bubbleX = position.x;
                bubbleY = position.y;
            }
            
            // Create bubble data
            const bubbleData = this.createBubbleData(bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRotation);
            
            // Create bubble container element
            const bubbleContainer = this.createBubbleElementFromData(bubbleData);
            
            // Add event listeners
            this.addBubbleEventListeners(bubbleContainer);
            
            // Add to DOM and tracking array
            this.canvasContainer.appendChild(bubbleContainer);
            bubbleData.element = bubbleContainer;
            this.bubbles.push(bubbleData);
            
            // Select the newly created bubble (this will trigger UI update)
            this.selectBubble(bubbleContainer);
            
            console.log(`Speech bubble added successfully! Total bubbles: ${this.bubbles.length}`);
            return bubbleData;
            
        } catch (error) {
            console.error('Error adding speech bubble:', error);
            return null;
        }
    }
    
    /**
     * Delete the specified bubble with UI update
     */
    deleteBubble(bubbleElement) {
        if (!bubbleElement) return false;
        
        try {
            // Find bubble data
            const bubbleIndex = this.bubbles.findIndex(b => b.element === bubbleElement);
            if (bubbleIndex === -1) return false;
            
            // Remove handles if this bubble is selected
            if (this.selectedBubble === bubbleElement) {
                this.handleManager.removeAllHandles(bubbleElement);
                this.selectedBubble = null;
                // Trigger UI update when selection is cleared
                this.triggerUIUpdate();
            }
            
            // Remove bubble element from DOM
            bubbleElement.remove();
            
            // Remove from tracking array
            this.bubbles.splice(bubbleIndex, 1);
            
            console.log(`Speech bubble deleted. Remaining bubbles: ${this.bubbles.length}`);
            return true;
            
        } catch (error) {
            console.error('Error deleting bubble:', error);
            return false;
        }
    }
    
    /**
     * Copy the specified bubble with deformation preservation
     */
    copyBubble(bubbleElement) {
        if (!bubbleElement) return null;
        
        try {
            // Find the original bubble data
            const originalBubbleData = this.bubbles.find(b => b.element === bubbleElement);
            if (!originalBubbleData) {
                console.error('Could not find bubble data for copying');
                return null;
            }
            
            // Calculate offset position for the copy
            const offset = this.calculateCopyOffset(originalBubbleData);
            
            // Create new bubble data with copied properties
            const newBubbleData = this.createBubbleData(
                offset.x, 
                offset.y, 
                originalBubbleData.width, 
                originalBubbleData.height, 
                originalBubbleData.rotation
            );
            
            // Copy control point data and deformation state
            if (originalBubbleData.isDeformed) {
                newBubbleData.controlPoints = JSON.parse(JSON.stringify(originalBubbleData.controlPoints));
                newBubbleData.isDeformed = originalBubbleData.isDeformed;
                newBubbleData.deformationMatrix = originalBubbleData.deformationMatrix;
                console.log('✓ Deformation state copied to new bubble');
            }
            
            // Create the new bubble element with deformation applied
            const newBubbleElement = this.createBubbleElementFromData(newBubbleData);
            
            // Add event listeners
            this.addBubbleEventListeners(newBubbleElement);
            
            // Add to container and arrays
            this.canvasContainer.appendChild(newBubbleElement);
            newBubbleData.element = newBubbleElement;
            this.bubbles.push(newBubbleData);
            
            // Select the new bubble (this will trigger UI update)
            this.selectBubble(newBubbleElement);
            
            console.log(`Bubble copied successfully! Total bubbles: ${this.bubbles.length}`);
            return newBubbleData;
            
        } catch (error) {
            console.error('Error copying bubble:', error);
            return null;
        }
    }
    
    /**
     * Select a bubble with UI update
     */
    selectBubble(bubbleElement) {
        if (!bubbleElement) return;
        
        // Deselect previous bubble
        this.deselectBubble();
        
        // Select new bubble
        this.selectedBubble = bubbleElement;
        this.handleManager.createAllHandles(bubbleElement);
        
        // Trigger UI update when bubble is selected
        this.triggerUIUpdate();
        
        console.log('Bubble selected with all handles');
    }
    
    /**
     * Deselect current bubble with UI update
     */
    deselectBubble() {
        if (this.selectedBubble) {
            this.handleManager.removeAllHandles(this.selectedBubble);
            this.selectedBubble = null;
            
            // Trigger UI update when bubble is deselected
            this.triggerUIUpdate();
            
            console.log('Bubble deselected, all handles removed');
        }
    }
    
    /**
     * Get bubble data for a given element
     */
    getBubbleData(bubbleElement) {
        return this.bubbles.find(b => b.element === bubbleElement);
    }
    
    /**
     * Update bubble data
     */
    updateBubbleData(bubbleElement, newData) {
        const bubbleData = this.getBubbleData(bubbleElement);
        if (bubbleData) {
            Object.assign(bubbleData, newData);
            
            // If control points were updated, reapply deformation
            if (newData.controlPoints && this.controlPointManager) {
                bubbleData.isDeformed = this.controlPointManager.checkIfBubbleIsDeformed(bubbleData);
                this.controlPointManager.applyDeformationToBubble(bubbleElement, bubbleData);
                console.log('✓ Bubble deformation updated');
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * Get all bubbles
     */
    getAllBubbles() {
        return [...this.bubbles];
    }
    
    /**
     * Get selected bubble
     */
    getSelectedBubble() {
        return this.selectedBubble;
    }
    
    /**
     * Get selected bubble data
     */
    getSelectedBubbleData() {
        return this.selectedBubble ? this.getBubbleData(this.selectedBubble) : null;
    }
    
    /**
     * Calculate smart positioning for new bubbles
     */
    calculateBubblePosition(width, height) {
        let x = Constants.BUBBLE_START_OFFSET;
        let y = Constants.BUBBLE_START_OFFSET;
        
        // If there are existing bubbles, offset the new one
        if (this.bubbles.length > 0) {
            const offset = this.bubbles.length * Constants.BUBBLE_STACK_OFFSET;
            x = Constants.BUBBLE_START_OFFSET + offset;
            y = Constants.BUBBLE_START_OFFSET + offset;
            
            // Wrap around if going off screen
            const containerWidth = this.canvasContainer.offsetWidth;
            const containerHeight = this.canvasContainer.offsetHeight;
            
            if (x + width > containerWidth) {
                x = Constants.BUBBLE_START_OFFSET;
                y += 100;
            }
            
            if (y + height > containerHeight) {
                y = Constants.BUBBLE_START_OFFSET;
            }
        }
        
        return { x, y };
    }
    
    /**
     * Calculate copy offset position
     */
    calculateCopyOffset(originalBubble) {
        const defaultOffset = Constants.COPY_OFFSET;
        let newX = originalBubble.x + defaultOffset;
        let newY = originalBubble.y + defaultOffset;
        
        const containerWidth = this.canvasContainer.offsetWidth;
        const containerHeight = this.canvasContainer.offsetHeight;
        
        // Check if default offset keeps bubble within bounds
        if (newX + originalBubble.width <= containerWidth && 
            newY + originalBubble.height <= containerHeight) {
            return { x: newX, y: newY };
        }
        
        // Try alternative positions if default doesn't fit
        const alternatives = [
            { x: originalBubble.x - defaultOffset, y: originalBubble.y + defaultOffset }, // left, down
            { x: originalBubble.x + defaultOffset, y: originalBubble.y - defaultOffset }, // right, up
            { x: originalBubble.x - defaultOffset, y: originalBubble.y - defaultOffset }, // left, up
        ];
        
        for (const alt of alternatives) {
            if (alt.x >= 0 && alt.y >= 0 && 
                alt.x + originalBubble.width <= containerWidth && 
                alt.y + originalBubble.height <= containerHeight) {
                return alt;
            }
        }
        
        // If no perfect fit, place with minimal valid offset
        newX = Math.max(0, Math.min(originalBubble.x + 10, containerWidth - originalBubble.width));
        newY = Math.max(0, Math.min(originalBubble.y + 10, containerHeight - originalBubble.height));
        
        return { x: newX, y: newY };
    }
    
    /**
     * Apply styles to bubble element
     */
    applyBubbleStyles(bubbleContainer, x, y, width, height, rotation) {
        bubbleContainer.style.position = 'absolute';
        bubbleContainer.style.left = x + 'px';
        bubbleContainer.style.top = y + 'px';
        bubbleContainer.style.width = width + 'px';
        bubbleContainer.style.height = height + 'px';
        bubbleContainer.style.cursor = 'move';
        bubbleContainer.style.transformOrigin = 'center center';
        bubbleContainer.style.transform = `rotate(${rotation}deg)`;
        bubbleContainer.style.zIndex = Constants.BUBBLE_Z_INDEX;
    }
    
    /**
     * FIXED: Create bubble element from data with CSS transform support
     */
    createBubbleElementFromData(bubbleData) {
        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'speech-bubble';
        
        // ALWAYS use original SVG content (never modify the SVG itself)
        bubbleContainer.innerHTML = Constants.BUBBLE_SVG;
        
        // Apply basic styles (position, size, rotation)
        this.applyBubbleStyles(
            bubbleContainer, 
            bubbleData.x, 
            bubbleData.y, 
            bubbleData.width, 
            bubbleData.height, 
            bubbleData.rotation
        );
        
        // FIXED: Apply deformation using CSS transforms if bubble is deformed
        if (bubbleData.isDeformed && this.controlPointManager) {
            // Use the new CSS transform system instead of SVG path manipulation
            this.controlPointManager.applyDeformationToBubble(bubbleContainer, bubbleData);
            console.log('✓ CSS transform deformation applied to copied bubble');
        }
        
        return bubbleContainer;
    }
    
    /**
     * Add event listeners to bubble element
     */
    addBubbleEventListeners(bubbleContainer) {
        // Click to select bubble
        bubbleContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBubble(bubbleContainer);
        });
        
        // Note: Mouse down for dragging will be handled by InteractionManager
        // This is just for selection
    }
    
    /**
     * Get bubble count
     */
    getBubbleCount() {
        return this.bubbles.length;
    }
    
    /**
     * Clear all bubbles with deformation cleanup
     */
    clearAllBubbles() {
        // Remove all bubbles from DOM
        this.bubbles.forEach(bubbleData => {
            if (bubbleData.element) {
                bubbleData.element.remove();
            }
        });
        
        // Clear handles
        this.deselectBubble();
        
        // Clear tracking array
        this.bubbles = [];
        this.bubbleIdCounter = 0;
        
        console.log('All bubbles cleared');
    }
    
    /**
     * Get deformation summary for all bubbles
     */
    getDeformationSummary() {
        const summary = {
            totalBubbles: this.bubbles.length,
            deformedBubbles: 0,
            averageDeformation: 0
        };
        
        if (!this.controlPointManager) return summary;
        
        let totalDeformation = 0;
        
        this.bubbles.forEach(bubbleData => {
            if (bubbleData.isDeformed) {
                summary.deformedBubbles++;
                totalDeformation += this.controlPointManager.calculateDeformationStrength(bubbleData);
            }
        });
        
        if (summary.deformedBubbles > 0) {
            summary.averageDeformation = totalDeformation / summary.deformedBubbles;
        }
        
        return summary;
    }
    
    /**
     * Reset all bubbles to default shape
     */
    resetAllBubblesToDefault() {
        if (!this.controlPointManager) return;
        
        let resetCount = 0;
        
        this.bubbles.forEach(bubbleData => {
            if (bubbleData.isDeformed) {
                this.controlPointManager.resetControlPoints(bubbleData);
                this.controlPointManager.applyDeformationToBubble(bubbleData.element, bubbleData);
                resetCount++;
            }
        });
        
        // Update handles for selected bubble
        if (this.selectedBubble) {
            this.handleManager.updateControlPointHandlePositions(this.selectedBubble);
        }
        
        console.log(`✓ Reset ${resetCount} bubbles to default shape`);
        return resetCount;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleManager;
}