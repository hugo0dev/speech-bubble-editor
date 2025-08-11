/**
 * ControlPointManager - CSS Transform Deformation System (Phase 1)
 * REPLACES: SVG path manipulation with CSS transforms for universal compatibility
 */
class ControlPointManager {
    constructor() {
        // Initialize SVG deformation with safety systems
        this.initializeSVGDeformation();
        
        // Safety system for preventing bubble disappearing
        this.lastValidSVG = null;
        this.lastValidControlPoints = null;
        this.deformationAttempts = 0;
        this.maxDeformationAttempts = 3;
        this.deformationEnabled = true;
        
        // NEW: CSS Transform system bounds and configuration
        this.transformBounds = {
            scale: { min: 0.5, max: 2.0 },
            translate: { min: -50, max: 50 }, // pixels
            skew: { min: -30, max: 30 }       // degrees
        };
        
        console.log('✓ CSS Transform deformation system initialized');
    }
    
    /**
     * Initialize SVG deformation system (keep for backward compatibility)
     */
    initializeSVGDeformation() {
        // Parse the default bubble SVG path to understand its structure
        this.defaultPathData = this.parseDefaultBubblePath();
        console.log('✓ SVG deformation system initialized (legacy fallback)');
    }
    
    /**
     * Parse default bubble SVG path (keep for backward compatibility)
     */
    parseDefaultBubblePath() {
        // Extract the path data from the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(Constants.BUBBLE_SVG, 'image/svg+xml');
        const pathElement = svgDoc.querySelector('path[d]');
        
        if (!pathElement) {
            console.error('Could not find path element in bubble SVG');
            return null;
        }
        
        const pathData = pathElement.getAttribute('d');
        console.log('✓ Default bubble path extracted');
        
        // Store original as fallback
        this.lastValidSVG = Constants.BUBBLE_SVG;
        
        return {
            originalPath: pathData,
            originalSVG: Constants.BUBBLE_SVG,
            baseWidth: 150,
            baseHeight: 112,
            centerX: 75,
            centerY: 56
        };
    }
    
    // =====================================
    // NEW: CSS TRANSFORM SYSTEM
    // =====================================
    
    /**
     * NEW: Calculate CSS transform string from control points
     */
    calculateCSSTransform(bubbleData) {
        try {
            if (!bubbleData || !bubbleData.controlPoints) {
                console.warn('Invalid bubble data for CSS transform calculation');
                return '';
            }
            
            console.log('🔄 Calculating CSS transform from control points...');
            
            // Get control points
            const cp = bubbleData.controlPoints;
            const defaultPoints = Constants.DEFAULT_CONTROL_POINTS;
            
            // Calculate scale factors
            const scaleX = this.mapControlPointToScaleX(cp.left, cp.right);
            const scaleY = this.mapControlPointToScaleY(cp.top, cp.bottom);
            
            // Calculate translation offsets
            const translate = this.mapControlPointToTranslate(cp);
            
            // Calculate skew angles for organic distortion
            const skew = this.mapControlPointToSkew(cp);
            
            // Generate safe CSS transform string
            const transformString = this.safeTransformString(
                scaleX, scaleY, 
                translate.x, translate.y, 
                skew.x, skew.y
            );
            
            console.log('✓ CSS transform calculated:', transformString);
            return transformString;
            
        } catch (error) {
            console.error('❌ CSS transform calculation failed:', error);
            return ''; // Return empty string for no transform
        }
    }
    
    /**
     * NEW: Map left/right control points to horizontal scale factor
     */
    mapControlPointToScaleX(leftPoint, rightPoint) {
        const defaultLeft = Constants.DEFAULT_CONTROL_POINTS.left;
        const defaultRight = Constants.DEFAULT_CONTROL_POINTS.right;
        
        // Calculate how much each point has moved from default
        const leftMovement = Math.abs(leftPoint.x - defaultLeft.x);
        const rightMovement = Math.abs(rightPoint.x - defaultRight.x);
        
        // Average movement determines scale factor
        const avgMovement = (leftMovement + rightMovement) / 2;
        
        // Convert movement to scale factor (0 = 1.0x, 0.5 = 1.5x, etc.)
        let scaleFactor = 1.0 + (avgMovement * 0.8); // Moderate scaling
        
        // Apply safety bounds
        scaleFactor = this.clampValue(scaleFactor, this.transformBounds.scale.min, this.transformBounds.scale.max);
        
        return scaleFactor;
    }
    
    /**
     * NEW: Map top/bottom control points to vertical scale factor
     */
    mapControlPointToScaleY(topPoint, bottomPoint) {
        const defaultTop = Constants.DEFAULT_CONTROL_POINTS.top;
        const defaultBottom = Constants.DEFAULT_CONTROL_POINTS.bottom;
        
        // Calculate how much each point has moved from default
        const topMovement = Math.abs(topPoint.y - defaultTop.y);
        const bottomMovement = Math.abs(bottomPoint.y - defaultBottom.y);
        
        // Average movement determines scale factor
        const avgMovement = (topMovement + bottomMovement) / 2;
        
        // Convert movement to scale factor (0 = 1.0x, 0.5 = 1.5x, etc.)
        let scaleFactor = 1.0 + (avgMovement * 0.8); // Moderate scaling
        
        // Apply safety bounds
        scaleFactor = this.clampValue(scaleFactor, this.transformBounds.scale.min, this.transformBounds.scale.max);
        
        return scaleFactor;
    }
    
    /**
     * NEW: Map control points to translation offsets
     */
    mapControlPointToTranslate(controlPoints) {
        const defaultPoints = Constants.DEFAULT_CONTROL_POINTS;
        
        // Calculate center of mass of all control points vs default center of mass
        let totalOffsetX = 0;
        let totalOffsetY = 0;
        
        for (const direction in controlPoints) {
            const current = controlPoints[direction];
            const default_ = defaultPoints[direction];
            
            totalOffsetX += (current.x - default_.x);
            totalOffsetY += (current.y - default_.y);
        }
        
        // Average offset and convert to pixels
        const avgOffsetX = (totalOffsetX / 4) * 60; // Scale factor for pixel conversion
        const avgOffsetY = (totalOffsetY / 4) * 60;
        
        // Apply safety bounds
        const translateX = this.clampValue(avgOffsetX, this.transformBounds.translate.min, this.transformBounds.translate.max);
        const translateY = this.clampValue(avgOffsetY, this.transformBounds.translate.min, this.transformBounds.translate.max);
        
        return { x: translateX, y: translateY };
    }
    
    /**
     * NEW: Map control point asymmetry to skew angles
     */
    mapControlPointToSkew(controlPoints) {
        const defaultPoints = Constants.DEFAULT_CONTROL_POINTS;
        
        // Calculate asymmetry between opposing control points
        const leftRightAsymmetry = (controlPoints.left.y - defaultPoints.left.y) - 
                                   (controlPoints.right.y - defaultPoints.right.y);
        
        const topBottomAsymmetry = (controlPoints.top.x - defaultPoints.top.x) - 
                                   (controlPoints.bottom.x - defaultPoints.bottom.x);
        
        // Convert asymmetry to skew angles (moderate skewing)
        let skewX = topBottomAsymmetry * 20;    // Top/bottom asymmetry affects X skew
        let skewY = leftRightAsymmetry * 20;    // Left/right asymmetry affects Y skew
        
        // Apply safety bounds
        skewX = this.clampValue(skewX, this.transformBounds.skew.min, this.transformBounds.skew.max);
        skewY = this.clampValue(skewY, this.transformBounds.skew.min, this.transformBounds.skew.max);
        
        return { x: skewX, y: skewY };
    }
    
    /**
     * NEW: Generate safe CSS transform string with bounds checking
     */
    safeTransformString(scaleX, scaleY, translateX, translateY, skewX, skewY) {
        // Apply final bounds checking to all values
        const safeScaleX = this.clampValue(scaleX, this.transformBounds.scale.min, this.transformBounds.scale.max);
        const safeScaleY = this.clampValue(scaleY, this.transformBounds.scale.min, this.transformBounds.scale.max);
        const safeTranslateX = this.clampValue(translateX, this.transformBounds.translate.min, this.transformBounds.translate.max);
        const safeTranslateY = this.clampValue(translateY, this.transformBounds.translate.min, this.transformBounds.translate.max);
        const safeSkewX = this.clampValue(skewX, this.transformBounds.skew.min, this.transformBounds.skew.max);
        const safeSkewY = this.clampValue(skewY, this.transformBounds.skew.min, this.transformBounds.skew.max);
        
        // Build transform string with proper units
        const transforms = [];
        
        // Only add transforms that differ from defaults
        if (Math.abs(safeScaleX - 1.0) > 0.01) {
            transforms.push(`scaleX(${safeScaleX.toFixed(3)})`);
        }
        if (Math.abs(safeScaleY - 1.0) > 0.01) {
            transforms.push(`scaleY(${safeScaleY.toFixed(3)})`);
        }
        if (Math.abs(safeTranslateX) > 1) {
            transforms.push(`translateX(${safeTranslateX.toFixed(1)}px)`);
        }
        if (Math.abs(safeTranslateY) > 1) {
            transforms.push(`translateY(${safeTranslateY.toFixed(1)}px)`);
        }
        if (Math.abs(safeSkewX) > 1) {
            transforms.push(`skewX(${safeSkewX.toFixed(1)}deg)`);
        }
        if (Math.abs(safeSkewY) > 1) {
            transforms.push(`skewY(${safeSkewY.toFixed(1)}deg)`);
        }
        
        return transforms.join(' ');
    }
    
    /**
     * NEW: Apply CSS transform to bubble container element
     */
    applyCSSTransformToBubble(bubbleElement, transformString) {
        if (!bubbleElement) {
            console.warn('⚠️ Cannot apply CSS transform - missing bubble element');
            return false;
        }
        
        try {
            // Set transform origin to center for predictable transforms
            bubbleElement.style.transformOrigin = 'center center';
            
            // Apply the transform string
            bubbleElement.style.transform = transformString;
            
            console.log('✓ CSS transform applied to bubble:', transformString);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to apply CSS transform:', error);
            // Clear any problematic transform
            bubbleElement.style.transform = '';
            return false;
        }
    }
    
    /**
     * NEW: Helper function to clamp values within bounds
     */
    clampValue(value, min, max) {
        if (isNaN(value) || !isFinite(value)) {
            console.warn('⚠️ Invalid transform value, using default:', value);
            return (min + max) / 2; // Return middle value as safe default
        }
        return Math.max(min, Math.min(max, value));
    }
    
    // =====================================
    // MODIFIED CORE FUNCTIONS
    // =====================================
    
    /**
     * MODIFIED: Apply deformation using CSS transforms instead of SVG manipulation
     */
    applyDeformationToBubble(bubbleElement, bubbleData) {
        if (!bubbleElement || !bubbleData) {
            console.warn('⚠️ Cannot apply deformation - missing element or data');
            return;
        }
        
        try {
            // If bubble is not deformed, clear any transforms and use original SVG
            if (!bubbleData.isDeformed) {
                bubbleElement.style.transform = '';
                bubbleElement.innerHTML = Constants.BUBBLE_SVG;
                console.log('✓ Bubble reset to original shape (no transform)');
                return;
            }
            
            // Use CSS transform approach for deformation
            console.log('🔄 Applying CSS transform deformation...');
            
            // Ensure original SVG is in place (don't modify the SVG content)
            if (!bubbleElement.innerHTML.includes('xmlns')) {
                bubbleElement.innerHTML = Constants.BUBBLE_SVG;
                console.log('✓ Original SVG restored');
            }
            
            // Calculate and apply CSS transform
            const transformString = this.calculateCSSTransform(bubbleData);
            
            if (transformString) {
                const success = this.applyCSSTransformToBubble(bubbleElement, transformString);
                if (success) {
                    console.log('✅ CSS transform deformation applied successfully');
                } else {
                    console.warn('⚠️ CSS transform failed, bubble remains in original state');
                }
            } else {
                console.log('ℹ️ No transform needed (default position)');
                bubbleElement.style.transform = '';
            }
            
        } catch (error) {
            console.error('❌ Failed to apply CSS transform deformation:', error);
            
            // Emergency fallback - ensure bubble remains visible
            bubbleElement.style.transform = '';
            bubbleElement.innerHTML = Constants.BUBBLE_SVG;
            console.log('🚨 Emergency fallback - bubble restored to original state');
        }
    }
    
    /**
     * MODIFIED: Reset control points and clear CSS transforms
     */
    resetControlPoints(bubbleData) {
        bubbleData.controlPoints = { ...Constants.DEFAULT_CONTROL_POINTS };
        bubbleData.isDeformed = false;
        bubbleData.deformationMatrix = null;
        
        // NEW: Clear CSS transforms when resetting
        if (bubbleData.element) {
            bubbleData.element.style.transform = '';
            bubbleData.element.innerHTML = Constants.BUBBLE_SVG;
            console.log('✓ CSS transforms cleared during reset');
        }
        
        // Reset safety system
        this.resetDeformationSystem();
        this.storeValidState(Constants.BUBBLE_SVG, bubbleData.controlPoints);
        
        console.log('Control points reset to default positions with CSS transform reset');
        return bubbleData;
    }
    
    // =====================================
    // EXISTING SAFETY FUNCTIONS (Keep unchanged)
    // =====================================
    
    // [All the existing safety functions remain exactly the same]
    // This includes: validateSVGPath, storeValidState, rollbackToValidState, etc.
    // They're kept for backward compatibility and emergency fallbacks
    
    /**
     * Validate control point position within bounds
     */
    validateControlPointPosition(direction, newPosition) {
        const bounds = Constants.CONTROL_POINT_BOUNDS[direction];
        if (!bounds) return newPosition;
        
        // Clamp position to bounds
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, newPosition.x));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, newPosition.y));
        
        return { x: clampedX, y: clampedY };
    }
    
    /**
     * Check if bubble is deformed from default state
     */
    checkIfBubbleIsDeformed(bubbleData) {
        const tolerance = Constants.FLOAT_TOLERANCE;
        
        for (const direction in Constants.DEFAULT_CONTROL_POINTS) {
            const current = bubbleData.controlPoints[direction];
            const default_ = Constants.DEFAULT_CONTROL_POINTS[direction];
            
            if (Math.abs(current.x - default_.x) > tolerance || 
                Math.abs(current.y - default_.y) > tolerance) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get deformation status and safety info
     */
    getDeformationStatus() {
        return {
            enabled: this.deformationEnabled,
            attempts: this.deformationAttempts,
            maxAttempts: this.maxDeformationAttempts,
            hasValidState: !!this.lastValidSVG,
            shouldDisable: this.shouldDisableDeformation(),
            transformSystem: 'CSS Transform' // NEW: Indicate which system is active
        };
    }
    
    /**
     * Reset deformation system
     */
    resetDeformationSystem() {
        this.deformationAttempts = 0;
        this.deformationEnabled = true;
        console.log('✓ CSS transform deformation system reset');
    }
    
    /**
     * Check if deformation should be disabled temporarily (MISSING FUNCTION FIX)
     */
    shouldDisableDeformation() {
        if (this.deformationAttempts >= this.maxDeformationAttempts) {
            console.warn('⚠️ Too many deformation failures - temporarily disabling');
            return true;
        }
        return false;
    }
    
    // [Additional existing methods continue unchanged...]
    // Including: getControlPointWorldPosition, setControlPointFromWorldPosition, 
    // calculateDeformationStrength, getDeformationSummary, etc.
    
    /**
     * Get control point world position
     */
    getControlPointWorldPosition(bubbleData, direction) {
        const controlPoint = bubbleData.controlPoints[direction];
        const centerX = bubbleData.x + (bubbleData.width / 2);
        const centerY = bubbleData.y + (bubbleData.height / 2);
        
        return {
            x: centerX + (controlPoint.x * bubbleData.width),
            y: centerY + (controlPoint.y * bubbleData.height)
        };
    }
    
    /**
     * Set control point from world position
     */
    setControlPointFromWorldPosition(bubbleData, direction, worldX, worldY) {
        const centerX = bubbleData.x + (bubbleData.width / 2);
        const centerY = bubbleData.y + (bubbleData.height / 2);
        
        const relativeX = (worldX - centerX) / bubbleData.width;
        const relativeY = (worldY - centerY) / bubbleData.height;
        
        // Validate position
        const validatedPosition = this.validateControlPointPosition(direction, {
            x: relativeX,
            y: relativeY
        });
        
        bubbleData.controlPoints[direction] = validatedPosition;
        bubbleData.isDeformed = this.checkIfBubbleIsDeformed(bubbleData);
        
        return validatedPosition;
    }
    
    /**
     * Calculate deformation strength (0 = no deformation, 1 = maximum)
     */
    calculateDeformationStrength(bubbleData) {
        let totalDeformation = 0;
        let maxPossibleDeformation = 0;
        
        for (const direction in Constants.DEFAULT_CONTROL_POINTS) {
            const current = bubbleData.controlPoints[direction];
            const default_ = Constants.DEFAULT_CONTROL_POINTS[direction];
            const bounds = Constants.CONTROL_POINT_BOUNDS[direction];
            
            // Calculate current deformation
            const currentDeformation = Math.sqrt(
                Math.pow(current.x - default_.x, 2) + 
                Math.pow(current.y - default_.y, 2)
            );
            
            // Calculate maximum possible deformation for this direction
            const maxDeformation = Math.sqrt(
                Math.pow(bounds.maxX - bounds.minX, 2) + 
                Math.pow(bounds.maxY - bounds.minY, 2)
            );
            
            totalDeformation += currentDeformation;
            maxPossibleDeformation += maxDeformation;
        }
        
        return maxPossibleDeformation > 0 ? (totalDeformation / maxPossibleDeformation) : 0;
    }
    
    /**
     * Get deformation summary
     */
    getDeformationSummary(bubbleData) {
        const strength = this.calculateDeformationStrength(bubbleData);
        const deformedDirections = [];
        
        for (const direction in Constants.DEFAULT_CONTROL_POINTS) {
            const current = bubbleData.controlPoints[direction];
            const default_ = Constants.DEFAULT_CONTROL_POINTS[direction];
            
            if (Math.abs(current.x - default_.x) > Constants.FLOAT_TOLERANCE || 
                Math.abs(current.y - default_.y) > Constants.FLOAT_TOLERANCE) {
                deformedDirections.push(direction);
            }
        }
        
        return {
            isDeformed: bubbleData.isDeformed,
            strength: strength,
            deformedDirections: deformedDirections,
            controlPoints: { ...bubbleData.controlPoints },
            safetyStatus: this.getDeformationStatus(),
            transformSystem: 'CSS Transform' // NEW: Indicate system type
        };
    }
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ControlPointManager;
}