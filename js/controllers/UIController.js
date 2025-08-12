/**
 * UIController - Handles UI state management
 */
class UIController {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.bubbleManager = null;
        this.controlPointManager = null;
        this.backgroundImageElement = null;
        this.isExporting = false;
        this.domElements = {};
    }
    
    initialize() {
        this.cacheDOMElements();
    }
    
    setManagers(bubbleManager, controlPointManager, backgroundImageElement) {
        this.bubbleManager = bubbleManager;
        this.controlPointManager = controlPointManager;
        this.backgroundImageElement = backgroundImageElement;
    }
    
    cacheDOMElements() {
        this.domElements = {
            bubbleControls: document.getElementById('bubbleControls'),
            bubbleCount: document.getElementById('bubbleCount'),
            copyBtn: document.getElementById('copyBubbleBtn'),
            deleteBtn: document.getElementById('deleteBubbleBtn'),
            exportBtn: document.getElementById('exportImageBtn'),
            addBtn: document.getElementById('addBubbleBtn')
        };
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
        const { bubbleControls } = this.domElements;
        if (bubbleControls) {
            bubbleControls.style.display = 'none';
        }
    }
    
    setupControlEventListeners() {
        const { addBtn, copyBtn, deleteBtn, exportBtn } = this.domElements;
        
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
        
        if (exportBtn && !exportBtn.hasAttribute('data-listener-added')) {
            exportBtn.addEventListener('click', () => this.onExportClick());
            exportBtn.setAttribute('data-listener-added', 'true');
        }
    }
    
    updateBubbleControls() {
        if (!this.bubbleManager) return;

        const { bubbleCount, copyBtn, deleteBtn, exportBtn } = this.domElements;
        
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
        
        if (exportBtn) {
            const hasBackgroundImage = this.backgroundImageElement?.src;
            exportBtn.disabled = !hasBackgroundImage || this.isExporting;
            exportBtn.textContent = this.isExporting ? 'Exporting...' : 'Export Image';
        }
    }
    
    forceUpdateBubbleControls() {
        setTimeout(() => this.updateBubbleControls(), 10);
    }
    
    setExportState(isExporting) {
        this.isExporting = isExporting;
        this.updateBubbleControls();
    }
    
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
    
    onExportClick() {
        this.onExport?.();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}