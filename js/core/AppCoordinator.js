/**
 * AppCoordinator - Manages initialization and coordination of all managers
 * Updated to include text system integration
 */
class AppCoordinator {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        
        // Existing managers
        this.controlPointManager = null;
        this.handleManager = null;
        this.bubbleManager = null;
        this.interactionManager = null;
        
        // Text system managers  
        this.fontLoader = null;
        this.textElementManager = null;
        this.selectionManager = null;
        
        this.canvasContainer = null;
    }
    
    async initialize(canvasContainer) {
        try {
            this.canvasContainer = canvasContainer;
            
            await this.createCoreManagers();
            await this.createInteractionManager();
            await this.setCrossReferences();
            
            return {
                success: true,
                managers: this.getManagers()
            };
            
        } catch (error) {
            return this.handleInitializationError(error);
        }
    }
    
    async createCoreManagers() {
        // Existing managers (unchanged)
        this.controlPointManager = new ControlPointManager();
        this.handleManager = new HandleManager(this.canvasContainer);
        this.bubbleManager = new BubbleManager(this.canvasContainer, this.handleManager);
        
        // Text system managers (new)
        this.fontLoader = new FontLoader();
        this.textElementManager = new TextElementManager(this.canvasContainer, this.fontLoader);
        this.selectionManager = new SelectionManager();
    }
    
    async createInteractionManager() {
        // Unchanged - existing interaction manager creation
        this.interactionManager = new InteractionManager(
            this.canvasContainer, 
            this.bubbleManager, 
            this.handleManager, 
            this.controlPointManager
        );
    }
    
    async setCrossReferences() {
        // Existing cross-references (unchanged)
        this.handleManager.setInteractionManager(this.interactionManager);
        this.handleManager.setBubbleManager(this.bubbleManager);
        this.bubbleManager.setControlPointManager(this.controlPointManager);
        
        // Text system cross-references (new)
        // SelectionManager needs access to text and bubble managers for unified selection
        if (this.selectionManager && this.textElementManager && this.bubbleManager) {
            // Note: SelectionManager will access managers through window.editor reference
            // This follows the existing pattern seen in TextElementManager
        }
    }
    
    handleInitializationError(error) {
        this.errorHandler.handleError(error, 'Manager initialization');
        
        return {
            success: false,
            error: error,
            userMessage: 'Failed to initialize the editor. Please refresh and try again.',
            managers: this.getManagers()
        };
    }
    
    getManagers() {
        return {
            // Existing managers
            controlPointManager: this.controlPointManager,
            handleManager: this.handleManager,
            bubbleManager: this.bubbleManager,
            interactionManager: this.interactionManager,
            
            // Text system managers
            fontLoader: this.fontLoader,
            textElementManager: this.textElementManager,
            selectionManager: this.selectionManager
        };
    }
    
    getManager(name) {
        return this.getManagers()[name] || null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppCoordinator;
}