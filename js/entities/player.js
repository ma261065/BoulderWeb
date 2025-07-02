// Updated Player class with debug logging
class Player extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.PLAYER);
        
        // Animation properties
        this.currentDirection = null; // 'up', 'down', 'left', 'right', or null
        this.animationFrame = 1; // 1 or 2
        this.baseSprite = 'player'; // Default sprite when not moving
        this.isPushing = false; // Whether player is pushing a boulder
        this.lastMoveTime = 0; // Track when player last moved
    }
    
    // Set movement direction (called when player moves)
    setMovementDirection(direction, isPushing = false) {
        this.currentDirection = direction;
        this.isPushing = isPushing;
        this.animationFrame = 1; // Start with frame 1
        this.lastMoveTime = performance.now(); // Record when movement started
    }
    
    // Clear movement direction (called when player stops)
    clearMovementDirection() {
        this.currentDirection = null;
        this.isPushing = false;
        this.animationFrame = 1;
        console.log(`Player movement direction cleared`);
    }
    
    // Unified tick method - handles both physics and animation
    tick(isPhysicsTick) {
        if (isPhysicsTick) {
            // PHYSICS TICK: Handle physics-related logic
            // Auto-clear animation if enough time has passed since last movement
            if (this.currentDirection && this.lastMoveTime) {
                const timeSinceMove = performance.now() - this.lastMoveTime;
                if (timeSinceMove > 150) { // 150ms timeout
                    this.clearMovementDirection();
                }
            }
            return false; // No visual change needed
            
        } else {
            // ANIMATION TICK: Update animation frame
            if (this.currentDirection) {
                // Toggle between frame 1 and 2
                this.animationFrame = this.animationFrame === 1 ? 2 : 1;
                return true; // Visual change needed
            }
            return false; // No animation, no visual change
        }
    }
    
    // Get the current sprite name based on animation state
    getCurrentSprite() {
        if (!this.currentDirection) {
            return this.baseSprite;
        }
        
        // If pushing, use static pushing sprites (no animation frames)
        if (this.isPushing && (this.currentDirection === 'left' || this.currentDirection === 'right')) {
            const pushSprite = this.currentDirection === 'right' ? 'playerpushr' : 'playerpushl';
            return pushSprite;
        }
        
        // Return appropriate regular movement sprite name (lowercase to match SPRITE_PATHS)
        switch(this.currentDirection) {
            case 'right':
                return `playerr${this.animationFrame}`;
            case 'left':
                return `playerl${this.animationFrame}`;
            case 'up':
                return `playeru${this.animationFrame}`;
            case 'down':
                return `playerd${this.animationFrame}`;
            default:
                return this.baseSprite;
        }
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        const spriteName = this.getCurrentSprite();
        
        // Try to use the animated sprite
        if (window.spriteManager && window.spriteManager.getSprite(spriteName)) {
            ctx.drawImage(window.spriteManager.getSprite(spriteName), x, y, tileSize, tileSize);
        } 

        // Fallback to base sprite if animated sprite not found
        else if (window.spriteManager && window.spriteManager.getSprite(this.baseSprite)) {
            ctx.drawImage(window.spriteManager.getSprite(this.baseSprite), x, y, tileSize, tileSize);
        }
        // Final fallback to simple rectangle
        else {
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
    }
}