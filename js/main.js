/**
 * Speech Bubble Editor - Main Entry Point (Updated with Text Integration)
 */
class SpeechBubbleEditor {
    constructor() {
        this.errorHandler = new ErrorHandler();
        this.appCoordinator = new AppCoordinator(this.errorHandler);
        this.uiController = new UIController(this.errorHandler);
        this.imageController = new ImageController(this.errorHandler);
        
        // Text system managers (new)
        this.textElementManager = null;
        this.selectionManager = null;
        this.fontLoader = null;
        
        this.canvasContainer = document.getElementById('canvas-container');
        this.backgroundImageElement = document.getElementById('background-image');
        this.uploadPlaceholder = document.getElementById('upload-placeholder');
        
        this.isInitialized = false;
        this.initialize();
    }
    
    async initialize() {
        try {
            const managerResult = await this.appCoordinator.initialize(this.canvasContainer);
            
            if (!managerResult.success) {
                this.handleInitializationFailure(managerResult);
                return;
            }
            
            this.uiController.initialize();
            this.setupUIControllerCallbacks();
            
            // Set up managers for UI controller (including text managers)
            this.uiController.setManagers(
                this.appCoordinator.getManager('bubbleManager'),
                this.appCoordinator.getManager('controlPointManager'),
                this.backgroundImageElement,
                this.appCoordinator.getManager('textElementManager'),
                this.appCoordinator.getManager('selectionManager')
            );
            
            // Get text manager references
            this.textElementManager = this.appCoordinator.getManager('textElementManager');
            this.selectionManager = this.appCoordinator.getManager('selectionManager');
            this.fontLoader = this.appCoordinator.getManager('fontLoader');
            
            this.setupBubbleManagerUICallback();
            this.setupTextManagerCallbacks();
            
            this.imageController.initialize(
                this.canvasContainer, 
                this.backgroundImageElement, 
                this.uploadPlaceholder
            );
            this.setupImageControllerCallbacks();
            
            this.isInitialized = true;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'SpeechBubbleEditor initialization');
            this.handleInitializationFailure({ success: false, error });
        }
    }
    
    setupBubbleManagerUICallback() {
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (bubbleManager && this.uiController) {
            bubbleManager.setUIUpdateCallback(() => {
                this.uiController.forceUpdateBubbleControls();
            });
        }
    }
    
    setupTextManagerCallbacks() {
        // Set up text system callbacks for UI updates
        if (this.selectionManager && this.uiController) {
            this.selectionManager.onSelectionChange = () => {
                this.uiController.forceUpdateBubbleControls();
            };
        }
    }
    
    handleInitializationFailure(result) {
        alert(result.userMessage || 'Failed to initialize Speech Bubble Editor. Please refresh the page.');
    }
    
    setupUIControllerCallbacks() {
        // Existing bubble callbacks
        this.uiController.onAddBubble = () => this.addSpeechBubble();
        this.uiController.onCopyBubble = () => this.copySelectedBubble();
        this.uiController.onDeleteBubble = () => this.deleteSelectedBubble();
        this.uiController.onResetBubble = () => this.resetSelectedBubble();
        this.uiController.onFlipHorizontal = () => this.flipSelectedBubbleHorizontal();
        this.uiController.onFlipVertical = () => this.flipSelectedBubbleVertical();
        this.uiController.onExport = () => this.exportImage();
        
        // Text operation callbacks (new)
        this.uiController.onAddText = () => this.addTextElement();
        this.uiController.onDeleteText = () => this.deleteSelectedText();
        this.uiController.onLinkText = () => this.linkSelectedTextToBubble();
        this.uiController.onUnlinkText = () => this.unlinkSelectedText();
    }
    
    setupImageControllerCallbacks() {
        this.imageController.setOnImageLoaded((imageInfo) => {
            this.handleImageLoaded(imageInfo);
        });
        
        this.imageController.setOnImageCleared(() => {
            this.handleImageCleared();
        });
    }
    
    handleImageLoaded(imageInfo) {
        this.addSpeechBubble();
        this.uiController.showBubbleControls();
        
        // Initialize global reference for text system
        window.selectionManager = this.selectionManager;
    }
    
    handleImageCleared() {
        this.clearAllBubbles();
        this.clearAllText();
        this.uiController.hideBubbleControls();
    }
    
    // ===== EXISTING BUBBLE METHODS (unchanged) =====
    addSpeechBubble() {
        if (!this.isInitialized) return null;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return null;
        
        const newBubble = bubbleManager.addBubble();
        
        // Register bubble with selection manager
        if (newBubble && this.selectionManager) {
            this.selectionManager.registerElement(newBubble.element, 'bubble', newBubble);
        }
        
        return newBubble;
    }
    
    copySelectedBubble() {
        if (!this.isInitialized) return null;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return null;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return null;
        
        const newBubble = bubbleManager.copyBubble(selectedBubble);
        
        // Register copied bubble with selection manager
        if (newBubble && this.selectionManager) {
            this.selectionManager.registerElement(newBubble.element, 'bubble', newBubble);
        }
        
        return newBubble;
    }
    
    deleteSelectedBubble() {
        if (!this.isInitialized) return false;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return false;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return false;
        
        // Clean up from selection manager
        if (this.selectionManager) {
            this.selectionManager.cleanup(selectedBubble);
        }
        
        return bubbleManager.deleteBubble(selectedBubble);
    }

    resetSelectedBubble() {
        if (!this.isInitialized) return false;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        const controlPointManager = this.appCoordinator.getManager('controlPointManager');
        const handleManager = this.appCoordinator.getManager('handleManager');
        
        if (!bubbleManager || !controlPointManager) return false;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return false;
        
        const bubbleData = bubbleManager.getBubbleData(selectedBubble);
        if (!bubbleData) return false;
        
        // Reset the control points
        controlPointManager.resetControlPoints(bubbleData);
        controlPointManager.applyDeformationToBubble(selectedBubble, bubbleData);
        
        // Update handle positions
        if (handleManager) {
            handleManager.updateControlPointHandlePositions(selectedBubble);
        }
        
        // Force UI update
        this.uiController.forceUpdateBubbleControls();
        
        return true;
    }
    
    flipSelectedBubbleHorizontal() {
        if (!this.isInitialized) return false;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return false;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return false;
        
        return bubbleManager.flipBubbleHorizontal(selectedBubble);
    }
    
    flipSelectedBubbleVertical() {
        if (!this.isInitialized) return false;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return false;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return false;
        
        return bubbleManager.flipBubbleVertical(selectedBubble);
    }
    
    clearAllBubbles() {
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (bubbleManager) {
            bubbleManager.clearAllBubbles();
        }
    }
    
    // ===== NEW TEXT METHODS =====
    addTextElement() {
        if (!this.isInitialized || !this.textElementManager) return null;
        
        try {
            // Create text element at center of canvas with default text
            const canvasRect = this.canvasContainer.getBoundingClientRect();
            const x = canvasRect.width / 2 - 50; // Center horizontally
            const y = 50; // Near top
            
            const textElement = this.textElementManager.createTextElement(x, y, 'New Text');
            
            if (textElement && this.selectionManager) {
                // Get text data for registration
                const textData = this.textElementManager.getTextDataByElement(textElement);
                if (textData) {
                    this.selectionManager.registerElement(textElement, 'text', textData);
                }
            }
            
            // Force UI update
            this.uiController.forceUpdateBubbleControls();
            
            return textElement;
        } catch (error) {
            this.errorHandler.handleError(error, 'Text element creation');
            return null;
        }
    }
    
    deleteSelectedText() {
        if (!this.isInitialized || !this.selectionManager || !this.textElementManager) return false;
        
        try {
            const selectedElements = this.selectionManager.getSelectedByType('text');
            
            if (selectedElements.length === 0) return false;
            
            // Delete all selected text elements
            selectedElements.forEach(textItem => {
                this.textElementManager.deleteTextElement(textItem.element);
            });
            
            // Force UI update
            this.uiController.forceUpdateBubbleControls();
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'Text element deletion');
            return false;
        }
    }
    
    linkSelectedTextToBubble() {
        if (!this.isInitialized || !this.selectionManager || !this.textElementManager) return false;
        
        try {
            const selectedTexts = this.selectionManager.getSelectedByType('text');
            const selectedBubbles = this.selectionManager.getSelectedByType('bubble');
            
            if (selectedTexts.length === 0 || selectedBubbles.length === 0) {
                this.errorHandler.showUserError('Please select both text and a bubble to link them.');
                return false;
            }
            
            // Use first selected bubble as the target
            const targetBubble = selectedBubbles[0];
            
            // Link all selected text elements to the bubble
            selectedTexts.forEach(textItem => {
                this.textElementManager.linkTextToBubble(textItem.element, targetBubble.element);
            });
            
            // Force UI update
            this.uiController.forceUpdateBubbleControls();
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'Text-bubble linking');
            return false;
        }
    }
    
    unlinkSelectedText() {
        if (!this.isInitialized || !this.selectionManager || !this.textElementManager) return false;
        
        try {
            const selectedTexts = this.selectionManager.getSelectedByType('text');
            
            if (selectedTexts.length === 0) {
                this.errorHandler.showUserError('Please select text elements to unlink.');
                return false;
            }
            
            // Unlink all selected text elements
            selectedTexts.forEach(textItem => {
                this.textElementManager.unlinkTextFromBubble(textItem.element);
            });
            
            // Force UI update
            this.uiController.forceUpdateBubbleControls();
            
            return true;
        } catch (error) {
            this.errorHandler.handleError(error, 'Text unlinking');
            return false;
        }
    }
    
    clearAllText() {
        if (this.textElementManager) {
            // Clear all text elements
            const allTextElements = this.canvasContainer.querySelectorAll('.text-element');
            allTextElements.forEach(element => {
                this.textElementManager.deleteTextElement(element);
            });
        }
    }
    
    // ===== EXISTING EXPORT METHOD (unchanged) =====
    async exportImage() {
        if (!this.imageController.hasImage()) {
            this.errorHandler.showUserError('Please upload an image first.');
            return;
        }
        
        this.uiController.setExportState(true);
        
        try {
            // Placeholder for export functionality
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            const deformationSummary = bubbleManager?.getDeformationSummary();
            
            let message = 'Export functionality will be added in next update.';
            if (deformationSummary?.deformedBubbles > 0) {
                message += `\n\nNote: ${deformationSummary.deformedBubbles} deformed bubbles will be included in export.`;
            }
            
            this.errorHandler.showUserError(message);
        } finally {
            this.uiController.setExportState(false);
        }
    }
}

// Initialize when page loads
window.editor = null;
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new SpeechBubbleEditor();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechBubbleEditor;
}