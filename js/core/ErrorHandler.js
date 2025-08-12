/**
 * ErrorHandler - Simplified error handling
 */
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 50;
    }
    
    handleError(error, context = 'unknown') {
        const errorEntry = {
            timestamp: Date.now(),
            error: error.message || 'Unknown error',
            context
        };
        
        this.errors.push(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // In development, you might want to uncomment:
        // console.error(`[${context}]`, error);
        
        return errorEntry;
    }
    
    logWarning(message, context = 'unknown') {
        // Simplified - just track if needed
        return { type: 'WARNING', message, context };
    }
    
    logInfo(message, context = 'unknown') {
        // Simplified - no tracking needed for info
        return { type: 'INFO', message, context };
    }
    
    showUserError(message) {
        alert(message);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}