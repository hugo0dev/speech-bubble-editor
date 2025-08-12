/**
 * Speech Bubble Editor - Main Entry Point (Pruned Version)
 */
class SpeechBubbleEditor {
    constructor() {
        this.errorHandler = new ErrorHandler();
        this.appCoordinator = new AppCoordinator(this.errorHandler);
        this.uiController = new UIController(this.errorHandler);
        this.imageController = new ImageController(this.errorHandler);
        
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
            this.uiController.setManagers(
                this.appCoordinator.getManager('bubbleManager'),
                this.appCoordinator.getManager('controlPointManager'),
                this.backgroundImageElement
            );
            
            this.setupBubbleManagerUICallback();
            
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
    
    handleInitializationFailure(result) {
        alert(result.userMessage || 'Failed to initialize Speech Bubble Editor. Please refresh the page.');
    }
    
    setupUIControllerCallbacks() {
        this.uiController.onAddBubble = () => this.addSpeechBubble();
        this.uiController.onCopyBubble = () => this.copySelectedBubble();
        this.uiController.onDeleteBubble = () => this.deleteSelectedBubble();
        this.uiController.onResetBubble = () => this.resetSelectedBubble();
        this.uiController.onFlipHorizontal = () => this.flipSelectedBubbleHorizontal();
        this.uiController.onFlipVertical = () => this.flipSelectedBubbleVertical();
        this.uiController.onExport = () => this.exportImage();
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
    }
    
    handleImageCleared() {
        this.clearAllBubbles();
        this.uiController.hideBubbleControls();
    }
    
    addSpeechBubble() {
        if (!this.isInitialized) return null;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return null;
        
        return bubbleManager.addBubble();
    }
    
    copySelectedBubble() {
        if (!this.isInitialized) return null;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return null;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return null;
        
        return bubbleManager.copyBubble(selectedBubble);
    }
    
    deleteSelectedBubble() {
        if (!this.isInitialized) return false;
        
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        if (!bubbleManager) return false;
        
        const selectedBubble = bubbleManager.getSelectedBubble();
        if (!selectedBubble) return false;
        
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