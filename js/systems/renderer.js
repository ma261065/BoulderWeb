class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Fixed tile size - never changes
        this.TILE_SIZE = 32;
        
        // Viewport dimensions (will be calculated based on canvas display size)
        this.viewport = {
            x: 0,
            y: 0,
            width: 0,
            height: 0
        };
        
        // Ensure crisp pixel rendering
        this.ctx.imageSmoothingEnabled = false;
        
        // Set up resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle initial sizing
        this.handleResize();
    }
    
    handleResize() {
        // Get the container size
        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();
        
        // Calculate available space (accounting for info panel, etc.)
        // Subtract some space for other elements to prevent scrollbars
        const availableWidth = containerRect.width;
        const availableHeight = window.innerHeight - 150; // Space for header, info panel, etc.
        
        // Calculate how many tiles can fit in the available space
        const tilesWide = Math.floor(availableWidth / this.TILE_SIZE);
        const tilesHigh = Math.floor(availableHeight / this.TILE_SIZE);
        
        // Set canvas size to exactly fit these tiles (no partial tiles)
        this.canvas.width = tilesWide * this.TILE_SIZE;
        this.canvas.height = tilesHigh * this.TILE_SIZE;
        
        // Update viewport dimensions
        this.viewport.width = Math.min(tilesWide, GRID_WIDTH);
        this.viewport.height = Math.min(tilesHigh, GRID_HEIGHT);
        
        // Center viewport on player if possible
        if (this.game && this.game.player) {
            this.centerViewportOnPlayer();
        }
        
        // Redraw the game with the new viewport
        this.drawGame();
    }
    
    centerViewportOnPlayer() {
        if (!this.game || !this.game.player) return;
        
        // Calculate viewport position that centers the player
        this.viewport.x = Math.floor(this.game.player.x - this.viewport.width / 2);
        this.viewport.y = Math.floor(this.game.player.y - this.viewport.height / 2);
        
        // Clamp viewport to grid boundaries
        this.clampViewport();
    }
    
    clampViewport() {
        // Ensure viewport stays within grid boundaries
        this.viewport.x = Math.max(0, Math.min(GRID_WIDTH - this.viewport.width, this.viewport.x));
        this.viewport.y = Math.max(0, Math.min(GRID_HEIGHT - this.viewport.height, this.viewport.y));
    }
    
    updateViewportPosition() {
        if (!this.game || !this.game.player) return false;
        
        const playerX = this.game.player.x;
        const playerY = this.game.player.y;
        
        // Only update if we're not showing the full grid
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            // Always center the viewport on the player
            // Calculate ideal center position
            const idealX = Math.floor(playerX - this.viewport.width / 2);
            const idealY = Math.floor(playerY - this.viewport.height / 2);
            
            // Check if viewport position needs to change
            let changed = false;
            if (this.viewport.x !== idealX || this.viewport.y !== idealY) {
                // Update viewport to center on player
                this.viewport.x = idealX;
                this.viewport.y = idealY;
                changed = true;
            }
            
            // Ensure viewport stays within grid boundaries
            this.clampViewport();
            
            return changed;
        }
        
        return false;
    }
    
    // SIMPLIFIED: Single method to draw any entity type
    drawEntity(entityType, x, y) {
        const spriteNames = {
            [ENTITY_TYPES.WALL]: 'wall',
            [ENTITY_TYPES.DIRT]: 'dirt', 
            [ENTITY_TYPES.BOULDER]: 'boulder',
            [ENTITY_TYPES.DIAMOND]: 'diamond',
            [ENTITY_TYPES.PLAYER]: 'player',
            [ENTITY_TYPES.EXIT]: 'exit'
        };
        
        const fallbacks = {
            [ENTITY_TYPES.WALL]: () => {
                this.ctx.fillStyle = '#555';
                this.ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
            },
            [ENTITY_TYPES.DIRT]: () => {
                this.ctx.fillStyle = '#8B4513';
                this.ctx.fillRect(x + 2, y + 2, this.TILE_SIZE - 4, this.TILE_SIZE - 4);
            },
            [ENTITY_TYPES.BOULDER]: () => {
                this.ctx.fillStyle = '#AAA';
                this.ctx.beginPath();
                this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, this.TILE_SIZE/2 - 4, 0, Math.PI * 2);
                this.ctx.fill();
            },
            [ENTITY_TYPES.DIAMOND]: () => {
                this.ctx.fillStyle = '#00FFFF';
                this.ctx.beginPath();
                this.ctx.arc(x + this.TILE_SIZE/2, y + this.TILE_SIZE/2, this.TILE_SIZE/2 - 4, 0, Math.PI * 2);
                this.ctx.fill();
            },
            [ENTITY_TYPES.PLAYER]: () => {
                this.ctx.fillStyle = '#FF0000';
                this.ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
            },
            [ENTITY_TYPES.EXIT]: () => {
                this.ctx.fillStyle = '#00FF00';
                this.ctx.fillRect(x, y, this.TILE_SIZE, this.TILE_SIZE);
            }
        };
        
        const spriteName = spriteNames[entityType];
        if (spriteName && window.spriteManager && window.spriteManager.getSprite(spriteName)) {
            this.ctx.drawImage(window.spriteManager.getSprite(spriteName), x, y, this.TILE_SIZE, this.TILE_SIZE);
        } else if (fallbacks[entityType]) {
            fallbacks[entityType]();
        }
    }
    
    drawGame() {
        // Ensure grid and viewport are available
        if (!this.game || !this.game.grid || this.game.grid.length === 0 || !this.viewport) {
            console.warn('Cannot draw game: grid or viewport not available');
            return;
        }
        
        // Clear the entire canvas first
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw black background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate offset to center the visible part of the grid
        const gameWidth = this.viewport.width * this.TILE_SIZE;
        const gameHeight = this.viewport.height * this.TILE_SIZE;
        const offsetX = Math.floor((this.canvas.width - gameWidth) / 2);
        const offsetY = Math.floor((this.canvas.height - gameHeight) / 2);
        
        // Draw each visible tile
        for (let y = 0; y < this.viewport.height; y++) {
            for (let x = 0; x < this.viewport.width; x++) {
                // Convert viewport coordinates to grid coordinates
                const gridX = x + this.viewport.x;
                const gridY = y + this.viewport.y;
                
                // Skip if outside grid boundaries
                if (gridX < 0 || gridY < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) {
                    continue;
                }
                
                // Skip if grid position doesn't exist (safety check)
                if (!this.game.grid[gridY] || typeof this.game.grid[gridY][gridX] === 'undefined') {
                    continue;
                }
                
                // Get tile type from grid
                const tileType = this.game.grid[gridY][gridX];
                
                // Skip empty tiles
                if (tileType === ENTITY_TYPES.EMPTY) {
                    continue;
                }
                
                // Calculate drawing position
                const drawX = x * this.TILE_SIZE + offsetX;
                const drawY = y * this.TILE_SIZE + offsetY;
                
                // NEW: Check if there's a specific entity at this position with a custom draw method
                const entity = this.game.entities.get(`${gridX},${gridY}`);
                
                if (entity && typeof entity.draw === 'function') {
                    // Use the entity's custom draw method (for animated player, etc.)
                    entity.draw(this.ctx, drawX, drawY, this.TILE_SIZE);
                } else {
                    // Fallback to generic drawing method
                    this.drawEntity(tileType, drawX, drawY);
                }
            }
        }
        
        // Draw mini-map if not showing entire grid
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            this.drawMiniMap();
        }
    }
    
    drawMiniMap() {
        // Skip if canvas is too small for a meaningful mini-map
        if (this.canvas.width < 200 || this.canvas.height < 200) return;
        
        // Mini-map settings
        const mapSize = Math.min(100, Math.min(this.canvas.width, this.canvas.height) * 0.2);
        const padding = 10;
        const mapX = this.canvas.width - mapSize - padding;
        const mapY = this.canvas.height - mapSize - padding;
        
        // Calculate scaling
        const scaleX = mapSize / GRID_WIDTH;
        const scaleY = mapSize / GRID_HEIGHT;
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(mapX, mapY, mapSize, mapSize);
        
        // Draw grid outline
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        
        // Draw viewport rectangle
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            mapX + this.viewport.x * scaleX,
            mapY + this.viewport.y * scaleY,
            this.viewport.width * scaleX,
            this.viewport.height * scaleY
        );
        
        // Draw player position
        if (this.game && this.game.player) {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.beginPath();
            this.ctx.arc(
                mapX + this.game.player.x * scaleX,
                mapY + this.game.player.y * scaleY,
                3, 0, Math.PI * 2
            );
            this.ctx.fill();
        }
    }

    addRestartButton() {
        // Remove any existing restart button first
        this.removeRestartButton();
        
        // Create restart button
        const restartButton = document.createElement('button');
        restartButton.id = 'restart-button';
        restartButton.textContent = 'Restart Game';
        
        // Add click handler
        restartButton.addEventListener('click', () => {
            if (typeof endGameAndShowSplash === 'function') {
                endGameAndShowSplash();
            } else {
                this.removeRestartButton();
                window.gameInstance = new Game();
            }
        });
        
        // Add to document body
        document.body.appendChild(restartButton);
    }
    
    removeRestartButton() {
        const existingButton = document.getElementById('restart-button');
        if (existingButton) {
            existingButton.remove();
        }
    }
    
    drawMessage(message, subMessage, color) {
        // Draw semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw main message
        this.ctx.fillStyle = color || '#FFFFFF';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        // Draw sub-message if provided
        if (subMessage) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(subMessage, this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
        
        // Add restart button for mobile devices
        this.addRestartButton();
    }
    
    updateUI(level, diamondsCollected, diamondsNeeded, timeLeft) {
        const levelInfo = document.getElementById('level-info');
        const diamondsInfo = document.getElementById('diamonds-info');
        const timeInfo = document.getElementById('time-info');
        
        if (levelInfo) levelInfo.textContent = `Level: ${level}`;
        if (diamondsInfo) diamondsInfo.textContent = `Diamonds: ${diamondsCollected}/${diamondsNeeded}`;
        if (timeInfo) timeInfo.textContent = `Time: ${timeLeft}`;
    }
}