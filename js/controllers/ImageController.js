/**
 * ImageController - Handles image upload and background management
 */
class ImageController {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.canvasContainer = null;
        this.backgroundImageElement = null;
        this.uploadPlaceholder = null;
        this.imageUploadInput = null;
        this.currentImageSrc = null;
        this.isImageLoaded = false;
    }
    
    initialize(canvasContainer, backgroundImageElement, uploadPlaceholder) {
        this.canvasContainer = canvasContainer;
        this.backgroundImageElement = backgroundImageElement;
        this.uploadPlaceholder = uploadPlaceholder;
        this.imageUploadInput = document.getElementById('imageUpload');
        
        if (!this.canvasContainer || !this.backgroundImageElement || !this.imageUploadInput) {
            throw new Error('Required elements not found');
        }
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.imageUploadInput.addEventListener('change', (e) => this.handleImageUpload(e));
    }
    
    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const validationResult = this.validateImageFile(file);
        if (!validationResult.valid) {
            this.errorHandler.showUserError(validationResult.message);
            return;
        }
        
        this.loadImageFile(file);
    }
    
    validateImageFile(file) {
        if (!file) {
            return { valid: false, message: 'No file provided.' };
        }
        
        if (!file.type.startsWith('image/')) {
            return { 
                valid: false, 
                message: 'Please select a valid image file (JPEG, PNG, GIF, WebP, etc.).' 
            };
        }
        
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return { 
                valid: false, 
                message: 'Image file is too large. Please select an image smaller than 50MB.' 
            };
        }
        
        return { valid: true };
    }
    
    loadImageFile(file) {
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
    }
    
    loadBackgroundImage(imageSrc) {
        this.backgroundImageElement.src = imageSrc;
        this.currentImageSrc = imageSrc;
        
        this.backgroundImageElement.style.display = 'block';
        if (this.uploadPlaceholder) {
            this.uploadPlaceholder.style.display = 'none';
        }
        
        this.backgroundImageElement.onload = () => {
            this.handleImageLoaded();
        };
        
        this.backgroundImageElement.onerror = () => {
            this.handleImageLoadError();
        };
    }
    
    handleImageLoaded() {
        const img = this.backgroundImageElement;
        this.adjustCanvasSize(img.clientWidth, img.clientHeight);
        this.isImageLoaded = true;
        
        if (this.onImageLoaded) {
            this.onImageLoaded({
                width: img.clientWidth,
                height: img.clientHeight,
                src: this.currentImageSrc
            });
        }
    }
    
    handleImageLoadError() {
        this.errorHandler.handleError(
            new Error('Failed to load background image'), 
            'Background image loading'
        );
        
        this.isImageLoaded = false;
        this.currentImageSrc = null;
        
        if (this.uploadPlaceholder) {
            this.uploadPlaceholder.style.display = 'flex';
        }
        this.backgroundImageElement.style.display = 'none';
        
        this.errorHandler.showUserError('Failed to load the selected image. Please try a different image.');
    }
    
    adjustCanvasSize(imageWidth, imageHeight) {
        if (this.canvasContainer) {
            this.canvasContainer.style.width = imageWidth + 'px';
            this.canvasContainer.style.height = imageHeight + 'px';
        }
    }
    
    getCurrentImageInfo() {
        return {
            isLoaded: this.isImageLoaded,
            src: this.currentImageSrc,
            width: this.backgroundImageElement?.clientWidth || 0,
            height: this.backgroundImageElement?.clientHeight || 0
        };
    }
    
    hasImage() {
        return this.isImageLoaded && this.currentImageSrc;
    }
    
    setOnImageLoaded(callback) {
        this.onImageLoaded = callback;
    }
    
    setOnImageCleared(callback) {
        this.onImageCleared = callback;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageController;
}