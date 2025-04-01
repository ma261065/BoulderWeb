class Wall extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.WALL);
    }
    
    update(grid) {
        // Walls don't update
        return false;
    }
    
    draw(ctx, x, y) {
        // Use the sprite if available
        if (window.spriteManager && window.spriteManager.getSprite('wall')) {
            ctx.drawImage(window.spriteManager.getSprite('wall'), x, y, TILE_SIZE, TILE_SIZE);
        } else {
            // Fallback to drawing a rectangle
            ctx.fillStyle = '#555';
            ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
    }
}