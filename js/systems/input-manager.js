/**
 * Fixed HybridInputManager with Continuous Touch Movement
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
        this.currentTouchDirection = null; // NEW: Track continuous touch direction
        this.isMouseDown = false;
        this.isTouchDown = false; // NEW: Track touch state
        
        // Device detection
        this.isTouchDevice = this.detectTouchDevice();
        
        // Touch tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.minSwipeDistance = 30;
        this.touchMoveThreshold = 20; // NEW: Threshold for continuous touch movement
        
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
        
        // Touch - ENHANCED: Support both discrete swipes AND continuous movement
        this.gameElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.gameElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false }); // NEW
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
            this.currentTouchDirection = null; // NEW
            this.isMouseDown = false;
            this.isTouchDown = false; // NEW
            this.inputQueue = [];
        });
        
        this.gameElement.focus();
    }

    handleKeyDown(event) {
        if (!this.isActive) return;
        
        const direction = this.KEY_CODES[event.keyCode];
        if (direction) {
            event.preventDefault();
            
            if (this.currentKey !== direction) {
                this.inputQueue = [direction];
                console.log(`Key queued: ${direction.name}, queue length: ${this.inputQueue.length}`);
            }
            
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

    // ENHANCED: Touch start - initialize continuous tracking
    handleTouchStart(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouchDown = true; // NEW: Track touch state
        this.currentTouchDirection = null; // NEW: Reset direction
    }

    // NEW: Touch move - continuous direction tracking (like mouse)
    handleTouchMove(event) {
        if (!this.isActive || !this.isTouchDown) return;
        
        event.preventDefault();
        
        const touch = event.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance >= this.touchMoveThreshold) {
            const newDirection = this.getSwipeDirection(deltaX, deltaY);
            
            // If direction changed, queue the new direction
            if (this.currentTouchDirection !== newDirection) {
                this.inputQueue = [newDirection];
                console.log(`Touch direction changed: ${newDirection.name}`);
            }
            
            this.currentTouchDirection = newDirection;
            
            // Reset reference point for continuous movement
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }
    }

    // ENHANCED: Touch end - handle both discrete swipes and end continuous movement
    handleTouchEnd(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        
        this.isTouchDown = false; // NEW: Clear touch state
        this.currentTouchDirection = null; // NEW: Clear continuous direction
        
        // If no continuous movement was detected, treat as discrete swipe
        if (event.changedTouches.length > 0 && !this.currentTouchDirection) {
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - this.touchStartX;
            const deltaY = touch.clientY - this.touchStartY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            
            if (distance >= this.minSwipeDistance) {
                const direction = this.getSwipeDirection(deltaX, deltaY);
                this.inputQueue = [direction];
                console.log(`Discrete swipe: ${direction.name}`);
            }
        }
    }

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

    getNextQueuedInput() {
        return this.inputQueue.shift();
    }

    hasQueuedInputs() {
        return this.inputQueue.length > 0;
    }

    clearQueue() {
        this.inputQueue = [];
    }

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
            ? '📱 TOUCH CONTROLS<br>Drag to move continuously<br>Or tap+swipe for single moves<br><small>⚡ Enhanced responsiveness</small>'
            : '⌨️ KEYBOARD CONTROLS<br>Arrow Keys or WASD<br>🖱️ Mouse drag also works<br><small>⚡ Enhanced responsiveness</small>';
        
        controlsInfo.innerHTML = controlText;
        
        setTimeout(() => {
            if (controlsInfo) {
                controlsInfo.style.opacity = '0';
                setTimeout(() => controlsInfo?.remove(), 500);
            }
        }, 6000);
    }

    activate() {
        this.isActive = true;
        this.gameElement.focus();
    }

    deactivate() {
        this.isActive = false;
        this.currentKey = null;
        this.currentMouseDirection = null;
        this.currentTouchDirection = null; // NEW
        this.isMouseDown = false;
        this.isTouchDown = false; // NEW
        this.inputQueue = [];
    }

    getCurrentDirection() {
        return this.currentKey;
    }

    setGame(gameInstance) {
        this.game = gameInstance;
    }

    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        
        this.gameElement.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.gameElement.removeEventListener('touchmove', this.handleTouchMove.bind(this)); // NEW
        this.gameElement.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        this.gameElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.gameElement.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.gameElement.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        
        document.getElementById('controls-info')?.remove();
        
        console.log('Queued input manager destroyed');
    }
}