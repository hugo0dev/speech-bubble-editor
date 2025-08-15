/**
 * TextElementManager - Fixed with proper editor positioning and drag support (Updated for Group Movement)
 */
class TextElementManager {
    constructor(canvasContainer, fontLoader) {
        this.canvasContainer = canvasContainer;
        this.fontLoader = fontLoader;
        this.textElements = new Map();
        this.bubbleTextLinks = new Map();
        this.elementIdCounter = 0;
        this.currentEditingElement = null;
        
        this.initializeEditor();
        this.initializeTextDecorations();
    }
    
    initializeEditor() {
        // Create modal editor that appears at top center of image
        this.editorModal = document.createElement('div');
        this.editorModal.className = 'text-editor-modal';
        this.editorModal.style.cssText = `
            position: absolute;
            display: none;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 300px;
            max-width: 500px;
            z-index: 1000;
        `;
        
        this.editorInput = document.createElement('input');
        this.editorInput.type = 'text';
        this.editorInput.className = 'text-editor-input';
        this.editorInput.placeholder = 'Enter text...';
        this.editorInput.style.cssText = `
            width: 100%;
            padding: 10px;
            font-size: 16px;
            border: 1px solid #ddd;
            border-radius: 4px;
            outline: none;
        `;
        
        this.editorModal.appendChild(this.editorInput);
        // Append to canvas container instead of body for proper positioning
        this.canvasContainer.appendChild(this.editorModal);
        
        // Editor event listeners
        this.editorInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.finishEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.cancelEditing();
            }
        });
        
        this.editorInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (this.currentEditingElement) {
                    this.finishEditing();
                }
            }, 200);
        });
    }
    
    initializeTextDecorations() {
        this.decorationControls = {
            underline: false,
            strikethrough: false,
            italic: false,
            uppercase: false,
            shadow: false,
            outline: false
        };
    }
    
    createTextElement(x = null, y = null, content = '') {
        const id = ++this.elementIdCounter;
        
        // Default position to center of viewport if not specified
        if (x === null || y === null) {
            const rect = this.canvasContainer.getBoundingClientRect();
            x = rect.width / 2 - 50;
            y = 50;
        }
        
        // Create text element div
        const element = document.createElement('div');
        element.className = 'text-element';
        element.id = `text-element-${id}`;
        element.textContent = content || 'New Text';
        
        // Apply initial styles for drag support
        Object.assign(element.style, {
            position: 'absolute',
            left: x + 'px',
            top: y + 'px',
            fontSize: Constants.DEFAULT_FONT_SIZE + 'px',
            fontFamily: this.fontLoader.buildFontStack(Constants.DEFAULT_FONT_FAMILY),
            fontWeight: Constants.DEFAULT_FONT_WEIGHT,
            color: Constants.DEFAULT_TEXT_COLOR,
            zIndex: 50,
            cursor: 'move',
            padding: '8px',
            whiteSpace: 'nowrap',
            transformOrigin: 'center center',
            userSelect: 'none', // Prevent text selection during drag
            pointerEvents: 'all' // Ensure element receives pointer events
        });
        
        // Create data structure
        const textData = {
            id,
            element,
            content: content || 'New Text',
            x,
            y,
            fontSize: Constants.DEFAULT_FONT_SIZE,
            fontFamily: Constants.DEFAULT_FONT_FAMILY,
            fontWeight: Constants.DEFAULT_FONT_WEIGHT,
            color: Constants.DEFAULT_TEXT_COLOR,
            linkedBubbleId: null,
            relativePosition: null,
            decorations: {...this.decorationControls}
        };
        
        // Store data
        this.textElements.set(id, textData);
        
        // Add to DOM
        this.canvasContainer.appendChild(element);
        
        // Add event listeners for both selection and dragging
        this.addTextInteractionListeners(element);
        
        // Start editing immediately for new text
        setTimeout(() => this.startEditing(element), 100);
        
        return element;
    }

    // MODIFIED: Enhanced to coordinate with group dragging
    addTextInteractionListeners(textElement) {
        let isDragging = false;
        let isGroupDrag = false;
        let dragStartX = 0;
        let dragStartY = 0;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        // Mouse down - start potential drag or selection
        textElement.addEventListener('mousedown', (e) => {
            // Don't interfere if editing
            if (textElement.classList.contains('editing')) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // Store drag start position
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            // Get current element position
            const rect = textElement.getBoundingClientRect();
            const containerRect = this.canvasContainer.getBoundingClientRect();
            
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            
            // Set initial state
            isDragging = false;
            isGroupDrag = false;
            
            // Handle selection immediately (before potential drag)
            this.handleTextSelection(textElement, e);
            
            // NEW: Check for group drag coordination with InteractionManager
            const interactionManager = window.editor?.appCoordinator?.getManager('interactionManager');
            
            if (interactionManager) {
                // Detect if this text element is part of a group
                isGroupDrag = interactionManager.detectGroupDragStart(textElement);
            }
            
            // Add temporary global event listeners for drag (both individual and group)
            const handleMouseMove = (e) => {
                if (!isDragging) {
                    // Check if mouse moved enough to start dragging
                    const deltaX = Math.abs(e.clientX - dragStartX);
                    const deltaY = Math.abs(e.clientY - dragStartY);
                    
                    if (deltaX > 3 || deltaY > 3) {
                        isDragging = true;
                        
                        if (isGroupDrag) {
                            // For group drag, set up InteractionManager state
                            if (interactionManager) {
                                interactionManager.isDragging = true;
                                interactionManager.draggedElement = textElement;
                                interactionManager.dragOffset = {
                                    x: dragOffsetX,
                                    y: dragOffsetY
                                };
                            }
                        } else {
                            // Individual text drag visual feedback
                            textElement.style.opacity = '0.8';
                            textElement.style.zIndex = '100';
                            document.body.style.cursor = 'move';
                        }
                    }
                }
                
                if (isDragging) {
                    if (isGroupDrag && interactionManager) {
                        // Let InteractionManager handle group movement
                        const containerRect = interactionManager.canvasContainer.getBoundingClientRect();
                        const newX = e.clientX - containerRect.left - dragOffsetX;
                        const newY = e.clientY - containerRect.top - dragOffsetY;
                        interactionManager.updateGroupPositions(newX, newY);
                    } else {
                        // Handle individual text drag
                        this.performTextDrag(textElement, e, dragOffsetX, dragOffsetY);
                    }
                }
            };
            
            const handleMouseUp = (e) => {
                if (isGroupDrag && interactionManager) {
                    // Clean up group drag
                    interactionManager.cleanupGroupDrag();
                    interactionManager.isDragging = false;
                    interactionManager.draggedElement = null;
                } else {
                    // Clean up individual drag state
                    textElement.style.opacity = '1';
                    textElement.style.zIndex = '50';
                    document.body.style.cursor = '';
                }
                
                // Remove global event listeners
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                // Reset drag state
                isDragging = false;
                isGroupDrag = false;
            };
            
            // Add global event listeners
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        // Double-click for editing
        textElement.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.startEditing(textElement);
        });
    }
    
    // NEW: Method to update text element position (used by group movement)
    updateTextElementPosition(element, newX, newY) {
        const textData = this.getTextDataByElement(element);
        if (!textData) return;
        
        // Apply boundary constraints
        const elementWidth = element.offsetWidth || 50;
        const elementHeight = element.offsetHeight || 20;
        const constrainedX = Math.max(0, Math.min(newX, this.canvasContainer.offsetWidth - elementWidth));
        const constrainedY = Math.max(0, Math.min(newY, this.canvasContainer.offsetHeight - elementHeight));
        
        // Update visual position
        element.style.left = constrainedX + 'px';
        element.style.top = constrainedY + 'px';
        
        // Update internal data
        textData.x = constrainedX;
        textData.y = constrainedY;
        
        // If text is linked to bubble, update relative position
        if (textData.linkedBubbleId) {
            const bubbleData = this.getBubbleDataById(textData.linkedBubbleId);
            if (bubbleData) {
                const bubbleCenterX = bubbleData.x + bubbleData.width / 2;
                const bubbleCenterY = bubbleData.y + bubbleData.height / 2;
                
                textData.relativePosition = {
                    x: constrainedX - bubbleCenterX,
                    y: constrainedY - bubbleCenterY
                };
            }
        }
    }
    
    startEditing(element) {
        const textData = this.getTextDataByElement(element);
        if (!textData) return;
        
        this.currentEditingElement = element;
        element.classList.add('editing');
        
        // Disable dragging while editing
        element.style.pointerEvents = 'none';
        
        // Position editor at top center of canvas
        const containerRect = this.canvasContainer.getBoundingClientRect();
        const modalWidth = 300;
        
        this.editorModal.style.left = (this.canvasContainer.offsetWidth / 2 - modalWidth / 2) + 'px';
        this.editorModal.style.top = '20px';
        this.editorModal.style.display = 'block';
        
        this.editorInput.value = textData.content;
        this.editorInput.select();
        this.editorInput.focus();
    }
    
    finishEditing() {
        if (!this.currentEditingElement) return;
        
        const newContent = this.editorInput.value.trim();
        if (newContent) {
            const textData = this.getTextDataByElement(this.currentEditingElement);
            if (textData) {
                textData.content = newContent;
                this.currentEditingElement.textContent = newContent;
            }
        } else {
            // If empty, delete the text element
            this.deleteTextElement(this.currentEditingElement);
        }
        
        // Re-enable dragging
        this.currentEditingElement.style.pointerEvents = 'all';
        this.currentEditingElement.classList.remove('editing');
        this.currentEditingElement = null;
        this.editorModal.style.display = 'none';
        this.editorInput.value = '';
    }
    
    cancelEditing() {
        if (this.currentEditingElement) {
            // If it's a new element with default text, delete it
            const textData = this.getTextDataByElement(this.currentEditingElement);
            if (textData && textData.content === 'New Text') {
                this.deleteTextElement(this.currentEditingElement);
            } else {
                // Re-enable dragging
                this.currentEditingElement.style.pointerEvents = 'all';
            }
            
            this.currentEditingElement.classList.remove('editing');
            this.currentEditingElement = null;
            this.editorModal.style.display = 'none';
            this.editorInput.value = '';
        }
    }
    
    linkTextToBubble(textElement, bubbleElement) {
        const textData = this.getTextDataByElement(textElement);
        const bubbleData = this.getBubbleData(bubbleElement);
        
        if (!textData || !bubbleData) return;
        
        // Calculate relative position
        const textX = parseFloat(textElement.style.left);
        const textY = parseFloat(textElement.style.top);
        
        const bubbleCenterX = bubbleData.x + bubbleData.width / 2;
        const bubbleCenterY = bubbleData.y + bubbleData.height / 2;
        
        textData.linkedBubbleId = bubbleData.id;
        textData.relativePosition = {
            x: textX - bubbleCenterX,
            y: textY - bubbleCenterY
        };
        
        // Store link
        if (!this.bubbleTextLinks.has(bubbleData.id)) {
            this.bubbleTextLinks.set(bubbleData.id, new Set());
        }
        this.bubbleTextLinks.get(bubbleData.id).add(textData.id);
        
        // Add visual indicator
        textElement.classList.add('linked');
    }
    
    unlinkTextFromBubble(textElement) {
        const textData = this.getTextDataByElement(textElement);
        if (!textData || !textData.linkedBubbleId) return;
        
        // Remove from links map
        const linkedTexts = this.bubbleTextLinks.get(textData.linkedBubbleId);
        if (linkedTexts) {
            linkedTexts.delete(textData.id);
            if (linkedTexts.size === 0) {
                this.bubbleTextLinks.delete(textData.linkedBubbleId);
            }
        }
        
        // Clear link data
        textData.linkedBubbleId = null;
        textData.relativePosition = null;
        
        // Remove visual indicator
        textElement.classList.remove('linked');
    }
    
    updateLinkedTextPositions(bubbleId, bubbleData) {
        const linkedTextIds = this.bubbleTextLinks.get(bubbleId);
        if (!linkedTextIds) return;
        
        const bubbleCenterX = bubbleData.x + bubbleData.width / 2;
        const bubbleCenterY = bubbleData.y + bubbleData.height / 2;
        
        linkedTextIds.forEach(textId => {
            const textData = this.textElements.get(textId);
            if (textData && textData.relativePosition) {
                // Calculate new position (text does NOT rotate with bubble)
                const newX = bubbleCenterX + textData.relativePosition.x;
                const newY = bubbleCenterY + textData.relativePosition.y;
                
                textData.x = newX;
                textData.y = newY;
                
                textData.element.style.left = newX + 'px';
                textData.element.style.top = newY + 'px';
            }
        });
    }
    
    deleteTextElement(element) {
        const textData = this.getTextDataByElement(element);
        if (!textData) return;
        
        // Unlink if linked
        if (textData.linkedBubbleId) {
            this.unlinkTextFromBubble(element);
        }
        
        // Clean up from SelectionManager
        if (window.selectionManager) {
            window.selectionManager.cleanup(element);
        }
        
        // Remove from DOM
        element.remove();
        
        // Remove from data
        this.textElements.delete(textData.id);
        
        // Update UI
        if (window.editor?.uiController) {
            window.editor.uiController.forceUpdateBubbleControls();
        }
    }
    
    copyTextElement(element) {
        const textData = this.getTextDataByElement(element);
        if (!textData) return null;
        
        // Create new element with offset position
        const newX = textData.x + 20;
        const newY = textData.y + 20;
        
        // Create the new text element manually (similar to createTextElement but for copying)
        const id = ++this.elementIdCounter;
        
        const newElement = document.createElement('div');
        newElement.className = 'text-element';
        newElement.id = `text-element-${id}`;
        newElement.textContent = textData.content;
        
        // Apply initial styles
        Object.assign(newElement.style, {
            position: 'absolute',
            left: newX + 'px',
            top: newY + 'px',
            fontSize: textData.fontSize + 'px',
            fontFamily: this.fontLoader.buildFontStack(textData.fontFamily),
            fontWeight: textData.fontWeight,
            color: textData.color,
            zIndex: 50,
            cursor: 'move',
            padding: '8px',
            whiteSpace: 'nowrap',
            transformOrigin: 'center center',
            userSelect: 'none',
            pointerEvents: 'all'
        });
        
        // Create new text data
        const newTextData = {
            id,
            element: newElement,
            content: textData.content,
            x: newX,
            y: newY,
            fontSize: textData.fontSize,
            fontFamily: textData.fontFamily,
            fontWeight: textData.fontWeight,
            color: textData.color,
            linkedBubbleId: null, // Don't copy links
            relativePosition: null,
            decorations: {...textData.decorations}
        };
        
        // Store data
        this.textElements.set(id, newTextData);
        
        // Add to DOM
        this.canvasContainer.appendChild(newElement);
        
        // Add interaction listeners (IMPORTANT: This was missing)
        this.addTextInteractionListeners(newElement);
        
        // Apply decorations to the new element
        Object.entries(newTextData.decorations).forEach(([decoration, value]) => {
            if (value) {
                this.applyTextDecoration(newElement, decoration, value);
            }
        });
        
        // Register with SelectionManager for UI updates
        if (window.selectionManager) {
            window.selectionManager.elementRegistry.set(newElement, { type: 'text', data: newTextData });
        }
        
        return newElement;
    }
    
    applyTextDecoration(element, decoration, value) {
        const textData = this.getTextDataByElement(element);
        if (!textData) return;
        
        textData.decorations[decoration] = value;
        
        // Apply CSS based on decoration
        switch(decoration) {
            case 'underline':
                if (value) {
                    element.style.textDecoration = (element.style.textDecoration || '') + ' underline';
                } else {
                    element.style.textDecoration = element.style.textDecoration.replace('underline', '').trim();
                }
                break;
            case 'strikethrough':
                if (value) {
                    element.style.textDecoration = (element.style.textDecoration || '') + ' line-through';
                } else {
                    element.style.textDecoration = element.style.textDecoration.replace('line-through', '').trim();
                }
                break;
            case 'italic':
                element.style.fontStyle = value ? 'italic' : 'normal';
                break;
            case 'uppercase':
                element.style.textTransform = value ? 'uppercase' : 'none';
                break;
            case 'shadow':
                element.style.textShadow = value ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none';
                break;
            case 'outline':
                element.style.webkitTextStroke = value ? '1px black' : '';
                element.style.textStroke = value ? '1px black' : '';
                break;
        }
    }
    
    updateTextStyle(element, styleData) {
        const textData = this.getTextDataByElement(element);
        if (!textData) return;
        
        // Update data
        Object.assign(textData, styleData);
        
        // Apply to element
        if (styleData.fontSize !== undefined) {
            element.style.fontSize = styleData.fontSize + 'px';
        }
        if (styleData.fontFamily !== undefined) {
            element.style.fontFamily = this.fontLoader.buildFontStack(styleData.fontFamily);
        }
        if (styleData.fontWeight !== undefined) {
            element.style.fontWeight = styleData.fontWeight;
        }
        if (styleData.color !== undefined) {
            element.style.color = styleData.color;
        }
        if (styleData.letterSpacing !== undefined) {
            element.style.letterSpacing = styleData.letterSpacing + 'px';
        }
        if (styleData.lineHeight !== undefined) {
            element.style.lineHeight = styleData.lineHeight;
        }
    }
    
    handleBubbleDelete(bubbleId) {
        const linkedTextIds = this.bubbleTextLinks.get(bubbleId);
        if (!linkedTextIds) return;
        
        // Unlink all associated text elements
        linkedTextIds.forEach(textId => {
            const textData = this.textElements.get(textId);
            if (textData) {
                this.unlinkTextFromBubble(textData.element);
            }
        });
        
        this.bubbleTextLinks.delete(bubbleId);
    }
    
    // Helper methods
    getTextDataByElement(element) {
        for (const [id, data] of this.textElements) {
            if (data.element === element) {
                return data;
            }
        }
        return null;
    }
    
    getBubbleData(bubbleElement) {
        if (window.editor?.appCoordinator) {
            const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
            return bubbleManager?.getBubbleData(bubbleElement);
        }
        return null;
    }
    
    getBubbleDataById(bubbleId) {
        if (window.editor?.appCoordinator) {
            const bubbleManager = window.editor.appCoordinator.getManager('bubbleManager');
            const bubbles = bubbleManager?.getAllBubbles();
            return bubbles?.find(b => b.id === bubbleId);
        }
        return null;
    }
    
    isTextLinked(element) {
        const textData = this.getTextDataByElement(element);
        return textData?.linkedBubbleId !== null && textData?.linkedBubbleId !== undefined;
    }

    handleTextSelection(textElement, event) {
        if (!window.selectionManager) return;
        
        const textData = this.getTextDataByElement(textElement);
        if (!textData) return;
        
        if (event.ctrlKey) {
            // Multi-selection with Ctrl
            window.selectionManager.toggleSelection(textElement, 'text', textData);
        } else {
            // Single selection - clear others first
            window.selectionManager.clearSelection();
            window.selectionManager.addToSelection(textElement, 'text', textData);
        }
    }

    performTextDrag(textElement, event, dragOffsetX, dragOffsetY) {
        const containerRect = this.canvasContainer.getBoundingClientRect();
        
        let newX = event.clientX - containerRect.left - dragOffsetX;
        let newY = event.clientY - containerRect.top - dragOffsetY;
        
        // Use the updateTextElementPosition method for consistency
        this.updateTextElementPosition(textElement, newX, newY);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextElementManager;
}