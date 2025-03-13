import { GameEngine } from './engine/gameEngine.js';
import { UIManager } from './ui/uiManager.js';
import { SplashScreenManager } from './ui/splashScreenManager.js';
import { LoadingManager } from './ui/loadingManager.js';
import { WorldGenerator } from './world/worldGenerator.js';
import { ConfigManager } from './systems/configManager.js';

// Entry point of the application
class Game {
    constructor() {
        this.engine = null;
        this.uiManager = null;
        this.worldGenerator = null;
        this.loadingManager = null;
        this.splashManager = null;
        this.configManager = null;
        
        // Initialize the game
        this.init();
    }
    
    async init() {
        // Initialize the loading manager first
        this.loadingManager = new LoadingManager();
        this.loadingManager.showLoadingScreen();
        
        // Set a small delay to show the loading screen
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Start loading components
        this.loadingManager.updateProgress(10, 'Initializing configuration...');
        this.configManager = new ConfigManager();
        await this.configManager.load();
        
        this.loadingManager.updateProgress(20, 'Setting up UI...');
        this.uiManager = new UIManager(this);
        
        this.loadingManager.updateProgress(40, 'Initializing engine...');
        this.engine = new GameEngine(this);
        
        this.loadingManager.updateProgress(60, 'Loading world systems...');
        this.worldGenerator = new WorldGenerator(this.engine);
        
        this.loadingManager.updateProgress(80, 'Preparing game assets...');
        await this.preloadAssets();
        
        this.loadingManager.updateProgress(100, 'Ready!');
        
        // Short delay to show the completed loading bar
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Hide loading screen and show splash screen
        this.loadingManager.hideLoadingScreen();
        
        // Initialize splash screen
        this.splashManager = new SplashScreenManager(this);
        this.splashManager.showSplashScreen();
        
        // Set up event listeners
        this.setupEventListeners();
    }
    
    async preloadAssets() {
        // Simulated asset loading - in a real implementation, this would load textures, models, etc.
        const totalAssets = 10;
        for (let i = 0; i < totalAssets; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            this.loadingManager.updateProgress(
                80 + (i + 1) * (20 / totalAssets),
                `Loading assets (${i + 1}/${totalAssets})...`
            );
        }
    }
    
    setupEventListeners() {
        // New Game button
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.splashManager.showNewGameScreen();
        });
        
        // Load Game button
        document.getElementById('load-game-btn').addEventListener('click', () => {
            this.splashManager.showLoadGameScreen();
        });
        
        // Options button
        document.getElementById('options-btn').addEventListener('click', () => {
            this.splashManager.showOptionsScreen();
        });
        
        // Back buttons
        document.getElementById('back-to-menu-btn').addEventListener('click', () => {
            this.splashManager.showSplashScreen();
        });
        
        document.getElementById('back-from-load-btn').addEventListener('click', () => {
            this.splashManager.showSplashScreen();
        });
        
        document.getElementById('back-from-options-btn').addEventListener('click', () => {
            this.splashManager.showSplashScreen();
        });
        
        // Start game button
        document.getElementById('start-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        // Random seed button
        document.getElementById('random-seed-btn').addEventListener('click', () => {
            const randomSeed = Math.floor(Math.random() * 1000000).toString();
            document.getElementById('world-seed').value = randomSeed;
        });
        
        // Save options button
        document.getElementById('save-options-btn').addEventListener('click', () => {
            this.saveOptions();
            this.splashManager.showSplashScreen();
        });
        
        // Dev tools toggle
        document.getElementById('toggle-dev-tools-btn').addEventListener('click', () => {
            const devTools = document.getElementById('dev-tools');
            const btn = document.getElementById('toggle-dev-tools-btn');
            
            if (devTools.classList.contains('hidden')) {
                devTools.classList.remove('hidden');
                btn.textContent = 'Hide';
            } else {
                devTools.classList.add('hidden');
                btn.textContent = 'Show';
            }
        });
        
        // Dev tools tabs
        const tabButtons = document.querySelectorAll('.dev-tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons and content
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.dev-tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                const tabId = button.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });
    }
    
    startNewGame() {
        const characterName = document.getElementById('character-name').value.trim() || 'Traveler';
        const worldSeed = document.getElementById('world-seed').value.trim() || String(Math.floor(Math.random() * 1000000));
        
        // Hide all screens and show game container
        document.querySelectorAll('.screen-container, #splash-screen, #new-game-screen').forEach(el => {
            el.classList.add('hidden');
        });
        document.getElementById('game-container').classList.remove('hidden');
        
        // Initialize the game world with the seed
        this.engine.initWorld(worldSeed);
        
        // Create player character
        this.engine.createPlayerCharacter(characterName);
        
        // Start the game loop
        this.engine.start();
        
        // Initialize UI for the game
        this.uiManager.initGameUI();
        
        console.log(`Starting new game with character "${characterName}" and seed "${worldSeed}"`);
    }
    
    saveOptions() {
        const musicVolume = document.getElementById('music-volume').value;
        const sfxVolume = document.getElementById('sfx-volume').value;
        const showFPS = document.getElementById('show-fps').checked;
        const enableWeather = document.getElementById('enable-weather').checked;
        
        this.configManager.saveOptions({
            audio: {
                musicVolume: parseInt(musicVolume),
                sfxVolume: parseInt(sfxVolume)
            },
            graphics: {
                showFPS,
                enableWeather
            }
        });
        
        console.log('Options saved:', {
            musicVolume, 
            sfxVolume, 
            showFPS, 
            enableWeather
        });
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});

