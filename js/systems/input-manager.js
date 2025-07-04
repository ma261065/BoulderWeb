/**
 * Simplified HybridInputManager with Input Queuing
 * Captures all key taps in a queue + handles continuous held keys
 */
class HybridInputManager {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.gameElement = document.getElementById('gameCanvas') || document.body;
        this.isActive = true;
        
        // Input queuing system for discrete taps
        this.inputQueue = [];
        
        // Current input state for continuous movement (checked by game loop)
        this.currentKey = null;
        this.currentMouseDirection = null;
        this.isMouseDown = false;
        
        // Device detection
        this.isTouchDevice = this.detectTouchDevice();
        
        // Touch tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 30;
        
        // Direction constants
        this.DIRECTIONS = {
            UP: { x: 0, y: -1, name: 'up' },
            DOWN: { x: 0, y: 1, name: 'down' },
            LEFT: { x: -1, y: 0, name: 'left' },
            RIGHT: { x: 1, y: 0, name: 'right' }
        };
        
        // Key mappings
        this.KEY_CODES = {
            37: this.DIRECTIONS.LEFT,   // Left arrow
            38: this.DIRECTIONS.UP,     // Up arrow
            39: this.DIRECTIONS.RIGHT,  // Right arrow
            40: this.DIRECTIONS.DOWN,   // Down arrow
            65: this.DIRECTIONS.LEFT,   // A key
            87: this.DIRECTIONS.UP,     // W key
            68: this.DIRECTIONS.RIGHT,  // D key
            83: this.DIRECTIONS.DOWN    // S key
        };
        
        this.setupStyles();
        this.setupEventListeners();
        this.showControls();
        
        console.log(`Queued Input Manager initialized for ${this.isTouchDevice ? 'touch' : 'desktop'} device`);
    }

    detectTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }

    setupStyles() {
        if (this.isTouchDevice) {
            this.gameElement.style.touchAction = 'none';
        }
        this.gameElement.style.userSelect = 'none';
        this.gameElement.style.outline = 'none';
        
        if (!this.gameElement.hasAttribute('tabindex')) {
            this.gameElement.setAttribute('tabindex', '0');
        }
    }

    setupEventListeners() {
        // Keyboard - queue discrete presses AND track held keys
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Touch - simple swipe detection
        this.gameElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.gameElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        
        // Mouse - simple drag detection
        this.gameElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.gameElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.gameElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
        
        // Prevent context menu
        this.gameElement.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Clear state on focus loss
        window.addEventListener('blur', () => {
            this.currentKey = null;
            this.currentMouseDirection = null;
            this.isMouseDown = false;
            this.inputQueue = []; // Clear queue on focus loss
        });
        
        this.gameElement.focus();
    }

    // ENHANCED: Queue discrete key presses AND set for continuous movement
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        const direction = this.KEY_CODES[event.keyCode];
        if (direction) {
            event.preventDefault();
            
            // Only queue if this is a NEW key press (not a repeat)
            if (this.currentKey !== direction) {
                // For responsive game controls, only keep the most recent input
                // Clear any existing queue and add the new input
                this.inputQueue = [direction];
                console.log(`Key queued: ${direction.name}, queue length: ${this.inputQueue.length}`);
            }
            
            // Always set current key for continuous movement (handles held keys)
            this.currentKey = direction;
        }
    }

    handleKeyUp(event) {
        if (!this.isActive) return;
        
        const direction = this.KEY_CODES[event.keyCode];
        if (direction && this.currentKey === direction) {
            this.currentKey = null;
            event.preventDefault();
        }
    }

    // SIMPLIFIED: Basic touch swipe
    handleTouchStart(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    handleTouchEnd(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance >= this.minSwipeDistance) {
                const direction = this.getSwipeDirection(deltaX, deltaY);
                // Replace queue with most recent swipe (same as keyboard)
                this.inputQueue = [direction];
            }
        }
    }

    // SIMPLIFIED: Basic mouse drag
    handleMouseDown(event) {
        if (!this.isActive) return;
        
        this.isMouseDown = true;
        this.mouseStartX = event.clientX;
        this.mouseStartY = event.clientY;
        this.currentMouseDirection = null;
        
        event.preventDefault();
        this.gameElement.style.cursor = 'none';
    }

    handleMouseMove(event) {
        if (!this.isActive || !this.isMouseDown) return;
        
        const deltaX = event.clientX - this.mouseStartX;
        const deltaY = event.clientY - this.mouseStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance >= 20) {
            this.currentMouseDirection = this.getSwipeDirection(deltaX, deltaY);
            
            // Reset reference point
            this.mouseStartX = event.clientX;
            this.mouseStartY = event.clientY;
        }
    }

    handleMouseUp(event) {
        if (!this.isActive) return;
        
        this.isMouseDown = false;
        this.currentMouseDirection = null;
        this.gameElement.style.cursor = 'default';
    }

    getSwipeDirection(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        if (absDeltaX > absDeltaY) {
            return deltaX > 0 ? this.DIRECTIONS.RIGHT : this.DIRECTIONS.LEFT;
        } else {
            return deltaY > 0 ? this.DIRECTIONS.DOWN : this.DIRECTIONS.UP;
        }
    }

    // NEW: Get next queued input (called by game loop)
    getNextQueuedInput() {
        return this.inputQueue.shift(); // Returns undefined if queue is empty
    }

    // NEW: Check if there are queued inputs
    hasQueuedInputs() {
        return this.inputQueue.length > 0;
    }

    // NEW: Clear the input queue
    clearQueue() {
        this.inputQueue = [];
    }

    // SIMPLIFIED: Just send move to game
    sendMove(direction) {
        if (!this.game || !this.isActive || !direction) return;
        
        try {
            if (typeof this.game.movePlayer === 'function') {
                this.game.movePlayer(direction.x, direction.y);
            } else if (typeof this.game.handleInput === 'function') {
                this.game.handleInput(direction.name, true);
            }
        } catch (error) {
            console.error('Error moving player:', error);
        }
    }

    showControls() {
        let controlsInfo = document.getElementById('controls-info');
        if (!controlsInfo) {
            controlsInfo = document.createElement('div');
            controlsInfo.id = 'controls-info';
            controlsInfo.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: #00ff00;
                padding: 15px 25px;
                border-radius: 10px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                text-align: center;
                z-index: 1000;
                pointer-events: none;
                max-width: 300px;
                border: 1px solid #00ff00;
            `;
            document.body.appendChild(controlsInfo);
        }
        
        const controlText = this.isTouchDevice 
            ? '📱 TOUCH CONTROLS<br>Tap and swipe to move<br>👆👇👈👉<br><small>⚡ Enhanced responsiveness</small>'
            : '⌨️ KEYBOARD CONTROLS<br>Arrow Keys or WASD<br>🖱️ Mouse drag also works<br><small>⚡ Enhanced responsiveness</small>';
        
        controlsInfo.innerHTML = controlText;
        
        // Hide after 6 seconds
        setTimeout(() => {
            if (controlsInfo) {
                controlsInfo.style.opacity = '0';
                setTimeout(() => controlsInfo?.remove(), 500);
            }
        }, 6000);
    }

    // Public API
    activate() {
        this.isActive = true;
        this.gameElement.focus();
    }

    deactivate() {
        this.isActive = false;
        this.currentKey = null;
        this.currentMouseDirection = null;
        this.isMouseDown = false;
        this.inputQueue = [];
    }

    getCurrentDirection() {
        return this.currentKey;
    }

    setGame(gameInstance) {
        this.game = gameInstance;
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        
        this.gameElement.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.gameElement.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        this.gameElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.gameElement.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.gameElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        
        document.getElementById('controls-info')?.remove();
        
        console.log('Queued input manager destroyed');
    }
}