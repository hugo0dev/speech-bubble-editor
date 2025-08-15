/**
 * FontLoader - Manages font loading for text system (Google Fonts ready)
 */
class FontLoader {
    constructor() {
        this.loadedFonts = new Set();
        this.loadingPromises = new Map();
        this.systemFonts = new Set(Constants.SYSTEM_FONTS);
        this.fontStyleElement = null;
        this.initializeFontStyles();
    }
    
    initializeFontStyles() {
        // Create a style element for future font-face declarations
        this.fontStyleElement = document.createElement('style');
        this.fontStyleElement.id = 'speech-bubble-fonts';
        document.head.appendChild(this.fontStyleElement);
    }
    
    /**
     * Load a font (system or web font)
     * @param {string} fontFamily - Font family name
     * @param {number} fontWeight - Font weight (100-900)
     * @param {string} fontStyle - Font style (normal, italic)
     * @returns {Promise} Resolves when font is ready
     */
    async loadFont(fontFamily, fontWeight = 400, fontStyle = 'normal') {
        // Check if it's a system font
        if (this.isSystemFont(fontFamily)) {
            return Promise.resolve();
        }
        
        // Create cache key
        const cacheKey = `${fontFamily}-${fontWeight}-${fontStyle}`;
        
        // Check if already loaded
        if (this.loadedFonts.has(cacheKey)) {
            return Promise.resolve();
        }
        
        // Check if currently loading
        if (this.loadingPromises.has(cacheKey)) {
            return this.loadingPromises.get(cacheKey);
        }
        
        // Create loading promise
        const loadPromise = this.performFontLoad(fontFamily, fontWeight, fontStyle, cacheKey);
        this.loadingPromises.set(cacheKey, loadPromise);
        
        try {
            await loadPromise;
            this.loadedFonts.add(cacheKey);
            this.loadingPromises.delete(cacheKey);
        } catch (error) {
            this.loadingPromises.delete(cacheKey);
            throw error;
        }
        
        return loadPromise;
    }
    
    /**
     * Perform actual font loading (placeholder for Google Fonts)
     * @private
     */
    async performFontLoad(fontFamily, fontWeight, fontStyle, cacheKey) {
        // For now, just simulate font loading
        // This will be replaced with actual Google Fonts API integration
        return new Promise((resolve) => {
            // Simulate async font loading
            setTimeout(() => {
                console.log(`Font loaded (simulated): ${fontFamily} ${fontWeight} ${fontStyle}`);
                resolve();
            }, 100);
        });
        
        // Future implementation will look like:
        // const googleFontUrl = this.buildGoogleFontUrl(fontFamily, [fontWeight], [fontStyle]);
        // await this.loadFontFromUrl(googleFontUrl);
        // await document.fonts.load(`${fontWeight} 16px "${fontFamily}"`);
    }
    
    /**
     * Check if font is loaded
     * @param {string} fontFamily 
     * @param {number} fontWeight 
     * @returns {boolean}
     */
    isFontLoaded(fontFamily, fontWeight = 400) {
        if (this.isSystemFont(fontFamily)) {
            return true;
        }
        
        const cacheKey = `${fontFamily}-${fontWeight}-normal`;
        return this.loadedFonts.has(cacheKey);
    }
    
    /**
     * Check if font is a system font
     * @param {string} fontFamily 
     * @returns {boolean}
     */
    isSystemFont(fontFamily) {
        return this.systemFonts.has(fontFamily);
    }
    
    /**
     * Get fallback font for a font family
     * @param {string} fontFamily 
     * @returns {string}
     */
    getFallbackFont(fontFamily) {
        // Check if we have a specific category for this font
        const category = Constants.FONT_CATEGORIES[fontFamily];
        if (category) {
            return category;
        }
        
        // Try to guess based on font name
        if (fontFamily.toLowerCase().includes('serif') && !fontFamily.toLowerCase().includes('sans')) {
            return 'serif';
        }
        if (fontFamily.toLowerCase().includes('mono') || fontFamily.toLowerCase().includes('code')) {
            return 'monospace';
        }
        if (fontFamily.toLowerCase().includes('script') || fontFamily.toLowerCase().includes('cursive')) {
            return 'cursive';
        }
        
        // Default to sans-serif
        return 'sans-serif';
    }
    
    /**
     * Build a CSS font stack
     * @param {string} primaryFont 
     * @param {string} fallbackFont 
     * @returns {string}
     */
    buildFontStack(primaryFont, fallbackFont = null) {
        const fallback = fallbackFont || this.getFallbackFont(primaryFont);
        
        // Quote font names that contain spaces
        const quotedPrimary = primaryFont.includes(' ') ? `"${primaryFont}"` : primaryFont;
        
        return `${quotedPrimary}, ${fallback}`;
    }
    
    /**
     * Preload a Google Font (placeholder for future implementation)
     * @param {string} fontFamily 
     * @param {Array} weights 
     * @returns {Promise}
     */
    async preloadGoogleFont(fontFamily, weights = [400]) {
        // Placeholder for future Google Fonts integration
        // Will construct URL like:
        // https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap
        
        console.log(`Preloading Google Font (placeholder): ${fontFamily} with weights ${weights.join(',')}`);
        
        // For now, just mark as loaded
        for (const weight of weights) {
            const cacheKey = `${fontFamily}-${weight}-normal`;
            this.loadedFonts.add(cacheKey);
        }
        
        return Promise.resolve();
    }
    
    /**
     * Build Google Fonts URL (for future use)
     * @private
     */
    buildGoogleFontUrl(fontFamily, weights = [400], styles = ['normal']) {
        const family = fontFamily.replace(/ /g, '+');
        const variants = [];
        
        for (const style of styles) {
            for (const weight of weights) {
                if (style === 'italic') {
                    variants.push(`ital,wght@1,${weight}`);
                } else {
                    variants.push(`wght@${weight}`);
                }
            }
        }
        
        const variantString = variants.join(';');
        return `https://fonts.googleapis.com/css2?family=${family}:${variantString}&display=swap`;
    }
    
    /**
     * Get available font weights for a font
     * @param {string} fontFamily 
     * @returns {Array}
     */
    getAvailableWeights(fontFamily) {
        // For system fonts, return standard weights
        if (this.isSystemFont(fontFamily)) {
            return [300, 400, 700];
        }
        
        // For Google Fonts, this will be fetched from API metadata
        // For now, return common weights
        return [100, 300, 400, 500, 700, 900];
    }
    
    /**
     * Clean up font loader
     */
    destroy() {
        if (this.fontStyleElement && this.fontStyleElement.parentNode) {
            this.fontStyleElement.parentNode.removeChild(this.fontStyleElement);
        }
        this.loadedFonts.clear();
        this.loadingPromises.clear();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontLoader;
}