/**
 * AppCoordinator - Manages initialization and coordination of all managers
 */
class AppCoordinator {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.controlPointManager = null;
        this.handleManager = null;
        this.bubbleManager = null;
        this.interactionManager = null;
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
        this.controlPointManager = new ControlPointManager();
        this.handleManager = new HandleManager(this.canvasContainer);
        this.bubbleManager = new BubbleManager(this.canvasContainer, this.handleManager);
    }
    
    async createInteractionManager() {
        this.interactionManager = new InteractionManager(
            this.canvasContainer, 
            this.bubbleManager, 
            this.handleManager, 
            this.controlPointManager
        );
    }
    
    async setCrossReferences() {
        this.handleManager.setInteractionManager(this.interactionManager);
        this.handleManager.setBubbleManager(this.bubbleManager);
        this.bubbleManager.setControlPointManager(this.controlPointManager);
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
            controlPointManager: this.controlPointManager,
            handleManager: this.handleManager,
            bubbleManager: this.bubbleManager,
            interactionManager: this.interactionManager
        };
    }
    
    getManager(name) {
        return this.getManagers()[name] || null;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppCoordinator;
}