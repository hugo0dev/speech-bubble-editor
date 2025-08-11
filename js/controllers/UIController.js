/**
 * UIController - Handles all UI state management and updates
 * Responsible for: bubble counter, button states, control visibility, deformation hints
 */
class UIController {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        
        // Manager references (set by AppCoordinator)
        this.bubbleManager = null;
        this.controlPointManager = null;
        this.backgroundImageElement = null;
        this.isExporting = false;
        
        // DOM elements cache
        this.domElements = {};
        
        console.log('✓ UIController initialized');
    }
    
    /**
     * Initialize UIController - cache DOM elements and setup
     */
    initialize() {
        try {
            this.cacheDOMElements();
            console.log('✓ UIController setup complete');
        } catch (error) {
            this.errorHandler.handleError(error, 'UIController initialization');
        }
    }
    
    /**
     * Set manager references (called by AppCoordinator)
     */
    setManagers(bubbleManager, controlPointManager, backgroundImageElement) {
        this.bubbleManager = bubbleManager;
        this.controlPointManager = controlPointManager;
        this.backgroundImageElement = backgroundImageElement;
        console.log('✓ UIController manager references set');
    }
    
    /**
     * Cache DOM elements for performance
     */
    cacheDOMElements() {
        this.domElements = {
            bubbleControls: document.getElementById('bubbleControls'),
            bubbleCount: document.getElementById('bubbleCount'),
            copyBtn: document.getElementById('copyBubbleBtn'),
            deleteBtn: document.getElementById('deleteBubbleBtn'),
            exportBtn: document.getElementById('exportImageBtn'),
            addBtn: document.getElementById('addBubbleBtn')
        };
        
        // Verify critical elements exist
        if (!this.domElements.bubbleControls) {
            throw new Error('Critical DOM element bubbleControls not found');
        }
        
        console.log('✓ DOM elements cached');
    }
    
    /**
     * Show bubble controls and setup event listeners
     */
    showBubbleControls() {
        try {
            if (this.domElements.bubbleControls) {
                this.domElements.bubbleControls.style.display = 'flex';
                this.setupControlEventListeners();
                this.addDeformationHints();
                this.updateBubbleControls();
                console.log('✓ Bubble controls shown');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'showBubbleControls');
        }
    }
    
    /**
     * Hide bubble controls
     */
    hideBubbleControls() {
        try {
            if (this.domElements.bubbleControls) {
                this.domElements.bubbleControls.style.display = 'none';
                console.log('✓ Bubble controls hidden');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'hideBubbleControls');
        }
    }
    
    /**
     * Setup control button event listeners
     */
    setupControlEventListeners() {
        const { addBtn, copyBtn, deleteBtn, exportBtn } = this.domElements;
        
        // Only add listeners if not already added
        if (addBtn && !addBtn.hasAttribute('data-listener-added')) {
            addBtn.addEventListener('click', () => this.onAddBubbleClick());
            addBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (copyBtn && !copyBtn.hasAttribute('data-listener-added')) {
            copyBtn.addEventListener('click', () => this.onCopyBubbleClick());
            copyBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (deleteBtn && !deleteBtn.hasAttribute('data-listener-added')) {
            deleteBtn.addEventListener('click', () => this.onDeleteBubbleClick());
            deleteBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (exportBtn && !exportBtn.hasAttribute('data-listener-added')) {
            exportBtn.addEventListener('click', () => this.onExportClick());
            exportBtn.setAttribute('data-listener-added', 'true');
        }
        
        console.log('✓ Control event listeners setup');
    }
    
    /**
     * Add helpful deformation hints
     */
    addDeformationHints() {
        try {
            const { bubbleControls } = this.domElements;
            
            if (bubbleControls && !document.getElementById('deformation-hints')) {
                const hintsSpan = document.createElement('span');
                hintsSpan.id = 'deformation-hints';
                hintsSpan.style.fontSize = '12px';
                hintsSpan.style.color = '#666';
                hintsSpan.style.fontStyle = 'italic';
                
                // Check deformation system status
                let hintText = 'Tip: Ctrl+R to reset shape, Right-click bubble to reset';
                if (this.controlPointManager) {
                    try {
                        const status = this.controlPointManager.getDeformationStatus();
                        if (status && !status.enabled) {
                            hintText += ' (Safe mode: extreme deformations limited)';
                        }
                    } catch (error) {
                        console.warn('Could not get deformation status for hints:', error);
                    }
                }
                
                hintsSpan.textContent = hintText;
                bubbleControls.appendChild(hintsSpan);
                console.log('✓ Deformation hints added');
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'addDeformationHints');
        }
    }
    
    /**
     * ENHANCED: Update bubble controls UI with comprehensive debugging and error handling
     */
    updateBubbleControls() {
        console.log('🔍 UIController.updateBubbleControls() called');
        
        try {
            // Defensive programming - check if required managers are available
            if (!this.bubbleManager) {
                console.warn('⚠️ BubbleManager not available for counter update');
                return;
            }

            const { bubbleCount, copyBtn, deleteBtn, exportBtn } = this.domElements;

            if (!bubbleCount) {
                console.error('❌ bubbleCount DOM element not found');
                return;
            }

            // DEBUG: Check BubbleManager state
            console.log('🔍 BubbleManager state:', {
                hasBubbleManager: !!this.bubbleManager,
                hasGetBubbleCount: !!(this.bubbleManager && this.bubbleManager.getBubbleCount),
                hasGetAllBubbles: !!(this.bubbleManager && this.bubbleManager.getAllBubbles)
            });

            // Get basic bubble data with enhanced debugging
            let selectedBubble = null;
            let totalBubbles = 0;
            let actualDOMBubbles = 0;
            
            try {
                selectedBubble = this.bubbleManager.getSelectedBubble();
                totalBubbles = this.bubbleManager.getBubbleCount();
                
                // DEBUG: Count actual DOM bubbles
                actualDOMBubbles = document.querySelectorAll('.speech-bubble').length;
                
                // DEBUG: Get bubbles array directly for comparison
                const bubblesArray = this.bubbleManager.getAllBubbles();
                
                console.log('🔍 Bubble count debugging:', {
                    totalBubblesFromManager: totalBubbles,
                    actualDOMBubbles: actualDOMBubbles,
                    bubblesArrayLength: bubblesArray ? bubblesArray.length : 'undefined',
                    selectedBubble: !!selectedBubble
                });
                
                // If there's a mismatch, log detailed info
                if (totalBubbles !== actualDOMBubbles) {
                    console.warn('⚠️ BUBBLE COUNT MISMATCH detected!');
                    console.log('BubbleManager internal bubbles:', bubblesArray);
                    console.log('DOM bubbles:', document.querySelectorAll('.speech-bubble'));
                }
                
            } catch (error) {
                console.error('❌ Error getting basic bubble data:', error);
                // Use DOM count as fallback
                totalBubbles = document.querySelectorAll('.speech-bubble').length;
                console.log('🔧 Using DOM count as fallback:', totalBubbles);
            }

            // Update bubble count display with enhanced debugging
            let countText = `Bubbles: ${totalBubbles}`;
            
            // Add DOM count for debugging if different
            if (actualDOMBubbles !== totalBubbles) {
                countText += ` (DOM: ${actualDOMBubbles})`;
            }
            
            // Try to get deformation summary with fallback
            try {
                if (this.bubbleManager.getDeformationSummary) {
                    const deformationSummary = this.bubbleManager.getDeformationSummary();
                    if (deformationSummary && deformationSummary.deformedBubbles > 0) {
                        countText += ` (${deformationSummary.deformedBubbles} deformed)`;
                    }
                }
            } catch (error) {
                console.warn('Could not get deformation summary:', error);
                // Add a generic deformation indicator if there are any deformed bubbles
                if (this.hasAnyDeformedBubbles()) {
                    countText += ` (some deformed)`;
                }
            }
            
            // Add safety status indicator with error handling
            try {
                if (this.controlPointManager && this.controlPointManager.getDeformationStatus) {
                    const safetyStatus = this.controlPointManager.getDeformationStatus();
                    if (safetyStatus && safetyStatus.shouldDisable) {
                        countText += ' ⚠️';
                    }
                }
            } catch (error) {
                console.warn('Could not get deformation safety status:', error);
            }
            
            // Update the DOM
            bubbleCount.textContent = countText;
            console.log('✅ Bubble count updated to:', countText);
            
            // Update button states with null checks
            if (copyBtn) {
                copyBtn.disabled = !selectedBubble;
            }
            
            if (deleteBtn) {
                deleteBtn.disabled = !selectedBubble;
            }
            
            // Export button state with additional safety checks
            if (exportBtn) {
                const hasBackgroundImage = this.backgroundImageElement && this.backgroundImageElement.src;
                exportBtn.disabled = !hasBackgroundImage || this.isExporting;
                
                if (this.isExporting) {
                    exportBtn.textContent = 'Exporting...';
                } else {
                    exportBtn.textContent = 'Export Image';
                }
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'updateBubbleControls');
            
            // Emergency fallback - at least try to show basic count
            const { bubbleCount } = this.domElements;
            if (bubbleCount) {
                const domCount = document.querySelectorAll('.speech-bubble').length;
                bubbleCount.textContent = `Bubbles: ${domCount} (Error)`;
            }
        }
    }
    
    /**
     * Force bubble counter update with delay (call this after operations that modify bubbles)
     */
    forceUpdateBubbleControls() {
        // Add a small delay to ensure all bubble data is committed
        setTimeout(() => {
            this.updateBubbleControls();
        }, 10);
    }
    
    /**
     * Helper method to check if any bubbles are deformed (fallback method)
     */
    hasAnyDeformedBubbles() {
        try {
            if (!this.bubbleManager || !this.bubbleManager.getAllBubbles) {
                return false;
            }
            
            const bubbles = this.bubbleManager.getAllBubbles();
            return bubbles.some(bubble => bubble.isDeformed === true);
            
        } catch (error) {
            console.warn('Could not check for deformed bubbles:', error);
            return false;
        }
    }
    
    /**
     * Set export state
     */
    setExportState(isExporting) {
        this.isExporting = isExporting;
        this.updateBubbleControls();
    }
    
    // ===============================
    // EVENT HANDLERS (Delegate to main app)
    // ===============================
    
    /**
     * Handle add bubble button click
     */
    onAddBubbleClick() {
        // This will be wired up by the main app
        if (this.onAddBubble) {
            this.onAddBubble();
        }
        this.forceUpdateBubbleControls();
    }
    
    /**
     * Handle copy bubble button click
     */
    onCopyBubbleClick() {
        // This will be wired up by the main app
        if (this.onCopyBubble) {
            this.onCopyBubble();
        }
        this.forceUpdateBubbleControls();
    }
    
    /**
     * Handle delete bubble button click
     */
    onDeleteBubbleClick() {
        // This will be wired up by the main app  
        if (this.onDeleteBubble) {
            this.onDeleteBubble();
        }
        this.forceUpdateBubbleControls();
    }
    
    /**
     * Handle export button click
     */
    onExportClick() {
        // This will be wired up by the main app
        if (this.onExport) {
            this.onExport();
        }
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}