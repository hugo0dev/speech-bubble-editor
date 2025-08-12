/**
 * ControlPointManager - CSS Transform Deformation System
 */
class ControlPointManager {
    constructor() {
        this.transformBounds = {
            scale: { min: 0.3, max: 2.5 },
            translate: { min: -80, max: 80 },
            skew: { min: -45, max: 45 }
        };
        
        this.deformationConfig = {
            asymmetricStrength: 0.6,
            crossAxisInfluence: 0.3,
            momentumFactor: 0.8,
            originSensitivity: 0.4,
            smoothingFactor: 0.1
        };
    }
    
    calculateCSSTransform(bubbleData) {
        if (!bubbleData?.controlPoints) return { transformString: '', transformOrigin: 'center center' };
        
        const cp = bubbleData.controlPoints;
        const influences = this.calculateControlPointInfluences(cp);
        const scaleFactors = this.calculateDirectionalScales(influences);
        const translate = this.calculateOrganicTranslate(influences);
        const skew = this.calculateMomentumSkew(influences);
        const transformOrigin = this.calculateTransformOrigin(influences);
        
        const transformString = this.generateEnhancedTransformString(
            scaleFactors, translate, skew, transformOrigin
        );
        
        return { transformString, transformOrigin };
    }
    
    calculateControlPointInfluences(controlPoints) {
        const defaultPoints = Constants.DEFAULT_CONTROL_POINTS;
        const influences = {};
        
        for (const direction in controlPoints) {
            const current = controlPoints[direction];
            const default_ = defaultPoints[direction];
            
            const deltaX = current.x - default_.x;
            const deltaY = current.y - default_.y;
            const strength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX);
            
            influences[direction] = {
                deltaX,
                deltaY,
                strength,
                angle,
                outward: this.calculateOutwardMovement(direction, deltaX, deltaY),
                perpendicular: this.calculatePerpendicularMovement(direction, deltaX, deltaY)
            };
        }
        
        return influences;
    }
    
    calculateOutwardMovement(direction, deltaX, deltaY) {
        switch(direction) {
            case 'top': return -deltaY;
            case 'right': return deltaX;
            case 'bottom': return deltaY;
            case 'left': return -deltaX;
            default: return 0;
        }
    }
    
    calculatePerpendicularMovement(direction, deltaX, deltaY) {
        switch(direction) {
            case 'top':
            case 'bottom': return deltaX;
            case 'left':
            case 'right': return deltaY;
            default: return 0;
        }
    }
    
    calculateDirectionalScales(influences) {
        const config = this.deformationConfig;
        
        const leftInfluence = Math.max(0, influences.left.outward);
        const rightInfluence = Math.max(0, influences.right.outward);
        const topInfluence = Math.max(0, influences.top.outward);
        const bottomInfluence = Math.max(0, influences.bottom.outward);
        
        let scaleX = 1.0;
        if (leftInfluence > 0 || rightInfluence > 0) {
            const primaryStretch = Math.max(leftInfluence, rightInfluence);
            const secondaryCompress = Math.min(leftInfluence, rightInfluence);
            scaleX = 1.0 + (primaryStretch * 1.2) - (secondaryCompress * config.asymmetricStrength);
        }
        
        let scaleY = 1.0;
        if (topInfluence > 0 || bottomInfluence > 0) {
            const primaryStretch = Math.max(topInfluence, bottomInfluence);
            const secondaryCompress = Math.min(topInfluence, bottomInfluence);
            scaleY = 1.0 + (primaryStretch * 1.2) - (secondaryCompress * config.asymmetricStrength);
        }
        
        const horizontalCrossInfluence = (topInfluence + bottomInfluence) * config.crossAxisInfluence;
        const verticalCrossInfluence = (leftInfluence + rightInfluence) * config.crossAxisInfluence;
        
        scaleX += verticalCrossInfluence * 0.3;
        scaleY += horizontalCrossInfluence * 0.3;
        
        scaleX = this.clampValue(scaleX, this.transformBounds.scale.min, this.transformBounds.scale.max);
        scaleY = this.clampValue(scaleY, this.transformBounds.scale.min, this.transformBounds.scale.max);
        
        return { scaleX, scaleY };
    }
    
    calculateOrganicTranslate(influences) {
        const config = this.deformationConfig;
        
        let totalForceX = 0;
        let totalForceY = 0;
        let totalStrength = 0;
        
        for (const direction in influences) {
            const influence = influences[direction];
            const strength = influence.strength;
            
            if (strength > 0) {
                const forceX = influence.deltaX * strength * config.momentumFactor;
                const forceY = influence.deltaY * strength * config.momentumFactor;
                
                totalForceX += forceX;
                totalForceY += forceY;
                totalStrength += strength;
            }
        }
        
        let translateX = 0;
        let translateY = 0;
        
        if (totalStrength > 0) {
            translateX = (totalForceX / totalStrength) * 40;
            translateY = (totalForceY / totalStrength) * 40;
        }
        
        translateX = this.clampValue(translateX, this.transformBounds.translate.min, this.transformBounds.translate.max);
        translateY = this.clampValue(translateY, this.transformBounds.translate.min, this.transformBounds.translate.max);
        
        return { x: translateX, y: translateY };
    }
    
    calculateMomentumSkew(influences) {
        const config = this.deformationConfig;
        
        const horizontalAsymmetry = influences.left.outward - influences.right.outward;
        const verticalAsymmetry = influences.top.outward - influences.bottom.outward;
        
        const topBottomPerpendicular = (influences.top.perpendicular + influences.bottom.perpendicular) / 2;
        const leftRightPerpendicular = (influences.left.perpendicular + influences.right.perpendicular) / 2;
        
        let skewX = topBottomPerpendicular * 15 * config.momentumFactor;
        let skewY = leftRightPerpendicular * 15 * config.momentumFactor;
        
        skewX += verticalAsymmetry * 8;
        skewY += horizontalAsymmetry * 8;
        
        skewX = this.clampValue(skewX, this.transformBounds.skew.min, this.transformBounds.skew.max);
        skewY = this.clampValue(skewY, this.transformBounds.skew.min, this.transformBounds.skew.max);
        
        return { x: skewX, y: skewY };
    }
    
    calculateTransformOrigin(influences) {
        const config = this.deformationConfig;
        
        let totalWeightedX = 0;
        let totalWeightedY = 0;
        let totalWeight = 0;
        
        const originMap = {
            top: { x: 50, y: 0 },
            right: { x: 100, y: 50 },
            bottom: { x: 50, y: 100 },
            left: { x: 0, y: 50 }
        };
        
        for (const direction in influences) {
            const influence = influences[direction];
            const strength = influence.strength;
            
            if (strength > 0) {
                const origin = originMap[direction];
                totalWeightedX += origin.x * strength;
                totalWeightedY += origin.y * strength;
                totalWeight += strength;
            }
        }
        
        let originX = 50;
        let originY = 50;
        
        if (totalWeight > 0) {
            const weightedX = totalWeightedX / totalWeight;
            const weightedY = totalWeightedY / totalWeight;
            
            originX = 50 + (weightedX - 50) * config.originSensitivity;
            originY = 50 + (weightedY - 50) * config.originSensitivity;
        }
        
        originX = this.clampValue(originX, 20, 80);
        originY = this.clampValue(originY, 20, 80);
        
        return `${originX.toFixed(1)}% ${originY.toFixed(1)}%`;
    }
    
    generateEnhancedTransformString(scaleFactors, translate, skew, transformOrigin) {
        const transforms = [];
        
        if (Math.abs(scaleFactors.scaleX - 1.0) > 0.01) {
            transforms.push(`scaleX(${scaleFactors.scaleX.toFixed(3)})`);
        }
        if (Math.abs(scaleFactors.scaleY - 1.0) > 0.01) {
            transforms.push(`scaleY(${scaleFactors.scaleY.toFixed(3)})`);
        }
        if (Math.abs(translate.x) > 1) {
            transforms.push(`translateX(${translate.x.toFixed(1)}px)`);
        }
        if (Math.abs(translate.y) > 1) {
            transforms.push(`translateY(${translate.y.toFixed(1)}px)`);
        }
        if (Math.abs(skew.x) > 1) {
            transforms.push(`skewX(${skew.x.toFixed(1)}deg)`);
        }
        if (Math.abs(skew.y) > 1) {
            transforms.push(`skewY(${skew.y.toFixed(1)}deg)`);
        }
        
        return transforms.join(' ');
    }
    
    applyCSSTransformToBubble(bubbleElement, transformData) {
        if (!bubbleElement) return false;
        
        const { transformString, transformOrigin } = transformData;
        
        bubbleElement.style.transformOrigin = transformOrigin;
        bubbleElement.style.transform = transformString;
        
        return true;
    }
    
    clampValue(value, min, max) {
        if (isNaN(value) || !isFinite(value)) {
            return (min + max) / 2;
        }
        return Math.max(min, Math.min(max, value));
    }
    
    applyDeformationToBubble(bubbleElement, bubbleData) {
        if (!bubbleElement || !bubbleData) return;
        
        if (!bubbleData.isDeformed) {
            // Build transform with flip and rotation when not deformed
            const transforms = [];
            
            // Apply flips first
            if (bubbleData.flipX) {
                transforms.push('scaleX(-1)');
            }
            if (bubbleData.flipY) {
                transforms.push('scaleY(-1)');
            }
            
            // Then apply rotation
            if (bubbleData.rotation) {
                transforms.push(`rotate(${bubbleData.rotation || 0}deg)`);
            }
            
            bubbleElement.style.transform = transforms.join(' ');
            bubbleElement.style.transformOrigin = 'center center';
            bubbleElement.innerHTML = Constants.BUBBLE_SVG;
            return;
        }
        
        if (!bubbleElement.innerHTML.includes('xmlns')) {
            bubbleElement.innerHTML = Constants.BUBBLE_SVG;
        }
        
        const transformData = this.calculateCSSTransform(bubbleData);
        
        if (transformData.transformString || bubbleData.flipX || bubbleData.flipY || bubbleData.rotation) {
            // Build combined transform: flip, rotation, then deformation
            const transforms = [];
            
            // Apply flips first
            if (bubbleData.flipX) {
                transforms.push('scaleX(-1)');
            }
            if (bubbleData.flipY) {
                transforms.push('scaleY(-1)');
            }
            
            // Then rotation
            if (bubbleData.rotation) {
                transforms.push(`rotate(${bubbleData.rotation || 0}deg)`);
            }
            
            // Finally deformation transforms
            if (transformData.transformString) {
                transforms.push(transformData.transformString);
            }
            
            const combinedTransform = transforms.join(' ');
            
            bubbleElement.style.transformOrigin = transformData.transformOrigin || 'center center';
            bubbleElement.style.transform = combinedTransform;
        } else {
            // No transforms to apply
            bubbleElement.style.transform = '';
            bubbleElement.style.transformOrigin = 'center center';
        }
    }
    
    resetControlPoints(bubbleData) {
        bubbleData.controlPoints = { ...Constants.DEFAULT_CONTROL_POINTS };
        bubbleData.isDeformed = false;
        bubbleData.deformationMatrix = null;
        
        if (bubbleData.element) {
            // Build transform with preserved flip and rotation
            const transforms = [];
            
            // Preserve flips
            if (bubbleData.flipX) {
                transforms.push('scaleX(-1)');
            }
            if (bubbleData.flipY) {
                transforms.push('scaleY(-1)');
            }
            
            // Preserve rotation
            if (bubbleData.rotation) {
                transforms.push(`rotate(${bubbleData.rotation || 0}deg)`);
            }
            
            bubbleData.element.style.transform = transforms.join(' ');
            bubbleData.element.style.transformOrigin = 'center center';
            bubbleData.element.innerHTML = Constants.BUBBLE_SVG;
        }
        
        return bubbleData;
    }
    
    validateControlPointPosition(direction, newPosition) {
        const bounds = Constants.CONTROL_POINT_BOUNDS[direction];
        if (!bounds) return newPosition;
        
        const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, newPosition.x));
        const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, newPosition.y));
        
        return { x: clampedX, y: clampedY };
    }
    
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
    
    calculateDeformationStrength(bubbleData) {
        let totalDeformation = 0;
        let maxPossibleDeformation = 0;
        
        for (const direction in Constants.DEFAULT_CONTROL_POINTS) {
            const current = bubbleData.controlPoints[direction];
            const default_ = Constants.DEFAULT_CONTROL_POINTS[direction];
            const bounds = Constants.CONTROL_POINT_BOUNDS[direction];
            
            const currentDeformation = Math.sqrt(
                Math.pow(current.x - default_.x, 2) + 
                Math.pow(current.y - default_.y, 2)
            );
            
            const maxDeformation = Math.sqrt(
                Math.pow(bounds.maxX - bounds.minX, 2) + 
                Math.pow(bounds.maxY - bounds.minY, 2)
            );
            
            totalDeformation += currentDeformation;
            maxPossibleDeformation += maxDeformation;
        }
        
        return maxPossibleDeformation > 0 ? (totalDeformation / maxPossibleDeformation) : 0;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ControlPointManager;
}