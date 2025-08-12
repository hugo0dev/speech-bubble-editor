/**
 * Constants for Speech Bubble Editor
 */
class Constants {
    // Bubble dimensions
    static DEFAULT_BUBBLE_WIDTH = 150;
    static DEFAULT_BUBBLE_HEIGHT = 112;
    static DEFAULT_BUBBLE_ROTATION = 0;
    static MIN_BUBBLE_WIDTH = 50;
    static MIN_BUBBLE_HEIGHT = 38;
    
    // Handle sizes
    static RESIZE_HANDLE_SIZE = 8;
    static ROTATION_HANDLE_SIZE = 12;
    static CONTROL_POINT_HANDLE_SIZE = 10;
    
    // Colors
    static RESIZE_HANDLE_COLOR = '#4CAF50';
    static ROTATION_HANDLE_COLOR = '#FF6B6B';
    static CONTROL_POINT_COLOR = '#2196F3';
    static CONTROL_POINT_DRAG_COLOR = '#1565C0';
    
    // Z-index layers
    static BUBBLE_Z_INDEX = 10;
    static RESIZE_HANDLES_Z_INDEX = 200;
    static ROTATION_HANDLE_Z_INDEX = 201;
    static CONTROL_POINT_HANDLES_Z_INDEX = 202;
    
    // Control point bounds
    static CONTROL_POINT_BOUNDS = {
        top: { minX: -0.3, maxX: 0.3, minY: -1.5, maxY: 0.3 },
        right: { minX: -0.3, maxX: 1.5, minY: -0.3, maxY: 0.3 },
        bottom: { minX: -0.3, maxX: 0.3, minY: -0.3, maxY: 1.5 },
        left: { minX: -1.5, maxX: 0.3, minY: -0.3, maxY: 0.3 }
    };
    
    // Default control point positions
    static DEFAULT_CONTROL_POINTS = {
        top: { x: 0, y: -0.5 },
        right: { x: 0.5, y: 0 },
        bottom: { x: 0, y: 0.5 },
        left: { x: -0.5, y: 0 }
    };
    
    // Arrays
    static CONTROL_POINT_DIRECTIONS = ['top', 'right', 'bottom', 'left'];
    static RESIZE_HANDLE_POSITIONS = ['nw', 'ne', 'sw', 'se'];
    
    // Export formats
    static EXPORT_FORMATS = {
        'avif': { mimeType: 'image/avif', quality: 0.8, extension: 'avif' },
        'webp': { mimeType: 'image/webp', quality: 0.9, extension: 'webp' },
        'jpeg-high': { mimeType: 'image/jpeg', quality: 0.9, extension: 'jpg' },
        'jpeg-medium': { mimeType: 'image/jpeg', quality: 0.75, extension: 'jpg' },
        'png': { mimeType: 'image/png', quality: undefined, extension: 'png' }
    };
    
    // SVG bubble template
    static BUBBLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="112.09505" viewBox="0 0 150 112.09505">
        <defs>
            <filter color-interpolation-filters="sRGB" id="filter3721" x="-0.10992933" width="1.2198586" y="-0.13210191" height="1.2642038">
                <feGaussianBlur stdDeviation="1.5830058" id="feGaussianBlur3723" />
            </filter>
        </defs>
        <g transform="translate(-243.57147,-426.69225)">
            <g transform="matrix(3.5579653,0,0,3.0830792,-1005.1597,-1139.5182)">
                <path d="m 360.87694,531.87833 c -1.4496,3.55536 -4.0544,5.87349 -6.10995,8.68262 2.90852,-2.07384 6.20927,-4.08576 9.04885,-7.30233 m -2.94591,-1.37985 c -3.41784,-2.0992 -5.6521,-5.23895 -5.6521,-8.5986 0,-6.33965 7.63571,-11.47894 17.05483,-11.47894 9.41912,0 17.05483,5.13929 17.05483,11.47894 l 0,0 c 0,6.33965 -7.63571,11.47894 -17.05483,11.47894 -3.07787,0 -5.96532,-0.54876 -8.45814,-1.50885" style="fill:#7a7a7a;fill-opacity:1;stroke:none;filter:url(#filter3721)" />
                <path d="m 360.87694,529.87833 c -1.4496,3.55536 -4.0544,5.87349 -6.10995,8.68262 2.90852,-2.07384 6.20927,-4.08576 9.04885,-7.30233 m -2.94591,-1.37985 c -3.41784,-2.0992 -5.6521,-5.23895 -5.6521,-8.5986 0,-6.33965 7.63571,-11.47894 17.05483,-11.47894 9.41913,0 17.05484,5.13929 17.05484,11.47894 l 0,0 c 0,6.33965 -7.63571,11.47894 -17.05484,11.47894 -3.07787,0 -5.96532,-0.54876 -8.45814,-1.50885" style="fill:#ffffff;fill-opacity:1;stroke:#000000;stroke-width:0.30193037;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1;stroke-dasharray:none" />
            </g>
        </g>
    </svg>`;
    
    // Other constants
    static FLOAT_TOLERANCE = 0.01;
    static HANDLE_TRANSITION_DURATION = '0.2s';
    static BUBBLE_TRANSITION_DURATION = '0.1s';
    static COPY_OFFSET = 20;
    static BUBBLE_START_OFFSET = 50;
    static BUBBLE_STACK_OFFSET = 30;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Constants;
}