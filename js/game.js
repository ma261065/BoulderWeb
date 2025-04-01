class Game {
    constructor() {
        console.log('Creating new game instance...');
        
        // Game state
        this.grid = [];
        this.player = null;
        this.isGameOver = false;
        this.hasExitAppeared = false;
        this.diamondsCollected = 0;
        this.diamondsNeeded = 10;
        this.timeLeft = GAME_SETTINGS.initialTime;
        
        // Intervals
        this.gameInterval = null;
        this.timerInterval = null;
        
        // Systems - initialize in the correct order
        this.soundManager = new SoundManager();
        
        // Load sprites first
        console.log('Creating sprite manager...');
        window.spriteManager = new SpriteManager();
        
        this.renderer = new Renderer(this);
        this.levelManager = new LevelManager(this);
        this.inputManager = new InputManager(this);
        
        // Initialize the game
        this.init();
    }
    
    init() {
        console.log('Initializing game...');
        
        // Create the first level
        const levelData = this.levelManager.createLevel(this.levelManager.getCurrentLevel());
        this.grid = levelData.grid;
        this.player = levelData.player;
        
        // Reset game state
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = GAME_SETTINGS.initialTime;
        this.isGameOver = false;
        
        // Update UI
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        // Draw initial state
        this.renderer.drawGame();
        
        // Start game loop
        this.gameInterval = setInterval(() => this.update(), GAME_SETTINGS.gameUpdateInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), GAME_SETTINGS.timerUpdateInterval);
    }
    
    update() {
        if (this.isGameOver) return;
        
        let somethingChanged = false;
        
        // Process moving entities (boulders and diamonds)
        // Process from bottom to top, right to left for more natural falling behavior
        const movingEntities = this.levelManager.getMovingEntities();
        
        // Sort entities from bottom to top, right to left
        movingEntities.sort((a, b) => {
            if (a.y !== b.y) return b.y - a.y; // Bottom to top
            return b.x - a.x; // Right to left
        });
        
        // Update each entity
        for (const entity of movingEntities) {
            const changed = entity.update(this.grid);
            
            if (changed) {
                somethingChanged = true;
                
                // Check if sound should be played
                if (typeof entity.getFallingSound === 'function') {
                    const soundName = entity.getFallingSound();
                    if (soundName) {
                        this.soundManager.playSoundWithProbability(soundName, 0.1);
                    }
                }
                
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
        
        // Check if exit should appear
        if (!this.hasExitAppeared && this.diamondsCollected >= this.diamondsNeeded) {
            this.levelManager.createExit(this.grid);
            this.hasExitAppeared = true;
            somethingChanged = true;
        }
        
        // Sync entity list with grid - ensures consistency
        this.syncEntitiesWithGrid();
        
        // Redraw if something changed
        if (somethingChanged) {
            this.renderer.drawGame();
        }
    }
    
    // Method to ensure entities match grid state
    syncEntitiesWithGrid() {
        // Create a copy of entity instances
        const entitiesToKeep = [];
        
        // Add player first - player is always needed
        if (this.player) {
            entitiesToKeep.push(this.player);
        }
        
        // Iterate through grid and build entity list
        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const tileType = this.grid[y][x];
                
                // Skip empty tiles and player (already added)
                if (tileType === ENTITY_TYPES.EMPTY || 
                    (tileType === ENTITY_TYPES.PLAYER && this.player && this.player.x === x && this.player.y === y)) {
                    continue;
                }
                
                // Find or create entity for this tile
                const existingEntity = this.levelManager.entityInstances.find(e => 
                    e.x === x && e.y === y && e.type === tileType && e !== this.player);
                
                if (existingEntity) {
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
        
        // Replace entity instances with synchronized list
        this.levelManager.entityInstances = entitiesToKeep;
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
    
    collectDiamond() {
        this.diamondsCollected++;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
    }
    
    setDiamondsNeeded(count) {
        this.diamondsNeeded = count;
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
    }
    
    levelComplete() {
        // Stop game intervals
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        
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
            const levelData = this.levelManager.createLevel(nextLevel);
            
            this.grid = levelData.grid;
            this.player = levelData.player;
            
            // Reset game state
            this.diamondsCollected = 0;
            this.hasExitAppeared = false;
            this.timeLeft = GAME_SETTINGS.initialTime;
            
            // Update UI
            this.renderer.updateUI(
                this.levelManager.getCurrentLevel(),
                this.diamondsCollected,
                this.diamondsNeeded,
                this.timeLeft
            );
            
            // Draw initial state
            this.renderer.drawGame();
            
            // Start game loop
            this.gameInterval = setInterval(() => this.update(), GAME_SETTINGS.gameUpdateInterval);
            this.timerInterval = setInterval(() => this.updateTimer(), GAME_SETTINGS.timerUpdateInterval);
        }, 3000);
    }
    
    gameOver(won) {
        this.isGameOver = true;
        
        // Stop game intervals
        clearInterval(this.gameInterval);
        clearInterval(this.timerInterval);
        
        // Play game over sound
        this.soundManager.playSound('gameOver');
        
        // Show game over message
        this.renderer.drawMessage(
            won ? 'You Win!' : 'Game Over',
            'Press Enter to restart',
            won ? '#00FF00' : '#FF0000'
        );
    }
    
    restart() {
        const levelData = this.levelManager.createLevel(this.levelManager.getCurrentLevel());
        this.grid = levelData.grid;
        this.player = levelData.player;
        
        // Reset game state
        this.isGameOver = false;
        this.diamondsCollected = 0;
        this.hasExitAppeared = false;
        this.timeLeft = GAME_SETTINGS.initialTime;
        
        // Update UI
        this.renderer.updateUI(
            this.levelManager.getCurrentLevel(),
            this.diamondsCollected,
            this.diamondsNeeded,
            this.timeLeft
        );
        
        // Draw initial state
        this.renderer.drawGame();
        
        // Start game loop
        this.gameInterval = setInterval(() => this.update(), GAME_SETTINGS.gameUpdateInterval);
        this.timerInterval = setInterval(() => this.updateTimer(), GAME_SETTINGS.timerUpdateInterval);
    }
}