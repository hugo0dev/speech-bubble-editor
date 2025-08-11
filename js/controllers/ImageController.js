/**
 * ImageController - Handles image upload and background management
 * Responsible for: file validation, image loading, canvas sizing, placeholder management
 */
class ImageController {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        
        // DOM elements (set during initialization)
        this.canvasContainer = null;
        this.backgroundImageElement = null;
        this.uploadPlaceholder = null;
        this.imageUploadInput = null;
        
        // State
        this.currentImageSrc = null;
        this.isImageLoaded = false;
        
        console.log('✓ ImageController initialized');
    }
    
    /**
     * Initialize ImageController with DOM elements
     */
    initialize(canvasContainer, backgroundImageElement, uploadPlaceholder) {
        try {
            this.canvasContainer = canvasContainer;
            this.backgroundImageElement = backgroundImageElement;
            this.uploadPlaceholder = uploadPlaceholder;
            
            // Find image upload input
            this.imageUploadInput = document.getElementById('imageUpload');
            
            // Verify required elements
            if (!this.canvasContainer) {
                throw new Error('Canvas container element not found');
            }
            if (!this.backgroundImageElement) {
                throw new Error('Background image element not found');
            }
            if (!this.imageUploadInput) {
                throw new Error('Image upload input element not found');
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.errorHandler.logInfo('ImageController initialized successfully', 'ImageController');
            
        } catch (error) {
            this.errorHandler.handleError(error, 'ImageController initialization');
            throw error;
        }
    }
    
    /**
     * Setup event listeners for image upload
     */
    setupEventListeners() {
        try {
            this.imageUploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
            this.errorHandler.logInfo('Image upload event listeners setup', 'ImageController');
        } catch (error) {
            this.errorHandler.handleError(error, 'ImageController event listener setup');
        }
    }
    
    /**
     * Handle image upload event
     */
    handleImageUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) {
                this.errorHandler.logInfo('No file selected', 'ImageController');
                return;
            }
            
            // Validate file
            const validationResult = this.validateImageFile(file);
            if (!validationResult.valid) {
                this.errorHandler.showUserError(validationResult.message);
                return;
            }
            
            this.errorHandler.logInfo('Valid image file selected, loading...', 'ImageController', {
                name: file.name,
                size: file.size,
                type: file.type
            });
            
            // Load the image
            this.loadImageFile(file);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Image upload handling');
        }
    }
    
    /**
     * Validate uploaded image file
     */
    validateImageFile(file) {
        try {
            // Check if file exists
            if (!file) {
                return { valid: false, message: 'No file provided.' };
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                return { 
                    valid: false, 
                    message: 'Please select a valid image file (JPEG, PNG, GIF, WebP, etc.).' 
                };
            }
            
            // Check file size (limit to 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (file.size > maxSize) {
                return { 
                    valid: false, 
                    message: 'Image file is too large. Please select an image smaller than 50MB.' 
                };
            }
            
            // Check for supported formats explicitly
            const supportedTypes = [
                'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
                'image/webp', 'image/bmp', 'image/svg+xml'
            ];
            
            if (!supportedTypes.includes(file.type.toLowerCase())) {
                return { 
                    valid: false, 
                    message: `Image format "${file.type}" may not be supported. Please try JPEG, PNG, or WebP.` 
                };
            }
            
            return { valid: true };
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Image file validation');
            return { valid: false, message: 'Error validating image file.' };
        }
    }
    
    /**
     * Load image file using FileReader
     */
    loadImageFile(file) {
        try {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                this.loadBackgroundImage(e.target.result);
            };
            
            reader.onerror = () => {
                this.errorHandler.handleError(
                    new Error('Failed to read image file'), 
                    'Image file reading'
                );
            };
            
            reader.readAsDataURL(file);
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Image file loading');
        }
    }
    
    /**
     * Load background image from data URL
     */
    loadBackgroundImage(imageSrc) {
        try {
            this.errorHandler.logInfo('Loading background image...', 'ImageController');
            
            // Set image source
            this.backgroundImageElement.src = imageSrc;
            this.currentImageSrc = imageSrc;
            
            // Show image, hide placeholder
            this.backgroundImageElement.style.display = 'block';
            this.hideUploadPlaceholder();
            
            // Setup onload handler for sizing
            this.backgroundImageElement.onload = () => {
                this.handleImageLoaded();
            };
            
            // Setup error handler
            this.backgroundImageElement.onerror = () => {
                this.handleImageLoadError();
            };
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Background image loading');
        }
    }
    
    /**
     * Handle successful image loading
     */
    handleImageLoaded() {
        try {
            const img = this.backgroundImageElement;
            
            // Adjust container size to fit image
            this.adjustCanvasSize(img.clientWidth, img.clientHeight);
            
            // Update state
            this.isImageLoaded = true;
            
            this.errorHandler.logInfo('Background image loaded successfully', 'ImageController', {
                width: img.clientWidth,
                height: img.clientHeight,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight
            });
            
            // Trigger image loaded callback if set
            if (this.onImageLoaded) {
                this.onImageLoaded({
                    width: img.clientWidth,
                    height: img.clientHeight,
                    src: this.currentImageSrc
                });
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Image loaded handling');
        }
    }
    
    /**
     * Handle image loading error
     */
    handleImageLoadError() {
        this.errorHandler.handleError(
            new Error('Failed to load background image'), 
            'Background image loading'
        );
        
        // Reset state
        this.isImageLoaded = false;
        this.currentImageSrc = null;
        
        // Show placeholder again
        this.showUploadPlaceholder();
        this.backgroundImageElement.style.display = 'none';
        
        // Show user error
        this.errorHandler.showUserError('Failed to load the selected image. Please try a different image.');
    }
    
    /**
     * Adjust canvas container size to fit image
     */
    adjustCanvasSize(imageWidth, imageHeight) {
        try {
            if (this.canvasContainer) {
                this.canvasContainer.style.width = imageWidth + 'px';
                this.canvasContainer.style.height = imageHeight + 'px';
                
                this.errorHandler.logInfo('Canvas size adjusted', 'ImageController', {
                    width: imageWidth,
                    height: imageHeight
                });
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Canvas size adjustment');
        }
    }
    
    /**
     * Show upload placeholder
     */
    showUploadPlaceholder() {
        try {
            if (this.uploadPlaceholder) {
                this.uploadPlaceholder.style.display = 'flex';
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Show upload placeholder');
        }
    }
    
    /**
     * Hide upload placeholder
     */
    hideUploadPlaceholder() {
        try {
            if (this.uploadPlaceholder) {
                this.uploadPlaceholder.style.display = 'none';
            }
        } catch (error) {
            this.errorHandler.handleError(error, 'Hide upload placeholder');
        }
    }
    
    /**
     * Get current image information
     */
    getCurrentImageInfo() {
        return {
            isLoaded: this.isImageLoaded,
            src: this.currentImageSrc,
            width: this.backgroundImageElement ? this.backgroundImageElement.clientWidth : 0,
            height: this.backgroundImageElement ? this.backgroundImageElement.clientHeight : 0,
            naturalWidth: this.backgroundImageElement ? this.backgroundImageElement.naturalWidth : 0,
            naturalHeight: this.backgroundImageElement ? this.backgroundImageElement.naturalHeight : 0
        };
    }
    
    /**
     * Check if image is loaded
     */
    hasImage() {
        return this.isImageLoaded && this.currentImageSrc;
    }
    
    /**
     * Clear current image
     */
    clearImage() {
        try {
            this.isImageLoaded = false;
            this.currentImageSrc = null;
            
            if (this.backgroundImageElement) {
                this.backgroundImageElement.src = '';
                this.backgroundImageElement.style.display = 'none';
            }
            
            this.showUploadPlaceholder();
            
            // Reset canvas size
            if (this.canvasContainer) {
                this.canvasContainer.style.width = '';
                this.canvasContainer.style.height = '';
            }
            
            // Clear file input
            if (this.imageUploadInput) {
                this.imageUploadInput.value = '';
            }
            
            this.errorHandler.logInfo('Image cleared', 'ImageController');
            
            // Trigger image cleared callback if set
            if (this.onImageCleared) {
                this.onImageCleared();
            }
            
        } catch (error) {
            this.errorHandler.handleError(error, 'Clear image');
        }
    }
    
    /**
     * Get background image element reference
     */
    getBackgroundImageElement() {
        return this.backgroundImageElement;
    }
    
    /**
     * Get canvas container element reference
     */
    getCanvasContainer() {
        return this.canvasContainer;
    }
    
    /**
     * Set callback for when image is loaded
     */
    setOnImageLoaded(callback) {
        this.onImageLoaded = callback;
    }
    
    /**
     * Set callback for when image is cleared
     */
    setOnImageCleared(callback) {
        this.onImageCleared = callback;
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageController;
}