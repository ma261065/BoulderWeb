class Player extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.PLAYER);
        
        // Track movement state for smooth input handling
        this.isMoving = false;
        this.lastMoveTime = 0;
        this.moveDelay = 100; // Minimum time between moves in ms
    }
    
    update(grid) {
        // Player is controlled by user input, not by automatic updates
        return false;
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('player')) {
            ctx.drawImage(
                window.spriteManager.getSprite('player'), 
                x, y, 
                tileSize, tileSize
            );
        } else {
            // Fallback to drawing a rectangle with smaller margins
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }
    
    // ENHANCED: Improved movement method with better input handling
    tryMove(grid, dx, dy, soundManager, game) {
        // Prevent rapid movement to avoid input flooding
        const currentTime = Date.now();
        if (this.isMoving || (currentTime - this.lastMoveTime) < this.moveDelay) {
            return false;
        }
        
        // Validate movement direction (only allow cardinal directions)
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (Math.abs(dx) + Math.abs(dy)) !== 1) {
            console.warn(`Invalid movement direction: dx=${dx}, dy=${dy}`);
            return false;
        }
        
        this.isMoving = true;
        this.lastMoveTime = currentTime;
        
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        // Check bounds
        if (!Entity.isInBounds(newX, newY)) {
            this.isMoving = false;
            return false;
        }
        
        const destType = grid[newY][newX];
        
        // Check destination type
        if (destType === ENTITY_TYPES.WALL) {
            this.isMoving = false;
            return false;
        }
        
        if (destType === ENTITY_TYPES.BOULDER) {
            // Check if boulder can be pushed
            const pushDestX = newX + dx;
            
            // Can only push if:
            // 1. The destination is in bounds
            // 2. The destination is empty (not a wall, not another boulder, etc.)
            if (Entity.isInBounds(pushDestX, newY) && grid[newY][pushDestX] === ENTITY_TYPES.EMPTY) {
                // Move the boulder
                grid[newY][pushDestX] = ENTITY_TYPES.BOULDER;
                grid[newY][newX] = ENTITY_TYPES.EMPTY;
                
                if (soundManager) {
                    soundManager.playSound('boulder');
                }
                
                // Now move the player
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.x = newX;
                this.y = newY;
                grid[this.y][this.x] = this.type;
                
                // Update entity instances in level manager to reflect the pushed boulder
                if (game.levelManager) {
                    game.levelManager.updateEntityPosition(ENTITY_TYPES.BOULDER, newX, newY, pushDestX, newY);
                }
                
                // Force immediate entity sync to avoid visual glitches
                game.syncEntitiesWithGrid();
                
                // Force immediate viewport update
                this.updateViewport(game);
                
                this.isMoving = false;
                return true;
            }
            // If cannot push the boulder, the move is invalid
            this.isMoving = false;
            return false;
        }
        
        // Play appropriate sound based on destination
        if (soundManager) {
            if (destType === ENTITY_TYPES.EMPTY) {
                soundManager.playSound('move');
            } else if (destType === ENTITY_TYPES.DIRT) {
                soundManager.playSound('dig');
            } else if (destType === ENTITY_TYPES.DIAMOND) {
                soundManager.playSound('diamond');
            } else if (destType === ENTITY_TYPES.EXIT) {
                soundManager.playSound('levelComplete');
            }
        }
        
        // Handle special destinations
        if (destType === ENTITY_TYPES.DIAMOND) {
            // Collect diamond and allow movement
            if (game.collectDiamond) {
                game.collectDiamond();
            }
            
            // Remove the diamond from the grid and entity list
            grid[newY][newX] = ENTITY_TYPES.EMPTY;
            if (game.levelManager) {
                game.levelManager.removeEntityAtPosition(newX, newY);
            }
        } else if (destType === ENTITY_TYPES.EXIT) {
            // Complete the level
            if (game.levelComplete) {
                // Allow the movement first
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.x = newX;
                this.y = newY;
                grid[this.y][this.x] = this.type;
                
                // Update viewport
                this.updateViewport(game);
                
                // Complete level after a short delay to show player reaching exit
                setTimeout(() => {
                    game.levelComplete();
                }, 100);
                
                this.isMoving = false;
                return true;
            }
        }
        
        // Update grid - this is the source of truth
        grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
        this.x = newX;
        this.y = newY;
        grid[this.y][this.x] = this.type;
        
        // Force immediate entity sync to avoid visual glitches
        if (game.syncEntitiesWithGrid) {
            game.syncEntitiesWithGrid();
        }
        
        // Force immediate viewport update to maintain player centering
        this.updateViewport(game);
        
        this.isMoving = false;
        return true;
    }
    
    // ENHANCED: Better viewport update method
    updateViewport(game) {
        if (game && game.renderer) {
            try {
                // Always center the viewport on the player
                game.renderer.centerViewportOnPlayer();
                
                // Force redraw
                game.renderer.drawGame();
            } catch (error) {
                console.warn('Error updating viewport:', error);
            }
        }
    }
    
    // ADDED: Method for hybrid input manager to call directly
    move(deltaX, deltaY, game) {
        if (!game) {
            console.warn('Game instance required for player movement');
            return false;
        }
        
        return this.tryMove(
            game.grid, 
            deltaX, 
            deltaY, 
            game.soundManager, 
            game
        );
    }
    
    // ADDED: Set direction method (alternative interface)
    setDirection(deltaX, deltaY, game) {
        return this.move(deltaX, deltaY, game);
    }
    
    // ADDED: Get current position
    getPosition() {
        return { x: this.x, y: this.y };
    }
    
    // ADDED: Check if player can move in a direction
    canMove(grid, deltaX, deltaY) {
        const newX = this.x + deltaX;
        const newY = this.y + deltaY;
        
        // Check bounds
        if (!Entity.isInBounds(newX, newY)) {
            return false;
        }
        
        const destType = grid[newY][newX];
        
        // Can move to empty spaces, dirt, diamonds, and exit
        if (destType === ENTITY_TYPES.EMPTY || 
            destType === ENTITY_TYPES.DIRT || 
            destType === ENTITY_TYPES.DIAMOND || 
            destType === ENTITY_TYPES.EXIT) {
            return true;
        }
        
        // Check if boulder can be pushed
        if (destType === ENTITY_TYPES.BOULDER) {
            const pushDestX = newX + deltaX;
            return Entity.isInBounds(pushDestX, newY) && 
                   grid[newY][pushDestX] === ENTITY_TYPES.EMPTY;
        }
        
        return false;
    }
    
    // ADDED: Reset movement state (useful for input manager)
    resetMovementState() {
        this.isMoving = false;
        this.lastMoveTime = 0;
    }
    
    // ADDED: Check if player is currently moving
    getMovementState() {
        return {
            isMoving: this.isMoving,
            lastMoveTime: this.lastMoveTime,
            canMoveNow: !this.isMoving && (Date.now() - this.lastMoveTime) >= this.moveDelay
        };
    }
    
    // ADDED: Adjust movement delay for different input types
    setMoveDelay(delay) {
        this.moveDelay = Math.max(50, Math.min(500, delay)); // Clamp between 50-500ms
    }
    
    // ADDED: Force immediate movement (for special cases)
    forceMove(grid, deltaX, deltaY, soundManager, game) {
        const wasMoving = this.isMoving;
        this.isMoving = false;
        this.lastMoveTime = 0;
        
        const result = this.tryMove(grid, deltaX, deltaY, soundManager, game);
        
        if (!result) {
            this.isMoving = wasMoving;
        }
        
        return result;
    }
    
    // ADDED: Get valid movement directions
    getValidMoveDirections(grid) {
        const directions = [
            { name: 'up', x: 0, y: -1 },
            { name: 'down', x: 0, y: 1 },
            { name: 'left', x: -1, y: 0 },
            { name: 'right', x: 1, y: 0 }
        ];
        
        return directions.filter(dir => this.canMove(grid, dir.x, dir.y));
    }
}

// ADDED: Static helper methods for player-related operations
Player.createAt = function(x, y) {
    return new Player(x, y);
};

Player.isPlayerPosition = function(grid, x, y) {
    return Entity.isInBounds(x, y) && grid[y][x] === ENTITY_TYPES.PLAYER;
};

Player.findPlayerPosition = function(grid) {
    const gridHeight = grid.length;
    const gridWidth = grid[0] ? grid[0].length : 0;
    
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (grid[y][x] === ENTITY_TYPES.PLAYER) {
                return { x, y };
            }
        }
    }
    
    return null;
};