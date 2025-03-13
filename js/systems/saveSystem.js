/**
 * Handles saving and loading game state
 */
export class SaveSystem {
    constructor(engine) {
        this.engine = engine;
        this.saveSlots = 5;
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 5 * 60; // 5 minutes in seconds
        this.lastAutoSave = 0;
    }
    
    /**
     * Save the current game state
     * @param {string} [slotName] - Optional save slot name, defaults to auto-generated name
     * @returns {boolean} - True if save was successful
     */
    saveGame(slotName) {
        try {
            // Generate save data
            const saveData = this.generateSaveData(slotName);
            
            // Save to local storage
            const saveKey = `isometric_world_save_${saveData.id}`;
            localStorage.setItem(saveKey, JSON.stringify(saveData));
            
            // Update save list
            this.updateSaveList(saveData);
            
            console.log(`Game saved to slot ${saveData.id}: ${saveData.name}`);
            return true;
        } catch (error) {
            console.error('Error saving game:', error);
            return false;
        }
    }
    
    /**
     * Load a saved game
     * @param {string} saveId - ID of the save to load
     * @returns {boolean} - True if load was successful
     */
    loadGame(saveId) {
        try {
            // Get save data from storage
            const saveKey = `isometric_world_save_${saveId}`;
            const saveJSON = localStorage.getItem(saveKey);
            
            if (!saveJSON) {
                console.error(`Save ${saveId} not found`);
                return false;
            }
            
            const saveData = JSON.parse(saveJSON);
            
            // Apply save data to game state
            this.applySaveData(saveData);
            
            // Update save's last played time
            saveData.lastPlayed = new Date().toISOString();
            localStorage.setItem(saveKey, JSON.stringify(saveData));
            
            console.log(`Game loaded from save ${saveId}: ${saveData.name}`);
            return true;
        } catch (error) {
            console.error('Error loading game:', error);
            return false;
        }
    }
    
    /**
     * Delete a saved game
     * @param {string} saveId - ID of the save to delete
     * @returns {boolean} - True if delete was successful
     */
    deleteSave(saveId) {
        try {
            // Remove from storage
            const saveKey = `isometric_world_save_${saveId}`;
            localStorage.removeItem(saveKey);
            
            // Update save list
            this.engine.game.configManager.deleteSavedGame(saveId);
            
            console.log(`Save ${saveId} deleted`);
            return true;
        } catch (error) {
            console.error('Error deleting save:', error);
            return false;
        }
    }
    
    /**
     * Generate save data object from current game state
     * @param {string} [slotName] - Optional save slot name
     * @returns {object} - Save data object
     */
    generateSaveData(slotName) {
        // Generate unique save ID if not loading to existing slot
        const saveId = slotName || `save_${Date.now()}`;
        
        // Get player data
        const player = this.engine.player;
        const characterName = player?.name || 'Unknown';
        
        // Get world data
        const worldInfo = this.engine.worldManager?.getWorldInfo() || {};
        const worldName = worldInfo.seed || 'Unknown';
        
        // Calculate play time
        const playTime = Math.floor((performance.now() - this.engine.startTime) / 1000);
        
        // Create save metadata
        const saveData = {
            id: saveId,
            name: slotName || `${characterName} - ${new Date().toLocaleString()}`,
            characterName: characterName,
            worldName: worldName,
            level: player?.level || 1,
            lastPlayed: new Date().toISOString(),
            playTime: playTime,
            thumbnail: null, // Could store a base64 screenshot in the future
            
            // Actual game state data
            gameState: {
                player: this.serializePlayer(player),
                world: this.serializeWorld(),
                entities: this.serializeEntities(),
                quests: this.serializeQuests(),
                story: this.serializeStory(),
                time: this.serializeTime()
            }
        };
        
        return saveData;
    }
    
    /**
     * Apply loaded save data to the game state
     * @param {object} saveData - Save data to apply
     */
    applySaveData(saveData) {
        const gameState = saveData.gameState;
        
        // Stop current game systems
        this.engine.stop();
        
        // Initialize world with saved seed
        if (gameState.world && gameState.world.seed) {
            this.engine.initWorld(gameState.world.seed);
        }
        
        // Restore player
        if (gameState.player) {
            this.deserializePlayer(gameState.player);
        }
        
        // Restore entities
        if (gameState.entities) {
            this.deserializeEntities(gameState.entities);
        }
        
        // Restore quest state
        if (gameState.quests) {
            this.deserializeQuests(gameState.quests);
        }
        
        // Restore story state
        if (gameState.story) {
            this.deserializeStory(gameState.story);
        }
        
        // Restore time
        if (gameState.time) {
            this.deserializeTime(gameState.time);
        }
        
        // Restart game systems
        this.engine.start();
    }
    
    /**
     * Update the save list in config manager
     * @param {object} saveData - New save metadata
     */
    updateSaveList(saveData) {
        // Create save list entry (without the full game state)
        const saveEntry = {
            id: saveData.id,
            name: saveData.name,
            characterName: saveData.characterName,
            worldName: saveData.worldName,
            level: saveData.level,
            lastPlayed: saveData.lastPlayed,
            playTime: saveData.playTime,
            thumbnail: saveData.thumbnail
        };
        
        // Add to config manager's save list
        this.engine.game.configManager.addSavedGame(saveEntry);
    }
    
    /**
     * Serialize player data for saving
     * @param {object} player - Player entity
     * @returns {object} - Serialized player data
     */
    serializePlayer(player) {
        if (!player) return null;
        
        return {
            name: player.name,
            position: { ...player.position },
            stats: { ...player.stats },
            inventory: this.engine.inventorySystem.serializeInventory(player.inventory),
            equipment: this.engine.inventorySystem.serializeEquipment(player.equipment),
            level: player.level || 1,
            experience: player.experience || 0,
            skills: player.skills || {},
            perks: player.perks || []
        };
    }
    
    /**
     * Serialize world data for saving
     * @returns {object} - Serialized world data
     */
    serializeWorld() {
        const worldManager = this.engine.worldManager;
        if (!worldManager) return null;
        
        const worldInfo = worldManager.getWorldInfo();
        
        return {
            seed: worldInfo.seed,
            activeRegions: worldManager.getActivatedRegions(),
            modifications: this.serializeWorldModifications()
        };
    }
    
    /**
     * Serialize world modifications (terrain changes, placed items, etc.)
     * @returns {Array} - Array of world modifications
     */
    serializeWorldModifications() {
        // In a complete implementation, this would store:
        // - Terrain modifications
        // - Placed objects/structures
        // - Resource depletion
        // - NPC housing assignments
        // - etc.
        
        return [];
    }
    
    /**
     * Serialize entities for saving
     * @returns {Array} - Array of serialized entities
     */
    serializeEntities() {
        const entities = this.engine.entityManager?.getAllEntities() || [];
        const player = this.engine.player;
        
        // Skip the player entity since it's saved separately
        return entities
            .filter(entity => entity !== player)
            .map(entity => this.serializeEntity(entity));
    }
    
    /**
     * Serialize a single entity
     * @param {object} entity - Entity to serialize
     * @returns {object} - Serialized entity data
     */
    serializeEntity(entity) {
        // Base properties common to all entities
        const serialized = {
            id: entity.id,
            type: entity.type,
            name: entity.name,
            position: { ...entity.position }
        };
        
        // Add type-specific properties
        if (entity.type === 'npc') {
            serialized.stats = { ...entity.stats };
            serialized.brain = {
                type: entity.brain.type,
                currentState: entity.brain.currentState,
                currentGoal: entity.brain.currentGoal,
                needs: { ...entity.brain.needs },
                memories: [...entity.brain.memories || []],
                routine: {
                    schedule: { ...entity.brain.routine?.schedule }
                }
            };
            
            if (entity.inventory) {
                serialized.inventory = this.engine.inventorySystem.serializeInventory(entity.inventory);
            }
        }
        else if (entity.type === 'item') {
            serialized.item = { ...entity.item };
        }
        else if (entity.type === 'resource') {
            serialized.resource = {
                type: entity.resourceType,
                amount: entity.amount,
                maxAmount: entity.maxAmount
            };
        }
        
        return serialized;
    }
    
    /**
     * Serialize quest state for saving
     * @returns {object} - Serialized quest data
     */
    serializeQuests() {
        const questSystem = this.engine.questSystem;
        if (!questSystem) return null;
        
        return {
            activeQuests: questSystem.getActiveQuests(),
            completedQuests: questSystem.getCompletedQuests(),
            failedQuests: questSystem.getFailedQuests()
        };
    }
    
    /**
     * Serialize story state for saving
     * @returns {object} - Serialized story data
     */
    serializeStory() {
        const storyManager = this.engine.storyManager;
        if (!storyManager) return null;
        
        return {
            currentChapter: storyManager.currentChapter,
            flags: storyManager.getAllFlags(),
            plotThreads: storyManager.plotThreads.map(thread => ({
                id: thread.id,
                state: thread.state,
                progress: thread.progress
            })),
            completedArcs: storyManager.storyArcs
                .filter(arc => arc.progress >= 100)
                .map(arc => arc.id)
        };
    }
    
    /**
     * Serialize time data for saving
     * @returns {object} - Serialized time data
     */
    serializeTime() {
        const timeManager = this.engine.timeManager;
        if (!timeManager) return null;
        
        return {
            minute: timeManager.minute,
            hour: timeManager.hour,
            day: timeManager.day,
            season: timeManager.season,
            year: timeManager.year
        };
    }
    
    /**
     * Deserialize player data and restore player state
     * @param {object} playerData - Serialized player data
     */
    deserializePlayer(playerData) {
        if (!playerData) return;
        
        // Create player entity with basic data
        this.engine.createPlayerCharacter(playerData.name);
        const player = this.engine.player;
        
        // Restore position
        if (playerData.position) {
            player.position = { ...playerData.position };
        }
        
        // Restore stats
        if (playerData.stats) {
            player.stats = { ...playerData.stats };
        }
        
        // Restore inventory
        if (playerData.inventory) {
            this.engine.inventorySystem.deserializeInventory(player.inventory, playerData.inventory);
        }
        
        // Restore equipment
        if (playerData.equipment) {
            this.engine.inventorySystem.deserializeEquipment(player.equipment, playerData.equipment);
        }
        
        // Restore other player properties
        player.level = playerData.level || 1;
        player.experience = playerData.experience || 0;
        player.skills = playerData.skills || {};
        player.perks = playerData.perks || [];
    }
    
    /**
     * Deserialize entities and restore them to the world
     * @param {Array} entitiesData - Array of serialized entities
     */
    deserializeEntities(entitiesData) {
        if (!entitiesData || !entitiesData.length) return;
        
        const entityManager = this.engine.entityManager;
        if (!entityManager) return;
        
        // Remove existing entities (except player)
        const player = this.engine.player;
        entityManager.entities.forEach((entity, id) => {
            if (entity !== player) {
                entityManager.removeEntity(id);
            }
        });
        
        // Recreate entities from save data
        entitiesData.forEach(entityData => {
            this.deserializeEntity(entityData);
        });
    }
    
    /**
     * Deserialize a single entity
     * @param {object} entityData - Serialized entity data
     * @returns {object} - Recreated entity object
     */
    deserializeEntity(entityData) {
        const entityManager = this.engine.entityManager;
        
        // Create entity based on type
        let entity = null;
        
        switch (entityData.type) {
            case 'npc':
                entity = entityManager.createNPC(
                    entityData.brain.type,
                    entityData.name,
                    entityData.position
                );
                
                // Restore NPC data
                if (entity) {
                    // Restore stats
                    if (entityData.stats) {
                        entity.stats = { ...entityData.stats };
                    }
                    
                    // Restore brain state
                    if (entityData.brain) {
                        entity.brain.currentState = entityData.brain.currentState;
                        entity.brain.currentGoal = entityData.brain.currentGoal;
                        entity.brain.needs = { ...entityData.brain.needs };
                        
                        // Restore memories
                        if (entityData.brain.memories) {
                            entity.brain.memories = [...entityData.brain.memories];
                        }
                        
                        // Restore routine
                        if (entityData.brain.routine && entityData.brain.routine.schedule) {
                            entity.brain.routine.schedule = { ...entityData.brain.routine.schedule };
                        }
                    }
                    
                    // Restore inventory
                    if (entityData.inventory && entity.inventory) {
                        this.engine.inventorySystem.deserializeInventory(entity.inventory, entityData.inventory);
                    }
                }
                break;
                
            case 'item':
                // Create item entity
                // entityManager.createItemInWorld(entityData.item, entityData.position);
                break;
                
            case 'resource':
                // Create resource entity
                // entityManager.createResourceNode(entityData.resource, entityData.position);
                break;
        }
        
        return entity;
    }
    
    /**
     * Deserialize quest state
     * @param {object} questsData - Serialized quest data
     */
    deserializeQuests(questsData) {
        const questSystem = this.engine.questSystem;
        if (!questSystem || !questsData) return;
        
        // Clear current quest state
        questSystem.activeQuests.clear();
        questSystem.completedQuests.clear();
        questSystem.failedQuests.clear();
        
        // Restore active quests
        if (questsData.activeQuests) {
            questsData.activeQuests.forEach(quest => {
                questSystem.activeQuests.set(quest.id, quest);
            });
        }
        
        // Restore completed quests
        if (questsData.completedQuests) {
            questsData.completedQuests.forEach(quest => {
                questSystem.completedQuests.set(quest.id, quest);
            });
        }
        
        // Restore failed quests
        if (questsData.failedQuests) {
            questsData.failedQuests.forEach(quest => {
                questSystem.failedQuests.set(quest.id, quest);
            });
        }
    }
    
    /**
     * Deserialize story state
     * @param {object} storyData - Serialized story data
     */
    deserializeStory(storyData) {
        const storyManager = this.engine.storyManager;
        if (!storyManager || !storyData) return;
        
        // Restore chapter
        storyManager.currentChapter = storyData.currentChapter || 1;
        
        // Restore story flags
        if (storyData.flags) {
            storyManager.storyFlags.clear();
            Object.entries(storyData.flags).forEach(([key, value]) => {
                storyManager.storyFlags.set(key, value);
            });
        }
    }
    
    /**
     * Deserialize time state
     * @param {object} timeData - Serialized time data
     */
    deserializeTime(timeData) {
        const timeManager = this.engine.timeManager;
        if (!timeManager || !timeData) return;
        
        // Restore time values
        timeManager.minute = timeData.minute || 0;
        timeManager.hour = timeData.hour || 6;
        timeManager.day = timeData.day || 1;
        timeManager.season = timeData.season || 0;
        timeManager.year = timeData.year || 1;
        
        // Notify about time change
        timeManager.notifyTimeChanged();
    }
    
    /**
     * Check if auto-save should be performed
     * @param {number} deltaTime - Time since last update in seconds
     */
    checkAutoSave(deltaTime) {
        if (!this.autoSaveEnabled) return;
        
        this.lastAutoSave += deltaTime;
        
        // Check if it's time to auto-save
        if (this.lastAutoSave >= this.autoSaveInterval) {
            this.lastAutoSave = 0;
            this.saveGame('auto_save');
        }
    }
    
    /**
     * Enable or disable auto-save
     * @param {boolean} enabled - Whether auto-save should be enabled
     */
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
    }
    
    /**
     * Set auto-save interval
     * @param {number} minutes - Time between auto-saves in minutes
     */
    setAutoSaveInterval(minutes) {
        this.autoSaveInterval = minutes * 60;
    }
}