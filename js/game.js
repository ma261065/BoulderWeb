// Effect types that entities can return from their update() method
const EFFECT_TYPES = {
    REMOVE: 'remove',           // Remove an entity
    TRANSFORM: 'transform',     // Change entity type at position
    CREATE: 'create',          // Create new entity
    SOUND: 'sound',             // Play a sound
    COLLECT: 'collect'          // Collect an entity
};

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
        this.score = 0; // Initialize score
        this.minesCount = 0; // Initialize mines count
        
        // Intervals
        this.gameLoopId = null;
        this.timerIntervalId = null;
        
        // Systems
        this.assetPreloader = new AssetPreloader(this.config);
        this.soundManager = new SoundManager();
        
        // Sprite management
        this.setupSpriteManager();
        
        // Renderer and other systems
        this.renderer = new Renderer(this);
        this.levelManager = new LevelManager(this);
        this.inputManager = new HybridInputManager(this);
        
        // Store event listener reference for cleanup
        this.visibilityChangeHandler = null;

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
            this.score = 0; // Initialize score
            
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

            // Store listener reference for proper cleanup
            this.visibilityChangeHandler = () => {
                if (document.hidden) {
                    this.pauseTimers();
                } else {
                    this.resumeTimers();
                }
            };
            document.addEventListener('visibilitychange', this.visibilityChangeHandler);
            
            this.startGameLoop();
            
            
            this.logger.info('Game initialized successfully');
        } catch (error) {
            this.logger.error('Game initialization failed', error);
            console.error('Detailed error:', error);
        }
    }

    setupSpriteManager() {
        // Only create if it doesn't exist, or if previous one is invalid
        if (!window.spriteManager || 
            !window.spriteManager.getSprite || 
            !this.assetPreloader) {
            
            window.spriteManager = {
                sprites: {},
                getSprite: (name) => {
                    // Add safety check
                    if (!this.assetPreloader || typeof this.assetPreloader.getSprite !== 'function') {
                        console.warn('AssetPreloader not available for sprite:', name);
                        return null;
                    }
                    return this.assetPreloader.getSprite(name);
                }
            };
        }
    }

    // Create level and build simple entity map
    createLevel(levelNum) {
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

    createLevelx(levelNum) {
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
            this.grid[0][x] = ENTITY_TYPES.WALL;
            this.grid[GRID_HEIGHT-1][x] = ENTITY_TYPES.WALL;
        }
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.grid[y][0] = ENTITY_TYPES.WALL;
            this.grid[y][GRID_WIDTH-1] = ENTITY_TYPES.WALL;
        }
        
        // Position player
        const playerX = Math.floor(GRID_WIDTH / 2) + 3; 
        const playerY = GRID_HEIGHT - 6; 
        
        // Create and place player
        this.player = new Player(playerX, playerY);
        this.grid[playerY][playerX] = ENTITY_TYPES.PLAYER;
        this.entities.set(`${playerX},${playerY}`, this.player);
        
        // Create boulder (not diamond!)
        const boulderX = Math.floor(GRID_WIDTH / 2);
        const boulderY = playerY - 2;
        const boulder1 = new Boulder(boulderX, boulderY); // Fixed: use Boulder class
        this.grid[boulderY][boulderX] = ENTITY_TYPES.BOULDER;
        this.entities.set(`${boulderX},${boulderY}`, boulder1);
        
        // Create actual diamond
        const diamondX = playerX + 5;
        const diamondY = playerY;
        if (diamondX < GRID_WIDTH-1) {
            const diamond = new Diamond(diamondX, diamondY); // Fixed: proper Diamond entity
            this.grid[diamondY][diamondX] = ENTITY_TYPES.DIAMOND;
            this.entities.set(`${diamondX},${diamondY}`, diamond);
        }
        
        // ... rest of your level creation code
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

    getDirectionName(deltaX, deltaY) {
        if (deltaX > 0) return 'right';
        if (deltaX < 0) return 'left';
        if (deltaY > 0) return 'down';
        if (deltaY < 0) return 'up';
        return null;
    }

    // Process the player's movement based on input
    // Updated processPlayerMove method with boulder push resistance
    processPlayerMove(deltaX, deltaY) {
        if (!this.player) return [];

        const newX = this.player.x + deltaX;
        const newY = this.player.y + deltaY;
        const effects = [];

        if (newX < 0 || newX >= this.grid[0].length || newY < 0 || newY >= this.grid.length) {
            this.player.clearMovementDirection();
            return [];
        }

        const targetType = this.grid[newY][newX];
        const direction = this.getDirectionName(deltaX, deltaY);

        if (targetType === ENTITY_TYPES.EMPTY || targetType === ENTITY_TYPES.DIRT) {
            effects.push({ type: 'sound', sound: targetType === ENTITY_TYPES.DIRT ? 'dig' : 'move' });
            effects.push({ type: 'move', entity: this.player, from: { x: this.player.x, y: this.player.y }, to: { x: newX, y: newY } });
            if (targetType === ENTITY_TYPES.DIRT) {
                this.entities.delete(`${newX},${newY}`);
            }
            this.player.setMovementDirection(direction);
            
        } else if (targetType === ENTITY_TYPES.DIAMOND) {
            const diamondEntity = this.entities.get(`${newX},${newY}`);
            if (diamondEntity && diamondEntity.type === ENTITY_TYPES.DIAMOND) {
                effects.push({ type: 'sound', sound: 'pickup' });
                effects.push({ type: 'move', entity: this.player, from: { x: this.player.x, y: this.player.y }, to: { x: newX, y: newY } });
                effects.push({ type: 'collect', x: newX, y: newY });
                this.player.setMovementDirection(direction);
            }
            
        } else if (targetType === ENTITY_TYPES.EXIT && this.hasExitAppeared) {
            this.levelComplete();
            
        } else if (targetType === ENTITY_TYPES.BOULDER && deltaY === 0) {
            // ENHANCED: Boulder pushing with resistance
            const pushX = newX + deltaX;
            
            // Check if there's space to push the boulder
            if (pushX >= 0 && pushX < this.grid[0].length && this.grid[newY][pushX] === ENTITY_TYPES.EMPTY) {
                const boulder = this.entities.get(`${newX},${newY}`);
                if (boulder) {
                    // Random 1 in 3 chance for push to succeed
                    const pushSucceeds = Math.random() < 0.33; // 33% chance
                    
                    if (pushSucceeds) {
                        // Push succeeds - move both boulder and player with sound
                        effects.push({ type: 'sound', sound: 'push' });
                        effects.push({ type: 'move', entity: boulder, from: { x: newX, y: newY }, to: { x: pushX, y: newY } });
                        effects.push({ type: 'move', entity: this.player, from: { x: this.player.x, y: this.player.y }, to: { x: newX, y: newY } });
                        this.player.setMovementDirection(direction, true); // true = pushing
                    } else {
                        // Push fails - player shows pushing animation but no sound or movement
                        this.player.setMovementDirection(direction, true); // true = pushing (even though no movement)
                        // Optional: Add a different sound for failed push
                        // effects.push({ type: 'sound', sound: 'push_fail' }); // if you have this sound
                    }
                }
            } else {
                // Can't push boulder (no space behind it) - just show pushing animation
                this.player.setMovementDirection(direction, true);
            }
            
        } else {
            this.player.clearMovementDirection();
        }

        return effects;
    }

    // Add this method to clear player animation when no input is being processed
    // Call this in your tick() method when no input is active
    clearPlayerAnimationIfIdle() {
        // Only clear if no input is currently being processed
        if (this.inputManager && 
            !this.inputManager.currentKey && 
            !this.inputManager.isMouseDown && 
            !this.inputManager.hasQueuedInputs) {
            
            if (this.player && this.player.currentDirection) {
                this.player.clearMovementDirection();
            }
        }
    }

    collectDiamond() {
        this.diamondsCollected++;
        this.score += 30; // Add 30 points for each diamond collected
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
    }

    // method to handle physics effects
    processEffects(effects) {
        for (const effect of effects) {
            try {
                switch (effect.type) {
                    case 'move':
                        // Validate entity exists at from position
                        const entityAtFrom = this.entities.get(`${effect.from.x},${effect.from.y}`);
                        if (entityAtFrom !== effect.entity) {
                            console.error('Move effect: entity not at expected from position');
                            continue;
                        }
                        
                        // Process move
                        this.grid[effect.from.y][effect.from.x] = ENTITY_TYPES.EMPTY;
                        this.grid[effect.to.y][effect.to.x] = effect.entity.type;
                        this.entities.delete(`${effect.from.x},${effect.from.y}`);
                        this.entities.set(`${effect.to.x},${effect.to.y}`, effect.entity);
                        effect.entity.x = effect.to.x;
                        effect.entity.y = effect.to.y;
                        break;
                        
                    case 'move_and_collect':
                        // Atomic operation - either both succeed or both fail
                        const playerAtFrom = this.entities.get(`${effect.from.x},${effect.from.y}`);
                        const diamondAtTo = this.entities.get(`${effect.to.x},${effect.to.y}`);
                        
                        if (playerAtFrom === effect.entity && diamondAtTo === effect.collectEntity) {
                            // Remove both entities from old positions
                            this.entities.delete(`${effect.from.x},${effect.from.y}`);
                            this.entities.delete(`${effect.to.x},${effect.to.y}`);
                            
                            // Update grid
                            this.grid[effect.from.y][effect.from.x] = ENTITY_TYPES.EMPTY;
                            this.grid[effect.to.y][effect.to.x] = ENTITY_TYPES.PLAYER;
                            
                            // Place player at new position
                            this.entities.set(`${effect.to.x},${effect.to.y}`, effect.entity);
                            effect.entity.x = effect.to.x;
                            effect.entity.y = effect.to.y;
                            
                            // Collect the diamond
                            this.collectDiamond();
                        } else {
                            console.error('move_and_collect: entities not in expected positions');
                        }
                        break;
                        
                    case 'remove':
                        this.entities.delete(`${effect.x},${effect.y}`);
                        break;
                        
                    case 'collect':
                        if (effect.diamondEntity && effect.diamondEntity.type === ENTITY_TYPES.DIAMOND) {
                            this.collectDiamond();
                        } else if (effect.x !== undefined && effect.y !== undefined) {
                            const entityToRemove = this.entities.get(`${effect.x},${effect.y}`);
                            if (entityToRemove && entityToRemove.type === ENTITY_TYPES.DIAMOND) {
                                this.entities.delete(`${effect.x},${effect.y}`);
                                this.collectDiamond();
                            }
                        }
                        break;
                        
                    case 'sound':
                        if (this.soundManager && typeof this.soundManager.playSound === 'function') {
                            this.soundManager.playSound(effect.sound);
                        }
                        break;
                        
                    // ... other effect types ...
                }
            } catch (error) {
                console.error('Error processing effect:', effect, error);
                // Continue processing other effects rather than crashing
            }
        }
    }

    // New method to update entities with effects system
    updateEntitiesWithEffects() {
        // Create stable entity list BEFORE any processing
        // This prevents Map modification corruption during entity updates
        const entitiesToUpdate = Array.from(this.entities.values()).filter(entity => 
            entity !== this.player && 
            typeof entity.update === 'function'
        );
        
        // Sort entities by position (bottom-right to top-left) for proper physics order
        // This ensures falling objects are processed in the correct order
        entitiesToUpdate.sort((a, b) => {
            if (a.y !== b.y) return b.y - a.y; // Bottom to top
            return b.x - a.x; // Right to left
        });
        
        const allEffects = [];
        let somethingChanged = false;
        
        for (const entity of entitiesToUpdate) {
            // Skip if entity was removed from map during this update cycle
            const currentEntity = this.entities.get(`${entity.x},${entity.y}`);
            if (!currentEntity || currentEntity !== entity) {
                continue; // Entity was moved or removed by a previous update
            }
            
            const oldX = entity.x;
            const oldY = entity.y;
            
            const result = entity.update(this.grid);
            
            let moved, effects;
            if (result && typeof result === 'object' && 'effects' in result) {
                moved = result.moved;
                effects = result.effects || [];
            } else {
                moved = result;
                effects = [];
                
                // Add landing sound effect if entity has one
                if (typeof entity.getLandingSound === 'function') {
                    const soundName = entity.getLandingSound();
                    if (soundName) {
                        effects.push({
                            type: EFFECT_TYPES.SOUND,
                            sound: soundName
                        });
                    }
                }
            }
            
            if (moved) {
                somethingChanged = true;
                
                // Update grid based on movement
                this.grid[oldY][oldX] = ENTITY_TYPES.EMPTY;
                this.grid[entity.y][entity.x] = entity.type;

                // Handle position changes in the entities map
                if (oldX !== entity.x || oldY !== entity.y) {
                    this.entities.delete(`${oldX},${oldY}`);
                    this.entities.set(`${entity.x},${entity.y}`, entity);
                }

                // Check collision with player
                if ((entity.type === ENTITY_TYPES.BOULDER || entity.type === ENTITY_TYPES.DIAMOND) && 
                    this.player && entity.x === this.player.x && entity.y === this.player.y) {
                    this.soundManager.playSound('die');
                    this.gameOver(false);
                    return somethingChanged;
                }
            }
            
            allEffects.push(...effects);
        }
        
        // Process all accumulated effects at once
        this.processEffects(allEffects);
        
        return somethingChanged;
    }

    tick() {
        if (this.isGameOver) return false; // Return false if no changes
        
        // Initialize tick counter if it doesn't exist
        if (!this.tickCounter) this.tickCounter = 0;
        this.tickCounter++;
        
        let somethingChanged = false;
        
        // Determine tick type: even = physics, odd = animation
        const isPhysicsTick = (this.tickCounter % 2 === 0);
        
        if (isPhysicsTick) {
            // PHYSICS TICK: Process input, movement, and game logic
            
            // FIXED: Only mark input as processed if it actually succeeded
            let successfullyProcessedQueuedInput = false;
            
            // Process queued input first (higher priority)
            if (this.inputManager && this.inputManager.hasQueuedInputs && this.inputManager.hasQueuedInputs()) {
                const queuedInput = this.inputManager.getNextQueuedInput();
                if (queuedInput) {
                    const playerEffects = this.processPlayerMove(queuedInput.x, queuedInput.y);
                    this.processEffects(playerEffects);
                    
                    // FIXED: Only mark as processed if effects were actually generated
                    if (playerEffects.length > 0) {
                        somethingChanged = true;
                        successfullyProcessedQueuedInput = true;
                    }
                    // Note: If no effects were generated, we DON'T set successfullyProcessedQueuedInput
                    // This allows held keys to still be processed
                }
            }
            
            // Process held keys if no queued input was successfully processed. This ensures input doesn't get "eaten" by failed queued inputs
            if (this.inputManager && !successfullyProcessedQueuedInput) {
                const heldKey = this.inputManager.currentKey;
                if (heldKey) {
                    const playerEffects = this.processPlayerMove(heldKey.x, heldKey.y);
                    this.processEffects(playerEffects);
                    if (playerEffects.length > 0) somethingChanged = true;
                }
                
                // Also process mouse and touch input if no keyboard input was processed
                if ((this.inputManager.isMouseDown && this.inputManager.currentMouseDirection) ||
                    (this.inputManager.isTouchDown && this.inputManager.currentTouchDirection)) {
                    
                    const direction = this.inputManager.currentMouseDirection || this.inputManager.currentTouchDirection;
                    if (!this.isGameOver && this.player && this.isValidMove(direction.x, direction.y)) {
                        const playerEffects = this.processPlayerMove(direction.x, direction.y);
                        this.processEffects(playerEffects);
                        if (playerEffects.length > 0) somethingChanged = true;
                    }
                }
            }
            
            // Update entities with physics
            if (this.updateEntitiesWithEffects()) somethingChanged = true;

            // Update viewport if player moved
            if (this.player && this.renderer) {
                if (this.renderer.updateViewportPosition()) somethingChanged = true;
            }
                
            // Check if exit should appear
            if (!this.hasExitAppeared && this.diamondsCollected >= this.diamondsNeeded) {
                this.createExit();
                this.hasExitAppeared = true;
                somethingChanged = true;
            }

            // Clear player animation if idle
            this.clearPlayerAnimationIfIdle();

            // Update player physics tick
            if (this.player && typeof this.player.tick === 'function') {
                if (this.player.tick(true)) somethingChanged = true;
            }
        } else {
            // ANIMATION TICK: Update all entity animations (including player)
            if (this.player && typeof this.player.tick === 'function') {
                if (this.player.tick(false)) somethingChanged = true;
            }
            
            for (const entity of this.entities.values()) {
                if (entity !== this.player && typeof entity.tick === 'function') {
                    if (entity.tick(false)) somethingChanged = true;
                }
            }
        }
        
        return somethingChanged;
    }

    createExit() {
        // Find a suitable location for the exit (usually near player or predefined spot)
       
    }

    startNewLevel(level) {
        this.logger.info(`Starting level ${level}`);
        
        this.stopGameLoop();
        
        
        // Create new level
        this.createLevel(level);
        
        // Reset game state
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = this.config.get('time.initialTime');
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded') + 
                            (level * this.config.get('levels.diamondsIncrementPerLevel'));
        this.isGameOver = false;
        this.score = 0; // Reset score for new level
        
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
    }

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
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        // Use single interval for both game logic and timer
        const updateInterval = this.config.get('gameLoop.updateInterval');
        
        let lastFrameTime = performance.now();
        let timeSinceLastUpdate = 0;
        
        // Calculate how often to update timer (e.g., every 10 ticks for 1-second intervals)
        const timerInterval = this.config.get('gameLoop.timerInterval') || 1000;
        const ticksPerTimerUpdate = Math.round(timerInterval / updateInterval);
        let ticksSinceTimerUpdate = 0;

        const gameLoop = (currentTime) => {
            if (this.isGameOver) {
                this.stopGameLoop();
                return;
            }

            let deltaTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;

            // Safety cap to prevent spiral of death on long pauses
            if (deltaTime > 1000) { // 1 second max
                deltaTime = 1000;
            }

            timeSinceLastUpdate += deltaTime;

            // FIXED: Process both game logic and timer in lockstep
            while (timeSinceLastUpdate >= updateInterval) {
                // Always process game logic
                this.tick();
                
                // Update timer at regular intervals
                ticksSinceTimerUpdate++;
                if (ticksSinceTimerUpdate >= ticksPerTimerUpdate) {
                    this.updateTimer();
                    ticksSinceTimerUpdate = 0;
                }
                
                timeSinceLastUpdate -= updateInterval;
            }

            // Render the game state once per frame
            this.renderer.drawGame();

            this.gameLoopId = requestAnimationFrame(gameLoop);
        };

        this.gameLoopId = requestAnimationFrame(gameLoop);
    }

    stopGameLoop() {
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }

    updateTimer() {
        if (this.isGameOver) return;
        
        this.timeLeft--;
        
        // Update UI immediately - no race condition possible
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
        
        this.pauseTime = performance.now();
    }
    
    resumeTimers() {
        if (this.isGameOver) return;
        const pauseDuration = performance.now() - (this.pauseTime || performance.now());
        this.startGameLoop();
        
    }

    levelComplete() {
        this.stopGameLoop();
        
        
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
        
        
        this.isGameOver = false;
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = this.config.get('time.initialTime');
        this.diamondsNeeded = this.config.get('levels.baseDiamondsNeeded');
        this.score = 0; // Reset score when restarting
        
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
        
    }
}