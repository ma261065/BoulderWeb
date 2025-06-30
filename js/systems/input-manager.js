/**
 * HybridInputManager for Boulder Game
 * Replaces the existing input-manager.js
 * Handles both keyboard (desktop) and swipe (mobile) input
 */
class HybridInputManager {
    constructor(gameInstance) {
        this.lastMouseMoveTime = 0;
        this.mouseMoveInterval = 100; // Check every 100ms
        this.game = gameInstance;
        this.gameElement = document.getElementById('gameCanvas') || document.body;
        this.isActive = true;
        this.currentDirection = null;
        
        // Device detection
        this.isTouchDevice = this.detectTouchDevice();
        this.isDesktop = !this.isTouchDevice;
        
        // Touch tracking variables
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 25;
        this.isMouseDown = false;
        this.mouseStartX = 0;
        this.mouseStartY = 0;
        
        // Enhanced touch repeat system
        this.isTouchDown = false;
        this.touchRepeatInterval = null;
        this.touchRepeatDelay = 150; // Slightly slower than keyboard for touch
        this.lastSwipeDirection = null;
        this.touchMoveThreshold = 10; // Pixels to move before considering it a new swipe
        this.touchHoldDelay = 300; // Time to wait after initial swipe before starting repeat
        
        // Direction constants matching Boulder game expectations
        this.DIRECTIONS = {
            UP: { x: 0, y: -1, name: 'up' },
            DOWN: { x: 0, y: 1, name: 'down' },
            LEFT: { x: -1, y: 0, name: 'left' },
            RIGHT: { x: 1, y: 0, name: 'right' }
        };
        
        // Key codes for arrow keys and WASD
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
        
        // Enhanced key repeat system
        this.pressedKeys = new Set();
        this.repeatInterval = null;
        this.repeatDelay = 120; // Time between repeats in milliseconds
        this.currentRepeatingKey = null;
        
        this.setupStyles();
        this.setupEventListeners();
        this.showControls();
        
        console.log(`Input Manager initialized for ${this.isTouchDevice ? 'touch' : 'desktop'} device`);
    }

    detectTouchDevice() {
        return (('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0) ||
                (navigator.msMaxTouchPoints > 0));
    }

    setupStyles() {
        // Prevent scrolling and zooming on game area for touch devices
        if (this.isTouchDevice) {
            this.gameElement.style.touchAction = 'none';
        }
        this.gameElement.style.userSelect = 'none';
        this.gameElement.style.webkitUserSelect = 'none';
        this.gameElement.style.outline = 'none';
        
        // Make game element focusable for keyboard events
        if (!this.gameElement.hasAttribute('tabindex')) {
            this.gameElement.setAttribute('tabindex', '0');
        }
    }

    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Touch events
        this.gameElement.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.gameElement.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.gameElement.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        
        // Mouse events for desktop swipe simulation
        this.gameElement.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.gameElement.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.gameElement.addEventListener('mouseleave', (event) => {
            // Only stop if mouse button is not down
            if (!this.isMouseDown) {
                // Maybe restore cursor or do other cleanup
            }
            // Don't call handleMouseUp - let the global mouseup handle it
        });
        
        // Prevent context menu and drag
        this.gameElement.addEventListener('contextmenu', this.preventDefault.bind(this));
        this.gameElement.addEventListener('dragstart', this.preventDefault.bind(this));
        
        // Focus handling
        this.gameElement.addEventListener('blur', () => {
            this.pressedKeys.clear();
            this.stopKeyRepeat(); // Stop all repeats when losing focus
        });
        
        // Stop repeats when window loses focus
        window.addEventListener('blur', () => {
            this.pressedKeys.clear();
            this.stopKeyRepeat();
            this.stopTouchRepeat();
            this.isTouchDown = false;
        });
        
        // Focus the game element to receive keyboard events
        this.gameElement.focus();
    }

    preventDefault(event) {
        event.preventDefault();
        return false;
    }

    // Keyboard event handlers with immediate repeat
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        const direction = this.KEY_CODES[event.keyCode];
        if (direction) {
            event.preventDefault();
            
            // If this key is already being pressed, ignore the repeat
            if (this.pressedKeys.has(event.keyCode)) {
                return;
            }
            
            // Add to pressed keys
            this.pressedKeys.add(event.keyCode);
            
            // Move immediately on first press
            this.movePlayer(direction);
            
            // Start immediate repeat for this key
            this.startKeyRepeat(event.keyCode, direction);
        }
    }

    handleKeyUp(event) {
        if (!this.isActive) return;
        
        const direction = this.KEY_CODES[event.keyCode];
        if (direction) {
            this.pressedKeys.delete(event.keyCode);
            event.preventDefault();
            
            // Stop repeat for this key
            this.stopKeyRepeat(event.keyCode);
        }
    }

    // Enhanced key repeat system
    startKeyRepeat(keyCode, direction) {
        // Clear any existing repeat
        this.stopKeyRepeat();
        
        this.currentRepeatingKey = keyCode;
        
        // Start repeating immediately (no initial delay)
        this.repeatInterval = setInterval(() => {
            // Only repeat if the key is still pressed and we're active
            if (this.pressedKeys.has(keyCode) && this.isActive) {
                this.movePlayer(direction);
            } else {
                this.stopKeyRepeat(keyCode);
            }
        }, this.repeatDelay);
    }

    stopKeyRepeat(keyCode = null) {
        // If specific key provided, only stop if it matches current repeating key
        if (keyCode !== null && this.currentRepeatingKey !== keyCode) {
            return;
        }
        
        if (this.repeatInterval) {
            clearInterval(this.repeatInterval);
            this.repeatInterval = null;
            this.currentRepeatingKey = null;
        }
    }

    // Enhanced touch event handlers
    handleTouchStart(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        const touch = event.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouchDown = true;
        this.lastSwipeDirection = null;
        
        // Stop any existing touch repeat
        this.stopTouchRepeat();
    }

    handleTouchMove(event) {
        if (!this.isActive || !this.isTouchDown) return;
        
        event.preventDefault();
        
        const touch = event.touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;
        
        // Check if we've moved enough to register a swipe
        const deltaX = currentX - this.touchStartX;
        const deltaY = currentY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        console.log('Touch move - distance:', distance, 'delta:', deltaX, deltaY);
        
        if (distance >= this.minSwipeDistance) {
            // Determine swipe direction
            const direction = this.getSwipeDirection(deltaX, deltaY);
            
            console.log('Touch swipe detected:', direction.name);
            
            // If this is a new direction or first swipe
            if (!this.lastSwipeDirection || this.lastSwipeDirection.name !== direction.name) {
                this.lastSwipeDirection = direction;
                
                // Move immediately
                this.movePlayer(direction);
                
                // Start continuous movement (immediate for direction changes)
                this.startTouchRepeat(direction);
                
                console.log('Started touch repeat for direction:', direction.name);
            }
            
            // Update start position to current position for next swipe detection
            this.touchStartX = currentX;
            this.touchStartY = currentY;
        }
    }

    handleTouchEnd(event) {
        if (!this.isActive) return;
        
        event.preventDefault();
        this.isTouchDown = false;
        this.lastSwipeDirection = null;
        
        // Stop continuous movement
        this.stopTouchRepeat();
        
        // If it was a quick swipe without hold, process it
        if (event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            this.touchEndX = touch.clientX;
            this.touchEndY = touch.clientY;
            
            // Only process if we haven't already handled this swipe in touchmove
            if (!this.lastSwipeDirection) {
                this.processSwipe();
            }
        }
    }

    // Enhanced mouse event handlers with repeat functionality
    handleMouseDown(event) {
        if (!this.isActive) return;
        
        this.isMouseDown = true;
        this.mouseStartX = event.clientX;
        this.mouseStartY = event.clientY;
        this.currentMouseDirection = null;
        
        event.preventDefault();
        
        // ADDED: Hide cursor when mouse button is down for game control
        this.gameElement.style.cursor = 'none';
        
        // Add global mousemove listener
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleMouseMove(event) {
        if (!this.isActive || !this.isMouseDown) return;
        
        const now = Date.now();
        const currentX = event.clientX;
        const currentY = event.clientY;
        
        const deltaX = currentX - this.mouseStartX;
        const deltaY = currentY - this.mouseStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Check for direction change OR if enough time has passed
        const threshold = 15; // Smaller, more responsive threshold
        
        if (distance >= threshold || (now - this.lastMouseMoveTime) > this.mouseMoveInterval) {
            if (distance >= threshold) {
                const newDirection = this.getSwipeDirection(deltaX, deltaY);
                
                if (!this.currentMouseDirection || this.currentMouseDirection.name !== newDirection.name) {
                    this.currentMouseDirection = newDirection;
                    console.log('Mouse direction changed to:', newDirection.name);
                }
            }
            
            // Reset reference point regularly
            this.mouseStartX = currentX;
            this.mouseStartY = currentY;
            this.lastMouseMoveTime = now;
        }
    }

    handleMouseUp(event) {
        if (!this.isActive) return;
        
        this.isMouseDown = false;
        this.currentMouseDirection = null;
        
        // ADDED: Show cursor again when mouse button is released
        this.gameElement.style.cursor = 'default';
        
        // Remove global listeners
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        
        console.log('Mouse released - stopping movement');
    }

    processSwipe() {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        console.log('Processing swipe - distance:', distance, 'deltaX:', deltaX, 'deltaY:', deltaY);
        
        // Check if swipe distance is sufficient
        if (distance < this.minSwipeDistance) {
            console.log('Swipe too short, ignoring');
            return;
        }
        
        // Get swipe direction
        const direction = this.getSwipeDirection(deltaX, deltaY);
        console.log('Swipe direction:', direction.name);
        this.movePlayer(direction);
    }

    // Helper method to determine swipe direction
    getSwipeDirection(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Simple approach: just choose the larger component
        if (absDeltaX > absDeltaY) {
            return deltaX > 0 ? this.DIRECTIONS.RIGHT : this.DIRECTIONS.LEFT;
        } else {
            return deltaY > 0 ? this.DIRECTIONS.DOWN : this.DIRECTIONS.UP;
        }
}

        /*// Add a bias toward horizontal/vertical (not diagonal)
        const bias = 1.2; // Require 20% more movement to switch from horizontal to vertical
        
        if (absDeltaX > absDeltaY * bias) {
            // Clearly horizontal
            return deltaX > 0 ? this.DIRECTIONS.RIGHT : this.DIRECTIONS.LEFT;
        } else if (absDeltaY > absDeltaX * bias) {
            // Clearly vertical  
            return deltaY > 0 ? this.DIRECTIONS.DOWN : this.DIRECTIONS.UP;
        } else {
            // If it's close to diagonal, stick with current direction if we have one
            if (this.currentMouseDirection) {
                return this.currentMouseDirection;
            }
            
            // Default to the larger component
            if (absDeltaX > absDeltaY) {
                return deltaX > 0 ? this.DIRECTIONS.RIGHT : this.DIRECTIONS.LEFT;
            } else {
                return deltaY > 0 ? this.DIRECTIONS.DOWN : this.DIRECTIONS.UP;
            }
        }
    }*/

    // Touch repeat system with immediate direction changes
    startTouchRepeat(direction) {
        const wasRepeating = this.touchRepeatInterval !== null;
        
        // Clear any existing repeat
        this.stopTouchRepeat();
        
        console.log('Starting touch repeat for direction:', direction.name, 'wasRepeating:', wasRepeating);
        
        // If we were already repeating, start immediately (no delay for direction changes)
        const delay = wasRepeating ? 0 : this.touchHoldDelay;
        
        // Start repeating after delay (immediate if changing direction)
        setTimeout(() => {
            // Only start if touch/mouse is still down and direction hasn't changed
            if (this.isTouchDown && this.isActive && 
                this.lastSwipeDirection && this.lastSwipeDirection.name === direction.name) {
                
                console.log('Touch repeat interval started with delay:', delay);
                
                this.touchRepeatInterval = setInterval(() => {
                    // Continue moving if touch/mouse is still down
                    if (this.isTouchDown && this.isActive) {
                        console.log('Touch repeat move:', direction.name);
                        this.movePlayer(direction);
                    } else {
                        console.log('Stopping touch repeat - touch no longer down');
                        this.stopTouchRepeat();
                    }
                }, this.touchRepeatDelay);
            } else {
                console.log('Touch repeat not started - conditions not met');
            }
        }, delay);
    }

    stopTouchRepeat() {
        if (this.touchRepeatInterval) {
            console.log('Stopping touch repeat');
            clearInterval(this.touchRepeatInterval);
            this.touchRepeatInterval = null;
        }
    }

    // Main movement method that interfaces with your Boulder game
    movePlayer(direction) {
        if (!this.game || !this.isActive) return;
        
        // For mouse input, use the current mouse direction if mouse is down
        if (this.isMouseDown && this.currentMouseDirection) {
            direction = this.currentMouseDirection;
        }
        
        // If no direction and mouse not down, don't move
        if (!direction) 
            return;
        
        this.currentDirection = direction;
        
        try {
            // Try different possible method names in your game
            if (typeof this.game.movePlayer === 'function') {
                // If your game has a movePlayer method
                this.game.movePlayer(direction.x, direction.y);
            } else if (typeof this.game.handleInput === 'function') {
                // If your game has a handleInput method
                this.game.handleInput(direction.name, true);
            } else if (this.game.player && typeof this.game.player.move === 'function') {
                // If you can access player directly
                this.game.player.move(direction.x, direction.y);
            } else if (this.game.entities && this.game.entities.player) {
                // If player is in entities collection
                const player = this.game.entities.player;
                if (typeof player.move === 'function') {
                    player.move(direction.x, direction.y);
                } else if (typeof player.setDirection === 'function') {
                    player.setDirection(direction.x, direction.y);
                }
            } else {
                // Fallback: dispatch custom event
                const event = new CustomEvent('playerMove', { 
                    detail: { 
                        direction: direction.name,
                        x: direction.x,
                        y: direction.y
                    } 
                });
                this.gameElement.dispatchEvent(event);
                console.log('Dispatched playerMove event:', direction);
            }
            
            // Visual feedback (commented out - no longer needed)
            // this.showDirectionFeedback(direction.name);
            
        } catch (error) {
            console.error('Error moving player:', error);
            console.log('Available game methods:', Object.getOwnPropertyNames(this.game));
        }
    }

    // Visual feedback methods (disabled)
    showDirectionFeedback(direction) {
        // Direction feedback disabled - was only useful for debugging
        return;
    }

    showControls() {
        // Show appropriate control instructions
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
        
        let controlText = '';
        if (this.isTouchDevice) {
            controlText = '📱 TOUCH CONTROLS<br>Swipe in any direction to move<br>👆👇👈👉';
        } else {
            controlText = '⌨️ KEYBOARD CONTROLS<br>Arrow Keys or WASD to move<br>🖱️ Mouse drag also works';
        }
        
        controlsInfo.innerHTML = controlText;
        
        // Hide controls after 6 seconds
        setTimeout(() => {
            if (controlsInfo) {
                controlsInfo.style.opacity = '0';
                setTimeout(() => {
                    if (controlsInfo && controlsInfo.parentNode) {
                        controlsInfo.parentNode.removeChild(controlsInfo);
                    }
                }, 500);
            }
        }, 6000);
    }

    // Public API methods
    activate() {
        this.isActive = true;
        this.gameElement.focus();
        console.log('Input manager activated');
    }

    deactivate() {
        this.isActive = false;
        this.pressedKeys.clear();
        this.stopKeyRepeat(); // Stop all repeats when deactivating
        this.stopTouchRepeat(); // Stop touch repeats too
        this.isTouchDown = false;
        console.log('Input manager deactivated');
    }

    getCurrentDirection() {
        return this.currentDirection;
    }

    // Method to update the game reference (useful for level transitions)
    setGame(gameInstance) {
        this.game = gameInstance;
    }

    // ADDED: Method to adjust repeat speed
    setRepeatDelay(delay) {
        this.repeatDelay = Math.max(50, Math.min(500, delay)); // Clamp between 50-500ms
        console.log(`Key repeat delay set to ${this.repeatDelay}ms`);
    }

    // ADDED: Method to adjust touch repeat speed
    setTouchRepeatDelay(delay) {
        this.touchRepeatDelay = Math.max(50, Math.min(500, delay)); // Clamp between 50-500ms
        console.log(`Touch repeat delay set to ${this.touchRepeatDelay}ms`);
    }

    // ADDED: Method to adjust touch sensitivity
    setTouchSensitivity(swipeDistance, holdDelay = null) {
        this.minSwipeDistance = Math.max(20, Math.min(100, swipeDistance));
        if (holdDelay !== null) {
            this.touchHoldDelay = Math.max(100, Math.min(1000, holdDelay));
        }
        console.log(`Touch sensitivity: swipe=${this.minSwipeDistance}px, hold=${this.touchHoldDelay}ms`);
    }

    // ADDED: Get current repeat settings
    getRepeatSettings() {
        return {
            keyDelay: this.repeatDelay,
            touchDelay: this.touchRepeatDelay,
            touchHoldDelay: this.touchHoldDelay,
            minSwipeDistance: this.minSwipeDistance,
            isKeyRepeating: this.repeatInterval !== null,
            isTouchRepeating: this.touchRepeatInterval !== null,
            currentKey: this.currentRepeatingKey,
            touchDirection: this.lastSwipeDirection?.name || null
        };
    }

    destroy() {
        // Stop any active repeats
        this.stopKeyRepeat();
        this.stopTouchRepeat();
        
        // Clean up event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        document.removeEventListener('keyup', this.handleKeyUp.bind(this));
        
        this.gameElement.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.gameElement.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        this.gameElement.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        
        this.gameElement.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        this.gameElement.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this.gameElement.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        this.gameElement.removeEventListener('contextmenu', this.preventDefault.bind(this));
        this.gameElement.removeEventListener('dragstart', this.preventDefault.bind(this));
        
        // Remove UI elements (direction indicator no longer used)
        const controlsInfo = document.getElementById('controls-info');
        if (controlsInfo) controlsInfo.remove();
        
        console.log('Input manager destroyed');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridInputManager;
}

// Global assignment for browser usage
if (typeof window !== 'undefined') {
    window.HybridInputManager = HybridInputManager;
}