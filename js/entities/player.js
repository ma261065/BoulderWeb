class Player extends Entity {
    constructor(x, y) {
        super(x, y, ENTITY_TYPES.PLAYER);
    }
    
    update(grid) {
        // Player movement is handled by the main game loop, not here
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
            // Fallback to drawing a rectangle
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }
}