/**
 * AdvancedColorPicker - Professional color picker with gradient selection
 */
class AdvancedColorPicker {
    constructor() {
        this.currentColor = {
            hex: '#000000',
            rgb: {r: 0, g: 0, b: 0},
            hsv: {h: 0, s: 0, v: 0}
        };
        
        this.themeColors = [
            // Row 1 - Grays
            '#FFFFFF', '#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575',
            '#616161', '#424242', '#212121', '#000000', '#263238', '#37474F',
            
            // Row 2 - Colors
            '#FF5252', '#FF4081', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
            '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A',
            '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548',
            
            // Row 3 - Pastels
            '#FCE4EC', '#F3E5F5', '#E8EAF6', '#E3F2FD', '#E1F5FE', '#E0F2F1',
            '#E8F5E9', '#F1F8E9', '#F9FBE7', '#FFFDE7', '#FFF8E1', '#FFF3E0'
        ];
        
        this.customColors = this.loadCustomColors();
        this.isGradientDragging = false;
        this.modal = null;
        this.canvas = null;
        this.ctx = null;
        
        this.initialize();
    }
    
    initialize() {
        this.createModal();
        this.createGradientCanvas();
        this.createBrightnessSlider();
        this.createColorSwatches();
        this.createInputFields();
        this.setupEventListeners();
        this.updateDisplay();
    }
    
    createModal() {
        // Create modal container
        this.modal = document.createElement('div');
        this.modal.className = 'advanced-color-picker-modal';
        this.modal.style.display = 'none';
        
        // Create modal content
        const content = document.createElement('div');
        content.className = 'color-picker-content';
        
        // Header
        const header = document.createElement('div');
        header.className = 'color-picker-header';
        header.innerHTML = `
            <h3>Color Picker</h3>
            <button class="close-btn">&times;</button>
        `;
        
        // Main container
        const main = document.createElement('div');
        main.className = 'color-picker-main';
        
        // Left panel - Gradient and brightness
        const leftPanel = document.createElement('div');
        leftPanel.className = 'color-picker-left';
        
        // Right panel - Swatches and inputs
        const rightPanel = document.createElement('div');
        rightPanel.className = 'color-picker-right';
        
        main.appendChild(leftPanel);
        main.appendChild(rightPanel);
        
        content.appendChild(header);
        content.appendChild(main);
        this.modal.appendChild(content);
        
        document.body.appendChild(this.modal);
        
        this.leftPanel = leftPanel;
        this.rightPanel = rightPanel;
        
        // Close button
        header.querySelector('.close-btn').addEventListener('click', () => this.close());
    }
    
    createGradientCanvas() {
        const container = document.createElement('div');
        container.className = 'gradient-container';
        
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 256;
        this.canvas.height = 256;
        this.canvas.className = 'color-gradient-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Create crosshair
        this.crosshair = document.createElement('div');
        this.crosshair.className = 'gradient-crosshair';
        
        container.appendChild(this.canvas);
        container.appendChild(this.crosshair);
        this.leftPanel.appendChild(container);
        
        this.drawGradient();
        
        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleGradientMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleGradientMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleGradientMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleGradientMouseUp());
    }
    
    createBrightnessSlider() {
        const container = document.createElement('div');
        container.className = 'brightness-container';
        
        this.brightnessSlider = document.createElement('input');
        this.brightnessSlider.type = 'range';
        this.brightnessSlider.min = '0';
        this.brightnessSlider.max = '100';
        this.brightnessSlider.value = '100';
        this.brightnessSlider.className = 'brightness-slider';
        
        const brightnessTrack = document.createElement('div');
        brightnessTrack.className = 'brightness-track';
        
        container.appendChild(brightnessTrack);
        container.appendChild(this.brightnessSlider);
        this.leftPanel.appendChild(container);
        
        this.brightnessSlider.addEventListener('input', () => {
            this.currentColor.hsv.v = parseInt(this.brightnessSlider.value);
            this.updateFromHSV();
        });
    }
    
    createColorSwatches() {
        const container = document.createElement('div');
        container.className = 'swatches-container';
        
        // Theme colors section
        const themeSection = document.createElement('div');
        themeSection.className = 'theme-colors-section';
        themeSection.innerHTML = '<label>Theme colors</label>';
        
        const themeGrid = document.createElement('div');
        themeGrid.className = 'color-swatches-grid';
        
        this.themeColors.forEach(color => {
            const swatch = this.createSwatch(color);
            themeGrid.appendChild(swatch);
        });
        
        themeSection.appendChild(themeGrid);
        
        // Custom colors section
        const customSection = document.createElement('div');
        customSection.className = 'custom-colors-section';
        customSection.innerHTML = '<label>My colors</label>';
        
        this.customGrid = document.createElement('div');
        this.customGrid.className = 'color-swatches-grid custom-grid';
        
        // Add button for custom colors
        const addButton = document.createElement('button');
        addButton.className = 'add-color-btn';
        addButton.textContent = '+ Add';
        addButton.addEventListener('click', () => this.addCustomColor());
        
        this.customColors.forEach(color => {
            const swatch = this.createSwatch(color, true);
            this.customGrid.appendChild(swatch);
        });
        
        this.customGrid.appendChild(addButton);
        customSection.appendChild(this.customGrid);
        
        container.appendChild(themeSection);
        container.appendChild(customSection);
        this.rightPanel.appendChild(container);
    }
    
    createSwatch(color, isCustom = false) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = color;
        swatch.title = color;
        
        swatch.addEventListener('click', () => {
            this.setColor(color);
            this.onColorSelect?.(color);
        });
        
        if (isCustom) {
            // Add remove button for custom colors
            const removeBtn = document.createElement('span');
            removeBtn.className = 'remove-swatch';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeCustomColor(color);
            });
            swatch.appendChild(removeBtn);
        }
        
        return swatch;
    }
    
    createInputFields() {
        const container = document.createElement('div');
        container.className = 'color-inputs-container';
        
        // Hex input
        const hexGroup = document.createElement('div');
        hexGroup.className = 'input-group';
        hexGroup.innerHTML = `
            <label>Hex</label>
            <input type="text" class="hex-input" maxlength="7" value="#000000">
        `;
        
        // RGB inputs
        const rgbGroup = document.createElement('div');
        rgbGroup.className = 'input-group rgb-group';
        rgbGroup.innerHTML = `
            <label>RGB</label>
            <div class="rgb-inputs">
                <input type="number" class="r-input" min="0" max="255" value="0">
                <input type="number" class="g-input" min="0" max="255" value="0">
                <input type="number" class="b-input" min="0" max="255" value="0">
            </div>
        `;
        
        // Action buttons
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.innerHTML = `
            <button class="edit-btn">Edit</button>
            <button class="ok-btn">OK</button>
        `;
        
        container.appendChild(hexGroup);
        container.appendChild(rgbGroup);
        container.appendChild(buttonGroup);
        this.rightPanel.appendChild(container);
        
        // Store input references
        this.hexInput = hexGroup.querySelector('.hex-input');
        this.rInput = rgbGroup.querySelector('.r-input');
        this.gInput = rgbGroup.querySelector('.g-input');
        this.bInput = rgbGroup.querySelector('.b-input');
        
        // Input events
        this.hexInput.addEventListener('input', () => this.handleHexInput());
        this.rInput.addEventListener('input', () => this.handleRGBInput());
        this.gInput.addEventListener('input', () => this.handleRGBInput());
        this.bInput.addEventListener('input', () => this.handleRGBInput());
        
        // Button events
        buttonGroup.querySelector('.edit-btn').addEventListener('click', () => this.editCurrentColor());
        buttonGroup.querySelector('.ok-btn').addEventListener('click', () => this.applyColor());
    }
    
    setupEventListeners() {
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display !== 'none') {
                this.close();
            }
        });
        
        // Close on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }
    
    drawGradient() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const imageData = this.ctx.createImageData(width, height);
        const data = imageData.data;
        
        const brightness = this.currentColor.hsv.v / 100;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const hue = (x / width) * 360;
                const saturation = 100 - (y / height) * 100;
                
                const rgb = this.hsvToRgb(hue, saturation, brightness * 100);
                const index = (y * width + x) * 4;
                
                data[index] = rgb.r;
                data[index + 1] = rgb.g;
                data[index + 2] = rgb.b;
                data[index + 3] = 255;
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    handleGradientMouseDown(e) {
        this.isGradientDragging = true;
        this.updateColorFromGradient(e);
    }
    
    handleGradientMouseMove(e) {
        if (this.isGradientDragging) {
            this.updateColorFromGradient(e);
        }
    }
    
    handleGradientMouseUp() {
        this.isGradientDragging = false;
    }
    
    updateColorFromGradient(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(this.canvas.width - 1, e.clientX - rect.left));
        const y = Math.max(0, Math.min(this.canvas.height - 1, e.clientY - rect.top));
        
        const hue = (x / this.canvas.width) * 360;
        const saturation = 100 - (y / this.canvas.height) * 100;
        
        this.currentColor.hsv.h = hue;
        this.currentColor.hsv.s = saturation;
        
        this.updateFromHSV();
        this.updateCrosshair(x, y);
    }
    
    updateCrosshair(x, y) {
        this.crosshair.style.left = x + 'px';
        this.crosshair.style.top = y + 'px';
    }
    
    updateFromHSV() {
        const rgb = this.hsvToRgb(
            this.currentColor.hsv.h,
            this.currentColor.hsv.s,
            this.currentColor.hsv.v
        );
        
        this.currentColor.rgb = rgb;
        this.currentColor.hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
        
        this.updateDisplay();
        this.drawGradient();
    }
    
    updateFromRGB() {
        const hsv = this.rgbToHsv(
            this.currentColor.rgb.r,
            this.currentColor.rgb.g,
            this.currentColor.rgb.b
        );
        
        this.currentColor.hsv = hsv;
        this.currentColor.hex = this.rgbToHex(
            this.currentColor.rgb.r,
            this.currentColor.rgb.g,
            this.currentColor.rgb.b
        );
        
        this.updateDisplay();
        this.drawGradient();
        this.updateCrosshairFromHSV();
    }
    
    updateFromHex() {
        const rgb = this.hexToRgb(this.currentColor.hex);
        if (rgb) {
            this.currentColor.rgb = rgb;
            this.currentColor.hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b);
            
            this.updateDisplay();
            this.drawGradient();
            this.updateCrosshairFromHSV();
        }
    }
    
    updateCrosshairFromHSV() {
        const x = (this.currentColor.hsv.h / 360) * this.canvas.width;
        const y = ((100 - this.currentColor.hsv.s) / 100) * this.canvas.height;
        this.updateCrosshair(x, y);
    }
    
    updateDisplay() {
        // Update input fields
        this.hexInput.value = this.currentColor.hex;
        this.rInput.value = this.currentColor.rgb.r;
        this.gInput.value = this.currentColor.rgb.g;
        this.bInput.value = this.currentColor.rgb.b;
        
        // Update brightness slider
        this.brightnessSlider.value = this.currentColor.hsv.v;
        
        // Update brightness track gradient
        const track = this.leftPanel.querySelector('.brightness-track');
        if (track) {
            const hue = this.currentColor.hsv.h;
            const sat = this.currentColor.hsv.s;
            const dark = this.hsvToRgb(hue, sat, 0);
            const bright = this.hsvToRgb(hue, sat, 100);
            track.style.background = `linear-gradient(to right, 
                rgb(${dark.r}, ${dark.g}, ${dark.b}), 
                rgb(${bright.r}, ${bright.g}, ${bright.b}))`;
        }
    }
    
    handleHexInput() {
        const hex = this.hexInput.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            this.currentColor.hex = hex;
            this.updateFromHex();
        }
    }
    
    handleRGBInput() {
        const r = parseInt(this.rInput.value) || 0;
        const g = parseInt(this.gInput.value) || 0;
        const b = parseInt(this.bInput.value) || 0;
        
        this.currentColor.rgb = {
            r: Math.min(255, Math.max(0, r)),
            g: Math.min(255, Math.max(0, g)),
            b: Math.min(255, Math.max(0, b))
        };
        
        this.updateFromRGB();
    }
    
    setColor(color) {
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            this.currentColor.hex = color;
            this.updateFromHex();
        }
    }
    
    addCustomColor() {
        if (this.customColors.length >= 20) {
            this.customColors.shift(); // Remove oldest
        }
        
        this.customColors.push(this.currentColor.hex);
        this.saveCustomColors();
        this.refreshCustomSwatches();
    }
    
    removeCustomColor(color) {
        const index = this.customColors.indexOf(color);
        if (index > -1) {
            this.customColors.splice(index, 1);
            this.saveCustomColors();
            this.refreshCustomSwatches();
        }
    }
    
    refreshCustomSwatches() {
        // Clear existing custom swatches
        const swatches = this.customGrid.querySelectorAll('.color-swatch');
        swatches.forEach(s => s.remove());
        
        // Add updated swatches
        this.customColors.forEach(color => {
            const swatch = this.createSwatch(color, true);
            this.customGrid.insertBefore(swatch, this.customGrid.lastElementChild);
        });
    }
    
    editCurrentColor() {
        // Find and highlight current color in swatches
        const allSwatches = this.modal.querySelectorAll('.color-swatch');
        allSwatches.forEach(swatch => {
            if (swatch.style.backgroundColor === this.currentColor.hex ||
                this.rgbToHex(...this.parseRgbString(swatch.style.backgroundColor)) === this.currentColor.hex) {
                swatch.classList.add('selected');
            } else {
                swatch.classList.remove('selected');
            }
        });
    }
    
    applyColor() {
        this.onColorSelect?.(this.currentColor.hex);
        this.close();
    }
    
    open() {
        this.modal.style.display = 'flex';
        this.drawGradient();
        this.updateCrosshairFromHSV();
    }
    
    close() {
        this.modal.style.display = 'none';
    }
    
    // Color conversion utilities
    hsvToRgb(h, s, v) {
        h = h / 360;
        s = s / 100;
        v = v / 100;
        
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }
    
    rgbToHsv(r, g, b) {
        r = r / 255;
        g = g / 255;
        b = b / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        let h = 0;
        let s = max === 0 ? 0 : diff / max;
        let v = max;
        
        if (diff !== 0) {
            switch (max) {
                case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / diff + 2) / 6; break;
                case b: h = ((r - g) / diff + 4) / 6; break;
            }
        }
        
        return {
            h: h * 360,
            s: s * 100,
            v: v * 100
        };
    }
    
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    parseRgbString(rgb) {
        const match = rgb.match(/\d+/g);
        return match ? match.map(Number) : [0, 0, 0];
    }
    
    saveCustomColors() {
        localStorage.setItem('customColors', JSON.stringify(this.customColors));
    }
    
    loadCustomColors() {
        try {
            const saved = localStorage.getItem('customColors');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }
}

// Initialize when ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.advancedColorPicker = new AdvancedColorPicker();
    });
} else {
    window.advancedColorPicker = new AdvancedColorPicker();
}