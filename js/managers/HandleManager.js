/**
 * HandleManager - Manages visual handles for bubble manipulation
 */
class HandleManager {
    constructor(canvasContainer) {
        this.canvasContainer = canvasContainer;
        this.interactionManager = null;
        this.bubbleManager = null;
    }
    
    setInteractionManager(interactionManager) {
        this.interactionManager = interactionManager;
    }
    
    setBubbleManager(bubbleManager) {
        this.bubbleManager = bubbleManager;
    }
    
    createAllHandles(bubbleElement) {
        this.createResizeHandles(bubbleElement);
        this.createRotationHandle(bubbleElement);
        this.createControlPointHandles(bubbleElement);
    }
    
    removeAllHandles(bubbleElement) {
        this.removeResizeHandles(bubbleElement);
        this.removeRotationHandle(bubbleElement);
        this.removeControlPointHandles(bubbleElement);
    }
    
    createResizeHandles(bubbleElement) {
        const handleContainer = document.createElement('div');
        handleContainer.className = 'resize-handles';
        
        const bubbleData = this.getBubbleData(bubbleElement);
        
        Object.assign(handleContainer.style, {
            position: 'absolute',
            left: bubbleElement.style.left,
            top: bubbleElement.style.top,
            width: bubbleElement.style.width,
            height: bubbleElement.style.height,
            pointerEvents: 'none',
            zIndex: Constants.RESIZE_HANDLES_Z_INDEX,
            transformOrigin: 'center center',
            transform: bubbleData ? `rotate(${bubbleData.rotation}deg)` : ''
        });
        
        Constants.RESIZE_HANDLE_POSITIONS.forEach(position => {
            const handle = this.createResizeHandle(position, bubbleElement);
            handleContainer.appendChild(handle);
        });
        
        this.canvasContainer.appendChild(handleContainer);
        bubbleElement.resizeHandles = handleContainer;
    }
    
    createResizeHandle(position, bubbleElement) {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-handle-${position}`;
        
        const halfSize = Constants.RESIZE_HANDLE_SIZE / 2;
        const baseStyles = {
            position: 'absolute',
            width: Constants.RESIZE_HANDLE_SIZE + 'px',
            height: Constants.RESIZE_HANDLE_SIZE + 'px',
            backgroundColor: Constants.RESIZE_HANDLE_COLOR,
            border: '1px solid #333',
            cursor: `${position}-resize`,
            pointerEvents: 'all',
            borderRadius: '2px',
            transition: `background-color ${Constants.HANDLE_TRANSITION_DURATION}, transform 0.1s ease`
        };
        
        const positionStyles = {
            'nw': { left: -halfSize + 'px', top: -halfSize + 'px' },
            'ne': { right: -halfSize + 'px', top: -halfSize + 'px' },
            'sw': { left: -halfSize + 'px', bottom: -halfSize + 'px' },
            'se': { right: -halfSize + 'px', bottom: -halfSize + 'px' }
        };
        
        Object.assign(handle.style, baseStyles, positionStyles[position]);
        
        handle.addEventListener('mouseenter', () => {
            handle.style.backgroundColor = '#45a049';
            handle.style.transform = 'scale(1.1)';
        });
        
        handle.addEventListener('mouseleave', () => {
            handle.style.backgroundColor = Constants.RESIZE_HANDLE_COLOR;
            handle.style.transform = 'scale(1)';
        });
        
        if (this.interactionManager?.handleResizeMouseDown) {
            handle.addEventListener('mousedown', (e) => {
                this.interactionManager.handleResizeMouseDown(e, position, bubbleElement);
            });
        }
        
        return handle;
    }
    
    createRotationHandle(bubbleElement) {
        const rotationContainer = document.createElement('div');
        rotationContainer.className = 'rotation-handle-container';
        
        const bubbleData = this.getBubbleData(bubbleElement);
        
        Object.assign(rotationContainer.style, {
            position: 'absolute',
            left: bubbleElement.style.left,
            top: bubbleElement.style.top,
            width: bubbleElement.style.width,
            height: bubbleElement.style.height,
            pointerEvents: 'none',
            zIndex: Constants.ROTATION_HANDLE_Z_INDEX,
            transformOrigin: 'center center',
            transform: bubbleData ? `rotate(${bubbleData.rotation}deg)` : ''
        });
        
        const rotationLine = this.createRotationLine();
        const rotationHandle = this.createRotationHandleCircle(bubbleElement);
        
        rotationContainer.appendChild(rotationLine);
        rotationContainer.appendChild(rotationHandle);
        
        this.canvasContainer.appendChild(rotationContainer);
        bubbleElement.rotationHandle = rotationContainer;
    }
    
    createRotationLine() {
        const rotationLine = document.createElement('div');
        rotationLine.className = 'rotation-line';
        
        Object.assign(rotationLine.style, {
            position: 'absolute',
            left: '50%',
            top: '-25px',
            width: '1px',
            height: '20px',
            backgroundColor: Constants.RESIZE_HANDLE_COLOR,
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
        });
        
        return rotationLine;
    }
    
    createRotationHandleCircle(bubbleElement) {
        const rotationHandle = document.createElement('div');
        rotationHandle.className = 'rotation-handle';
        
        Object.assign(rotationHandle.style, {
            position: 'absolute',
            left: '50%',
            top: '-30px',
            width: Constants.ROTATION_HANDLE_SIZE + 'px',
            height: Constants.ROTATION_HANDLE_SIZE + 'px',
            backgroundColor: Constants.ROTATION_HANDLE_COLOR,
            border: '1px solid #333',
            borderRadius: '50%',
            cursor: 'crosshair',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'all',
            transition: `background-color ${Constants.HANDLE_TRANSITION_DURATION}, transform 0.1s ease`
        });
        
        rotationHandle.addEventListener('mouseenter', () => {
            rotationHandle.style.backgroundColor = '#FF5252';
            rotationHandle.style.transform = 'translate(-50%, -50%) scale(1.1)';
        });
        
        rotationHandle.addEventListener('mouseleave', () => {
            rotationHandle.style.backgroundColor = Constants.ROTATION_HANDLE_COLOR;
            rotationHandle.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        if (this.interactionManager?.handleRotationMouseDown) {
            rotationHandle.addEventListener('mousedown', (e) => {
                this.interactionManager.handleRotationMouseDown(e, bubbleElement);
            });
        }
        
        return rotationHandle;
    }
    
    createControlPointHandles(bubbleElement) {
        const controlPointContainer = document.createElement('div');
        controlPointContainer.className = 'control-point-handles';
        
        const bubbleData = this.getBubbleData(bubbleElement);
        
        Object.assign(controlPointContainer.style, {
            position: 'absolute',
            left: bubbleElement.style.left,
            top: bubbleElement.style.top,
            width: bubbleElement.style.width,
            height: bubbleElement.style.height,
            pointerEvents: 'none',
            zIndex: Constants.CONTROL_POINT_HANDLES_Z_INDEX,
            transformOrigin: 'center center',
            transform: bubbleData ? `rotate(${bubbleData.rotation}deg)` : ''
        });
        
        Constants.CONTROL_POINT_DIRECTIONS.forEach(direction => {
            const handle = this.createControlPointHandle(direction, bubbleElement);
            controlPointContainer.appendChild(handle);
        });
        
        this.canvasContainer.appendChild(controlPointContainer);
        bubbleElement.controlPointHandles = controlPointContainer;
        
        if (bubbleData) {
            setTimeout(() => {
                Constants.CONTROL_POINT_DIRECTIONS.forEach(direction => {
                    this.updateControlPointHandlePosition(
                        direction, 
                        bubbleElement, 
                        bubbleData.controlPoints[direction]
                    );
                });
            }, 0);
        }
    }
    
    createControlPointHandle(direction, bubbleElement) {
        const handle = document.createElement('div');
        handle.className = `control-point-handle control-point-${direction}`;
        
        const baseStyles = {
            position: 'absolute',
            width: Constants.CONTROL_POINT_HANDLE_SIZE + 'px',
            height: Constants.CONTROL_POINT_HANDLE_SIZE + 'px',
            backgroundColor: Constants.CONTROL_POINT_COLOR,
            border: '2px solid #fff',
            borderRadius: '2px',
            cursor: 'move',
            pointerEvents: 'all',
            transform: 'rotate(45deg)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transition: `background-color ${Constants.HANDLE_TRANSITION_DURATION}, transform 0.1s ease`
        };
        
        Object.assign(handle.style, baseStyles);
        
        this.positionControlPointHandleAtDefault(handle, direction);
        
        handle.addEventListener('mouseenter', () => {
            handle.style.backgroundColor = '#1976D2';
            handle.style.transform = handle.style.transform.replace('rotate(45deg)', 'rotate(45deg) scale(1.1)');
        });
        
        handle.addEventListener('mouseleave', () => {
            handle.style.backgroundColor = Constants.CONTROL_POINT_COLOR;
            handle.style.transform = handle.style.transform.replace('scale(1.1)', '');
        });
        
        if (this.interactionManager?.handleControlPointMouseDown) {
            handle.addEventListener('mousedown', (e) => {
                this.interactionManager.handleControlPointMouseDown(e, direction, bubbleElement);
            });
        }
        
        return handle;
    }
    
    positionControlPointHandleAtDefault(handle, direction) {
        const offset = 5;
        const transforms = {
            'top': { left: '50%', top: -offset + 'px', transform: 'rotate(45deg) translate(-50%, -50%)' },
            'right': { right: -offset + 'px', top: '50%', transform: 'rotate(45deg) translate(50%, -50%)' },
            'bottom': { left: '50%', bottom: -offset + 'px', transform: 'rotate(45deg) translate(-50%, 50%)' },
            'left': { left: -offset + 'px', top: '50%', transform: 'rotate(45deg) translate(-50%, -50%)' }
        };
        
        Object.assign(handle.style, transforms[direction]);
    }
    
    removeResizeHandles(bubbleElement) {
        bubbleElement?.resizeHandles?.remove();
        if (bubbleElement) bubbleElement.resizeHandles = null;
    }
    
    removeRotationHandle(bubbleElement) {
        bubbleElement?.rotationHandle?.remove();
        if (bubbleElement) bubbleElement.rotationHandle = null;
    }
    
    removeControlPointHandles(bubbleElement) {
        bubbleElement?.controlPointHandles?.remove();
        if (bubbleElement) bubbleElement.controlPointHandles = null;
    }
    
    updateHandlePositions(bubbleElement) {
        this.updateResizeHandlePositions(bubbleElement);
        this.updateRotationHandlePosition(bubbleElement);
        this.updateControlPointHandlePositions(bubbleElement);
    }
    
    updateResizeHandlePositions(bubbleElement) {
        if (!bubbleElement?.resizeHandles) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const handles = bubbleElement.resizeHandles;
        Object.assign(handles.style, {
            width: bubbleData.width + 'px',
            height: bubbleData.height + 'px',
            left: bubbleData.x + 'px',
            top: bubbleData.y + 'px',
            transform: `rotate(${bubbleData.rotation}deg)`
        });
    }
    
    updateRotationHandlePosition(bubbleElement) {
        if (!bubbleElement?.rotationHandle) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const handle = bubbleElement.rotationHandle;
        Object.assign(handle.style, {
            width: bubbleData.width + 'px',
            height: bubbleData.height + 'px',
            left: bubbleData.x + 'px',
            top: bubbleData.y + 'px',
            transform: `rotate(${bubbleData.rotation}deg)`
        });
    }
    
    updateControlPointHandlePositions(bubbleElement) {
        if (!bubbleElement?.controlPointHandles) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const handles = bubbleElement.controlPointHandles;
        Object.assign(handles.style, {
            width: bubbleData.width + 'px',
            height: bubbleData.height + 'px',
            left: bubbleData.x + 'px',
            top: bubbleData.y + 'px',
            transform: `rotate(${bubbleData.rotation}deg)`
        });
        
        Constants.CONTROL_POINT_DIRECTIONS.forEach(direction => {
            this.updateControlPointHandlePosition(direction, bubbleElement, bubbleData.controlPoints[direction]);
        });
    }
    
    updateControlPointHandlePosition(direction, bubbleElement, controlPointData) {
        if (!bubbleElement.controlPointHandles) return;
        
        const handle = bubbleElement.controlPointHandles.querySelector(`.control-point-${direction}`);
        if (!handle) return;
        
        const bubbleData = this.getBubbleData(bubbleElement);
        if (!bubbleData) return;
        
        const centerX = bubbleData.width / 2;
        const centerY = bubbleData.height / 2;
        
        const absoluteX = centerX + (controlPointData.x * bubbleData.width);
        const absoluteY = centerY + (controlPointData.y * bubbleData.height);
        
        const offset = 5;
        handle.style.left = (absoluteX - offset) + 'px';
        handle.style.top = (absoluteY - offset) + 'px';
        handle.style.transform = 'rotate(45deg) translate(-50%, -50%)';
    }
    
    getBubbleData(bubbleElement) {
        return this.bubbleManager?.getBubbleData(bubbleElement);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandleManager;
}