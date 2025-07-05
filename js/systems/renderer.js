class Renderer {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Scoreboard configuration (will be calculated dynamically)
        this.scoreboardHeight = 32; // Height of scoreboard in pixels (same as TILE_SIZE)
        this.scoreboardItemWidth = 32; // Will be calculated based on available width
        this.scoreboardItemHeight = 32; // Height of each scoreboard item (same as TILE_SIZE)
        this.scoreboardItemSpacing = 24; // Spacing between items (more compact than item width)

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
        
        // Calculate initial scoreboard size
        this.calculateScoreboardSize();
        
        // Set up resize handler
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Handle initial sizing
        this.handleResize();
    }
    
    calculateScoreboardSize() {
        // Calculate optimal scoreboard item size and spacing based on available width
        // We need: Clock(1) + 3digits(3) + blank(1) + Diamonds(1) + 3digits(3) + blank(1) + Mines(1) + 2digits(2) + blank(1) + Score(6) = 20 items minimum
        const minItems = 20;
        
        // Calculate available width (we'll use the canvas width once it's set)
        const availableWidth = this.canvas ? this.canvas.width : window.innerWidth;
        
        // Calculate item size - prefer TILE_SIZE (32px) but scale down if needed
        let itemSize = this.TILE_SIZE; // Start with full tile size (32px)
        let itemSpacing = 24; // Tighter spacing for more compact look
        
        // If we don't have enough room for 20 items at preferred spacing, scale down proportionally
        if (availableWidth < minItems * itemSpacing) {
            const scale = availableWidth / (minItems * itemSpacing);
            itemSpacing = Math.floor(itemSpacing * scale);
            itemSize = Math.floor(itemSize * scale);
            
            // Don't go smaller than minimums
            itemSpacing = Math.max(itemSpacing, 16);
            itemSize = Math.max(itemSize, 16);
        }
        
        this.scoreboardItemWidth = itemSize;
        this.scoreboardItemHeight = itemSize;
        this.scoreboardItemSpacing = itemSpacing; // New property for spacing
        this.scoreboardHeight = itemSize; // Make scoreboard height match item height
        
        console.log(`Scoreboard: ${itemSize}px items, ${itemSpacing}px spacing (canvas width: ${availableWidth}px)`);
    }
    
    handleResize() {
        // Get the container size
        const container = document.getElementById('game-container');
        const containerRect = container.getBoundingClientRect();
        
        // Calculate available space (accounting for info panel, etc.)
        // Subtract some space for other elements to prevent scrollbars
        const availableWidth = containerRect.width;
        const availableHeight = window.innerHeight - 150; // Space for header, info panel, etc.
        
        // Calculate how many tiles can fit in the available space (for initial sizing)
        const tilesWide = Math.floor(availableWidth / this.TILE_SIZE);
        const tilesHigh = Math.floor(availableHeight / this.TILE_SIZE);
        
        // Set initial canvas size to calculate scoreboard
        this.canvas.width = tilesWide * this.TILE_SIZE;
        this.canvas.height = tilesHigh * this.TILE_SIZE;
        
        // Calculate optimal scoreboard size based on canvas width
        this.calculateScoreboardSize();
        
        // Now recalculate with the actual scoreboard height
        const gameAreaHeight = availableHeight - this.scoreboardHeight;
        const finalTilesHigh = Math.floor(gameAreaHeight / this.TILE_SIZE);
        
        // Set final canvas size with proper scoreboard height
        this.canvas.width = tilesWide * this.TILE_SIZE;
        this.canvas.height = (finalTilesHigh * this.TILE_SIZE) + this.scoreboardHeight;
        
        // Re-enable crisp rendering after resize
        this.ctx.imageSmoothingEnabled = false;
        
        // Update viewport dimensions (these are the game area dimensions in tiles)
        this.viewport.width = Math.min(tilesWide, GRID_WIDTH);
        this.viewport.height = Math.min(finalTilesHigh, GRID_HEIGHT);
        
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
    
    // Add method for scoreboard image access (for Option 2)
    getScoreboardImage(name) {
        return this.game.assetPreloader.getSprite(name);
    }
    
    drawScoreboard() {
        const ctx = this.ctx;
        const itemWidth = this.scoreboardItemWidth;   // Now dynamically calculated (32px on wide screens)
        const itemHeight = this.scoreboardItemHeight; // Now dynamically calculated (32px on wide screens)
        
        // Calculate scoreboard position (top of canvas)
        const scoreboardY = 0;
        
        // Calculate game area dimensions to match scoreboard width
        const gameWidth = this.viewport.width * this.TILE_SIZE;
        const gameOffsetX = Math.floor((this.canvas.width - gameWidth) / 2);
        
        // Calculate starting X - align with game area if full board width is visible
        let currentX = 0;
        
        // If the full game board width is visible, align scoreboard with the game area
        if (this.viewport.width >= GRID_WIDTH) {
            // Align scoreboard with the left edge of the game area
            currentX = gameOffsetX;
        }
        
        // Helper function to draw a scoreboard image
        const drawItem = (imageName) => {
            const img = this.getScoreboardImage(imageName); // Use our wrapper method
            if (img) {
                ctx.drawImage(img, currentX, scoreboardY, itemWidth, itemHeight);
            } else {
                // Fallback if image not found
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(currentX, scoreboardY, itemWidth, itemHeight);
                // Draw text fallback - scale font size with item size
                ctx.fillStyle = '#FFFFFF';
                const fontSize = Math.max(8, Math.floor(itemWidth * 0.4)); // Scale font with item size
                ctx.font = `${fontSize}px Arial`;
                ctx.textAlign = 'center';
                const text = imageName.replace('hdr_', '').replace('digit_', '');
                ctx.fillText(text, currentX + itemWidth/2, scoreboardY + itemHeight/2 + fontSize/4);
            }
            currentX += this.scoreboardItemSpacing; // Use spacing instead of item width for tighter layout
        };

        // Helper function to draw a number with specified digits
        const drawNumber = (value, digits) => {
            const str = value.toString().padStart(digits, '0');
            for (let i = 0; i < digits; i++) {
                const digit = str[i];
                drawItem(`digit_${digit}`);
            }
        };

        // Clear scoreboard area (only the width we'll actually use)
        ctx.fillStyle = '#000000';
        if (this.viewport.width >= GRID_WIDTH) {
            // Clear only the game area width when aligned
            ctx.fillRect(gameOffsetX, 0, gameWidth, this.scoreboardHeight);
        } else {
            // Clear full canvas width when not aligned
            ctx.fillRect(0, 0, this.canvas.width, this.scoreboardHeight);
        }
        
        // Get game values
        const timeLeft = this.game.timeLeft || 0;
        const diamondsCollected = this.game.diamondsCollected || 0;
        const diamondsNeeded = this.game.diamondsNeeded || 0;
        const diamondsRemaining = Math.max(0, diamondsNeeded - diamondsCollected); // Calculate remaining diamonds
        const minesCount = this.game.minesCount || 0;
        const score = this.game.score || 0;
        
        // Draw scoreboard elements in your requested format:
        // Clock, 3 digits, blank, Diamonds, 3 digits, blank, mines, 2 digits, blank, 6 digits for scores
        
        // Clock + 3 digits
        drawItem('hdr_clock');
        drawNumber(timeLeft, 3);
        
        // Blank
        drawItem('hdr_blank');
        
        // Diamonds + 3 digits (showing remaining diamonds needed)
        drawItem('hdr_diamonds');
        drawNumber(diamondsRemaining, 3);
        
        // Blank
        drawItem('hdr_blank');
        
        // Mines + 2 digits
        drawItem('hdr_mines');
        drawNumber(minesCount, 2);
        
        // Blank
        drawItem('hdr_blank');
        
        // Score (6 digits)
        drawNumber(score, 6);
        
        // Fill rest with blanks (but only to the edge of the scoreboard area)
        if (this.viewport.width >= GRID_WIDTH) {
            // When aligned with game area, stop at the right edge of the game area
            const scoreboardEndX = gameOffsetX + gameWidth;
            while (currentX + this.scoreboardItemSpacing <= scoreboardEndX) {
                drawItem('hdr_blank');
            }
        } else {
            // When not aligned, fill to canvas edge as before
            const remainingWidth = this.canvas.width - currentX;
            const blanksNeeded = Math.floor(remainingWidth / this.scoreboardItemSpacing);
            for (let i = 0; i < blanksNeeded; i++) {
                drawItem('hdr_blank');
            }
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
        
        // Calculate total content size (scoreboard + game area)
        const gameAreaHeight = this.viewport.height * this.TILE_SIZE;
        const totalContentHeight = this.scoreboardHeight + gameAreaHeight;
        
        // Center the entire content (scoreboard + game) within the canvas
        const contentOffsetY = Math.floor((this.canvas.height - totalContentHeight) / 2);
        
        // Save context for content positioning
        this.ctx.save();
        
        // Translate to center the content vertically
        this.ctx.translate(0, contentOffsetY);
        
        // Draw scoreboard first at the top of our centered content
        this.drawScoreboard();
        
        // Save context state for game area drawing
        this.ctx.save();
        
        // Translate context to draw game area below scoreboard
        this.ctx.translate(0, this.scoreboardHeight);
        
        // Calculate offset to center the visible part of the grid horizontally
        const gameWidth = this.viewport.width * this.TILE_SIZE;
        const offsetX = Math.floor((this.canvas.width - gameWidth) / 2);
        const offsetY = 0; // No additional vertical offset needed since we're already centered
        
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
                } else if (tileType !== ENTITY_TYPES.EMPTY) {
                    // Fallback to generic drawing method ONLY for non-empty tiles that are not custom entities
                    this.drawEntity(tileType, drawX, drawY);
                }
            }
        }
        
        // Draw mini-map if not showing entire grid (in game area coordinates)
        if (this.viewport.width < GRID_WIDTH || this.viewport.height < GRID_HEIGHT) {
            this.drawMiniMap(gameAreaHeight);
        }
        
        // Restore context state for game area
        this.ctx.restore();
        
        // Restore context state for content positioning
        this.ctx.restore();
    }
    
    drawMiniMap(gameAreaHeight = null) {
        // Use provided gameAreaHeight or calculate it
        const availableHeight = gameAreaHeight || (this.canvas.height - this.scoreboardHeight);
        
        // Skip if canvas is too small for a meaningful mini-map
        if (this.canvas.width < 200 || availableHeight < 200) return;
        
        // Mini-map settings
        const mapSize = Math.min(100, Math.min(this.canvas.width, availableHeight) * 0.2);
        const padding = 10;
        const mapX = this.canvas.width - mapSize - padding;
        const mapY = availableHeight - mapSize - padding; // Position relative to game area
        
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
        
        // Calculate message position (center of game area, not including scoreboard)
        const gameAreaHeight = this.canvas.height - this.scoreboardHeight;
        const messageY = this.scoreboardHeight + (gameAreaHeight / 2);
        
        // Draw main message
        this.ctx.fillStyle = color || '#FFFFFF';
        this.ctx.font = '40px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(message, this.canvas.width / 2, messageY - 40);
        
        // Draw sub-message if provided
        if (subMessage) {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(subMessage, this.canvas.width / 2, messageY + 20);
        }
        
        // Add restart button for mobile devices
        this.addRestartButton();
    }
    
    updateUI(level, diamondsCollected, diamondsNeeded, timeLeft) {
        // Update game state for scoreboard rendering
        if (this.game) {
            this.game.currentLevel = level;
            this.game.diamondsCollected = diamondsCollected;
            this.game.diamondsNeeded = diamondsNeeded;
            this.game.timeLeft = timeLeft;
        }
        
        // Still update HTML elements if they exist (as fallback) - show remaining diamonds
        const levelInfo = document.getElementById('level-info');
        const diamondsInfo = document.getElementById('diamonds-info');
        const timeInfo = document.getElementById('time-info');
        
        const diamondsRemaining = Math.max(0, diamondsNeeded - diamondsCollected);
        
        if (levelInfo) levelInfo.textContent = `Level: ${level}`;
        if (diamondsInfo) diamondsInfo.textContent = `Diamonds: ${diamondsRemaining}`; // Show remaining instead of collected/needed
        if (timeInfo) timeInfo.textContent = `Time: ${timeLeft}`;
    }
}