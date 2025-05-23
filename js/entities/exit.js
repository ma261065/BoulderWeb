class Exit extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.EXIT);
    }
    
    update(grid) {
        // Exit doesn't update
        return false;
    }
    
    draw(ctx, x, y, tileSize = TILE_SIZE) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('exit')) {
            ctx.drawImage(window.spriteManager.getSprite('exit'), x, y, tileSize, tileSize);
        } else {
            // Fallback to drawing a rectangle
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
    }
}