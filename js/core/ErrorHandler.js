/**
 * ErrorHandler - Centralized error handling and logging
 * Provides consistent error handling across all modules
 */
class ErrorHandler {
    constructor() {
        this.errorLog = [];
        this.maxLogEntries = 100;
        
        // Error categories for different handling strategies
        this.errorCategories = {
            INITIALIZATION: 'initialization',
            DEFORMATION: 'deformation', 
            UI_UPDATE: 'ui_update',
            IMAGE_PROCESSING: 'image_processing',
            MANAGER_OPERATION: 'manager_operation',
            DOM_MANIPULATION: 'dom_manipulation',
            UNKNOWN: 'unknown'
        };
        
        console.log('✓ ErrorHandler initialized');
    }
    
    /**
     * Handle an error with context and appropriate recovery strategy
     */
    handleError(error, context = 'unknown', data = null) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            error: error,
            message: error.message || 'Unknown error',
            context: context,
            data: data,
            category: this.categorizeError(error, context),
            stack: error.stack
        };
        
        // Log the error
        this.logError(errorEntry);
        
        // Handle based on category
        this.handleByCategory(errorEntry);
        
        // Return error info for caller
        return errorEntry;
    }
    
    /**
     * Log a warning (non-fatal issue)
     */
    logWarning(message, context = 'unknown', data = null) {
        const warningEntry = {
            timestamp: new Date().toISOString(),
            type: 'WARNING',
            message: message,
            context: context,
            data: data
        };
        
        console.warn(`⚠️ [${context}] ${message}`, data || '');
        this.addToLog(warningEntry);
        
        return warningEntry;
    }
    
    /**
     * Log informational message
     */
    logInfo(message, context = 'unknown', data = null) {
        const infoEntry = {
            timestamp: new Date().toISOString(),
            type: 'INFO',
            message: message,
            context: context,
            data: data
        };
        
        console.log(`ℹ️ [${context}] ${message}`, data || '');
        this.addToLog(infoEntry);
        
        return infoEntry;
    }
    
    /**
     * Categorize error for appropriate handling
     */
    categorizeError(error, context) {
        const message = error.message?.toLowerCase() || '';
        const contextLower = context.toLowerCase();
        
        // Check for specific error patterns
        if (contextLower.includes('initialization') || 
            contextLower.includes('manager') && contextLower.includes('init')) {
            return this.errorCategories.INITIALIZATION;
        }
        
        if (message.includes('deformation') || 
            message.includes('svg') || 
            message.includes('control') ||
            contextLower.includes('deformation')) {
            return this.errorCategories.DEFORMATION;
        }
        
        if (contextLower.includes('ui') || 
            contextLower.includes('bubble') && contextLower.includes('control') ||
            contextLower.includes('update')) {
            return this.errorCategories.UI_UPDATE;
        }
        
        if (contextLower.includes('image') || 
            contextLower.includes('upload') ||
            contextLower.includes('background')) {
            return this.errorCategories.IMAGE_PROCESSING;
        }
        
        if (contextLower.includes('manager') || 
            contextLower.includes('bubble') ||
            contextLower.includes('handle')) {
            return this.errorCategories.MANAGER_OPERATION;
        }
        
        if (message.includes('element') || 
            message.includes('dom') ||
            contextLower.includes('dom')) {
            return this.errorCategories.DOM_MANIPULATION;
        }
        
        return this.errorCategories.UNKNOWN;
    }
    
    /**
     * Handle error based on its category
     */
    handleByCategory(errorEntry) {
        const { category, error, context, message } = errorEntry;
        
        switch (category) {
            case this.errorCategories.INITIALIZATION:
                this.handleInitializationError(errorEntry);
                break;
                
            case this.errorCategories.DEFORMATION:
                this.handleDeformationError(errorEntry);
                break;
                
            case this.errorCategories.UI_UPDATE:
                this.handleUIError(errorEntry);
                break;
                
            case this.errorCategories.IMAGE_PROCESSING:
                this.handleImageError(errorEntry);
                break;
                
            case this.errorCategories.MANAGER_OPERATION:
                this.handleManagerError(errorEntry);
                break;
                
            case this.errorCategories.DOM_MANIPULATION:
                this.handleDOMError(errorEntry);
                break;
                
            default:
                this.handleUnknownError(errorEntry);
        }
    }
    
    /**
     * Handle initialization errors
     */
    handleInitializationError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ Initialization Error in ${context}:`, error);
        
        // Check if this is a deformation-specific error
        const isDeformationError = error.message.includes('deformation') || 
                                  error.message.includes('SVG') ||
                                  error.message.includes('ControlPoint');
        
        let errorMessage = `Initialization Error: ${error.message}\n\n`;
        
        if (isDeformationError) {
            errorMessage += `This appears to be related to the deformation system. The editor may still work for basic operations, but shape deformation may be limited.\n\n`;
        }
        
        errorMessage += `Please refresh the page. If the problem persists:
1. Check browser console for detailed errors
2. Ensure all JavaScript files are loaded correctly
3. Verify browser supports SVG manipulation features
4. Try disabling browser extensions that might interfere`;
        
        // Don't immediately alert - let caller decide
        this.lastInitializationError = errorMessage;
    }
    
    /**
     * Handle deformation-related errors
     */
    handleDeformationError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ Deformation Error in ${context}:`, error);
        
        // Deformation errors should not break the app - log and continue
        this.logWarning(`Deformation failed, falling back to safe state`, context, error.message);
    }
    
    /**
     * Handle UI update errors
     */
    handleUIError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ UI Error in ${context}:`, error);
        
        // UI errors are usually recoverable - log and continue
        this.logWarning(`UI update failed, may need manual refresh`, context, error.message);
    }
    
    /**
     * Handle image processing errors
     */
    handleImageError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ Image Error in ${context}:`, error);
        
        // Image errors should be shown to user
        this.showUserError(`Image processing failed: ${error.message}. Please try a different image.`);
    }
    
    /**
     * Handle manager operation errors
     */
    handleManagerError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ Manager Error in ${context}:`, error);
        
        // Manager errors are usually recoverable - log and continue
        this.logWarning(`Manager operation failed, functionality may be limited`, context, error.message);
    }
    
    /**
     * Handle DOM manipulation errors
     */
    handleDOMError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ DOM Error in ${context}:`, error);
        
        // DOM errors usually indicate missing elements - warn but continue
        this.logWarning(`DOM element not found or manipulation failed`, context, error.message);
    }
    
    /**
     * Handle unknown errors
     */
    handleUnknownError(errorEntry) {
        const { error, context } = errorEntry;
        console.error(`❌ Unknown Error in ${context}:`, error);
        
        // Unknown errors get full logging
        this.logWarning(`Unexpected error occurred`, context, error.message);
    }
    
    /**
     * Show user-friendly error message
     */
    showUserError(message) {
        // Use console for now - could be enhanced with better UI later
        console.error('🚨 USER ERROR:', message);
        alert(message);
    }
    
    /**
     * Get the last initialization error message for display
     */
    getLastInitializationError() {
        return this.lastInitializationError || null;
    }
    
    /**
     * Add entry to log with size management
     */
    addToLog(entry) {
        this.errorLog.push(entry);
        
        // Keep log size manageable
        if (this.errorLog.length > this.maxLogEntries) {
            this.errorLog = this.errorLog.slice(-this.maxLogEntries);
        }
    }
    
    /**
     * Log error with appropriate console method
     */
    logError(errorEntry) {
        const { error, context, category } = errorEntry;
        
        console.error(`❌ [${category.toUpperCase()}] Error in ${context}:`, error);
        this.addToLog(errorEntry);
    }
    
    /**
     * Get error statistics for debugging
     */
    getErrorStats() {
        const stats = {
            totalErrors: 0,
            totalWarnings: 0,
            categories: {},
            recent: []
        };
        
        this.errorLog.forEach(entry => {
            if (entry.type === 'WARNING') {
                stats.totalWarnings++;
            } else {
                stats.totalErrors++;
                
                const category = entry.category || 'unknown';
                stats.categories[category] = (stats.categories[category] || 0) + 1;
            }
        });
        
        // Get last 5 entries
        stats.recent = this.errorLog.slice(-5);
        
        return stats;
    }
    
    /**
     * Clear error log
     */
    clearLog() {
        this.errorLog = [];
        console.log('✓ Error log cleared');
    }
    
    /**
     * Export error log for debugging
     */
    exportLog() {
        return {
            timestamp: new Date().toISOString(),
            entries: [...this.errorLog],
            stats: this.getErrorStats()
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}