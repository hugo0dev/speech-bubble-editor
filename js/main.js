/**
 * Speech Bubble Editor - Modular Entry Point with UI Fix
 * FIXES: UI buttons not re-enabling after bubble selection following deletion
 */
class SpeechBubbleEditor {
    constructor() {
        // Initialize core modules
        this.errorHandler = new ErrorHandler();
        this.appCoordinator = new AppCoordinator(this.errorHandler);
        this.uiController = new UIController(this.errorHandler);
        this.imageController = new ImageController(this.errorHandler);
        
        // DOM elements
        this.canvasContainer = document.getElementById('canvas-container');
        this.backgroundImageElement = document.getElementById('background-image');
        this.uploadPlaceholder = document.getElementById('upload-placeholder');
        
        // State
        this.isInitialized = false;
        
        // Initialize the application
        this.initialize();
    }
    
    /**
     * Initialize the application
     */
    async initialize() {
        try {
            this.errorHandler.logInfo('Starting Speech Bubble Editor initialization', 'SpeechBubbleEditor');
            
            // Step 1: Initialize managers through AppCoordinator
            const managerResult = await this.appCoordinator.initialize(this.canvasContainer);
            
            if (!managerResult.success) {
                this.handleInitializationFailure(managerResult);
                return;
            }
            
            // Step 2: Initialize UI Controller
            this.uiController.initialize();
            this.setupUIControllerCallbacks();
            this.uiController.setManagers(
                this.appCoordinator.getManager('bubbleManager'),
                this.appCoordinator.getManager('controlPointManager'),
                this.backgroundImageElement
            );
            
            // Step 3: FIXED - Setup BubbleManager UI callback connection
            this.setupBubbleManagerUICallback();
            
            // Step 4: Initialize Image Controller
            this.imageController.initialize(
                this.canvasContainer, 
                this.backgroundImageElement, 
                this.uploadPlaceholder
            );
            this.setupImageControllerCallbacks();
            
            // Step 5: Mark as initialized
            this.isInitialized = true;
            
            this.errorHandler.logInfo('Speech Bubble Editor initialized successfully', 'SpeechBubbleEditor');
            console.log('✅ Speech Bubble Editor ready - modular architecture active with UI fix');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'SpeechBubbleEditor initialization');
            this.handleInitializationFailure({ success: false, error });
        }
    }
    
    /**
     * NEW: Setup BubbleManager UI callback connection
     */
    setupBubbleManagerUICallback() {
        try {
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            
            if (!bubbleManager) {
                this.errorHandler.logWarning('BubbleManager not available for UI callback setup', 'SpeechBubbleEditor');
                return;
            }
            
            if (!this.uiController) {
                this.errorHandler.logWarning('UIController not available for UI callback setup', 'SpeechBubbleEditor');
                return;
            }
            
            // Wire BubbleManager selection changes to UIController updates
            // Use arrow function to maintain proper 'this' binding
            bubbleManager.setUIUpdateCallback(() => {
                this.uiController.forceUpdateBubbleControls();
            });
            
            this.errorHandler.logInfo('BubbleManager UI callback connected successfully', 'SpeechBubbleEditor');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'BubbleManager UI callback setup');
            // Don't fail initialization if UI callback setup fails - log and continue
        }
    }
    
    /**
     * Handle initialization failure
     */
    handleInitializationFailure(result) {
        console.error('❌ Speech Bubble Editor initialization failed');
        
        if (result.userMessage) {
            alert(result.userMessage);
        } else {
            alert('Failed to initialize Speech Bubble Editor. Please refresh the page and try again.');
        }
        
        // Log what was partially initialized
        if (result.partialStatus) {
            this.errorHandler.logInfo('Partial initialization status', 'SpeechBubbleEditor', result.partialStatus);
        }
    }
    
    /**
     * Setup UI Controller event callbacks
     */
    setupUIControllerCallbacks() {
        // Delegate UI events to appropriate methods
        this.uiController.onAddBubble = () => this.addSpeechBubble();
        this.uiController.onCopyBubble = () => this.copySelectedBubble();
        this.uiController.onDeleteBubble = () => this.deleteSelectedBubble();
        this.uiController.onExport = () => this.exportImage();
    }
    
    /**
     * Setup Image Controller event callbacks
     */
    setupImageControllerCallbacks() {
        // When image is loaded, show bubble controls and add default bubble
        this.imageController.setOnImageLoaded((imageInfo) => {
            this.handleImageLoaded(imageInfo);
        });
        
        // When image is cleared, hide bubble controls
        this.imageController.setOnImageCleared(() => {
            this.handleImageCleared();
        });
    }
    
    /**
     * Handle image loaded event
     */
    handleImageLoaded(imageInfo) {
        try {
            this.errorHandler.logInfo('Image loaded, setting up bubble controls', 'SpeechBubbleEditor', imageInfo);
            
            // Add default speech bubble
            this.addSpeechBubble();
            
            // Show bubble controls
            this.uiController.showBubbleControls();
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Handle image loaded');
        }
    }
    
    /**
     * Handle image cleared event
     */
    handleImageCleared() {
        try {
            this.errorHandler.logInfo('Image cleared, hiding bubble controls', 'SpeechBubbleEditor');
            
            // Clear all bubbles
            this.clearAllBubbles();
            
            // Hide bubble controls
            this.uiController.hideBubbleControls();
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Handle image cleared');
        }
    }
    
    // ===============================
    // BUBBLE MANAGEMENT METHODS
    // ===============================
    
    /**
     * Add speech bubble
     */
    addSpeechBubble() {
        try {
            if (!this.isInitialized) {
                this.errorHandler.logWarning('Cannot add bubble - editor not initialized', 'SpeechBubbleEditor');
                return null;
            }
            
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            if (!bubbleManager) {
                this.errorHandler.logWarning('BubbleManager not available', 'SpeechBubbleEditor');
                return null;
            }
            
            const bubble = bubbleManager.addBubble();
            // UI update is now triggered automatically by BubbleManager callback
            
            this.errorHandler.logInfo('Speech bubble added', 'SpeechBubbleEditor');
            return bubble;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Add speech bubble');
            return null;
        }
    }
    
    /**
     * Copy selected bubble
     */
    copySelectedBubble() {
        try {
            if (!this.isInitialized) {
                this.errorHandler.logWarning('Cannot copy bubble - editor not initialized', 'SpeechBubbleEditor');
                return null;
            }
            
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            if (!bubbleManager) {
                this.errorHandler.logWarning('BubbleManager not available', 'SpeechBubbleEditor');
                return null;
            }
            
            const selectedBubble = bubbleManager.getSelectedBubble();
            if (!selectedBubble) {
                this.errorHandler.logInfo('No bubble selected for copying', 'SpeechBubbleEditor');
                return null;
            }
            
            const newBubble = bubbleManager.copyBubble(selectedBubble);
            // UI update is now triggered automatically by BubbleManager callback
            
            this.errorHandler.logInfo('Speech bubble copied', 'SpeechBubbleEditor');
            return newBubble;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Copy selected bubble');
            return null;
        }
    }
    
    /**
     * Delete selected bubble
     */
    deleteSelectedBubble() {
        try {
            if (!this.isInitialized) {
                this.errorHandler.logWarning('Cannot delete bubble - editor not initialized', 'SpeechBubbleEditor');
                return false;
            }
            
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            if (!bubbleManager) {
                this.errorHandler.logWarning('BubbleManager not available', 'SpeechBubbleEditor');
                return false;
            }
            
            const selectedBubble = bubbleManager.getSelectedBubble();
            if (!selectedBubble) {
                this.errorHandler.logInfo('No bubble selected for deletion', 'SpeechBubbleEditor');
                return false;
            }
            
            const success = bubbleManager.deleteBubble(selectedBubble);
            // UI update is now triggered automatically by BubbleManager callback
            
            this.errorHandler.logInfo('Speech bubble deleted', 'SpeechBubbleEditor');
            return success;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Delete selected bubble');
            return false;
        }
    }
    
    /**
     * Clear all bubbles
     */
    clearAllBubbles() {
        try {
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            if (bubbleManager) {
                bubbleManager.clearAllBubbles();
                // UI update is now triggered automatically by BubbleManager callback
                this.errorHandler.logInfo('All bubbles cleared', 'SpeechBubbleEditor');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Clear all bubbles');
        }
    }
    
    /**
     * Export image (placeholder for future ExportController)
     */
    async exportImage() {
        try {
            if (!this.imageController.hasImage()) {
                this.errorHandler.showUserError('Please upload an image first.');
                return;
            }
            
            this.uiController.setExportState(true);
            
            // Placeholder for export functionality
            const bubbleManager = this.appCoordinator.getManager('bubbleManager');
            const deformationSummary = bubbleManager ? bubbleManager.getDeformationSummary() : null;
            
            let message = 'Export functionality will be moved to ExportController in next update.';
            if (deformationSummary && deformationSummary.deformedBubbles > 0) {
                message += `\n\nNote: ${deformationSummary.deformedBubbles} deformed bubbles will be included in export.`;
            }
            
            this.errorHandler.showUserError(message);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Export image');
        } finally {
            this.uiController.setExportState(false);
        }
    }
    
    // ===============================
    // PUBLIC API METHODS
    // ===============================
    
    /**
     * Get all speech bubbles
     */
    getSpeechBubbles() {
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        return bubbleManager ? bubbleManager.getAllBubbles() : [];
    }
    
    /**
     * Get selected bubble data
     */
    getSelectedBubbleData() {
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        return bubbleManager ? bubbleManager.getSelectedBubbleData() : null;
    }
    
    /**
     * Get bubble count
     */
    getBubbleCount() {
        const bubbleManager = this.appCoordinator.getManager('bubbleManager');
        return bubbleManager ? bubbleManager.getBubbleCount() : 0;
    }
    
    /**
     * Get deformation statistics
     */
    getDeformationStatistics() {
        return this.appCoordinator.getDeformationStatistics();
    }
    
    /**
     * Reset deformation safety system
     */
    resetDeformationSafetySystem() {
        return this.appCoordinator.resetDeformationSafetySystem();
    }
    
    /**
     * Get current image info
     */
    getCurrentImageInfo() {
        return this.imageController.getCurrentImageInfo();
    }
    
    /**
     * Get manager references (for testing and debugging)
     */
    getManagers() {
        return {
            ...this.appCoordinator.getManagers(),
            uiController: this.uiController,
            imageController: this.imageController,
            errorHandler: this.errorHandler,
            appCoordinator: this.appCoordinator
        };
    }
    
    /**
     * Get initialization status
     */
    getInitializationStatus() {
        return {
            isInitialized: this.isInitialized,
            ...this.appCoordinator.getInitializationStatus()
        };
    }
    
    /**
     * Perform health check
     */
    performHealthCheck() {
        return this.appCoordinator.performHealthCheck();
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        return this.errorHandler.getErrorStats();
    }
}

// Make editor instance available globally for testing
window.editor = null;

// Initialize the editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new SpeechBubbleEditor();
});

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpeechBubbleEditor;
}