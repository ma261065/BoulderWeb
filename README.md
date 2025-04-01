# Boulder - Web Version
A web-based clone of the classic Boulder Dash game, implemented with modern JavaScript and a modular architecture.

## Project Structure

```
boulder/
├── index.html           # Main HTML file
├── css/
│   └── styles.css       # Game styles
├── js/
│   ├── constants.js     # Game constants and settings
│   ├── game.js          # Main game logic
│   ├── entities/        # Entity classes
│   │   ├── entity.js    # Base entity class
│   │   ├── wall.js      # Wall entity
│   │   ├── dirt.js      # Dirt entity
│   │   ├── boulder.js   # Boulder entity
│   │   ├── diamond.js   # Diamond entity
│   │   ├── player.js    # Player entity
│   │   └── exit.js      # Exit entity
│   └── systems/         # Game systems
│       ├── sound-manager.js    # Sound system
│       ├── level-manager.js    # Level management
│       ├── input-manager.js    # Input handling
│       └── renderer.js         # Game rendering
└── sounds/              # Sound files
    ├── move.wav         # Player movement sound
    ├── dig.wav          # Digging sound
    ├── diamond.wav      # Diamond collection sound
    ├── boulder.wav      # Boulder rolling sound
    ├── fall.wav         # Falling sound
    ├── level_complete.wav  # Level completion sound
    └── game_over.wav    # Game over sound
```

## Game Features

- Multiple levels with increasing difficulty
- Entity-based architecture for clean code organization
- Physics system for falling and rolling objects
- Sound effects using external WAV files
- Responsive UI elements

## How to Play

1. Use the arrow keys to move the player
2. Collect the required number of diamonds to reveal the exit
3. Reach the exit to complete the level
4. Avoid being crushed by falling boulders

## Sound Effects

The game uses external WAV files for sound effects:
- `move.wav`: Played when the player moves to an empty space
- `dig.wav`: Played when the player digs through dirt
- `diamond.wav`: Played when the player collects a diamond
- `boulder.wav`: Played when a boulder is pushed or rolls
- `fall.wav`: Played when a boulder or diamond falls
- `level_complete.wav`: Played when a level is completed
- `game_over.wav`: Played when the game is over

## Implementation Notes

The game is implemented with a modular architecture:

- **Entity System**: Each game element (player, boulder, etc.) is represented by a class that extends the base `Entity` class.
- **Game Systems**: Logic is separated into systems: sound, level management, input handling, and rendering.
- **Main Game Logic**: The `Game` class coordinates the systems and manages the game state.

## Browser Compatibility

This game works in modern browsers that support JavaScript ES6 features and the Web Audio API.
