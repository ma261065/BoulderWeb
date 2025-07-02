class Boulder extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.BOULDER);
        this.falling = false;
        this.justLanded = false;
        this.fallStarted = false;
    }
    
    update(grid) {
        this.justLanded = false;
        const wasFalling = this.falling;
        this.falling = false;
        
        let moved = false;
        const effects = []; // Collect all effects to return
        
        // Check if we can fall straight down
        if (Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            
            if (belowType === ENTITY_TYPES.EMPTY) {
                // Fall into empty space
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.y++;
                grid[this.y][this.x] = this.type;
                this.falling = true;
                this.fallStarted = true;
                moved = true;
                
            } else if (belowType === ENTITY_TYPES.DIAMOND) {
                // Squash the diamond and stop (diamond was supported by something solid)
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.y++;
                grid[this.y][this.x] = this.type;
                this.fallStarted = true;
                moved = true;
                
                // Add effects for squashing diamond
                effects.push({
                    type: EFFECT_TYPES.REMOVE,
                    x: this.x,
                    y: this.y
                });
                effects.push({
                    type: EFFECT_TYPES.SOUND,
                    sound: 'squash'
                });
                
            } else if (belowType === ENTITY_TYPES.PLAYER && this.fallStarted) {
                // Only fall into player space if already falling
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.y++;
                grid[this.y][this.x] = this.type;
                this.falling = true;
                moved = true;
            }
        }
        
        // If we can't fall, check if we can roll off something (boulder or diamond)
        if (!moved && Entity.isInBounds(this.x, this.y + 1) && 
            (grid[this.y + 1][this.x] === ENTITY_TYPES.BOULDER || 
             grid[this.y + 1][this.x] === ENTITY_TYPES.DIAMOND)) {
            
            // Try rolling left first
            if (Entity.isInBounds(this.x - 1, this.y) && 
                Entity.isInBounds(this.x - 1, this.y + 1) && 
                grid[this.y][this.x - 1] === ENTITY_TYPES.EMPTY && 
                grid[this.y + 1][this.x - 1] === ENTITY_TYPES.EMPTY) {
                
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.x--;
                grid[this.y][this.x] = this.type;
                this.fallStarted = true;
                moved = true;
            }
            // Try rolling right
            else if (Entity.isInBounds(this.x + 1, this.y) && 
                    Entity.isInBounds(this.x + 1, this.y + 1) && 
                    grid[this.y][this.x + 1] === ENTITY_TYPES.EMPTY && 
                    grid[this.y + 1][this.x + 1] === ENTITY_TYPES.EMPTY) {
                
                grid[this.y][this.x] = ENTITY_TYPES.EMPTY;
                this.x++;
                grid[this.y][this.x] = this.type;
                this.fallStarted = true;
                moved = true;
            }
        }
        
        // Reset fallStarted if boulder is now resting on solid support
        if (!moved && Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            if (belowType === ENTITY_TYPES.WALL || 
                belowType === ENTITY_TYPES.DIRT || 
                belowType === ENTITY_TYPES.BOULDER || 
                belowType === ENTITY_TYPES.DIAMOND) {
                this.fallStarted = false;
            }
        }
        
        // Check if we just stopped falling and add landing sound (if no other sound added)
        if (wasFalling && !this.falling) {
            this.justLanded = true;
            
            // Only add boulder landing sound if we haven't already added a sound effect
            const hasSoundEffect = effects.some(effect => effect.type === EFFECT_TYPES.SOUND);
            if (!hasSoundEffect) {
                effects.push({
                    type: EFFECT_TYPES.SOUND,
                    sound: 'boulder'
                });
            }
        }
        
        // Return both movement status and effects
        return { moved, effects };
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('boulder')) {
            ctx.drawImage(window.spriteManager.getSprite('boulder'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a circle
            ctx.fillStyle = '#AAA';
            ctx.beginPath();
            ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}