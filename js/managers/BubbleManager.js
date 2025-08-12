/**
 * BubbleManager - Manages bubble lifecycle and data
 */
class BubbleManager {
    constructor(canvasContainer, handleManager) {
        this.canvasContainer = canvasContainer;
        this.handleManager = handleManager;
        this.bubbles = [];
        this.selectedBubble = null;
        this.bubbleIdCounter = 0;
        this.controlPointManager = null;
        this.uiUpdateCallback = null;
    }
    
    setControlPointManager(controlPointManager) {
        this.controlPointManager = controlPointManager;
    }
    
    setUIUpdateCallback(callback) {
        if (typeof callback === 'function') {
            this.uiUpdateCallback = callback;
        }
    }
    
    triggerUIUpdate() {
        this.uiUpdateCallback?.();
    }
    
    createBubbleData(x, y, width, height, rotation = 0) {
        return {
            id: ++this.bubbleIdCounter,
            x, y, width, height, rotation,
            controlPoints: { ...Constants.DEFAULT_CONTROL_POINTS },
            isDeformed: false,
            deformationMatrix: null
        };
    }
    
    addBubble(x = null, y = null, width = null, height = null) {
        const bubbleWidth = width || Constants.DEFAULT_BUBBLE_WIDTH;
        const bubbleHeight = height || Constants.DEFAULT_BUBBLE_HEIGHT;
        const bubbleRotation = Constants.DEFAULT_BUBBLE_ROTATION;
        
        let bubbleX = x;
        let bubbleY = y;
        
        if (bubbleX === null || bubbleY === null) {
            const position = this.calculateBubblePosition(bubbleWidth, bubbleHeight);
            bubbleX = position.x;
            bubbleY = position.y;
        }
        
        const bubbleData = this.createBubbleData(bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRotation);
        const bubbleContainer = this.createBubbleElementFromData(bubbleData);
        
        this.addBubbleEventListeners(bubbleContainer);
        
        this.canvasContainer.appendChild(bubbleContainer);
        bubbleData.element = bubbleContainer;
        this.bubbles.push(bubbleData);
        
        this.selectBubble(bubbleContainer);
        
        return bubbleData;
    }
    
    deleteBubble(bubbleElement) {
        if (!bubbleElement) return false;
        
        const bubbleIndex = this.bubbles.findIndex(b => b.element === bubbleElement);
        if (bubbleIndex === -1) return false;
        
        if (this.selectedBubble === bubbleElement) {
            this.handleManager.removeAllHandles(bubbleElement);
            this.selectedBubble = null;
            this.triggerUIUpdate();
        }
        
        bubbleElement.remove();
        this.bubbles.splice(bubbleIndex, 1);
        
        return true;
    }
    
    copyBubble(bubbleElement) {
        if (!bubbleElement) return null;
        
        const originalBubbleData = this.bubbles.find(b => b.element === bubbleElement);
        if (!originalBubbleData) return null;
        
        const offset = this.calculateCopyOffset(originalBubbleData);
        
        const newBubbleData = this.createBubbleData(
            offset.x, 
            offset.y, 
            originalBubbleData.width, 
            originalBubbleData.height, 
            originalBubbleData.rotation
        );
        
        if (originalBubbleData.isDeformed) {
            newBubbleData.controlPoints = JSON.parse(JSON.stringify(originalBubbleData.controlPoints));
            newBubbleData.isDeformed = originalBubbleData.isDeformed;
            newBubbleData.deformationMatrix = originalBubbleData.deformationMatrix;
        }
        
        const newBubbleElement = this.createBubbleElementFromData(newBubbleData);
        this.addBubbleEventListeners(newBubbleElement);
        
        this.canvasContainer.appendChild(newBubbleElement);
        newBubbleData.element = newBubbleElement;
        this.bubbles.push(newBubbleData);
        
        this.selectBubble(newBubbleElement);
        
        return newBubbleData;
    }
    
    selectBubble(bubbleElement) {
        if (!bubbleElement) return;
        
        this.deselectBubble();
        
        this.selectedBubble = bubbleElement;
        this.handleManager.createAllHandles(bubbleElement);
        
        this.triggerUIUpdate();
    }
    
    deselectBubble() {
        if (this.selectedBubble) {
            this.handleManager.removeAllHandles(this.selectedBubble);
            this.selectedBubble = null;
            this.triggerUIUpdate();
        }
    }
    
    getBubbleData(bubbleElement) {
        return this.bubbles.find(b => b.element === bubbleElement);
    }
    
    updateBubbleData(bubbleElement, newData) {
        const bubbleData = this.getBubbleData(bubbleElement);
        if (bubbleData) {
            Object.assign(bubbleData, newData);
            
            if (newData.controlPoints && this.controlPointManager) {
                bubbleData.isDeformed = this.controlPointManager.checkIfBubbleIsDeformed(bubbleData);
                this.controlPointManager.applyDeformationToBubble(bubbleElement, bubbleData);
            }
            
            return true;
        }
        return false;
    }
    
    getAllBubbles() {
        return [...this.bubbles];
    }
    
    getSelectedBubble() {
        return this.selectedBubble;
    }
    
    getSelectedBubbleData() {
        return this.selectedBubble ? this.getBubbleData(this.selectedBubble) : null;
    }
    
    calculateBubblePosition(width, height) {
        let x = Constants.BUBBLE_START_OFFSET;
        let y = Constants.BUBBLE_START_OFFSET;
        
        if (this.bubbles.length > 0) {
            const offset = this.bubbles.length * Constants.BUBBLE_STACK_OFFSET;
            x = Constants.BUBBLE_START_OFFSET + offset;
            y = Constants.BUBBLE_START_OFFSET + offset;
            
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
    
    calculateCopyOffset(originalBubble) {
        const defaultOffset = Constants.COPY_OFFSET;
        let newX = originalBubble.x + defaultOffset;
        let newY = originalBubble.y + defaultOffset;
        
        const containerWidth = this.canvasContainer.offsetWidth;
        const containerHeight = this.canvasContainer.offsetHeight;
        
        if (newX + originalBubble.width <= containerWidth && 
            newY + originalBubble.height <= containerHeight) {
            return { x: newX, y: newY };
        }
        
        const alternatives = [
            { x: originalBubble.x - defaultOffset, y: originalBubble.y + defaultOffset },
            { x: originalBubble.x + defaultOffset, y: originalBubble.y - defaultOffset },
            { x: originalBubble.x - defaultOffset, y: originalBubble.y - defaultOffset },
        ];
        
        for (const alt of alternatives) {
            if (alt.x >= 0 && alt.y >= 0 && 
                alt.x + originalBubble.width <= containerWidth && 
                alt.y + originalBubble.height <= containerHeight) {
                return alt;
            }
        }
        
        newX = Math.max(0, Math.min(originalBubble.x + 10, containerWidth - originalBubble.width));
        newY = Math.max(0, Math.min(originalBubble.y + 10, containerHeight - originalBubble.height));
        
        return { x: newX, y: newY };
    }
    
    applyBubbleStyles(bubbleContainer, x, y, width, height, rotation) {
    Object.assign(bubbleContainer.style, {
        position: 'absolute',
        left: x + 'px',
        top: y + 'px',
        width: width + 'px',
        height: height + 'px',
        cursor: 'move',
        transformOrigin: 'center center',
        // Store rotation separately to avoid conflicts with deformation transforms
        transform: `rotate(${rotation}deg)`,
        zIndex: Constants.BUBBLE_Z_INDEX
    });
    
    // Store rotation in a data attribute for later reference
    bubbleContainer.setAttribute('data-rotation', rotation);
}
    
    createBubbleElementFromData(bubbleData) {
        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = 'speech-bubble';
        bubbleContainer.innerHTML = Constants.BUBBLE_SVG;
        
        this.applyBubbleStyles(
            bubbleContainer, 
            bubbleData.x, 
            bubbleData.y, 
            bubbleData.width, 
            bubbleData.height, 
            bubbleData.rotation
        );
        
        if (bubbleData.isDeformed && this.controlPointManager) {
            this.controlPointManager.applyDeformationToBubble(bubbleContainer, bubbleData);
        }
        
        return bubbleContainer;
    }
    
    addBubbleEventListeners(bubbleContainer) {
        bubbleContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectBubble(bubbleContainer);
        });
    }
    
    getBubbleCount() {
        return this.bubbles.length;
    }
    
    clearAllBubbles() {
        this.bubbles.forEach(bubbleData => {
            bubbleData.element?.remove();
        });
        
        this.deselectBubble();
        this.bubbles = [];
        this.bubbleIdCounter = 0;
    }
    
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
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BubbleManager;
}