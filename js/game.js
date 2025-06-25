class Game {
    constructor(customConfig = {}) {
        // Initialize logging and configuration
        this.logger = new GameLogger(GameLogger.levels.DEBUG);
        this.config = new GameConfig(customConfig);
        
        // Game state
        this.grid = [];
        this.player = null;
        this.isGameOver = false;
        this.hasExitAppeared = false;
        this.diamondsCollected = 0;
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded');
        this.timeLeft = this.config.get('time.initialTime');
        this.pendingPlayerMove = null; // Store pending player movement
        
        // Intervals and animation frames
        this.gameLoopId = null;
        this.timerIntervalId = null;

        this.frameRequested = false;  // Flag to indicate a frame needs processing
        this.frameActions = [];       // Actions to process in the next frame
        
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
        
        // UPDATED: Use HybridInputManager instead of InputManager
        this.inputManager = new HybridInputManager(this);
        
        // Initialize the game
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
            
            // Create first level
            const levelData = this.levelManager.createLevel(this.levelManager.getCurrentLevel());
            this.grid = levelData.grid;
            this.player = levelData.player;
            
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

            // Ensure the viewport is centered on the player
            this.renderer.centerViewportOnPlayer();
            
            // Ensure initial game state is drawn
            this.renderer.drawGame();
            
            // Handle orientation changes for mobile
            this.setupOrientationHandler();

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Page is hidden, pause timers but don't show pause screen
                    this.pauseTimers();
                } else {
                    // Page is visible again, resume timers
                    this.resumeTimers();
                }
            });
            
            // Start game loops
            this.startGameLoop();
            this.startTimerLoop();
            
            this.logger.info('Game initialized successfully');
        } catch (error) {
            this.logger.error('Game initialization failed', error);
            console.error('Detailed error:', error);
        }
    }

    // ADDED: Method for hybrid input manager to call
    movePlayer(deltaX, deltaY) {
        if (!this.player || this.isGameOver || !this.isValidMove(deltaX, deltaY)) {
            return false;
        }

        try {
            const moved = this.player.tryMove(
                this.grid, deltaX, deltaY, this.soundManager, this
            );
            
            if (moved) {
                // Center viewport on player if needed
                this.renderer.updateViewportPosition();
                
                // Redraw game
                this.renderer.drawGame();
                
                this.logger.debug(`Player moved by (${deltaX}, ${deltaY})`);
            }
            
            return moved;
        } catch (error) {
            this.logger.error('Error moving player:', error);
            return false;
        }
    }

    // ADDED: Alternative method for input handling
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

    // ADDED: Validate movement direction
    isValidMove(deltaX, deltaY) {
        return Math.abs(deltaX) <= 1 && Math.abs(deltaY) <= 1 && 
               (Math.abs(deltaX) + Math.abs(deltaY)) === 1; // Only cardinal directions
    }

    requestFrame(action) {
        if (action) {
            this.frameActions.push(action);
        }
        this.frameRequested = true;
    }

    pauseTimers() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        if (this.timerLoopId) {
            cancelAnimationFrame(this.timerLoopId);
            this.timerLoopId = null;
        }
        // Store the time when we paused
        this.pauseTime = performance.now();
    }
    
    resumeTimers() {
        if (this.isGameOver) return;
        
        // Calculate how long we were paused
        const pauseDuration = performance.now() - (this.pauseTime || performance.now());
        
        // Restart game loops
        this.startGameLoop();
        this.startTimerLoop();
    }
    
    initializeCursorBehavior() {
        // Get the canvas element
        const canvas = document.getElementById('gameCanvas');
        
        // Timer variable to track inactivity
        let cursorTimeout;
        
        // Function to hide cursor after inactivity
        const hideCursor = () => {
            canvas.style.cursor = 'none';
        };
        
        // Set cursor to visible whenever mouse moves
        canvas.addEventListener('mousemove', () => {
            // Show cursor
            canvas.style.cursor = 'default';
            
            // Clear previous timeout if any
            if (cursorTimeout) {
                clearTimeout(cursorTimeout);
            }
            
            // Set new timeout to hide cursor after 2 seconds of inactivity
            cursorTimeout = setTimeout(hideCursor, 2000);
        });
        
        // Hide cursor when mouse leaves the canvas
        canvas.addEventListener('mouseleave', () => {
            canvas.style.cursor = 'default';
            if (cursorTimeout) {
                clearTimeout(cursorTimeout);
            }
        });
        
        // Hide cursor when game starts (after a brief delay)
        setTimeout(hideCursor, 2000);
    }
    
    startNewLevel(level) {
        this.logger.info(`Starting level ${level}`);
        
        // Stop any existing loops first
        this.stopGameLoop();
        this.stopTimerLoop();
        
        // Reset level-specific state
        const levelData = this.levelManager.createLevel(level);
        this.grid = levelData.grid;
        this.player = levelData.player;
        
        // Reset game state
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = this.config.get('time.initialTime');
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded') + 
                            (level * this.config.get('levels.diamondsIncrementPerLevel'));
        this.isGameOver = false;
        
        // Update UI
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        // Update viewport for new level
        this.renderer.centerViewportOnPlayer();
        
        // Draw initial state - this will clear any message overlays
        this.renderer.drawGame();
        
        // ADDED: Reactivate input manager for new level
        if (this.inputManager) {
            this.inputManager.activate();
        }
        
        // Start game loops
        this.startGameLoop();
        this.startTimerLoop();
    }
    
    collectDiamond() {
        this.diamondsCollected++;
        
        // Update UI
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        // Check if all diamonds collected
        if (this.diamondsCollected >= this.diamondsNeeded && !this.hasExitAppeared) {
            this.levelManager.createExit(this.grid);
            this.hasExitAppeared = true;
            this.renderer.drawGame();
        }
    }
    
    startGameLoop() {
        // Clear any existing game loop first
        this.stopGameLoop();
        
        const tickInterval = this.config.get('gameLoop.updateInterval');
        
        // Start a new interval
        this.gameLoopId = setInterval(() => {
            if (!this.isGameOver) {
                this.tick(); // Process one tick
            }
        }, tickInterval);
        
        console.log("Game loop started with interval:", tickInterval);
    }
    
    startTimerLoop() {
        // Clear any existing timer loop first
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
            this.gameOver(false);
        }
    }

    // Add orientation change handling
    setupOrientationHandler() {
        // Initial check
        this.handleOrientationChange();
        
        // Add listener for orientation changes
        window.addEventListener('resize', () => {
            this.handleOrientationChange();
        });
        
        // If device orientation API is available, use it too
        if (window.DeviceOrientationEvent) {
            window.addEventListener('orientationchange', () => {
                this.handleOrientationChange();
            });
        }
    }

    handleOrientationChange() {
        // Recalculate viewport
        this.renderer.handleResize();
        
        // Update touch controls layout if available
        if (this.inputManager && typeof this.inputManager.updateTouchControlsForOrientation === 'function') {
            this.inputManager.updateTouchControlsForOrientation();
        }
        
        // Center viewport on player
        this.renderer.centerViewportOnPlayer();
        
        // Force redraw
        this.renderer.drawGame();
    }

    tick() {
        if (this.isGameOver) return;
        
        let somethingChanged = false;
        
        // UPDATED: Simplified player movement handling 
        // The hybrid input manager now calls movePlayer() directly
        // No need to check keys here since that's handled by the input manager
        
        // 2. Process entity physics (bottom to top) - one step per entity per tick
        const movingEntities = this.levelManager.getMovingEntities();
        
        // Sort entities from bottom to top for natural falling
        movingEntities.sort((a, b) => {
            if (a.y !== b.y) return b.y - a.y; // Bottom to top
            return b.x - a.x; // Right to left
        });
        
        // Update each entity - ONE move per tick, in the proper order
        for (const entity of movingEntities) {
            // Store original position for entity instance updating
            const originalX = entity.x;
            const originalY = entity.y;
            
            // Update entity
            const changed = entity.update(this.grid);
            
            // ALWAYS check for sounds, regardless of movement
            if (typeof entity.getFallingSound === 'function') {
                const soundName = entity.getFallingSound();
                if (soundName) {
                    this.soundManager.playSoundWithProbability(soundName, 0.3);
                }
            }
            
            if (changed) {
                somethingChanged = true;
                
                // Update entity position in the levelManager
                if (originalX !== entity.x || originalY !== entity.y) {
                    this.levelManager.updateEntityPosition(
                        entity.type, 
                        originalX, 
                        originalY, 
                        entity.x, 
                        entity.y
                    );
                    
                    // Check if it falls on player
                    if (entity.falling && 
                        this.player && 
                        this.player.y === entity.y && 
                        this.player.x === entity.x) {
                        this.gameOver(false);
                        return;
                    }
                }
            }
        }

        if (this.player && this.renderer) {
            const viewportChanged = this.renderer.updateViewportPosition();
            somethingChanged = somethingChanged || viewportChanged;
        }
        
        // Sync entity list with grid
        this.syncEntitiesWithGrid();
            
        // Check if exit should appear
        if (!this.hasExitAppeared && this.diamondsCollected >= this.diamondsNeeded) {
            this.levelManager.createExit(this.grid);
            this.hasExitAppeared = true;
            somethingChanged = true;
        }
        
        // Redraw if something changed
        if (somethingChanged) {
            this.renderer.drawGame();
        }
    }

    // REMOVED: getActiveArrowKey method (no longer needed with hybrid input)
   
    levelComplete() {
        // Cancel existing loops
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
        }
        
        // ADDED: Deactivate input during level transition
        if (this.inputManager) {
            this.inputManager.deactivate();
        }
        
        // Show level complete message
        this.renderer.drawMessage(
            'Level Complete!', 
            `Starting Level ${this.levelManager.getCurrentLevel() + 1} in 3 seconds...`
        );
        
        // Play level complete sound
        this.soundManager.playSound('levelComplete');
        
        // Start new level after delay
        setTimeout(() => {
            const nextLevel = this.levelManager.nextLevel();
            this.startNewLevel(nextLevel);
        }, 3000);
    }
    
    gameOver(won) {
        if (this.isGameOver) return; // Prevent multiple calls
        
        // Ensure loops are stopped
        this.stopGameLoop();
        this.stopTimerLoop();
        
        // ADDED: Deactivate input manager during game over
        if (this.inputManager) {
            this.inputManager.deactivate();
        }
    
        this.isGameOver = true;
        
        // Play game over sound
        this.soundManager.playSound('gameOver');
        
        // Detect if this is a touch device
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const restartText = isTouchDevice ? 'Tap Restart to play again' : 'Press Enter to restart';
        
        // Show game over message
        this.renderer.drawMessage(
            won ? 'You Win!' : 'Game Over',
            restartText,
            won ? '#00FF00' : '#FF0000'
        );
    }

    cleanup() {
        console.log("Cleaning up game resources...");
        
        // Stop game and timer loops
        this.stopGameLoop();
        this.stopTimerLoop();
        
        // ADDED: Clean up hybrid input manager
        if (this.inputManager) {
            this.inputManager.destroy();
        }
        
        // Clean up event listeners
        if (this.inputManager) {
            // Remove any event listeners that might have been added directly to the window
            window.removeEventListener('resize', this.handleResize);
            window.removeEventListener('orientationchange', this.handleOrientationChange);
        }
        
        // Clear all references for garbage collection
        this.grid = null;
        this.player = null;
        this.levelManager = null;
        this.renderer = null;
        this.soundManager = null;
        this.inputManager = null;
        
        console.log("Game cleanup complete");
    }
    
    restart() {
        // Stop any existing loops
        this.stopGameLoop();
        this.stopTimerLoop();
        
        // Reset game state
        this.isGameOver = false;
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = this.config.get('time.initialTime');
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded');
        
        // ADDED: Reactivate input manager on restart
        if (this.inputManager) {
            this.inputManager.activate();
        }
        
        // Show splash screen when game is restarted
        if (typeof endGameAndShowSplash === 'function') {
            endGameAndShowSplash();
        } else {
            // Fallback to original implementation
            this.startNewLevel(this.levelManager.getCurrentLevel());
        }
    }
    
    // Ensure entities match grid state
    syncEntitiesWithGrid() {
        console.log("Synchronizing entities with grid...");
        
        // More robust entity synchronization
        const entitiesToKeep = [];
        
        // Add player first - player is always needed
        if (this.player) {
            entitiesToKeep.push(this.player);
            console.log(`Added player at (${this.player.x}, ${this.player.y})`);
        }
        
        // Get grid dimensions from config
        const gridWidth = this.config.get('grid.width');
        const gridHeight = this.config.get('grid.height');
        
        // Count entities by type before sync
        const initialCounts = {};
        this.levelManager.entityInstances.forEach(entity => {
            const typeName = Object.keys(ENTITY_TYPES).find(key => ENTITY_TYPES[key] === entity.type) || 'UNKNOWN';
            initialCounts[typeName] = (initialCounts[typeName] || 0) + 1;
        });
        console.log("Entities before sync:", initialCounts);
        
        // Iterate through grid and build entity list
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const tileType = this.grid[y][x];
                
                // Skip empty tiles and player (already added)
                if (tileType === ENTITY_TYPES.EMPTY || 
                    (tileType === ENTITY_TYPES.PLAYER && this.player && this.player.x === x && this.player.y === y)) {
                    continue;
                }
                
                // Find or create entity for this tile
                let existingEntity = this.levelManager.entityInstances.find(e => 
                    e.x === x && e.y === y && e.type === tileType);
                
                if (existingEntity) {
                    // Make sure x and y match grid position (defensive)
                    if (existingEntity.x !== x || existingEntity.y !== y) {
                        console.warn(`Fixing misaligned entity position: from (${existingEntity.x},${existingEntity.y}) to (${x},${y})`);
                        existingEntity.x = x;
                        existingEntity.y = y;
                    }
                    
                    entitiesToKeep.push(existingEntity);
                } else {
                    // Create a new entity if needed
                    let newEntity = null;
                    switch (tileType) {
                        case ENTITY_TYPES.WALL:
                            newEntity = new Wall(x, y);
                            break;
                        case ENTITY_TYPES.DIRT:
                            newEntity = new Dirt(x, y);
                            break;
                        case ENTITY_TYPES.BOULDER:
                            newEntity = new Boulder(x, y);
                            console.log(`Created new Boulder at (${x}, ${y})`);
                            break;
                        case ENTITY_TYPES.DIAMOND:
                            newEntity = new Diamond(x, y);
                            break;
                        case ENTITY_TYPES.EXIT:
                            newEntity = new Exit(x, y);
                            break;
                    }
                    
                    if (newEntity) {
                        entitiesToKeep.push(newEntity);
                    }
                }
            }
        }
        
        // Count entities by type after sync
        const finalCounts = {};
        entitiesToKeep.forEach(entity => {
            const typeName = Object.keys(ENTITY_TYPES).find(key => ENTITY_TYPES[key] === entity.type) || 'UNKNOWN';
            finalCounts[typeName] = (finalCounts[typeName] || 0) + 1;
        });
        
        // Log entity synchronization details
        console.log("Entities after sync:", finalCounts);
        console.log(`Entity synchronization: ${this.levelManager.entityInstances.length} -> ${entitiesToKeep.length}`);
        
        // Check for missing boulders
        const oldBoulders = this.levelManager.entityInstances.filter(e => e.type === ENTITY_TYPES.BOULDER).length;
        const newBoulders = entitiesToKeep.filter(e => e.type === ENTITY_TYPES.BOULDER).length;
        
        if (oldBoulders !== newBoulders) {
            console.warn(`Boulder count changed during sync: ${oldBoulders} -> ${newBoulders}`);
        }
        
        // Replace entity instances with synchronized list
        this.levelManager.entityInstances = entitiesToKeep;
    }
    
    // Performance tracking method
    trackPerformance(methodName, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.logger.debug('Performance tracking', {
            method: methodName,
            duration: duration.toFixed(2) + 'ms'
        });
    }
    
    // Difficulty scaling method
    scaleDifficulty() {
        // Adjust game parameters based on current level
        const currentLevel = this.levelManager.getCurrentLevel();
        
        // Example difficulty scaling
        const baseTime = this.config.get('time.initialTime');
        const timeReduction = Math.floor(currentLevel * 5); // Reduce time by 5 seconds per level
        const newTime = Math.max(60, baseTime - timeReduction); // Minimum 60 seconds
        
        this.timeLeft = newTime;
        
        // Potentially increase diamonds needed
        const baseDiamonds = this.config.get('levels.baseDiamondsNeeded');
        const diamondIncrement = this.config.get('levels.diamondsIncrementPerLevel');
        this.diamondsNeeded = baseDiamonds + (currentLevel * diamondIncrement);
        
        this.logger.info('Difficulty scaled', {
            level: currentLevel,
            timeLeft: this.timeLeft,
            diamondsNeeded: this.diamondsNeeded
        });
    }
    
    // Advanced pause and resume functionality
    pause() {
        if (this.isGameOver) return;
        
        // Cancel existing loops
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
        }
        
        // ADDED: Deactivate input during pause
        if (this.inputManager) {
            this.inputManager.deactivate();
        }
        
        // Draw pause message
        this.renderer.drawMessage(
            'PAUSED', 
            'Press ESC to continue',
            '#FFFF00'
        );
        
        // Add pause event listener
        this.pauseListener = (e) => {
            if (e.key === 'Escape') {
                this.resume();
            }
        };
        window.addEventListener('keydown', this.pauseListener);
    }
    
    resume() {
        // Remove pause event listener
        if (this.pauseListener) {
            window.removeEventListener('keydown', this.pauseListener);
        }
        
        // ADDED: Reactivate input after pause
        if (this.inputManager) {
            this.inputManager.activate();
        }
        
        // Redraw game
        this.renderer.drawGame();
        
        // Restart game loops
        this.startGameLoop();
        this.startTimerLoop();
    }
}

// Attach performance tracking to key methods
const performanceWrapper = (originalMethod) => {
    return function(...args) {
        const startTime = performance.now();
        const result = originalMethod.apply(this, args);
        this.trackPerformance(originalMethod.name, startTime);
        return result;
    };
};

// Example of wrapping methods with performance tracking
Game.prototype.update = performanceWrapper(Game.prototype.update);
Game.prototype.levelComplete = performanceWrapper(Game.prototype.levelComplete);
Game.prototype.gameOver = performanceWrapper(Game.prototype.gameOver);