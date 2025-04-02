class InputManager {
    constructor(game) {
        this.game = game;
        this.keysPressed = new Set();
        this.lastMoveTime = 0;
        
        // Use config for move delay
        this.moveDelay = this.game.config.get('player.moveDelay') || 150;
        
        // Initialize input listeners
        this.initializeListeners();
    }
    
    initializeListeners() {
        // Add keyboard event listeners
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Optional: Touch/mobile support
        this.initializeTouchControls();
    }
    
    initializeTouchControls() {
        const gameContainer = document.getElementById('game-container');
        
        // Create touch control overlay
        this.createTouchControlOverlay(gameContainer);
    }
    
    createTouchControlOverlay(container) {
        // Create a touch control div
        const touchControls = document.createElement('div');
        touchControls.id = 'touch-controls';
        
        // Styling to prevent overlapping and improve usability
        Object.assign(touchControls.style, {
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            display: 'flex',
            justifyContent: 'center',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: '10'
        });
        
        // Create directional buttons
        const directions = [
            { key: 'ArrowUp', label: '↑' },
            { key: 'ArrowDown', label: '↓' },
            { key: 'ArrowLeft', label: '←' },
            { key: 'ArrowRight', label: '→' }
        ];
        
        directions.forEach(dir => {
            const button = document.createElement('button');
            button.textContent = dir.label;
            button.dataset.key = dir.key;
            
            // Styling for touch buttons
            Object.assign(button.style, {
                margin: '0 10px',
                padding: '10px 15px',
                fontSize: '16px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '5px',
                cursor: 'pointer'
            });
            
            // Touch and mouse event handlers
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleDirectionalInput(dir.key);
                button.style.backgroundColor = 'rgba(255,255,255,0.4)';
            }, { passive: false });
            
            button.addEventListener('touchend', () => {
                button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            });
            
            button.addEventListener('mousedown', (e) => {
                this.handleDirectionalInput(dir.key);
                button.style.backgroundColor = 'rgba(255,255,255,0.4)';
            });
            
            button.addEventListener('mouseup', () => {
                button.style.backgroundColor = 'rgba(255,255,255,0.2)';
            });
            
            touchControls.appendChild(button);
        });
        
        container.appendChild(touchControls);
    }
    
    handleDirectionalInput(key) {
        // Check if game is over
        if (this.game.isGameOver) {
            if (key === 'Enter') {
                this.game.restart();
            }
            return;
        }
        
        // Get current time
        const currentTime = Date.now();
        
        // Only process movement if enough time has elapsed
        if (currentTime - this.lastMoveTime >= this.moveDelay) {
            if (this.processPlayerMovement(key)) {
                // Update last move time only if player moved
                this.lastMoveTime = currentTime;
            }
        }
    }
    
    handleKeyDown(e) {
        // Game over restart
        if (this.game.isGameOver) {
            if (e.key === 'Enter') {
                this.game.restart();
            }
            return;
        }
        
        // Track pressed keys
        this.keysPressed.add(e.key);
        
        // Get current time
        const currentTime = Date.now();
        
        // Only process movement if enough time has elapsed
        if (currentTime - this.lastMoveTime >= this.moveDelay) {
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    // Prevent scrolling
                    e.preventDefault();
                    
                    if (this.processPlayerMovement(e.key)) {
                        // Update last move time only if player moved
                        this.lastMoveTime = currentTime;
                    }
                    break;
            }
        }
    }
    
    handleKeyUp(e) {
        // Remove released key from tracking
        this.keysPressed.delete(e.key);
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
        
        // Attempt to move player
        if (dx !== 0 || dy !== 0) {
            const moved = this.game.player.tryMove(
                this.game.grid, 
                dx, 
                dy, 
                this.game.soundManager,
                this.game
            );
            
            if (moved) {
                // Redraw game after successful move
                this.game.renderer.drawGame();
                return true;
            }
        }
        
        return false;
    }
}