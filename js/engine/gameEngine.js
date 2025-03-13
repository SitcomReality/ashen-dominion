import { EntityManager } from './entityManager.js';
import { WorldManager } from '../world/worldManager.js';
import { StoryManager } from '../story/storyManager.js';
import { TimeManager } from '../systems/timeManager.js';
import { WeatherSystem } from '../systems/weatherSystem.js';
import { InputHandler } from './inputHandler.js';
import { PhysicsSystem } from './physicsSystem.js';
import { RenderSystem } from './renderSystem.js';
import { SoundManager } from '../systems/soundManager.js';
import { AISystem } from '../ai/aiSystem.js';
import { InventorySystem } from '../systems/inventorySystem.js';
import { QuestSystem } from '../story/questSystem.js';
import { SaveSystem } from '../systems/saveSystem.js';

/**
 * Main game engine that coordinates all game systems
 */
export class GameEngine {
    constructor(game) {
        this.game = game;
        this.running = false;
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set up canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Engine systems
        this.entityManager = new EntityManager(this);
        this.worldManager = new WorldManager(this);
        this.storyManager = new StoryManager(this);
        this.timeManager = new TimeManager(this);
        this.weatherSystem = new WeatherSystem(this);
        this.inputHandler = new InputHandler(this);
        this.physicsSystem = new PhysicsSystem(this);
        this.renderSystem = new RenderSystem(this);
        this.soundManager = new SoundManager(this);
        this.aiSystem = new AISystem(this);
        this.inventorySystem = new InventorySystem(this);
        this.questSystem = new QuestSystem(this);
        this.saveSystem = new SaveSystem(this);
        
        // Game state
        this.player = null;
        this.worldSeed = '';
        
        // Performance metrics
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.startTime = 0;
        
        // Debug options
        this.debugOptions = {
            showCollisionBoxes: false,
            showPathFinding: false,
            showNPCStates: false
        };
        
        // God mode
        this.godMode = false;
    }
    
    /**
     * Initialize the game world
     * @param {string} seed - Seed for world generation
     */
    initWorld(seed) {
        this.worldSeed = seed;
        this.worldManager.initialize(seed);
        this.timeManager.initialize();
        this.weatherSystem.initialize(seed);
    }
    
    /**
     * Create the player character
     * @param {string} name - Player character name
     */
    createPlayerCharacter(name) {
        // Create player entity
        this.player = this.entityManager.createPlayer(name);
        
        // Initialize story with player
        this.storyManager.initialize(this.player);
        
        // Initialize quest system
        this.questSystem.initialize();
    }
    
    /**
     * Start the game engine
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        this.startTime = performance.now();
        this.lastFpsUpdate = this.startTime;
        
        // Start the game loop
        this.gameLoop(this.startTime);
        
        // Save the game periodically
        this.autoSaveInterval = setInterval(() => {
            this.saveGame();
        }, 5 * 60 * 1000); // Auto-save every 5 minutes
    }
    
    /**
     * Stop the game engine
     */
    stop() {
        this.running = false;
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = (timestamp - this.lastTimestamp) / 1000 || 0;
        this.lastTimestamp = timestamp;
        
        // Update FPS counter
        this.frameCount++;
        if (timestamp - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = timestamp;
            
            // Update UI FPS display if enabled
            if (this.game.configManager.getOptions().graphics.showFPS) {
                const fpsCounter = document.getElementById('fps-counter');
                if (fpsCounter) {
                    fpsCounter.textContent = this.fps.toFixed(1);
                }
            }
        }
        
        // Process input
        this.inputHandler.update();
        
        // Update game systems
        this.update(deltaTime);
        
        // Render the game
        this.render();
        
        // Schedule next frame
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Update all game systems
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Cap delta time to prevent large jumps
        const cappedDelta = Math.min(deltaTime, 0.1);
        
        // Update time
        this.timeManager.update(cappedDelta);
        
        // Update weather
        this.weatherSystem.update(cappedDelta);
        
        // Update AI
        this.aiSystem.update(cappedDelta);
        
        // Update physics
        this.physicsSystem.update(cappedDelta);
        
        // Update entities
        this.entityManager.update(cappedDelta);
        
        // Update quests
        this.questSystem.update(cappedDelta);
        
        // Update story
        this.storyManager.update(cappedDelta);
    }
    
    /**
     * Render the game
     */
    render() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render the game
        this.renderSystem.render(this.ctx);
    }
    
    /**
     * Resize the canvas to match the window size
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update the render system to handle the resize
        if (this.renderSystem) {
            this.renderSystem.handleResize();
        }
    }
    
    /**
     * Save the current game state
     * @returns {boolean} - True if save successful
     */
    saveGame() {
        return this.saveSystem.saveGame();
    }
    
    /**
     * Load a saved game
     * @param {string} saveId - ID of the save to load
     * @returns {boolean} - True if load successful
     */
    loadGame(saveId) {
        return this.saveSystem.loadGame(saveId);
    }
    
    /**
     * Get player inventory
     * @returns {object} - Player inventory
     */
    getPlayerInventory() {
        // Placeholder implementation
        return {
            size: 20,
            items: [
                { id: 'item1', name: 'Wooden Sword', description: 'A basic wooden sword', type: 'equipment', icon: 'sword', count: 1, value: 10 },
                { id: 'item2', name: 'Health Potion', description: 'Restores 20 health', type: 'consumable', icon: 'potion', count: 5, value: 5 },
                { id: 'item3', name: 'Leather Helmet', description: 'Basic head protection', type: 'equipment', icon: 'helmet', count: 1, value: 15 },
                { id: 'item4', name: 'Iron Ore', description: 'Raw iron ore', type: 'material', icon: 'material', count: 8, value: 3 }
            ]
        };
    }
    
    /**
     * Get player equipment
     * @returns {object} - Player equipment
     */
    getPlayerEquipment() {
        // Placeholder implementation
        return {
            head: null,
            torso: { id: 'torso1', name: 'Leather Vest', description: 'Basic torso protection', type: 'equipment', icon: 'armor', value: 20 },
            legs: { id: 'legs1', name: 'Leather Pants', description: 'Basic leg protection', type: 'equipment', icon: 'pants', value: 15 },
            feet: null,
            weapon: null,
            accessory: null
        };
    }
    
    /**
     * Get player stats
     * @returns {object} - Player stats
     */
    getPlayerStats() {
        // Placeholder implementation
        return {
            health: 85,
            maxHealth: 100,
            energy: 70,
            maxEnergy: 100,
            strength: 10,
            dexterity: 8,
            intelligence: 6,
            vitality: 12,
            defense: 5,
            attack: 12
        };
    }
    
    /**
     * Get all entities in the game world
     * @returns {Array} - Array of entities
     */
    getAllEntities() {
        // Placeholder implementation
        return [
            { id: 'player', name: 'Player', type: 'player', position: { x: 0, y: 0 } },
            { id: 'npc1', name: 'Village Elder', type: 'npc', position: { x: 10, y: 5 } },
            { id: 'npc2', name: 'Shopkeeper', type: 'npc', position: { x: -5, y: 8 } }
        ];
    }
    
    /**
     * Get entity by ID
     * @param {string} entityId - Entity ID
     * @returns {object|null} - Entity object or null if not found
     */
    getEntityById(entityId) {
        // Placeholder implementation
        const entities = {
            player: {
                id: 'player',
                name: 'Player',
                type: 'player',
                position: { x: 0, y: 0 },
                stats: {
                    health: 85,
                    maxHealth: 100,
                    energy: 70,
                    maxEnergy: 100,
                    strength: 10,
                    dexterity: 8,
                    intelligence: 6,
                    vitality: 12
                },
                inventory: {
                    size: 20,
                    items: [
                        { id: 'item1', name: 'Wooden Sword', count: 1 },
                        { id: 'item2', name: 'Health Potion', count: 5 }
                    ]
                }
            },
            npc1: {
                id: 'npc1',
                name: 'Village Elder',
                type: 'npc',
                position: { x: 10, y: 5 },
                stats: {
                    health: 50,
                    maxHealth: 50,
                    energy: 40,
                    maxEnergy: 40,
                    strength: 5,
                    dexterity: 4,
                    intelligence: 12,
                    vitality: 6
                },
                brain: {
                    currentState: 'idle',
                    currentGoal: 'complete_daily_routine',
                    needs: {
                        hunger: 0.8,
                        rest: 0.5,
                        social: 0.7
                    },
                    routine: {
                        schedule: {
                            '06:00': { action: 'wake_up', location: 'home' },
                            '07:00': { action: 'eat_breakfast', location: 'home' },
                            '08:00': { action: 'work', location: 'village_square' },
                            '12:00': { action: 'eat_lunch', location: 'tavern' },
                            '13:00': { action: 'work', location: 'village_square' },
                            '18:00': { action: 'eat_dinner', location: 'home' },
                            '20:00': { action: 'socialize', location: 'tavern' },
                            '22:00': { action: 'sleep', location: 'home' }
                        }
                    }
                }
            },
            npc2: {
                id: 'npc2',
                name: 'Shopkeeper',
                type: 'npc',
                position: { x: -5, y: 8 },
                stats: {
                    health: 60,
                    maxHealth: 60,
                    energy: 50,
                    maxEnergy: 50,
                    strength: 7,
                    dexterity: 9,
                    intelligence: 8,
                    vitality: 7
                },
                inventory: {
                    size: 30,
                    items: [
                        { id: 'item3', name: 'Iron Sword', count: 2 },
                        { id: 'item4', name: 'Health Potion', count: 10 },
                        { id: 'item5', name: 'Leather Armor', count: 1 }
                    ]
                },
                brain: {
                    currentState: 'working',
                    currentGoal: 'sell_items',
                    needs: {
                        hunger: 0.4,
                        rest: 0.6,
                        social: 0.9
                    },
                    routine: {
                        schedule: {
                            '05:00': { action: 'wake_up', location: 'home' },
                            '06:00': { action: 'prepare_shop', location: 'shop' },
                            '08:00': { action: 'open_shop', location: 'shop' },
                            '12:00': { action: 'eat_lunch', location: 'shop' },
                            '18:00': { action: 'close_shop', location: 'shop' },
                            '19:00': { action: 'eat_dinner', location: 'home' },
                            '21:00': { action: 'sleep', location: 'home' }
                        }
                    }
                }
            }
        };
        
        return entities[entityId] || null;
    }
    
    /**
     * Get world information
     * @returns {object} - World information
     */
    getWorldInfo() {
        // Placeholder implementation
        return {
            seed: this.worldSeed,
            width: 1000,
            height: 1000,
            regions: [
                { id: 'region1', name: 'Forest', biome: 'forest' },
                { id: 'region2', name: 'Plains', biome: 'plains' },
                { id: 'region3', name: 'Mountain', biome: 'mountain' }
            ],
            time: this.timeManager.getCurrentTime(),
            weather: {
                current: this.weatherSystem.getCurrentWeather(),
                forecast: this.weatherSystem.getForecast()
            }
        };
    }
    
    /**
     * Get active quests
     * @returns {Array} - Array of active quests
     */
    getActiveQuests() {
        // Placeholder implementation
        return [
            {
                id: 'quest1',
                title: 'Village in Need',
                description: 'The village elder needs help gathering supplies.',
                giver: 'Village Elder',
                location: 'Forest clearing',
                isMainQuest: true,
                status: 'in_progress',
                progress: 50,
                objectives: [
                    {
                        id: 'obj1',
                        description: 'Collect 5 medicinal herbs',
                        type: 'collect',
                        required: 5,
                        current: 3,
                        completed: false
                    },
                    {
                        id: 'obj2',
                        description: 'Deliver herbs to the elder',
                        type: 'talk',
                        completed: false
                    }
                ],
                rewards: [
                    { type: 'item', name: 'Health Potion', amount: 3 },
                    { type: 'gold', amount: 50 },
                    { type: 'exp', amount: 100 }
                ],
                abandonable: false
            },
            {
                id: 'quest2',
                title: 'Wolf Problem',
                description: 'Wolves have been attacking travelers on the road.',
                giver: 'Hunter',
                location: 'Eastern woods',
                isMainQuest: false,
                status: 'in_progress',
                progress: 25,
                objectives: [
                    {
                        id: 'obj1',
                        description: 'Kill 4 wolves',
                        type: 'kill',
                        required: 4,
                        current: 1,
                        completed: false
                    }
                ],
                rewards: [
                    { type: 'item', name: 'Leather Boots', amount: 1 },
                    { type: 'gold', amount: 75 }
                ],
                abandonable: true
            }
        ];
    }
    
    /**
     * Get completed quests
     * @returns {Array} - Array of completed quests
     */
    getCompletedQuests() {
        // Placeholder implementation
        return [
            {
                id: 'quest3',
                title: 'First Steps',
                description: 'Introduction to the village.',
                giver: 'Village Elder',
                location: 'Village',
                isMainQuest: true,
                status: 'completed',
                progress: 100,
                objectives: [
                    {
                        id: 'obj1',
                        description: 'Talk to the village elder',
                        type: 'talk',
                        completed: true
                    },
                    {
                        id: 'obj2',
                        description: 'Visit the blacksmith',
                        type: 'visit',
                        completed: true
                    }
                ],
                rewards: [
                    { type: 'item', name: 'Wooden Sword', amount: 1 },
                    { type: 'exp', amount: 50 }
                ],
                abandonable: false
            }
        ];
    }
    
    /**
     * Get story state
     * @returns {object} - Story state
     */
    getStoryState() {
        // Placeholder implementation
        return {
            currentChapter: 1,
            mainQuestProgress: 15,
            activePlotThreads: ['village_troubles', 'mysterious_stranger'],
            completedArcs: []
        };
    }
    
    /**
     * Get story flags
     * @returns {object} - Story flags
     */
    getStoryFlags() {
        // Placeholder implementation
        return {
            'met_elder': true,
            'knows_about_artifact': false,
            'village_reputation': 20,
            'helped_farmer': true
        };
    }
    
    /**
     * Get system statistics
     * @returns {object} - System statistics
     */
    getSystemStats() {
        // Calculate uptime
        const uptime = (performance.now() - this.startTime) / 1000;
        
        // Placeholder implementation
        return {
            fps: this.fps,
            entityCount: 15,
            memoryUsage: 50 * 1024 * 1024, // 50 MB (placeholder)
            uptime: uptime,
            debugOptions: this.debugOptions
        };
    }
    
    /**
     * Set a debug option
     * @param {string} option - Option name
     * @param {boolean} value - Option value
     */
    setDebugOption(option, value) {
        if (option in this.debugOptions) {
            this.debugOptions[option] = value;
        }
    }
    
    /**
     * Toggle god mode
     * @returns {boolean} - New god mode state
     */
    toggleGodMode() {
        this.godMode = !this.godMode;
        return this.godMode;
    }
    
    /**
     * Clear engine cache
     */
    clearCache() {
        // Placeholder implementation
        console.log('Engine cache cleared');
    }
    
    /**
     * Teleport player to position
     * @param {object} position - Target position
     */
    teleportPlayerTo(position) {
        if (this.player) {
            this.player.position = { ...position };
        }
    }
    
    /**
     * Update entity stats
     * @param {string} entityId - Entity ID
     * @param {object} newStats - New stats
     */
    updateEntityStats(entityId, newStats) {
        // Placeholder implementation
        console.log(`Updated stats for entity ${entityId}`, newStats);
    }
    
    /**
     * Remove entity from game
     * @param {string} entityId - Entity ID
     */
    removeEntity(entityId) {
        // Placeholder implementation
        console.log(`Removed entity ${entityId}`);
    }
    
    /**
     * Advance game time
     * @param {number} hours - Hours to advance
     */
    advanceTime(hours) {
        this.timeManager.advanceTime(hours);
    }
    
    /**
     * Set weather
     * @param {string} weatherType - Weather type
     */
    setWeather(weatherType) {
        this.weatherSystem.setWeather(weatherType);
    }
    
    /**
     * Spawn a random NPC
     * @returns {string} - ID of spawned NPC
     */
    spawnRandomNPC() {
        // Placeholder implementation
        const id = 'npc' + Math.floor(Math.random() * 1000);
        console.log(`Spawned random NPC with ID ${id}`);
        return id;
    }
    
    /**
     * Regenerate current region
     */
    regenerateCurrentRegion() {
        // Placeholder implementation
        console.log('Regenerated current region');
    }
    
    /**
     * Add a random quest
     */
    addRandomQuest() {
        // Placeholder implementation
        console.log('Added random quest');
    }
    
    /**
     * Advance main story
     */
    advanceMainStory() {
        this.storyManager.advanceMainStory();
    }
    
    /**
     * Reset story progress
     */
    resetStoryProgress() {
        this.storyManager.resetProgress();
    }
    
    /**
     * Set a story flag
     * @param {string} flag - Flag name
     * @param {any} value - Flag value
     */
    setStoryFlag(flag, value) {
        this.storyManager.setFlag(flag, value);
    }
    
    /**
     * Equipment-related functions
     */
    equipItem(slotIndex) {
        // Placeholder implementation
        console.log(`Equipped item at slot ${slotIndex}`);
    }
    
    unequipItem(slotType) {
        // Placeholder implementation
        console.log(`Unequipped item from ${slotType}`);
    }
    
    /**
     * Item-related functions
     */
    useItem(slotIndex) {
        // Placeholder implementation
        console.log(`Used item at slot ${slotIndex}`);
    }
    
    dropItem(slotIndex) {
        // Placeholder implementation
        console.log(`Dropped item at slot ${slotIndex}`);
    }
    
    givePlayerItem(itemId, count) {
        // Placeholder implementation
        console.log(`Gave player ${count}x item ${itemId}`);
    }
    
    takePlayerItem(itemId, count) {
        // Placeholder implementation
        console.log(`Took ${count}x item ${itemId} from player`);
    }
    
    /**
     * Quest-related functions
     */
    giveQuest(questId) {
        // Placeholder implementation
        console.log(`Gave quest ${questId} to player`);
    }
    
    completeQuest(questId) {
        // Placeholder implementation
        console.log(`Completed quest ${questId}`);
    }
    
    abandonQuest(questId) {
        // Placeholder implementation
        console.log(`Abandoned quest ${questId}`);
    }
    
    /**
     * Trading-related functions
     */
    executeTrade(merchantId, tradeData) {
        // Placeholder implementation
        console.log(`Executed trade with merchant ${merchantId}`, tradeData);
        return { success: true };
    }
}

