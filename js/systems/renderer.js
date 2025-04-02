class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize viewport property
        this.viewport = null;
        
        // Ensure crisp pixel rendering
        this.ctx.imageSmoothingEnabled = false;
    }
    
    // Method to calculate the visible portion of the grid
    calculateViewport() {
        // Get canvas dimensions
        const canvas = document.getElementById('gameCanvas');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        // Get computed style (actual display size)
        const computedStyle = window.getComputedStyle(canvas);
        const displayWidth = parseFloat(computedStyle.width);
        const displayHeight = parseFloat(computedStyle.height);
        
        // Define minimum tile size for playability
        const minTileSize = 32;
        
        // Calculate the tile size that would fit the entire grid
        const maxTileWidth = displayWidth / GRID_WIDTH;
        const maxTileHeight = displayHeight / GRID_HEIGHT;
        
        // Use the smaller dimension to ensure both fit
        const maxTileSize = Math.min(maxTileWidth, maxTileHeight);
        
        // Initialize viewport
        this.viewport = {
            x: 0,
            y: 0,
            width: GRID_WIDTH,
            height: GRID_HEIGHT,
            tileSize: maxTileSize,
            minTileSize: minTileSize
        };
        
        // Debug display info
        console.log("Display dimensions:", { width: displayWidth, height: displayHeight });
        console.log("Max tile size calculated:", maxTileSize);
        
        // If the tile size would be smaller than the minimum, use a scrolling viewport
        if (maxTileSize < minTileSize) {
            console.log("Using scrolling viewport with minimum tile size");
            
            // Use the minimum tile size
            this.viewport.tileSize = minTileSize;
            
            // Calculate how many tiles fit in the viewport
            this.viewport.width = Math.floor(displayWidth / minTileSize);
            this.viewport.height = Math.floor(displayHeight / minTileSize);
            
            // Ensure viewport dimensions are at least 1
            this.viewport.width = Math.max(1, this.viewport.width);
            this.viewport.height = Math.max(1, this.viewport.height);
            
            // Ensure viewport dimensions don't exceed grid size
            this.viewport.width = Math.min(this.viewport.width, GRID_WIDTH);
            this.viewport.height = Math.min(this.viewport.height, GRID_HEIGHT);
            
            // Center on player if available
            if (this.game.player) {
                this.centerViewportOnPlayer();
            }
        }
        
        console.log("Final viewport:", this.viewport);
    }
    
    // Method to center the viewport on the player
    centerViewportOnPlayer() {
        if (!this.game.player) return;
        
        // Center the viewport on the player
        this.viewport.x = Math.max(0, Math.min(
            GRID_WIDTH - this.viewport.width,
            Math.floor(this.game.player.x - this.viewport.width / 2)
        ));
        
        this.viewport.y = Math.max(0, Math.min(
            GRID_HEIGHT - this.viewport.height,
            Math.floor(this.game.player.y - this.viewport.height / 2)
        ));
    }
    
    // Method to update viewport position as player moves
    updateViewportPosition() {
        if (!this.game.player) return false;
        
        const playerX = this.game.player.x;
        const playerY = this.game.player.y;
        
        // Only update if the viewport doesn't show the full grid
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            // Define margins (20% of viewport size)
            const marginX = Math.floor(this.viewport.width * 0.2);
            const marginY = Math.floor(this.viewport.height * 0.2);
            
            let changed = false;
            
            // Check if player is too close to edges
            if (playerX < this.viewport.x + marginX) {
                this.viewport.x = Math.max(0, playerX - marginX);
                changed = true;
            } else if (playerX >= this.viewport.x + this.viewport.width - marginX) {
                this.viewport.x = Math.min(
                    GRID_WIDTH - this.viewport.width, 
                    playerX + marginX - this.viewport.width
                );
                changed = true;
            }
            
            if (playerY < this.viewport.y + marginY) {
                this.viewport.y = Math.max(0, playerY - marginY);
                changed = true;
            } else if (playerY >= this.viewport.y + this.viewport.height - marginY) {
                this.viewport.y = Math.min(
                    GRID_HEIGHT - this.viewport.height, 
                    playerY + marginY - this.viewport.height
                );
                changed = true;
            }
            
            return changed;
        }
        
        return false;
    }
    
    drawGame() {
        // Ensure grid exists before drawing
        if (!this.game.grid || this.game.grid.length === 0) {
            console.warn('Attempted to draw empty grid');
            return;
        }

        // Initialize viewport if needed
        if (!this.viewport) {
            this.calculateViewport();
            if (this.game.player) {
                this.centerViewportOnPlayer();
            }
        }

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fill background
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Get tile size from viewport
        const tileSize = this.viewport.tileSize;
        
        // Calculate the drawing dimensions
        const gameWidth = this.viewport.width * tileSize;
        const gameHeight = this.viewport.height * tileSize;
        
        // Center the game on the canvas
        const offsetX = Math.max(0, (this.canvas.width - gameWidth) / 2);
        const offsetY = Math.max(0, (this.canvas.height - gameHeight) / 2);
        
        // Draw visible portion of the grid
        for (let y = 0; y < this.viewport.height; y++) {
            for (let x = 0; x < this.viewport.width; x++) {
                const gridX = x + this.viewport.x;
                const gridY = y + this.viewport.y;
                
                // Skip if outside grid boundaries
                if (gridX < 0 || gridY < 0 || gridX >= GRID_WIDTH || gridY >= GRID_HEIGHT) {
                    continue;
                }
                
                const tileType = this.game.grid[gridY][gridX];
                const drawX = x * tileSize + offsetX;
                const drawY = y * tileSize + offsetY;
                
                // Draw based on grid value
                switch (tileType) {
                    case ENTITY_TYPES.WALL:
                        this.drawWall(drawX, drawY, tileSize);
                        break;
                    case ENTITY_TYPES.DIRT:
                        this.drawDirt(drawX, drawY, tileSize);
                        break;
                    case ENTITY_TYPES.BOULDER:
                        this.drawBoulder(drawX, drawY, tileSize);
                        break;
                    case ENTITY_TYPES.DIAMOND:
                        this.drawDiamond(drawX, drawY, tileSize);
                        break;
                    case ENTITY_TYPES.PLAYER:
                        this.drawPlayer(drawX, drawY, tileSize);
                        break;
                    case ENTITY_TYPES.EXIT:
                        this.drawExit(drawX, drawY, tileSize);
                        break;
                }
            }
        }
        
        // Draw mini-map if we're not seeing the whole grid
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            this.drawMiniMap();
        }
    }

    // Add this new method to renderer.js for showing a mini-map
    drawMiniMap() {
        // Parameters for mini-map
        const mapSize = 120;  // Size of the mini-map in pixels
        const padding = 10;   // Padding from the edge
        const mapX = this.canvas.width - mapSize - padding;
        const mapY = this.canvas.height - mapSize - padding;
        
        // Calculate scaling factors
        const scaleX = mapSize / GRID_WIDTH;
        const scaleY = mapSize / GRID_HEIGHT;
        
        // Draw background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(mapX, mapY, mapSize, mapSize);
        
        // Draw border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        
        // Draw viewport area
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(
            mapX + this.viewport.x * scaleX,
            mapY + this.viewport.y * scaleY,
            this.viewport.width * scaleX,
            this.viewport.height * scaleY
        );
        
        // Draw player position if available
        if (this.game.player) {
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
    
    drawWall(x, y, tileSize = TILE_SIZE) {
        if (window.spriteManager && window.spriteManager.getSprite('wall')) {
            this.ctx.drawImage(window.spriteManager.getSprite('wall'), x, y, tileSize, tileSize);
        } else {
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(x, y, tileSize, tileSize);
        }
    }
    
    drawDirt(x, y, tileSize = TILE_SIZE) {
        if (window.spriteManager && window.spriteManager.getSprite('dirt')) {
            this.ctx.drawImage(window.spriteManager.getSprite('dirt'), x, y, tileSize, tileSize);
        } else {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
    }
    
    drawBoulder(x, y, tileSize = TILE_SIZE) {
        if (window.spriteManager && window.spriteManager.getSprite('boulder')) {
            this.ctx.drawImage(window.spriteManager.getSprite('boulder'), x, y, tileSize, tileSize);
        } else {
            this.ctx.fillStyle = '#AAA';
            this.ctx.beginPath();
            this.ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawDiamond(x, y, tileSize = TILE_SIZE) {
        if (window.spriteManager && window.spriteManager.getSprite('diamond')) {
            this.ctx.drawImage(window.spriteManager.getSprite('diamond'), x, y, tileSize, tileSize);
        } else {
            this.ctx.fillStyle = '#00FFFF';
            this.ctx.beginPath();
            this.ctx.arc(x + tileSize/2, y + tileSize/2, tileSize/2 - 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawPlayer(x, y, tileSize = TILE_SIZE) {
        if (window.spriteManager && window.spriteManager.getSprite('player')) {
            this.ctx.drawImage(window.spriteManager.getSprite('player'), x, y, tileSize, tileSize);
        } else {
            this.ctx.fillStyle = '#FF0000';
            this.ctx.fillRect(x, y, tileSize, tileSize);
        }
    }
    
    drawExit(x, y, tileSize = TILE_SIZE) {
        if (window.spriteManager && window.spriteManager.getSprite('exit')) {
            this.ctx.drawImage(window.spriteManager.getSprite('exit'), x, y, tileSize, tileSize);
        } else {
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(x, y, tileSize, tileSize);
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
    }
    
    updateUI(level, diamondsCollected, diamondsNeeded, timeLeft) {
        const levelInfo = document.getElementById('level-info');
        const diamondsInfo = document.getElementById('diamonds-info');
        const timeInfo = document.getElementById('time-info');
        
        levelInfo.textContent = `Level: ${level}`;
        diamondsInfo.textContent = `Diamonds: ${diamondsCollected}/${diamondsNeeded}`;
        timeInfo.textContent = `Time: ${timeLeft}`;
    }
}