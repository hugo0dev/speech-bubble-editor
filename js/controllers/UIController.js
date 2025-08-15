/**
 * UIController - Handles UI state management (Phase 3: Text Styling Controls)
 */
class UIController {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        
        // Existing managers
        this.bubbleManager = null;
        this.controlPointManager = null;
        this.backgroundImageElement = null;
        
        // Text system managers
        this.textElementManager = null;
        this.selectionManager = null;
        
        this.isExporting = false;
        this.domElements = {};
        
        // Text operation callbacks
        this.onAddText = null;
        this.onDeleteText = null;
        this.onLinkText = null;
        this.onUnlinkText = null;
        
        // Text styling callbacks (new)
        this.onTextStyleChange = null;
        this.onTextDecorationToggle = null;
        
        this.currentSelectedText = null;
    }
    
    initialize() {
        this.cacheDOMElements();
        this.initializeColorPicker();
    }
    
    setManagers(bubbleManager, controlPointManager, backgroundImageElement, textElementManager = null, selectionManager = null) {
        // Existing managers
        this.bubbleManager = bubbleManager;
        this.controlPointManager = controlPointManager;
        this.backgroundImageElement = backgroundImageElement;
        
        // Text system managers
        this.textElementManager = textElementManager;
        this.selectionManager = selectionManager;
    }
    
    cacheDOMElements() {
        this.domElements = {
            // Existing bubble controls
            bubbleControls: document.getElementById('bubbleControls'),
            bubbleCount: document.getElementById('bubbleCount'),
            copyBtn: document.getElementById('copyBubbleBtn'),
            deleteBtn: document.getElementById('deleteBubbleBtn'),
            resetBtn: document.getElementById('resetBubbleBtn'),
            flipHorizontalBtn: document.getElementById('flipHorizontalBtn'),
            flipVerticalBtn: document.getElementById('flipVerticalBtn'),
            exportBtn: document.getElementById('exportImageBtn'),
            addBtn: document.getElementById('addBubbleBtn'),
            
            // Text controls
            addTextBtn: document.getElementById('addTextBtn'),
            deleteTextBtn: document.getElementById('deleteTextBtn'),
            linkTextBtn: document.getElementById('linkTextBtn'),
            unlinkTextBtn: document.getElementById('unlinkTextBtn'),
            textCount: document.getElementById('textCount'),
            
            // Text styling controls (new)
            textStylingPanel: document.getElementById('textStylingPanel'),
            fontFamilySelect: document.getElementById('fontFamilySelect'),
            fontSizeInput: document.getElementById('fontSizeInput'),
            fontSizeUp: document.getElementById('fontSizeUp'),
            fontSizeDown: document.getElementById('fontSizeDown'),
            textColorBtn: document.getElementById('textColorBtn'),
            
            // Decoration buttons
            boldBtn: document.getElementById('boldBtn'),
            italicBtn: document.getElementById('italicBtn'),
            underlineBtn: document.getElementById('underlineBtn'),
            strikethroughBtn: document.getElementById('strikethroughBtn'),
            uppercaseBtn: document.getElementById('uppercaseBtn'),
            shadowBtn: document.getElementById('shadowBtn'),
            outlineBtn: document.getElementById('outlineBtn')
        };
    }
    
    initializeColorPicker() {
        // Initialize the advanced color picker for text color
        if (window.advancedColorPicker && this.domElements.textColorBtn) {
            this.domElements.textColorBtn.addEventListener('click', () => {
                window.advancedColorPicker.onColorSelect = (color) => {
                    this.handleTextColorChange(color);
                };
                window.advancedColorPicker.open();
            });
        }
    }
    
    showBubbleControls() {
        const { bubbleControls } = this.domElements;
        if (bubbleControls) {
            bubbleControls.style.display = 'flex';
            this.setupControlEventListeners();
            this.updateBubbleControls();
        }
    }
    
    hideBubbleControls() {
        const { bubbleControls, textStylingPanel } = this.domElements;
        if (bubbleControls) {
            bubbleControls.style.display = 'none';
        }
        if (textStylingPanel) {
            textStylingPanel.style.display = 'none';
        }
    }
    
    setupControlEventListeners() {
        const { 
            addBtn, copyBtn, deleteBtn, resetBtn, flipHorizontalBtn, flipVerticalBtn, exportBtn,
            addTextBtn, deleteTextBtn, linkTextBtn, unlinkTextBtn,
            fontFamilySelect, fontSizeInput, fontSizeUp, fontSizeDown,
            boldBtn, italicBtn, underlineBtn, strikethroughBtn, uppercaseBtn, shadowBtn, outlineBtn
        } = this.domElements;
        
        // Existing bubble button listeners (unchanged)
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
        
        if (resetBtn && !resetBtn.hasAttribute('data-listener-added')) {
            resetBtn.addEventListener('click', () => this.onResetBubbleClick());
            resetBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (flipHorizontalBtn && !flipHorizontalBtn.hasAttribute('data-listener-added')) {
            flipHorizontalBtn.addEventListener('click', () => this.onFlipHorizontalClick());
            flipHorizontalBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (flipVerticalBtn && !flipVerticalBtn.hasAttribute('data-listener-added')) {
            flipVerticalBtn.addEventListener('click', () => this.onFlipVerticalClick());
            flipVerticalBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (exportBtn && !exportBtn.hasAttribute('data-listener-added')) {
            exportBtn.addEventListener('click', () => this.onExportClick());
            exportBtn.setAttribute('data-listener-added', 'true');
        }
        
        // Text button listeners (unchanged)
        if (addTextBtn && !addTextBtn.hasAttribute('data-listener-added')) {
            addTextBtn.addEventListener('click', () => this.onAddTextClick());
            addTextBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (deleteTextBtn && !deleteTextBtn.hasAttribute('data-listener-added')) {
            deleteTextBtn.addEventListener('click', () => this.onDeleteTextClick());
            deleteTextBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (linkTextBtn && !linkTextBtn.hasAttribute('data-listener-added')) {
            linkTextBtn.addEventListener('click', () => this.onLinkTextClick());
            linkTextBtn.setAttribute('data-listener-added', 'true');
        }
        
        if (unlinkTextBtn && !unlinkTextBtn.hasAttribute('data-listener-added')) {
            unlinkTextBtn.addEventListener('click', () => this.onUnlinkTextClick());
            unlinkTextBtn.setAttribute('data-listener-added', 'true');
        }
        
        // Text styling listeners (new)
        if (fontFamilySelect && !fontFamilySelect.hasAttribute('data-listener-added')) {
            fontFamilySelect.addEventListener('change', () => this.handleFontFamilyChange());
            fontFamilySelect.setAttribute('data-listener-added', 'true');
        }
        
        if (fontSizeInput && !fontSizeInput.hasAttribute('data-listener-added')) {
            fontSizeInput.addEventListener('change', () => this.handleFontSizeChange());
            fontSizeInput.addEventListener('input', () => this.handleFontSizeChange());
            fontSizeInput.setAttribute('data-listener-added', 'true');
        }
        
        if (fontSizeUp && !fontSizeUp.hasAttribute('data-listener-added')) {
            fontSizeUp.addEventListener('click', () => this.handleFontSizeAdjust(2));
            fontSizeUp.setAttribute('data-listener-added', 'true');
        }
        
        if (fontSizeDown && !fontSizeDown.hasAttribute('data-listener-added')) {
            fontSizeDown.addEventListener('click', () => this.handleFontSizeAdjust(-2));
            fontSizeDown.setAttribute('data-listener-added', 'true');
        }
        
        // Decoration button listeners (new)
        const decorationButtons = [boldBtn, italicBtn, underlineBtn, strikethroughBtn, uppercaseBtn, shadowBtn, outlineBtn];
        decorationButtons.forEach(btn => {
            if (btn && !btn.hasAttribute('data-listener-added')) {
                btn.addEventListener('click', () => this.handleDecorationToggle(btn));
                btn.setAttribute('data-listener-added', 'true');
            }
        });
    }
    
    updateBubbleControls() {
        if (!this.bubbleManager) return;

        const { 
            bubbleCount, copyBtn, deleteBtn, resetBtn, flipHorizontalBtn, flipVerticalBtn, exportBtn,
            textCount, deleteTextBtn, linkTextBtn, unlinkTextBtn, textStylingPanel
        } = this.domElements;
        
        // Existing bubble control logic (unchanged)
        const selectedBubble = this.bubbleManager.getSelectedBubble();
        const totalBubbles = this.bubbleManager.getBubbleCount();
        
        if (bubbleCount) {
            let countText = `Bubbles: ${totalBubbles}`;
            const deformationSummary = this.bubbleManager.getDeformationSummary?.();
            if (deformationSummary?.deformedBubbles > 0) {
                countText += ` (${deformationSummary.deformedBubbles} deformed)`;
            }
            bubbleCount.textContent = countText;
        }
        
        if (copyBtn) copyBtn.disabled = !selectedBubble;
        if (deleteBtn) deleteBtn.disabled = !selectedBubble;
        if (flipHorizontalBtn) flipHorizontalBtn.disabled = !selectedBubble;
        if (flipVerticalBtn) flipVerticalBtn.disabled = !selectedBubble;
        
        if (resetBtn) {
            const selectedBubbleData = this.bubbleManager.getSelectedBubbleData?.();
            resetBtn.disabled = !selectedBubble || !selectedBubbleData?.isDeformed;
        }
        
        if (exportBtn) {
            const hasBackgroundImage = this.backgroundImageElement?.src;
            exportBtn.disabled = !hasBackgroundImage || this.isExporting;
            exportBtn.textContent = this.isExporting ? 'Exporting...' : 'Export Image';
        }
        
        // Text control logic
        this.updateTextControls();
        
        // Text styling panel logic (new)
        this.updateTextStylingPanel();
    }
    
    updateTextControls() {
        const { textCount, deleteTextBtn, linkTextBtn, unlinkTextBtn } = this.domElements;
        
        // Default values if no selection manager
        let selectedTexts = [];
        let selectedBubbles = [];
        let totalTextElements = 0;
        
        if (this.selectionManager) {
            selectedTexts = this.selectionManager.getSelectedByType('text');
            selectedBubbles = this.selectionManager.getSelectedByType('bubble');
        }
        
        // Count total text elements
        const textElements = document.querySelectorAll('.text-element');
        totalTextElements = textElements.length;
        
        // Update text count display
        if (textCount) {
            textCount.textContent = `Text: ${totalTextElements}`;
        }
        
        // Update text button states
        if (deleteTextBtn) {
            deleteTextBtn.disabled = selectedTexts.length === 0;
        }
        
        if (linkTextBtn) {
            // Enable link button only when both text and bubble are selected
            linkTextBtn.disabled = selectedTexts.length === 0 || selectedBubbles.length === 0;
        }
        
        if (unlinkTextBtn) {
            // Enable unlink button only when linked text is selected
            let hasLinkedText = false;
            if (this.textElementManager) {
                hasLinkedText = selectedTexts.some(textItem => 
                    this.textElementManager.isTextLinked?.(textItem.element)
                );
            }
            unlinkTextBtn.disabled = !hasLinkedText;
        }
    }
    
    updateTextStylingPanel() {
        const { textStylingPanel } = this.domElements;
        if (!textStylingPanel || !this.selectionManager) return;
        
        const selectedTexts = this.selectionManager.getSelectedByType('text');
        
        if (selectedTexts.length > 0) {
            // Show styling panel when text is selected
            textStylingPanel.style.display = 'block';
            textStylingPanel.classList.add('active');
            
            // Update styling controls based on selected text
            this.updateStylingControlsFromSelection(selectedTexts);
            
            // Store current selected text for style operations
            this.currentSelectedText = selectedTexts;
        } else {
            // Hide styling panel when no text selected
            textStylingPanel.style.display = 'none';
            textStylingPanel.classList.remove('active');
            this.currentSelectedText = null;
        }
    }
    
    updateStylingControlsFromSelection(selectedTexts) {
        if (!this.textElementManager || selectedTexts.length === 0) return;
        
        // Get style data from first selected text element
        const firstTextData = this.textElementManager.getTextDataByElement(selectedTexts[0].element);
        if (!firstTextData) return;
        
        const { 
            fontFamilySelect, fontSizeInput, textColorBtn,
            boldBtn, italicBtn, underlineBtn, strikethroughBtn, uppercaseBtn, shadowBtn, outlineBtn 
        } = this.domElements;
        
        // Update font family
        if (fontFamilySelect) {
            fontFamilySelect.value = firstTextData.fontFamily || 'Arial';
        }
        
        // Update font size
        if (fontSizeInput) {
            fontSizeInput.value = firstTextData.fontSize || 18;
        }
        
        // Update text color button
        if (textColorBtn) {
            textColorBtn.style.backgroundColor = firstTextData.color || '#000000';
        }
        
        // Update decoration button states using actual applied styles
        const decorations = firstTextData.decorations || {};
        const element = selectedTexts[0].element;
        const computedStyle = window.getComputedStyle(element);

        // Check actual applied styles for more accurate state
        const isBold = decorations.bold || firstTextData.fontWeight > 400 || computedStyle.fontWeight > 400 || computedStyle.fontWeight === 'bold';
        const isItalic = decorations.italic || computedStyle.fontStyle === 'italic';
        const hasUnderline = decorations.underline || computedStyle.textDecoration.includes('underline');
        const hasStrikethrough = decorations.strikethrough || computedStyle.textDecoration.includes('line-through');
        const isUppercase = decorations.uppercase || computedStyle.textTransform === 'uppercase';
        const hasShadow = decorations.shadow || computedStyle.textShadow !== 'none';
        const hasOutline = decorations.outline || computedStyle.webkitTextStroke !== '' || computedStyle.textStroke !== '';

        this.updateDecorationButtonState(boldBtn, isBold);
        this.updateDecorationButtonState(italicBtn, isItalic);
        this.updateDecorationButtonState(underlineBtn, hasUnderline);
        this.updateDecorationButtonState(strikethroughBtn, hasStrikethrough);
        this.updateDecorationButtonState(uppercaseBtn, isUppercase);
        this.updateDecorationButtonState(shadowBtn, hasShadow);
        this.updateDecorationButtonState(outlineBtn, hasOutline);
    }
    
    updateDecorationButtonState(button, isActive) {
        if (!button) return;
        
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
    
    // ===== TEXT STYLING HANDLERS (new) =====
    
    handleFontFamilyChange() {
        const { fontFamilySelect } = this.domElements;
        if (!fontFamilySelect || !this.currentSelectedText) return;
        
        const fontFamily = fontFamilySelect.value;
        this.applyStyleToSelectedText({ fontFamily });
    }
    
    handleFontSizeChange() {
        const { fontSizeInput } = this.domElements;
        if (!fontSizeInput || !this.currentSelectedText) return;
        
        const fontSize = parseInt(fontSizeInput.value);
        if (fontSize >= 8 && fontSize <= 72) {
            this.applyStyleToSelectedText({ fontSize });
        }
    }
    
    handleFontSizeAdjust(delta) {
        const { fontSizeInput } = this.domElements;
        if (!fontSizeInput || !this.currentSelectedText) return;
        
        const currentSize = parseInt(fontSizeInput.value) || 18;
        const newSize = Math.max(8, Math.min(72, currentSize + delta));
        
        fontSizeInput.value = newSize;
        this.applyStyleToSelectedText({ fontSize: newSize });
    }
    
    handleTextColorChange(color) {
        const { textColorBtn } = this.domElements;
        if (!this.currentSelectedText) return;
        
        // Update color button appearance
        if (textColorBtn) {
            textColorBtn.style.backgroundColor = color;
        }
        
        this.applyStyleToSelectedText({ color });
    }
    
    handleDecorationToggle(button) {
        if (!button || !this.currentSelectedText) return;
        
        const decoration = button.getAttribute('data-decoration');
        if (!decoration) return;
        
        const isCurrentlyActive = button.classList.contains('active');
        const newValue = !isCurrentlyActive;
        
        // Update button state
        this.updateDecorationButtonState(button, newValue);
        
        // Apply decoration to text
        this.applyDecorationToSelectedText(decoration, newValue);
    }
    
    applyStyleToSelectedText(styleData) {
        if (!this.textElementManager || !this.currentSelectedText) return;
        
        this.currentSelectedText.forEach(textItem => {
            this.textElementManager.updateTextStyle(textItem.element, styleData);
        });
    }
    
    applyDecorationToSelectedText(decoration, value) {
        if (!this.textElementManager || !this.currentSelectedText) return;
        
        this.currentSelectedText.forEach(textItem => {
            if (decoration === 'bold') {
                // Handle bold as font weight change
                const fontWeight = value ? 700 : 400;
                this.textElementManager.updateTextStyle(textItem.element, { fontWeight });
                this.textElementManager.applyTextDecoration(textItem.element, decoration, value);
            } else if (decoration === 'italic') {
                // Handle italic directly through text decoration system
                this.textElementManager.applyTextDecoration(textItem.element, decoration, value);
            } else {
                // Handle other decorations normally
                this.textElementManager.applyTextDecoration(textItem.element, decoration, value);
            }
        });
    }
    
    forceUpdateBubbleControls() {
        setTimeout(() => this.updateBubbleControls(), 10);
    }
    
    setExportState(isExporting) {
        this.isExporting = isExporting;
        this.updateBubbleControls();
    }
    
    // ===== EXISTING BUTTON HANDLERS (unchanged) =====
    onAddBubbleClick() {
        this.onAddBubble?.();
        this.forceUpdateBubbleControls();
    }
    
    onCopyBubbleClick() {
        this.onCopyBubble?.();
        this.forceUpdateBubbleControls();
    }
    
    onDeleteBubbleClick() {
        this.onDeleteBubble?.();
        this.forceUpdateBubbleControls();
    }

    onResetBubbleClick() {
        this.onResetBubble?.();
        this.forceUpdateBubbleControls();
    }
    
    onFlipHorizontalClick() {
        this.onFlipHorizontal?.();
        this.forceUpdateBubbleControls();
    }
    
    onFlipVerticalClick() {
        this.onFlipVertical?.();
        this.forceUpdateBubbleControls();
    }
    
    onExportClick() {
        this.onExport?.();
    }
    
    onAddTextClick() {
        this.onAddText?.();
        this.forceUpdateBubbleControls();
    }
    
    onDeleteTextClick() {
        this.onDeleteText?.();
        this.forceUpdateBubbleControls();
    }
    
    onLinkTextClick() {
        this.onLinkText?.();
        this.forceUpdateBubbleControls();
    }
    
    onUnlinkTextClick() {
        this.onUnlinkText?.();
        this.forceUpdateBubbleControls();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}