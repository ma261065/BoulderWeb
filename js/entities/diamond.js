class Diamond extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIAMOND);
        this.falling = false;
        this.justLanded = false;
        this.fallStarted = false; // Track if this diamond has started falling
    }
    
    update(grid) {
        this.justLanded = false;
        const wasFalling = this.falling;
        this.falling = false;
        
        let moved = false;
        const effects = []; // Collect all effects to return
        
        // Check if we can fall straight down - ONE TILE MOVEMENT ONLY
        if (Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            
            if (belowType === ENTITY_TYPES.EMPTY) {
                // Fall into empty space
                this.y++;
                this.falling = true;
                this.fallStarted = true;
                moved = true;
                
            } else if (belowType === ENTITY_TYPES.PLAYER && this.fallStarted) {
                // Only fall into player space if already falling
                // This prevents "instant death" when player moves under stationary diamond
                this.y++;
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
                
                this.x--;
                this.fallStarted = true; // Rolling also counts as starting to fall
                moved = true;
            }
            // Try rolling right
            else if (Entity.isInBounds(this.x + 1, this.y) && 
                    Entity.isInBounds(this.x + 1, this.y + 1) && 
                    grid[this.y][this.x + 1] === ENTITY_TYPES.EMPTY && 
                    grid[this.y + 1][this.x + 1] === ENTITY_TYPES.EMPTY) {
                
                this.x++;
                this.fallStarted = true; // Rolling also counts as starting to fall
                moved = true;
            }
        }
        
        // IMPORTANT: Reset fallStarted if diamond is now resting on solid support
        if (!moved && Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            if (belowType === ENTITY_TYPES.WALL || 
                belowType === ENTITY_TYPES.DIRT || 
                belowType === ENTITY_TYPES.BOULDER || 
                belowType === ENTITY_TYPES.DIAMOND) {
                // Diamond is supported by something solid - reset fallStarted
                this.fallStarted = false;
            }
        }
        
        // Check if we just stopped falling (for sound)
        if (wasFalling && !this.falling) {
            this.justLanded = true;
            effects.push({
                type: EFFECT_TYPES.SOUND,
                sound: 'diamond'
            });
        }
        
        // Return both movement status and effects
        return { moved, effects };
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a diamond shape
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}