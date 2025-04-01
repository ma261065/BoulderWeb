class InputManager {
    constructor(game) {
        this.game = game;
        this.keysPressed = new Set();
        this.lastMoveTime = 0;
        this.moveDelay = 150; // Milliseconds between allowed moves (adjust as needed)
        
        // Add keyboard listeners
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    handleKeyDown(e) {
        // If game is over, check for restart
        if (this.game.isGameOver) {
            if (e.key === 'Enter') {
                this.game.restart();
            }
            return;
        }
        
        this.keysPressed.add(e.key);
        
        // Get current time
        const currentTime = Date.now();
        
        // Only process movement if enough time has elapsed since last move
        if (currentTime - this.lastMoveTime >= this.moveDelay) {
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    // Prevent scrolling when using arrow keys
                    e.preventDefault();
                    
                    if (this.processPlayerMovement(e.key)) {
                        // Only update lastMoveTime if player actually moved
                        this.lastMoveTime = currentTime;
                    }
                    break;
            }
        }
    }
    
    handleKeyUp(e) {
        this.keysPressed.delete(e.key);
    }
    
    processPlayerMovement(key) {
        if (!this.game.player) return false;
        
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
        
        if (dx !== 0 || dy !== 0) {
            const moved = this.game.player.tryMove(
                this.game.grid, 
                dx, 
                dy, 
                this.game.soundManager,
                this.game
            );
            
            if (moved) {
                this.game.renderer.drawGame();
                return true;
            }
        }
        
        return false;
    }
}