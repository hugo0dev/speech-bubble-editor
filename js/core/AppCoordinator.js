/**
 * AppCoordinator - Handles initialization and coordination of all managers
 * Responsible for: manager creation, dependency injection, cross-references, verification
 */
class AppCoordinator {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        
        // Manager instances
        this.controlPointManager = null;
        this.handleManager = null;
        this.bubbleManager = null;
        this.interactionManager = null;
        
        // Core DOM elements
        this.canvasContainer = null;
        
        console.log('✓ AppCoordinator initialized');
    }
    
    /**
     * Initialize all managers with safe deformation support
     */
    async initialize(canvasContainer) {
        try {
            this.canvasContainer = canvasContainer;
            
            this.errorHandler.logInfo('Starting manager initialization with safe deformation support', 'AppCoordinator');
            
            // Phase 1: Create managers with basic dependencies (no circular refs)
            this.errorHandler.logInfo('Phase 1: Creating core managers', 'AppCoordinator');
            await this.createCoreManagers();
            
            // Phase 2: Create InteractionManager with all dependencies
            this.errorHandler.logInfo('Phase 2: Creating InteractionManager', 'AppCoordinator');
            await this.createInteractionManager();
            
            // Phase 3: Set cross-references using setter methods
            this.errorHandler.logInfo('Phase 3: Setting cross-references', 'AppCoordinator');
            await this.setCrossReferences();
            
            // Phase 4: Verify safe deformation initialization
            this.errorHandler.logInfo('Phase 4: Verification', 'AppCoordinator');
            this.verifyManagerInitialization();
            this.verifySafeDeformationSystem();
            
            this.errorHandler.logInfo('All managers initialized successfully with safe deformation', 'AppCoordinator');
            
            return {
                success: true,
                managers: this.getManagers()
            };
            
        } catch (error) {
            return this.handleInitializationError(error);
        }
    }
    
    /**
     * Create core managers without circular dependencies
     */
    async createCoreManagers() {
        try {
            // ControlPointManager (no dependencies)
            this.controlPointManager = new ControlPointManager();
            this.errorHandler.logInfo('ControlPointManager created with safety systems', 'AppCoordinator');
            
            // HandleManager (minimal dependencies)
            this.handleManager = new HandleManager(this.canvasContainer);
            this.errorHandler.logInfo('HandleManager created', 'AppCoordinator');
            
            // BubbleManager (depends on HandleManager)
            this.bubbleManager = new BubbleManager(this.canvasContainer, this.handleManager);
            this.errorHandler.logInfo('BubbleManager created', 'AppCoordinator');
            
        } catch (error) {
            throw new Error(`Core manager creation failed: ${error.message}`);
        }
    }
    
    /**
     * Create InteractionManager with all dependencies
     */
    async createInteractionManager() {
        try {
            this.interactionManager = new InteractionManager(
                this.canvasContainer, 
                this.bubbleManager, 
                this.handleManager, 
                this.controlPointManager
            );
            this.errorHandler.logInfo('InteractionManager created', 'AppCoordinator');
            
        } catch (error) {
            throw new Error(`InteractionManager creation failed: ${error.message}`);
        }
    }
    
    /**
     * Set cross-references between managers
     */
    async setCrossReferences() {
        try {
            // HandleManager cross-references
            this.handleManager.setInteractionManager(this.interactionManager);
            this.handleManager.setBubbleManager(this.bubbleManager);
            
            // BubbleManager cross-references (for deformation support)
            this.bubbleManager.setControlPointManager(this.controlPointManager);
            
            this.errorHandler.logInfo('Safe deformation cross-references set', 'AppCoordinator');
            
        } catch (error) {
            throw new Error(`Cross-reference setup failed: ${error.message}`);
        }
    }
    
    /**
     * Verify that all managers have required dependencies
     */
    verifyManagerInitialization() {
        const issues = [];
        
        if (!this.controlPointManager) {
            issues.push('ControlPointManager not created');
        }
        
        if (!this.handleManager) {
            issues.push('HandleManager not created');
        } else {
            if (!this.handleManager.interactionManager) {
                issues.push('HandleManager missing InteractionManager reference');
            }
            if (!this.handleManager.bubbleManager) {
                issues.push('HandleManager missing BubbleManager reference');
            }
        }
        
        if (!this.bubbleManager) {
            issues.push('BubbleManager not created');
        } else {
            if (!this.bubbleManager.controlPointManager) {
                issues.push('BubbleManager missing ControlPointManager reference');
            }
        }
        
        if (!this.interactionManager) {
            issues.push('InteractionManager not created');
        }
        
        if (issues.length > 0) {
            throw new Error('Manager initialization issues: ' + issues.join(', '));
        }
        
        this.errorHandler.logInfo('Manager dependency verification passed (including safe deformation)', 'AppCoordinator');
    }
    
    /**
     * Verify safe deformation system is working correctly
     */
    verifySafeDeformationSystem() {
        try {
            if (!this.controlPointManager) {
                throw new Error('ControlPointManager not available for safety verification');
            }
            
            // Check if safety systems are initialized
            const deformationStatus = this.controlPointManager.getDeformationStatus();
            if (!deformationStatus.enabled) {
                this.errorHandler.logWarning('Deformation system is disabled on startup', 'AppCoordinator');
            }
            
            this.errorHandler.logInfo('Safe deformation system verification passed', 'AppCoordinator', deformationStatus);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Safe deformation system verification');
            // Continue execution - deformation issues shouldn't prevent basic functionality
        }
    }
    
    /**
     * Handle manager initialization errors with deformation-specific handling
     */
    handleInitializationError(error) {
        this.errorHandler.handleError(error, 'Manager initialization');
        
        // Get user-friendly error message from ErrorHandler
        const userMessage = this.errorHandler.getLastInitializationError();
        
        // Try to show what did initialize
        const partialStatus = {
            controlPointManager: !!this.controlPointManager,
            handleManager: !!this.handleManager,
            bubbleManager: !!this.bubbleManager,
            interactionManager: !!this.interactionManager,
            deformationStatus: this.controlPointManager ? 
                this.controlPointManager.getDeformationStatus() : 'unavailable'
        };
        
        this.errorHandler.logInfo('Partial initialization status', 'AppCoordinator', partialStatus);
        
        return {
            success: false,
            error: error,
            userMessage: userMessage,
            partialStatus: partialStatus,
            managers: this.getManagers()
        };
    }
    
    /**
     * Get all manager references
     */
    getManagers() {
        return {
            controlPointManager: this.controlPointManager,
            handleManager: this.handleManager,
            bubbleManager: this.bubbleManager,
            interactionManager: this.interactionManager
        };
    }
    
    /**
     * Get specific manager by name
     */
    getManager(name) {
        const managers = this.getManagers();
        return managers[name] || null;
    }
    
    /**
     * Check if all managers are initialized
     */
    isFullyInitialized() {
        return !!(this.controlPointManager && 
                 this.handleManager && 
                 this.bubbleManager && 
                 this.interactionManager);
    }
    
    /**
     * Get initialization status
     */
    getInitializationStatus() {
        return {
            fullyInitialized: this.isFullyInitialized(),
            managers: {
                controlPointManager: !!this.controlPointManager,
                handleManager: !!this.handleManager,
                bubbleManager: !!this.bubbleManager,
                interactionManager: !!this.interactionManager
            },
            deformationStatus: this.controlPointManager ? 
                this.controlPointManager.getDeformationStatus() : null
        };
    }
    
    /**
     * Reset deformation safety system
     */
    resetDeformationSafetySystem() {
        try {
            if (this.controlPointManager) {
                this.controlPointManager.resetDeformationSystem();
                this.errorHandler.logInfo('Deformation safety system reset', 'AppCoordinator');
                return true;
            }
            return false;
        } catch (error) {
            this.errorHandler.handleError(error, 'Reset deformation safety system');
            return false;
        }
    }
    
    /**
     * Get deformation statistics
     */
    getDeformationStatistics() {
        try {
            if (!this.bubbleManager) {
                return null;
            }
            
            const summary = this.bubbleManager.getDeformationSummary();
            const selectedBubbleData = this.bubbleManager.getSelectedBubbleData();
            
            const stats = {
                ...summary,
                selectedBubbleDeformed: selectedBubbleData ? selectedBubbleData.isDeformed : false,
                selectedBubbleDeformationStrength: 0,
                safetyInfo: null
            };
            
            if (selectedBubbleData && selectedBubbleData.isDeformed && this.controlPointManager) {
                stats.selectedBubbleDeformationStrength = 
                    this.controlPointManager.calculateDeformationStrength(selectedBubbleData);
            }
            
            if (this.controlPointManager) {
                stats.safetyInfo = this.controlPointManager.getDeformationStatus();
            }
            
            return stats;
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Get deformation statistics');
            return null;
        }
    }
    
    /**
     * Perform health check on all managers
     */
    performHealthCheck() {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            overall: 'healthy',
            managers: {},
            issues: []
        };
        
        try {
            // Check each manager
            const managers = this.getManagers();
            
            Object.entries(managers).forEach(([name, manager]) => {
                if (manager) {
                    healthStatus.managers[name] = 'healthy';
                } else {
                    healthStatus.managers[name] = 'missing';
                    healthStatus.issues.push(`${name} is not initialized`);
                }
            });
            
            // Check deformation system
            if (this.controlPointManager) {
                const deformationStatus = this.controlPointManager.getDeformationStatus();
                if (deformationStatus.shouldDisable) {
                    healthStatus.issues.push('Deformation system disabled due to errors');
                }
            }
            
            // Determine overall health
            if (healthStatus.issues.length > 0) {
                healthStatus.overall = healthStatus.issues.length > 2 ? 'critical' : 'warning';
            }
            
        } catch (error) {
            healthStatus.overall = 'error';
            healthStatus.issues.push(`Health check failed: ${error.message}`);
            this.errorHandler.handleError(error, 'Health check');
        }
        
        return healthStatus;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppCoordinator;
}