// Enhanced InputManager with circular touch controls
class InputManager {
    constructor(game) {
        this.game = game;
        this.keysPressed = new Set();
        this.lastMoveTime = 0;
        this.touchControls = null;
        this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // Key queue system
        this.keyQueue = [];
        this.processingKey = false;
        this.boundMouseHandlers = {};
        
        // Active touch tracking
        this.activeTouch = null;
        this.currentQuadrant = null;
        
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
    }
    
    createTouchControlOverlay(container) {
        // Create a touch control div
        const touchControls = document.createElement('div');
        touchControls.id = 'touch-controls';
        
        // Set initial position explicitly
        touchControls.style.position = 'fixed';
        touchControls.style.bottom = '150px'; // Increased from 100px to position it higher
        touchControls.style.left = '20px';
        touchControls.style.zIndex = '100';
        touchControls.style.pointerEvents = 'none';
        
        // Create a circular d-pad container
        const dpad = document.createElement('div');
        dpad.id = 'dpad';
        
        // Create directional buttons (quadrants)
        const directions = [
            { key: 'ArrowUp', label: '↑', id: 'btn-up' },
            { key: 'ArrowRight', label: '→', id: 'btn-right' },
            { key: 'ArrowDown', label: '↓', id: 'btn-down' },
            { key: 'ArrowLeft', label: '←', id: 'btn-left' }
        ];
        
        directions.forEach(dir => {
            const button = document.createElement('button');
            button.textContent = dir.label;
            button.id = dir.id;
            button.dataset.key = dir.key;
            dpad.appendChild(button);
        });
        
        // Add event listeners to the entire d-pad for continuous tracking
        this.addDpadEventListeners(dpad);
        
        touchControls.appendChild(dpad);
        container.appendChild(touchControls);
        
        return touchControls;
    }
    
    // Mouse event handlers for touch controls
    addDpadEventListeners(dpad) {
        // Existing touch event listeners can remain the same
    
        // Modify mouse event listeners to ensure clean state management
        dpad.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.activeTouch = 'mouse';
            this.resetAllButtonStates(); // Reset ALL button states first
            this.handleMouseInput(e, dpad);
        });
    
        dpad.addEventListener('mousemove', (e) => {
            e.preventDefault();
            if (this.activeTouch === 'mouse') {
                this.resetAllButtonStates(); // Reset ALL button states first
                this.handleMouseInput(e, dpad);
            }
        });
    
        dpad.addEventListener('mouseup', (e) => {
            e.preventDefault();
            this.activeTouch = null;
            this.currentQuadrant = null;
            this.resetAllButtonStates(); // Reset ALL button states
            this.stopContinuousMovement();
        });
    
        dpad.addEventListener('mouseleave', (e) => {
            e.preventDefault();
            this.activeTouch = null;
            this.currentQuadrant = null;
            this.resetAllButtonStates(); // Reset ALL button states
            this.stopContinuousMovement();
        });
    }
    
    handleTouchInput(touch, dpad) {
        const rect = dpad.getBoundingClientRect();
        
        // Calculate touch position relative to d-pad center
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Get touch coordinates relative to center
        const touchX = touch.clientX - centerX;
        const touchY = touch.clientY - centerY;
        
        // Calculate distance from center (for dead zone)
        const distance = Math.sqrt(touchX * touchX + touchY * touchY);
        
        // Ignore touches in the center "dead zone"
        if (distance < rect.width * 0.15) {
            this.stopContinuousMovement();
            return;
        }
        
        // Determine quadrant (direction) based on angle
        const angle = Math.atan2(touchY, touchX) * 180 / Math.PI;
        
        let key;
        if (angle > -45 && angle <= 45) {
            key = 'ArrowRight';
        } else if (angle > 45 && angle <= 135) {
            key = 'ArrowDown';
        } else if (angle > 135 || angle <= -135) {
            key = 'ArrowLeft';
        } else { // angle > -135 && angle <= -45
            key = 'ArrowUp';
        }
        
        // CRITICAL CHANGE: Always reset and re-apply highlights
        this.resetAllButtonHighlights();
        this.highlightButtonByKey(key);
        
        // Only trigger movement if quadrant changed
        if (this.currentQuadrant !== key) {
            this.currentQuadrant = key;
            
            // Trigger the movement
            this.handleDirectionalInput(key);
            
            // Start continuous movement in this direction
            this.startContinuousMovement(key);
        }
    }
    
    resetAllButtonStates() {
        const buttons = [
            document.getElementById('btn-up'),
            document.getElementById('btn-right'),
            document.getElementById('btn-down'),
            document.getElementById('btn-left')
        ];
        
        buttons.forEach(button => {
            if (button) {
                // Remove any active classes
                button.classList.remove('active-btn');
                // Ensure it's marked as inactive
                button.classList.add('inactive');
            }
        });
    }

    handleMouseInput(e, dpad) {
        const rect = dpad.getBoundingClientRect();
        
        // Calculate mouse position relative to d-pad center
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Get mouse coordinates relative to center
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        // Calculate distance from center (for dead zone)
        const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
        
        // Ignore clicks in the center "dead zone"
        if (distance < rect.width * 0.15) {
            this.stopContinuousMovement();
            this.resetAllButtonStates();
            return;
        }
        
        // Determine quadrant (direction) based on angle
        const angle = Math.atan2(mouseY, mouseX) * 180 / Math.PI;
        
        let key;
        if (angle > -45 && angle <= 45) {
            key = 'ArrowRight';
        } else if (angle > 45 && angle <= 135) {
            key = 'ArrowDown';
        } else if (angle > 135 || angle <= -135) {
            key = 'ArrowLeft';
        } else { // angle > -135 && angle <= -45
            key = 'ArrowUp';
        }
        
        // Reset all button states first
        this.resetAllButtonStates();
        
        // Find and set the current button's state
        const currentButton = document.getElementById(`btn-${key.replace('Arrow', '').toLowerCase()}`);
        if (currentButton) {
            // Use the class from the CSS, not direct style manipulation
            currentButton.classList.remove('inactive');
            currentButton.classList.add('active-btn');
        }
        
        // Only trigger movement if quadrant changed
        if (this.currentQuadrant !== key) {
            this.currentQuadrant = key;
            
            // Trigger the movement
            this.handleDirectionalInput(key);
            
            // Start continuous movement in this direction
            this.startContinuousMovement(key);
        }
    }

    resetAllButtonHighlights() {
        const buttons = [
            document.getElementById('btn-up'),
            document.getElementById('btn-right'),
            document.getElementById('btn-down'),
            document.getElementById('btn-left')
        ];
        
        buttons.forEach(button => {
            if (button) {
                button.classList.remove('active-btn');
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }
        });
    }

    updateButtonHighlights(activeKey) {
        // Get all buttons
        const buttons = {
            up: document.getElementById('btn-up'),
            right: document.getElementById('btn-right'),
            down: document.getElementById('btn-down'),
            left: document.getElementById('btn-left')
        };
        
        // First, mark all buttons as inactive
        for (const button of Object.values(buttons)) {
            if (button) {
                button.className = 'inactive'; // Replace all classes with 'inactive'
            }
        }
        
        // Then, mark only the active button
        let activeButton = null;
        switch (activeKey) {
            case 'ArrowUp': activeButton = buttons.up; break;
            case 'ArrowRight': activeButton = buttons.right; break;
            case 'ArrowDown': activeButton = buttons.down; break;
            case 'ArrowLeft': activeButton = buttons.left; break;
        }
        
        if (activeButton) {
            activeButton.className = 'active-btn'; // Replace all classes with 'active-btn'
        }
    }

    // New helper method for highlighting a button by key
    highlightButtonByKey(key) {
        switch (key) {
            case 'ArrowUp':
                document.getElementById('btn-up').style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                break;
            case 'ArrowRight':
                document.getElementById('btn-right').style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                break;
            case 'ArrowDown':
                document.getElementById('btn-down').style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                break;
            case 'ArrowLeft':
                document.getElementById('btn-left').style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
                break;
        }
    }
        
    // Enable continuous movement when holding a direction
    startContinuousMovement(key) {
        // Clear any existing interval
        this.stopContinuousMovement();
        
        // Store the key being held
        this.heldKey = key;
        
        // Use the game's update interval for consistent timing
        const moveInterval = this.game.config.get('gameLoop.updateInterval');
        
        // Set an interval to repeatedly move in that direction
        this.moveInterval = setInterval(() => {
            this.handleDirectionalInput(this.heldKey);
        }, moveInterval);
    }
    
    stopContinuousMovement() {
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
        this.heldKey = null;
        
        // Reset all button highlights when movement stops
        this.resetAllButtonHighlights();
    }
    
    handleDirectionalInput(key) {
        // Check if game is over
        if (this.game.isGameOver) {
            if (key === 'Enter') {
                console.log("Enter input received while game over - restarting game");
                if (typeof endGameAndShowSplash === 'function') {
                    endGameAndShowSplash();
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

        // Ctrl+V to toggle touch controls
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            this.toggleForceTouchControls();
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

    // Method to toggle touch controls for testing
    toggleForceTouchControls() {
        this.forceShowTouchControls = !this.forceShowTouchControls;
        
        // Remove existing controls
        const existingControls = document.getElementById('touch-controls');
        if (existingControls) {
            existingControls.remove();
        }
        
        // Reinitialize touch controls
        this.initializeTouchControls();
        
        console.log(`Force touch controls: ${this.forceShowTouchControls ? 'ON' : 'OFF'}`);
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
    
    updateTouchControlsForOrientation() {
        if (!this.isTouchDevice && !this.forceShowTouchControls && !this.touchControls) return;
        
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // Position controls on the left side in landscape mode
            this.touchControls.style.left = '20px';
            this.touchControls.style.bottom = '150px'; // Increased from 100px to match initial position
            this.touchControls.style.right = 'auto';
        } else {
            // Position controls on left side in portrait mode too
            this.touchControls.style.left = '20px';
            this.touchControls.style.bottom = '150px'; // Increased from 100px to match initial position
        }
    }
}