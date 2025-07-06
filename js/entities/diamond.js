class Diamond extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIAMOND);
        this.falling = false;
        this.justLanded = false;
        this.fallStarted = false;
        this.showSparkle = false; // Simple flag for this tick only
    }
    
    update(grid) {
        this.justLanded = false;
        const wasFalling = this.falling;
        this.falling = false;
        
        let moved = false;
        const effects = [];
        
        // Reset sparkle each tick
        this.showSparkle = false;
        
        // Check if we can fall straight down
        if (Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            
            if (belowType === ENTITY_TYPES.EMPTY) {
                this.y++;
                this.falling = true;
                this.fallStarted = true;
                moved = true;
                
            } else if (belowType === ENTITY_TYPES.PLAYER && this.fallStarted) {
                this.y++;
                this.falling = true;
                moved = true;
            }
        }
        
        // Try rolling off boulders/diamonds
        if (!moved && Entity.isInBounds(this.x, this.y + 1) && 
            (grid[this.y + 1][this.x] === ENTITY_TYPES.BOULDER || 
             grid[this.y + 1][this.x] === ENTITY_TYPES.DIAMOND)) {
            
            if (Entity.isInBounds(this.x - 1, this.y) && 
                Entity.isInBounds(this.x - 1, this.y + 1) && 
                grid[this.y][this.x - 1] === ENTITY_TYPES.EMPTY && 
                grid[this.y + 1][this.x - 1] === ENTITY_TYPES.EMPTY) {
                
                this.x--;
                this.fallStarted = true;
                moved = true;
            }
            else if (Entity.isInBounds(this.x + 1, this.y) && 
                    Entity.isInBounds(this.x + 1, this.y + 1) && 
                    grid[this.y][this.x + 1] === ENTITY_TYPES.EMPTY && 
                    grid[this.y + 1][this.x + 1] === ENTITY_TYPES.EMPTY) {
                
                this.x++;
                this.fallStarted = true;
                moved = true;
            }
        }
        
        // Reset fallStarted if resting on solid support
        if (!moved && Entity.isInBounds(this.x, this.y + 1)) {
            const belowType = grid[this.y + 1][this.x];
            if (belowType === ENTITY_TYPES.WALL || 
                belowType === ENTITY_TYPES.DIRT || 
                belowType === ENTITY_TYPES.BOULDER || 
                belowType === ENTITY_TYPES.DIAMOND) {
                this.fallStarted = false;
            }
        }
        
        // Landing sound
        if (wasFalling && !this.falling) {
            this.justLanded = true;
            effects.push({
                type: EFFECT_TYPES.SOUND,
                sound: 'diamond'
            });
        }
        
        // Simple sparkle: roughly 1 in 100 chance for still diamonds
        if (!this.falling && !moved && Math.random() < 0.01) {
            this.showSparkle = true;
        }
        
        return { moved, effects };
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Draw base diamond, or draw sparkle overlay if active this tick
        if (this.showSparkle && window.spriteManager && window.spriteManager.getSprite('diamondsparkle')) {
            ctx.drawImage(window.spriteManager.getSprite('diamondsparkle'), x, y, tileSize, tileSize);
        }
        else if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, tileSize, tileSize);
        } else {
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}