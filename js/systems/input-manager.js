class InputManager {
    constructor(game) {
        this.game = game;
        this.keysPressed = new Set();
        this.lastMoveTime = 0;
        this.touchControls = null;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // New key queue system
        this.keyQueue = [];
        this.processingKey = false;
        
        // Use config for move delay
        this.moveDelay = this.game.config.get('player.moveDelay') || 150;
        
        // Initialize input listeners
        this.initializeListeners();
    }
    
    initializeListeners() {
        // Add keyboard event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Set the moveDelay to match the game update interval
        // This is critical for synchronized movement
        this.moveDelay = this.game.config.get('gameLoop.updateInterval');
        
        // Initialize touch controls if on a touch-enabled device
        if (this.isTouchDevice) {
            this.initializeTouchControls();
        }
    }
    
    initializeTouchControls() {
        const gameContainer = document.getElementById('game-container');
        
        // Remove existing touch controls if any
        const existingControls = document.getElementById('touch-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        // Create touch control overlay
        this.touchControls = this.createTouchControlOverlay(gameContainer);
        
        // Add swipe detection
        this.addSwipeDetection();
    }
    
    createTouchControlOverlay(container) {
        // Create a touch control div
        const touchControls = document.createElement('div');
        touchControls.id = 'touch-controls';
        
        // Create directional buttons
        const directions = [
            { key: 'ArrowUp', label: '↑', id: 'btn-up' },
            { key: 'ArrowLeft', label: '←', id: 'btn-left' },
            { key: 'ArrowRight', label: '→', id: 'btn-right' },
            { key: 'ArrowDown', label: '↓', id: 'btn-down' }
        ];
        
        // Create a layout container for d-pad style controls
        const dpad = document.createElement('div');
        dpad.id = 'dpad';
        dpad.style.display = 'grid';
        dpad.style.gridTemplateAreas = '"up up" "left right" "down down"';
        dpad.style.gridGap = '5px';
        dpad.style.margin = '0 auto';
        dpad.style.width = '150px';
        
        directions.forEach(dir => {
            const button = document.createElement('button');
            button.textContent = dir.label;
            button.id = dir.id;
            button.dataset.key = dir.key;
            
            // Set grid area for d-pad layout
            switch (dir.key) {
                case 'ArrowUp': button.style.gridArea = 'up'; break;
                case 'ArrowDown': button.style.gridArea = 'down'; break;
                case 'ArrowLeft': button.style.gridArea = 'left'; break;
                case 'ArrowRight': button.style.gridArea = 'right'; break;
            }
            
            // Better sizing for touch targets
            button.style.padding = '15px';
            button.style.fontSize = '24px';
            button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            button.style.color = 'white';
            button.style.border = '1px solid rgba(255,255,255,0.5)';
            button.style.borderRadius = '5px';
            button.style.touchAction = 'manipulation'; // Prevent double-tap zoom
            
            // Event handlers for both touch and mouse
            this.addButtonEventListeners(button, dir.key);
            
            dpad.appendChild(button);
        });
        
        touchControls.appendChild(dpad);
        container.appendChild(touchControls);
        
        return touchControls;
    }
    
    addButtonEventListeners(button, key) {
        // Touch event handlers with improved responsiveness
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleDirectionalInput(key);
            button.style.backgroundColor = 'rgba(255,255,255,0.4)';
            
            // Enable continuous movement while button is held
            this.startContinuousMovement(key);
        }, { passive: false });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            this.stopContinuousMovement();
        }, { passive: false });
        
        button.addEventListener('touchcancel', (e) => {
            button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            this.stopContinuousMovement();
        }, { passive: false });
        
        // Mouse event handlers (for testing on desktop)
        button.addEventListener('mousedown', (e) => {
            this.handleDirectionalInput(key);
            button.style.backgroundColor = 'rgba(255,255,255,0.4)';
            
            // Enable continuous movement while button is held
            this.startContinuousMovement(key);
        });
        
        button.addEventListener('mouseup', () => {
            button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            this.stopContinuousMovement();
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            this.stopContinuousMovement();
        });
    }
    
    // Enable continuous movement when holding a direction
    startContinuousMovement(key) {
        // Clear any existing interval
        this.stopContinuousMovement();
        
        // Store the key being held
        this.heldKey = key;
        
        // Use the game's update interval for consistent timing
        const moveInterval = this.game.config.get('gameLoop.updateInterval');
        
        // Initial move immediately
        this.handleDirectionalInput(this.heldKey);
        
        // Set an interval to repeatedly move in that direction at the same rate as game updates
        this.moveInterval = setInterval(() => {
            this.handleDirectionalInput(this.heldKey);
        }, moveInterval);
    }
    
    stopContinuousMovement() {
        if (this.moveLoopId) {
            cancelAnimationFrame(this.moveLoopId);
            this.moveLoopId = null;
        }
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        this.heldKey = null;
    }
    
    addSwipeDetection() {
        const canvas = document.getElementById('gameCanvas');
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        // Detect touch start position
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }, false);
        
        // Detect touch end position and determine swipe direction
        canvas.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        }, false);
    }
    
    handleSwipe(startX, startY, endX, endY) {
        // Calculate distance of swipe
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        
        // Minimum distance for a swipe
        const minSwipeDistance = 30;
        
        // Determine direction based on which axis had the greater movement
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > minSwipeDistance) {
                if (deltaX > 0) {
                    this.handleDirectionalInput('ArrowRight');
                } else {
                    this.handleDirectionalInput('ArrowLeft');
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > minSwipeDistance) {
                if (deltaY > 0) {
                    this.handleDirectionalInput('ArrowDown');
                } else {
                    this.handleDirectionalInput('ArrowUp');
                }
            }
        }
    }
    
    handleDirectionalInput(key) {
        // Check if game is over
        if (this.game.isGameOver) {
            if (key === 'Enter') {
                console.log("Enter input received while game over - restarting game");
                if (typeof restartGameClean === 'function') {
                    restartGameClean();
                } else {
                    this.game.restart();
                }
                return;
            }
            return;
        }
        
        // Add to the key queue
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            // Add to the queue if it's not the same as the last key added
            if (this.keyQueue.length === 0 || this.keyQueue[this.keyQueue.length - 1] !== key) {
                this.keyQueue.push(key);
                console.log("Touch key added to queue:", key, "Queue length:", this.keyQueue.length);
            }
        }
    }
    
    handleKeyDown(e) {
        // ESC key to end game and return to splash screen
        if (e.key === 'Escape' && !this.game.isGameOver) {
            e.preventDefault();
            console.log("ESC pressed");
            
            // Use global function if available
            if (typeof endGameAndShowSplash === 'function') {
                endGameAndShowSplash();
            } else {
                // Fallback to original behavior
                this.game.gameOver(false);
            }
            return;
        }
        
        // Game over restart
        if (this.game.isGameOver) {
            if (e.key === 'Enter') {
                e.preventDefault();
                
                // Show splash screen
                if (typeof endGameAndShowSplash === 'function') {
                    endGameAndShowSplash();
                } else {
                    // Fallback
                    const existingButton = document.getElementById('restart-button');
                    if (existingButton) {
                        existingButton.remove();
                    }
                    window.gameInstance = new Game();
                }
                return;
            }
            return;
        }
        
        // Only process arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            
            // Track pressed keys
            this.keysPressed.add(e.key);
            
            // Add to the queue if it's not the same as the last key added
            if (this.keyQueue.length === 0 || this.keyQueue[this.keyQueue.length - 1] !== e.key) {
                this.keyQueue.push(e.key);
                console.log("Key added to queue:", e.key, "Queue length:", this.keyQueue.length);
            }
        }
    }
    
    handleKeyUp(e) {
        // Remove released key from tracking
        this.keysPressed.delete(e.key);
    }

    getNextKey() {
        // First try to get a key from the queue
        if (this.keyQueue.length > 0) {
            const key = this.keyQueue.shift();
            console.log("Getting key from queue:", key);
            return key;
        }
        
        // If queue is empty but a key is still pressed, return that key
        if (this.keysPressed.size > 0) {
            // Get the active arrow key in a specific order
            const arrowKeys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
            for (const key of arrowKeys) {
                if (this.keysPressed.has(key)) {
                    console.log("Getting held key:", key);
                    return key;
                }
            }
        }
        
        return null;
    }

    processQueuedMovement() {
        if (!this.queuedDirection) return false;
        
        const moved = this.processPlayerMovement(this.queuedDirection);
        this.queuedDirection = null; // Clear the queued direction
        
        return moved;
    }
    
    processPlayerMovement(key) {
        // Validate player exists
        if (!this.game.player) {
            this.game.logger.warn('Attempted to move non-existent player');
            return false;
        }
        
        // Determine movement direction
        let dx = 0;
        let dy = 0;
        
        switch (key) {
            case 'ArrowUp':
                dy = -1;
                break;
            case 'ArrowDown':
                dy = 1;
                break;
            case 'ArrowLeft':
                dx = -1;
                break;
            case 'ArrowRight':
                dx = 1;
                break;
        }
        
        // Queue the movement for the next tick
        if (dx !== 0 || dy !== 0) {
            this.game.pendingPlayerMove = [dx, dy];
            return true;
        }
        
        return false;
    }
    
    toggleTouchControls(show) {
        if (this.touchControls) {
            this.touchControls.style.display = show ? 'block' : 'none';
        }
    }
    
    updateTouchControlsForOrientation() {
        if (!this.isTouchDevice || !this.touchControls) return;
        
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // Position controls on the left side in landscape mode
            this.touchControls.style.left = '20px';
            this.touchControls.style.bottom = '20px';
            this.touchControls.style.right = 'auto';
        } else {
            // Position controls centered at bottom in portrait mode
            this.touchControls.style.left = '0';
            this.touchControls.style.right = '0';
            this.touchControls.style.bottom = '20px';
        }
    }
}