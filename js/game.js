class Game {
    constructor(customConfig = {}) {
        // Initialize logging and configuration
        this.logger = new GameLogger(GameLogger.levels.DEBUG);
        this.config = new GameConfig(customConfig);
        
        // Game state - SIMPLIFIED: Grid stores ENTITY_TYPES, entities tracked by position
        this.grid = [];  // Grid stores ENTITY_TYPES numbers (your existing format)
        this.entities = new Map(); // Simple position-based entity lookup: "x,y" -> entity
        this.player = null;
        this.isGameOver = false;
        this.hasExitAppeared = false;
        this.diamondsCollected = 0;
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded');
        this.timeLeft = this.config.get('time.initialTime');
        this.pendingPlayerMove = null;
        
        // Intervals
        this.gameLoopId = null;
        this.timerIntervalId = null;
        
        // Systems
        this.assetPreloader = new AssetPreloader(this.config);
        this.soundManager = new SoundManager();
        
        // Sprite management
        window.spriteManager = {
            sprites: {},
            getSprite: (name) => this.assetPreloader.getSprite(name)
        };
        
        // Renderer and other systems
        this.renderer = new Renderer(this);
        this.levelManager = new LevelManager(this);
        this.inputManager = new HybridInputManager(this);
        
        this.init();
    }
    
    async init() {
        try {
            this.logger.info('Initializing game...');
            
            // Preload assets
            await Promise.all([
                this.assetPreloader.preloadSprites(),
                this.assetPreloader.preloadSounds()
            ]);
            
            // Create first level - SIMPLIFIED: Use existing level manager but track entities simply
            this.createLevel(this.levelManager.getCurrentLevel());
            
            // Reset game state
            this.diamondsCollected = 0;
            this.hasExitAppeared = false;
            this.timeLeft = this.config.get('time.initialTime');
            this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded');
            this.isGameOver = false;
            
            // Update UI
            this.renderer.updateUI(
                this.levelManager.getCurrentLevel(),
                this.diamondsCollected,
                this.diamondsNeeded,
                this.timeLeft
            );
            
            this.initializeCursorBehavior();
            this.renderer.centerViewportOnPlayer();
            this.renderer.drawGame();
            this.setupOrientationHandler();

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.pauseTimers();
                } else {
                    this.resumeTimers();
                }
            });
            
            this.startGameLoop();
            this.startTimerLoop();
            
            this.logger.info('Game initialized successfully');
        } catch (error) {
            this.logger.error('Game initialization failed', error);
            console.error('Detailed error:', error);
        }
    }

    // SIMPLIFIED: Create level and build simple entity map
    createLevelx(levelNum) {
        // Use existing level manager to get grid and entities
        const levelData = this.levelManager.createLevel(levelNum);
        this.grid = levelData.grid; // Keep existing ENTITY_TYPES grid
        this.player = levelData.player;
        
        // Build simple entity position map from existing entity instances
        this.entities.clear();
        if (this.levelManager.entityInstances) {
            for (const entity of this.levelManager.entityInstances) {
                this.entities.set(`${entity.x},${entity.y}`, entity);
            }
        }
        
        // Add player to entities map
        if (this.player) {
            this.entities.set(`${this.player.x},${this.player.y}`, this.player);
        }
    }

    // SIMPLIFIED: Create level and build simple entity map
    createLevel(levelNum) {
        console.log("Creating boulder fall test level...");
        
        // Clear entities
        this.entities.clear();
        
        // Create a simple test grid
        this.grid = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.grid[y][x] = ENTITY_TYPES.EMPTY;
            }
        }
        
        // Add walls around the border
        for (let x = 0; x < GRID_WIDTH; x++) {
            this.grid[0][x] = ENTITY_TYPES.WALL; // Top wall
            this.grid[GRID_HEIGHT-1][x] = ENTITY_TYPES.WALL; // Bottom wall
        }
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y][0] = ENTITY_TYPES.WALL; // Left wall
            this.grid[y][GRID_WIDTH-1] = ENTITY_TYPES.WALL; // Right wall
        }
        
        // Position player to the side and one level below boulder
        const playerX = Math.floor(GRID_WIDTH / 2) + 3; 
        const playerY = GRID_HEIGHT - 6; 
        
        // Position boulder #1 on a dirt platform (stationary)
        const boulderX = Math.floor(GRID_WIDTH / 2);
        const boulderY = playerY - 2; // Boulder 2 levels above player
        const platformY = boulderY + 1; // Dirt platform 1 level above player
        
        // Position boulder #2 (falling boulder) - to the right
        const boulder2X = boulderX + 4;  // 4 spaces to the right
        const boulder2Y = playerY - 10;  // 10 spaces above player level
        const landingDirtY = playerY - 1; // Where boulder #2 will land
                
        // Create and place player
        this.player = new Player(playerX, playerY);
        this.grid[playerY][playerX] = ENTITY_TYPES.PLAYER;
        this.entities.set(`${playerX},${playerY}`, this.player);
        
        // Create and place boulder #1 (stationary, never fallen)
        const boulder1 = new Boulder(boulderX, boulderY);
        this.grid[boulderY][boulderX] = ENTITY_TYPES.BOULDER;
        this.entities.set(`${boulderX},${boulderY}`, boulder1);
        
        // Create dirt platform supporting boulder #1
        const supportDirt = new Dirt(boulderX, platformY);
        this.grid[platformY][boulderX] = ENTITY_TYPES.DIRT;
        this.entities.set(`${boulderX},${platformY}`, supportDirt);
        
        // Create and place boulder #2 (falling boulder) - to the right of player path
        const boulder2 = new Diamond(boulder2X, boulder2Y);
        this.grid[boulder2Y][boulder2X] = ENTITY_TYPES.DIAMOND;
        this.entities.set(`${boulder2X},${boulder2Y}`, boulder2);
        
        // Create dirt for boulder #2 to land on
        const landingDirt = new Dirt(boulder2X, landingDirtY);
        this.grid[landingDirtY][boulder2X] = ENTITY_TYPES.DIRT;
        this.entities.set(`${boulder2X},${landingDirtY}`, landingDirt);
        
        // IMPORTANT: Spaces at (boulderX, playerY) and (boulder2X, playerY) left EMPTY for player to walk under boulders
        
        // Add a few dirt blocks for visual reference
        const dirtPositions = [
            {x: playerX - 3, y: playerY},
            {x: playerX + 3, y: playerY},
            {x: playerX - 2, y: playerY + 1},
            {x: playerX + 2, y: playerY + 1},
            {x: playerX - 1, y: playerY + 2},
            {x: playerX + 1, y: playerY + 2}
        ];
        
        dirtPositions.forEach(pos => {
            if (pos.x > 0 && pos.x < GRID_WIDTH-1 && pos.y > 0 && pos.y < GRID_HEIGHT-1) {
                const dirt = new Dirt(pos.x, pos.y);
                this.grid[pos.y][pos.x] = ENTITY_TYPES.DIRT;
                this.entities.set(`${pos.x},${pos.y}`, dirt);
            }
        });
        
        // Add a diamond for testing collection (away from the falling boulder)
        const diamondX = playerX + 5;
        const diamondY = playerY;
        if (diamondX < GRID_WIDTH-1) {
            const diamond = new Diamond(diamondX, diamondY);
            this.grid[diamondY][diamondX] = ENTITY_TYPES.DIAMOND;
            this.entities.set(`${diamondX},${diamondY}`, diamond);
        }
        
        // Update renderer and UI
        if (this.renderer) {
            this.renderer.updateUI(
                this.levelManager ? this.levelManager.getCurrentLevel() : 1,
                this.diamondsCollected || 0,
                this.diamondsNeeded || 1,
                this.timeLeft || 60
            );
            this.renderer.centerViewportOnPlayer();
            this.renderer.drawGame();
        }
    }

    movePlayer(deltaX, deltaY) {
        if (!this.player || this.isGameOver || !this.isValidMove(deltaX, deltaY)) {
            return false;
        }
        
        // Process movement immediately
        return this.processPlayerMove(deltaX, deltaY);
    }

    handleInput(direction, isPressed) {
        if (!isPressed || this.isGameOver) return;
        
        const directionMap = {
            'up': { x: 0, y: -1 },
            'down': { x: 0, y: 1 },
            'left': { x: -1, y: 0 },
            'right': { x: 1, y: 0 }
        };
        
        const movement = directionMap[direction];
        if (movement) {
            this.movePlayer(movement.x, movement.y);
        }
    }

    isValidMove(deltaX, deltaY) {
        const isValid = Math.abs(deltaX) <= 1 && Math.abs(deltaY) <= 1 && 
               (Math.abs(deltaX) + Math.abs(deltaY)) === 1;
        return isValid;
    }

    // SIMPLIFIED: Process player move with existing grid format
    processPlayerMove(deltaX, deltaY) {
        if (!this.player) return false;
        
        const newX = this.player.x + deltaX;
        const newY = this.player.y + deltaY;
        
        // Check bounds
        if (newX < 0 || newX >= GRID_WIDTH || newY < 0 || newY >= GRID_HEIGHT) {
            return false;
        }
        
        const targetType = this.grid[newY][newX];
        
        // Handle different target types
        if (targetType === ENTITY_TYPES.EMPTY) {
            // Empty space - just move
            this.grid[this.player.y][this.player.x] = ENTITY_TYPES.EMPTY;
            this.entities.delete(`${this.player.x},${this.player.y}`);
            
            this.player.x = newX;
            this.player.y = newY;
            
            this.grid[newY][newX] = ENTITY_TYPES.PLAYER;
            this.entities.set(`${newX},${newY}`, this.player);
            this.soundManager.playSound('move');
            return true;
            
        } else if (targetType === ENTITY_TYPES.DIRT) {
            // Dig through dirt
            this.grid[this.player.y][this.player.x] = ENTITY_TYPES.EMPTY;
            this.entities.delete(`${this.player.x},${this.player.y}`);
            this.entities.delete(`${newX},${newY}`); // Remove dirt entity
            
            this.player.x = newX;
            this.player.y = newY;
            
            this.grid[newY][newX] = ENTITY_TYPES.PLAYER;
            this.entities.set(`${newX},${newY}`, this.player);
            this.soundManager.playSound('dig');
            return true;
            
        } else if (targetType === ENTITY_TYPES.DIAMOND) {
            // Collect diamond
            this.grid[this.player.y][this.player.x] = ENTITY_TYPES.EMPTY;
            this.entities.delete(`${this.player.x},${this.player.y}`);
            this.entities.delete(`${newX},${newY}`); // Remove diamond entity
            
            this.player.x = newX;
            this.player.y = newY;
            
            this.grid[newY][newX] = ENTITY_TYPES.PLAYER;
            this.entities.set(`${newX},${newY}`, this.player);
            this.collectDiamond();
            this.soundManager.playSound('diamond');
            return true;
            
        } else if (targetType === ENTITY_TYPES.EXIT && this.hasExitAppeared) {
            // Complete level
            this.grid[this.player.y][this.player.x] = ENTITY_TYPES.EMPTY;
            this.entities.delete(`${this.player.x},${this.player.y}`);
            
            this.player.x = newX;
            this.player.y = newY;
            
            this.grid[newY][newX] = ENTITY_TYPES.PLAYER;
            this.entities.set(`${newX},${newY}`, this.player);
            this.levelComplete();
            return true;
        }
        
        // Try pushing boulders (only horizontally)
        if (targetType === ENTITY_TYPES.BOULDER && deltaY === 0) { // Only allow horizontal pushes
            const pushX = newX + deltaX;
            const pushY = newY + deltaY;
            
            if (pushX >= 0 && pushX < GRID_WIDTH && 
                pushY >= 0 && pushY < GRID_HEIGHT && 
                this.grid[pushY][pushX] === ENTITY_TYPES.EMPTY) {
                
                // Get boulder entity
                const boulder = this.entities.get(`${newX},${newY}`);
                if (boulder) {
                    // Move boulder
                    this.grid[newY][newX] = ENTITY_TYPES.EMPTY;
                    this.entities.delete(`${newX},${newY}`);
                    
                    boulder.x = pushX;
                    boulder.y = pushY;
                    
                    this.grid[pushY][pushX] = ENTITY_TYPES.BOULDER;
                    this.entities.set(`${pushX},${pushY}`, boulder);
                    
                    // Move player
                    this.grid[this.player.y][this.player.x] = ENTITY_TYPES.EMPTY;
                    this.entities.delete(`${this.player.x},${this.player.y}`);
                    
                    this.player.x = newX;
                    this.player.y = newY;
                    
                    this.grid[newY][newX] = ENTITY_TYPES.PLAYER;
                    this.entities.set(`${newX},${newY}`, this.player);
                    
                    this.soundManager.playSound('push');
                    return true;
                }
            }
        }
        
        // Can't move into walls, boulders, etc. (just block movement, no death)
        return false;
        
        return false;
    }

    tick() {
        if (this.isGameOver) return;
        
        let somethingChanged = false;
        
        // PRIORITY: Process queued discrete inputs first (for responsive taps)
        let processedQueuedInput = false;
        if (this.inputManager) {
            while (this.inputManager.hasQueuedInputs && this.inputManager.hasQueuedInputs()) {
                const queuedInput = this.inputManager.getNextQueuedInput();
                if (queuedInput) {
                    const moved = this.processPlayerMove(queuedInput.x, queuedInput.y);
                    if (moved) somethingChanged = true;
                    processedQueuedInput = true;
                }
            }
        }
        
        // Handle continuous held input ONLY if no queued inputs were processed
        if (this.inputManager && !processedQueuedInput) {
            // Check for held keyboard key
            const heldKey = this.inputManager.currentKey;
            if (heldKey) {
                const moved = this.processPlayerMove(heldKey.x, heldKey.y);
                if (moved) somethingChanged = true;
            }
            
            // Check for mouse drag
            if (this.inputManager.isMouseDown && this.inputManager.currentMouseDirection) {
                const direction = this.inputManager.currentMouseDirection;
                const moved = this.processPlayerMove(direction.x, direction.y);
                if (moved) somethingChanged = true;
            }
        }
        
        // SIMPLIFIED: Collect entities first, then update (no double processing)
        const entitiesToUpdate = [];
        for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
            for (let x = GRID_WIDTH - 1; x >= 0; x--) {
                const entity = this.entities.get(`${x},${y}`);
                if (entity && typeof entity.update === 'function' && entity !== this.player) {
                    entitiesToUpdate.push(entity);
                }
            }
        }
        
        // Update entities (no double processing possible)
        for (const entity of entitiesToUpdate) {
            const oldX = entity.x;
            const oldY = entity.y;
            
            const changed = entity.update(this.grid);
            
            if (changed) {
                somethingChanged = true;
                
                // Update entity position in our map
                if (oldX !== entity.x || oldY !== entity.y) {
                    this.entities.delete(`${oldX},${oldY}`);
                    this.entities.set(`${entity.x},${entity.y}`, entity);
                }
                if (entity.type === ENTITY_TYPES.BOULDER) {
                }

                // Check if moving boulder/diamond hits player
                if ((entity.type === ENTITY_TYPES.BOULDER || entity.type === ENTITY_TYPES.DIAMOND) && 
                    this.player && entity.x === this.player.x && entity.y === this.player.y) {
                    this.soundManager.playSound('die');
                    this.gameOver(false);
                    return;
                }
            }
            
            // ALWAYS check for sounds, regardless of movement
            if (typeof entity.getLandingSound === 'function') {
                const soundName = entity.getLandingSound();
                if (soundName) {
                    this.soundManager.playSound(soundName);
                }
            }
        }

        // Update viewport
        if (this.player && this.renderer) {
            const viewportChanged = this.renderer.updateViewportPosition();
            somethingChanged = somethingChanged || viewportChanged;
        }
            
        // Check if exit should appear
        if (!this.hasExitAppeared && this.diamondsCollected >= this.diamondsNeeded) {
            this.createExit();
            this.hasExitAppeared = true;
            somethingChanged = true;
        }
        
        // Redraw if something changed
        if (somethingChanged) {
            this.renderer.drawGame();
        }
    }

    // SIMPLIFIED: Create exit directly in grid
    createExit() {
        // Find a suitable spot for the exit (simple version)
        for (let y = 1; y < GRID_HEIGHT - 1; y++) {
            for (let x = 1; x < GRID_WIDTH - 1; x++) {
                if (this.grid[y][x] === ENTITY_TYPES.DIRT) {
                    // Remove dirt entity
                    this.entities.delete(`${x},${y}`);
                    
                    // Create and place exit
                    const exit = new Exit(x, y);
                    this.grid[y][x] = ENTITY_TYPES.EXIT;
                    this.entities.set(`${x},${y}`, exit);
                    return;
                }
            }
        }
    }

    collectDiamond() {
        this.diamondsCollected++;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
    }

    startNewLevel(level) {
        this.logger.info(`Starting level ${level}`);
        
        this.stopGameLoop();
        this.stopTimerLoop();
        
        // Create new level
        this.createLevel(level);
        
        // Reset game state
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = this.config.get('time.initialTime');
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded') + 
                            (level * this.config.get('levels.diamondsIncrementPerLevel'));
        this.isGameOver = false;
        
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        this.renderer.centerViewportOnPlayer();
        this.renderer.drawGame();
        
        if (this.inputManager) {
            this.inputManager.activate();
        }
        
        this.startGameLoop();
        this.startTimerLoop();
    }

    // Rest of the methods remain the same...
    initializeCursorBehavior() {
        const canvas = document.getElementById('gameCanvas');
        let cursorTimeout;
        
        const hideCursor = () => {
            canvas.style.cursor = 'none';
        };
        
        canvas.addEventListener('mousemove', () => {
            if (this.inputManager && this.inputManager.isMouseDown) {
                return;
            }
            canvas.style.cursor = 'default';
            if (cursorTimeout) {
                clearTimeout(cursorTimeout);
            }
            cursorTimeout = setTimeout(hideCursor, 2000);
        });
        
        canvas.addEventListener('mouseleave', () => {
            if (!this.inputManager || !this.inputManager.isMouseDown) {
                canvas.style.cursor = 'default';
            }
            if (cursorTimeout) {
                clearTimeout(cursorTimeout);
            }
        });
        
        setTimeout(hideCursor, 2000);
    }

    startGameLoop() {
        this.stopGameLoop();
        const tickInterval = this.config.get('gameLoop.updateInterval');
        this.gameLoopId = setInterval(() => {
            if (!this.isGameOver) {
                this.tick();
            }
        }, tickInterval);
    }
    
    startTimerLoop() {
        this.stopTimerLoop();
        const timerInterval = this.config.get('gameLoop.timerInterval');
        this.timerIntervalId = setInterval(() => {
            if (!this.isGameOver) {
                this.updateTimer();
            }
        }, timerInterval);
    }

    stopGameLoop() {
        if (this.gameLoopId) {
            clearInterval(this.gameLoopId);
            this.gameLoopId = null;
        }
    }

    stopTimerLoop() {
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
            this.timerIntervalId = null;
        }
    }

    updateTimer() {
        if (this.isGameOver) return;
        
        this.timeLeft--;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        if (this.timeLeft <= 0) {
            this.soundManager.playSound('die');
            this.gameOver(false);
        }
    }

    setupOrientationHandler() {
        this.handleOrientationChange();
        window.addEventListener('resize', () => {
            this.handleOrientationChange();
        });
        if (window.DeviceOrientationEvent) {
            window.addEventListener('orientationchange', () => {
                this.handleOrientationChange();
            });
        }
    }

    handleOrientationChange() {
        this.renderer.handleResize();
        if (this.inputManager && typeof this.inputManager.updateTouchControlsForOrientation === 'function') {
            this.inputManager.updateTouchControlsForOrientation();
        }
        this.renderer.centerViewportOnPlayer();
        this.renderer.drawGame();
    }

    pauseTimers() {
        this.stopGameLoop();
        this.stopTimerLoop();
        this.pauseTime = performance.now();
    }
    
    resumeTimers() {
        if (this.isGameOver) return;
        const pauseDuration = performance.now() - (this.pauseTime || performance.now());
        this.startGameLoop();
        this.startTimerLoop();
    }

    levelComplete() {
        this.stopGameLoop();
        this.stopTimerLoop();
        
        if (this.inputManager) {
            this.inputManager.deactivate();
        }
        
        this.renderer.drawMessage(
            'Level Complete!', 
            `Starting Level ${this.levelManager.getCurrentLevel() + 1} in 3 seconds...`
        );
        
        this.soundManager.playSound('levelComplete');
        
        setTimeout(() => {
            const nextLevel = this.levelManager.nextLevel();
            this.startNewLevel(nextLevel);
        }, 3000);
    }
    
    gameOver(won) {
        if (this.isGameOver) return;
        
        this.stopGameLoop();
        this.stopTimerLoop();
        
        if (this.inputManager) {
            this.inputManager.deactivate();
        }
    
        this.isGameOver = true;
        this.soundManager.playSound('gameOver');
        
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const restartText = isTouchDevice ? 'Tap Restart to play again' : 'Press Enter to restart';
        
        this.renderer.drawMessage(
            won ? 'You Win!' : 'Game Over',
            restartText,
            won ? '#00FF00' : '#FF0000'
        );
    }

    cleanup() {
        console.log("Cleaning up game resources...");
        this.stopGameLoop();
        this.stopTimerLoop();
        
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        // Clear all references
        this.grid = null;
        this.entities.clear();
        this.player = null;
        this.levelManager = null;
        this.renderer = null;
        this.soundManager = null;
        this.inputManager = null;
        
        console.log("Game cleanup complete");
    }
    
    restart() {
        this.stopGameLoop();
        this.stopTimerLoop();
        
        this.isGameOver = false;
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = this.config.get('time.initialTime');
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded');
        
        if (this.inputManager) {
            this.inputManager.activate();
        }
        
        if (typeof endGameAndShowSplash === 'function') {
            endGameAndShowSplash();
        } else {
            this.startNewLevel(this.levelManager.getCurrentLevel());
        }
    }

    pause() {
        if (this.isGameOver) return;
        this.stopGameLoop();
        this.stopTimerLoop();
        
        if (this.inputManager) {
            this.inputManager.deactivate();
        }
        
        this.renderer.drawMessage(
            'PAUSED', 
            'Press ESC to continue',
            '#FFFF00'
        );
        
        this.pauseListener = (e) => {
            if (e.key === 'Escape') {
                this.resume();
            }
        };
        window.addEventListener('keydown', this.pauseListener);
    }
    
    resume() {
        if (this.pauseListener) {
            window.removeEventListener('keydown', this.pauseListener);
        }
        
        if (this.inputManager) {
            this.inputManager.activate();
        }
        
        this.renderer.drawGame();
        this.startGameLoop();
        this.startTimerLoop();
    }
}