/**
 * Manages the game's storylines, narrative events, and story progression
 */
export class StoryManager {
    constructor(engine) {
        this.engine = engine;
        this.player = null;
        
        // Story state
        this.currentChapter = 0;
        this.completedMainQuests = [];
        this.availableMainQuests = [];
        this.completedSideQuests = [];
        this.storyFlags = new Map();
        this.activeNarrativeEvents = [];
        this.storyCharacters = [];
        
        // Story progression
        this.storylines = [];
        this.storyArcs = [];
        this.plotThreads = [];
        this.currentStoryArc = null;
        
        // Player reputation with different factions
        this.factionReputation = new Map();
    }
    
    /**
     * Initialize the story manager with player character
     * @param {object} player - Player entity
     */
    initialize(player) {
        this.player = player;
        
        // Set initial story flags
        this.setFlag('story_chapter', 1);
        this.setFlag('main_quest_progress', 0);
        this.setFlag('met_elder', false);
        this.setFlag('knows_about_artifact', false);
        
        // Generate initial storylines
        this.generateInitialStory();
        
        console.log('Story manager initialized');
    }
    
    /**
     * Generate the initial story structure
     */
    generateInitialStory() {
        // Generate story arcs
        this.generateStoryArcs();
        
        // Set up active story threads
        this.setupActiveStoryThreads();
        
        // Generate first chapter quests
        this.generateChapterQuests(1);
        
        // Set current chapter
        this.currentChapter = 1;
    }
    
    /**
     * Generate story arcs for the game
     */
    generateStoryArcs() {
        // Main story arc always follows a similar structure
        this.storyArcs = [
            {
                id: 'main_arc',
                name: 'Main Story',
                description: 'The primary storyline of the game',
                chapters: 5,
                currentChapter: 1,
                progress: 0,
                threads: [
                    'mysterious_artifact',
                    'village_troubles',
                    'ancient_threat'
                ]
            },
            {
                id: 'faction_war',
                name: 'Faction Conflict',
                description: 'A conflict between regional powers',
                chapters: 3,
                currentChapter: 0, // Not active yet
                progress: 0,
                threads: [
                    'bandits_rising',
                    'merchant_guild',
                    'royal_guards'
                ]
            }
        ];
        
        // Set current story arc
        this.currentStoryArc = this.storyArcs[0];
        
        // Generate plot threads for each arc
        this.generatePlotThreads();
    }
    
    /**
     * Generate plot threads for story arcs
     */
    generatePlotThreads() {
        // Create plot threads for main arc
        this.plotThreads = [
            {
                id: 'mysterious_artifact',
                name: 'The Mysterious Artifact',
                description: 'An ancient artifact with unknown powers',
                progress: 0,
                state: 'active',
                requiredFlags: [],
                triggers: [
                    { flag: 'discovered_artifact', value: true, chapter: 2 }
                ]
            },
            {
                id: 'village_troubles',
                name: 'Village in Need',
                description: 'The local village facing mysterious problems',
                progress: 0,
                state: 'active',
                requiredFlags: [],
                triggers: [
                    { flag: 'helped_village', value: true, chapter: 1 }
                ]
            },
            {
                id: 'ancient_threat',
                name: 'The Ancient Threat',
                description: 'A dormant evil stirs once more',
                progress: 0,
                state: 'inactive', // Starts inactive
                requiredFlags: [
                    { flag: 'discovered_artifact', value: true }
                ],
                triggers: [
                    { flag: 'confronted_ancient_evil', value: true, chapter: 4 }
                ]
            },
            // Faction war threads
            {
                id: 'bandits_rising',
                name: 'Bandits Rising',
                description: 'Bandits gaining power in the region',
                progress: 0,
                state: 'inactive',
                requiredFlags: [
                    { flag: 'helped_village', value: true }
                ],
                triggers: []
            },
            {
                id: 'merchant_guild',
                name: 'Merchant Guild Secrets',
                description: 'The merchant guild is hiding something',
                progress: 0,
                state: 'inactive',
                requiredFlags: [
                    { flag: 'met_merchant_leader', value: true }
                ],
                triggers: []
            }
        ];
    }
    
    /**
     * Set up active story threads at game start
     */
    setupActiveStoryThreads() {
        // Activate initial threads
        const initialThreads = this.plotThreads.filter(thread => 
            thread.state === 'active' && 
            this.checkRequiredFlags(thread.requiredFlags)
        );
        
        initialThreads.forEach(thread => {
            console.log(`Activating story thread: ${thread.name}`);
        });
    }
    
    /**
     * Generate quests for a specific chapter
     * @param {number} chapter - Chapter number
     */
    generateChapterQuests(chapter) {
        console.log(`Generating quests for chapter ${chapter}`);
        
        // Clear available main quests
        this.availableMainQuests = [];
        
        if (chapter === 1) {
            // First chapter quests are hardcoded for now
            // In future, these could be procedurally generated
            
            // Add intro quest
            const introQuest = {
                id: 'mq_intro',
                title: 'A New Beginning',
                description: 'Speak with the village elder to learn about recent events.',
                type: 'main',
                chapter: 1,
                isMainQuest: true,
                giver: 'Village Elder',
                location: 'Village Center',
                status: 'available',
                objectives: [
                    {
                        id: 'speak_elder',
                        description: 'Speak with the village elder',
                        type: 'talk',
                        targetId: 'npc_village_elder',
                        completed: false
                    }
                ],
                rewards: [
                    { type: 'item', itemId: 'health_potion', amount: 2 },
                    { type: 'exp', amount: 50 }
                ],
                nextQuestId: 'mq_supplies',
                storyThread: 'village_troubles'
            };
            
            this.availableMainQuests.push(introQuest);
            
            // Add additional quests that will be triggered by completing the intro
            const suppliesQuest = {
                id: 'mq_supplies',
                title: 'Village in Need',
                description: 'The village needs supplies to survive. Gather resources to help them.',
                type: 'main',
                chapter: 1,
                isMainQuest: true,
                giver: 'Village Elder',
                location: 'Village Center',
                status: 'locked', // Will be unlocked after intro quest
                objectives: [
                    {
                        id: 'gather_herbs',
                        description: 'Collect 5 healing herbs',
                        type: 'collect',
                        itemId: 'herb',
                        required: 5,
                        current: 0,
                        completed: false
                    },
                    {
                        id: 'gather_wood',
                        description: 'Collect 10 wood',
                        type: 'collect',
                        itemId: 'wood',
                        required: 10,
                        current: 0,
                        completed: false
                    }
                ],
                rewards: [
                    { type: 'item', itemId: 'village_key', amount: 1 },
                    { type: 'gold', amount: 50 },
                    { type: 'exp', amount: 100 }
                ],
                nextQuestId: 'mq_investigate',
                storyThread: 'village_troubles'
            };
            
            // Add to quest system but don't make available yet
            this.engine.questSystem.registerQuest(suppliesQuest);
        }
    }
    
    /**
     * Update story state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Check for story thread progression
        this.checkStoryThreadUpdates();
        
        // Check for chapter progression
        this.checkChapterProgression();
        
        // Process narrative events
        this.processNarrativeEvents(deltaTime);
    }
    
    /**
     * Check if any story threads should update based on current flags
     */
    checkStoryThreadUpdates() {
        this.plotThreads.forEach(thread => {
            // Check if inactive thread should be activated
            if (thread.state === 'inactive' && this.checkRequiredFlags(thread.requiredFlags)) {
                thread.state = 'active';
                console.log(`Story thread activated: ${thread.name}`);
                
                // Generate quests for newly activated thread
                this.generateQuestsForThread(thread.id);
            }
            
            // Check for thread progression triggers
            if (thread.state === 'active') {
                for (const trigger of thread.triggers) {
                    if (this.getFlag(trigger.flag) === trigger.value) {
                        console.log(`Story thread progressed: ${thread.name}`);
                        thread.progress += 20; // Arbitrary progress value
                        
                        // If this trigger should advance the chapter
                        if (trigger.chapter && trigger.chapter > this.currentChapter) {
                            this.advanceToChapter(trigger.chapter);
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Check if chapter should progress based on quest completion
     */
    checkChapterProgression() {
        // Calculate main quest progress percentage
        const mainQuestProgress = this.calculateMainQuestProgress();
        this.setFlag('main_quest_progress', mainQuestProgress);
        
        // Check if we should advance to next chapter
        const currentArc = this.storyArcs.find(arc => arc.id === 'main_arc');
        if (currentArc && mainQuestProgress >= 100 && this.currentChapter < currentArc.chapters) {
            this.advanceToChapter(this.currentChapter + 1);
        }
    }
    
    /**
     * Calculate progress through main quests as a percentage
     * @returns {number} - Progress percentage (0-100)
     */
    calculateMainQuestProgress() {
        const mainQuestsInChapter = this.engine.questSystem.getQuestsByChapter(this.currentChapter)
            .filter(q => q.isMainQuest);
        
        if (mainQuestsInChapter.length === 0) return 0;
        
        const completedCount = mainQuestsInChapter.filter(q => q.status === 'completed').length;
        return Math.floor((completedCount / mainQuestsInChapter.length) * 100);
    }
    
    /**
     * Process active narrative events
     * @param {number} deltaTime - Time since last update in seconds
     */
    processNarrativeEvents(deltaTime) {
        // Process any time-based narrative events
        for (let i = this.activeNarrativeEvents.length - 1; i >= 0; i--) {
            const event = this.activeNarrativeEvents[i];
            
            // Update event timer
            event.timeRemaining -= deltaTime;
            
            // Check if event should trigger
            if (event.timeRemaining <= 0) {
                console.log(`Narrative event triggered: ${event.name}`);
                
                // Execute event effects
                this.executeNarrativeEvent(event);
                
                // Remove from active events
                this.activeNarrativeEvents.splice(i, 1);
            }
        }
    }
    
    /**
     * Execute a narrative event's effects
     * @param {object} event - Narrative event object
     */
    executeNarrativeEvent(event) {
        // Event effects depend on event type
        switch (event.type) {
            case 'dialogue':
                // Trigger dialogue with NPC
                if (event.npcId) {
                    // In a real implementation, we'd queue this dialogue to show
                    // when the player next interacts with this NPC
                    console.log(`Queueing dialogue for NPC ${event.npcId}: ${event.dialogueKey}`);
                }
                break;
                
            case 'spawn_npc':
                // Spawn a new NPC
                if (event.npcData) {
                    // In a real implementation, we'd spawn the NPC at the specified location
                    console.log(`Spawning NPC: ${event.npcData.name} at (${event.npcData.x}, ${event.npcData.y})`);
                }
                break;
                
            case 'world_change':
                // Change something in the world
                if (event.regionId && event.change) {
                    // In a real implementation, we'd modify the specified region
                    console.log(`Changing region ${event.regionId}: ${event.change}`);
                }
                break;
                
            case 'quest_offer':
                // Make a quest available
                if (event.questId) {
                    this.engine.questSystem.makeQuestAvailable(event.questId);
                }
                break;
                
            default:
                console.log(`Unknown narrative event type: ${event.type}`);
        }
        
        // Set any flags from the event
        if (event.setFlags) {
            event.setFlags.forEach(flag => {
                this.setFlag(flag.key, flag.value);
            });
        }
    }
    
    /**
     * Advance to a specific chapter
     * @param {number} chapter - Chapter number to advance to
     */
    advanceToChapter(chapter) {
        if (chapter <= this.currentChapter) return;
        
        console.log(`Advancing to chapter ${chapter}`);
        
        // Update chapter
        this.currentChapter = chapter;
        this.setFlag('story_chapter', chapter);
        
        // Move completed quests
        this.completedMainQuests = this.completedMainQuests.concat(
            this.availableMainQuests.filter(q => q.status === 'completed')
        );
        
        // Reset available main quests
        this.availableMainQuests = [];
        
        // Generate new quests for this chapter
        this.generateChapterQuests(chapter);
        
        // Create a narrative event for chapter transition
        this.scheduleNarrativeEvent({
            name: `Chapter ${chapter} Introduction`,
            type: 'dialogue',
            timeRemaining: 2, // 2 seconds until trigger
            dialogueKey: `chapter_${chapter}_intro`,
            npcId: null, // Narrator dialogue
            setFlags: [
                { key: `chapter_${chapter}_started`, value: true }
            ]
        });
    }
    
    /**
     * Generate quests for a specific story thread
     * @param {string} threadId - Story thread ID
     */
    generateQuestsForThread(threadId) {
        // To be implemented: Generate quests dynamically based on story thread
        console.log(`Generating quests for thread: ${threadId}`);
        
        // In a full implementation, we would create quests dynamically
    }
    
    /**
     * Schedule a narrative event to occur
     * @param {object} event - Narrative event to schedule
     */
    scheduleNarrativeEvent(event) {
        this.activeNarrativeEvents.push(event);
    }
    
    /**
     * Check if required flags are met
     * @param {Array} requiredFlags - Array of required flag objects
     * @returns {boolean} - True if all requirements are met
     */
    checkRequiredFlags(requiredFlags) {
        if (!requiredFlags || requiredFlags.length === 0) return true;
        
        return requiredFlags.every(req => 
            this.getFlag(req.flag) === req.value
        );
    }
    
    /**
     * Get a story flag value
     * @param {string} flag - Flag name
     * @param {any} defaultValue - Default value if flag doesn't exist
     * @returns {any} - Flag value
     */
    getFlag(flag, defaultValue = false) {
        return this.storyFlags.has(flag) ? this.storyFlags.get(flag) : defaultValue;
    }
    
    /**
     * Set a story flag value
     * @param {string} flag - Flag name
     * @param {any} value - Flag value
     */
    setFlag(flag, value) {
        this.storyFlags.set(flag, value);
        console.log(`Story flag set: ${flag} = ${value}`);
        
        // Check for flag-based story updates
        this.checkStoryThreadUpdates();
    }
    
    /**
     * Get current story state
     * @returns {object} - Story state object
     */
    getStoryState() {
        return {
            currentChapter: this.currentChapter,
            mainQuestProgress: this.getFlag('main_quest_progress', 0),
            activePlotThreads: this.plotThreads
                .filter(thread => thread.state === 'active')
                .map(thread => thread.id),
            completedArcs: this.storyArcs
                .filter(arc => arc.progress >= 100)
                .map(arc => arc.id)
        };
    }
    
    /**
     * Get all story flags
     * @returns {object} - Object containing all story flags
     */
    getAllFlags() {
        const flags = {};
        this.storyFlags.forEach((value, key) => {
            flags[key] = value;
        });
        return flags;
    }
    
    /**
     * Advance the main story (used for debugging)
     */
    advanceMainStory() {
        const thread = this.plotThreads.find(t => t.id === 'village_troubles');
        if (thread) {
            thread.progress += 25;
            if (thread.progress >= 100) {
                this.setFlag('helped_village', true);
                
                // Progress to next chapter if needed
                if (this.currentChapter === 1) {
                    this.advanceToChapter(2);
                }
            }
        }
    }
    
    /**
     * Reset story progress (used for debugging)
     */
    resetProgress() {
        this.currentChapter = 1;
        this.storyFlags.clear();
        this.setFlag('story_chapter', 1);
        this.setFlag('main_quest_progress', 0);
        
        // Reset thread progress
        this.plotThreads.forEach(thread => {
            thread.progress = 0;
            thread.state = thread.id === 'village_troubles' || thread.id === 'mysterious_artifact' 
                ? 'active' : 'inactive';
        });
        
        // Regenerate chapter quests
        this.generateChapterQuests(1);
    }
}
