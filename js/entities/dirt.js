class Dirt extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.DIRT);
    }
    
    update(grid) {
        // Dirt doesn't update
        return false;
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('dirt')) {
            ctx.drawImage(window.spriteManager.getSprite('dirt'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a rectangle
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
    }
}