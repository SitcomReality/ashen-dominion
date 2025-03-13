/**
 * Manages the game world and its regions, including terrain, resources, and structures
 */
export class WorldManager {
    constructor(engine) {
        this.engine = engine;
        this.regions = new Map();
        this.activatedRegions = new Set();
        this.currentRegion = null;
        this.worldData = null;
        this.chunkSize = 16; // Size of each chunk in world units
        this.visibleChunks = 3; // Number of chunks visible in each direction
    }
    
    /**
     * Initialize the world with a given seed
     * @param {string} seed - Seed for world generation
     */
    initialize(seed) {
        // Generate the world using WorldGenerator
        this.worldData = this.engine.game.worldGenerator.generateWorld(seed);
        console.log(`World initialized with seed: ${seed}`);
        
        // Set initial player position
        if (this.worldData.playerStart) {
            this.activateRegionAtPosition(this.worldData.playerStart.x, this.worldData.playerStart.y);
        } else {
            // Default starting position if none specified
            this.activateRegionAtPosition(0, 0);
        }
    }
    
    /**
     * Activate region at the given position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    activateRegionAtPosition(x, y) {
        const regionId = this.getRegionIdForPosition(x, y);
        
        if (regionId) {
            this.activateRegion(regionId);
        }
    }
    
    /**
     * Get region ID for a specific world position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string|null} - Region ID or null if outside world bounds
     */
    getRegionIdForPosition(x, y) {
        if (!this.worldData) return null;
        
        const regionSize = this.worldData.regions[0]?.width || 100;
        
        // Find the region that contains the position
        for (const region of this.worldData.regions) {
            if (x >= region.x && x < region.x + region.width &&
                y >= region.y && y < region.y + region.height) {
                return region.id;
            }
        }
        
        return null;
    }
    
    /**
     * Activate a specific region and surrounding regions
     * @param {string} regionId - ID of the region to activate
     */
    activateRegion(regionId) {
        if (!this.worldData) return;
        
        // Find the region in world data
        const region = this.worldData.regions.find(r => r.id === regionId);
        if (!region) return;
        
        this.currentRegion = region;
        
        // Activate this region and surrounding regions
        this.activateRegionAndSurroundings(region);
        
        // Deactivate regions that are now too far away
        this.deactivateDistantRegions(region);
    }
    
    /**
     * Activate a region and its surrounding regions
     * @param {object} centerRegion - The central region to activate around
     */
    activateRegionAndSurroundings(centerRegion) {
        // First, activate the center region
        this.activatedRegions.add(centerRegion.id);
        
        // If the region is not already loaded, load it
        if (!this.regions.has(centerRegion.id)) {
            this.loadRegion(centerRegion);
        }
        
        // Activate surrounding regions
        const regionSize = centerRegion.width;
        const surroundingOffsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];
        
        for (const [xOffset, yOffset] of surroundingOffsets) {
            const rx = Math.floor(centerRegion.x / regionSize) + xOffset;
            const ry = Math.floor(centerRegion.y / regionSize) + yOffset;
            const neighborId = `r${rx}_${ry}`;
            
            // Find the neighbor region
            const neighbor = this.worldData.regions.find(r => r.id === neighborId);
            
            if (neighbor) {
                this.activatedRegions.add(neighbor.id);
                
                // If the region is not already loaded, load it
                if (!this.regions.has(neighbor.id)) {
                    this.loadRegion(neighbor);
                }
            }
        }
    }
    
    /**
     * Deactivate regions that are too far from the given center region
     * @param {object} centerRegion - The center region to measure distance from
     */
    deactivateDistantRegions(centerRegion) {
        const regionSize = centerRegion.width;
        const centerRx = Math.floor(centerRegion.x / regionSize);
        const centerRy = Math.floor(centerRegion.y / regionSize);
        const maxDistance = 2; // Maximum distance in regions
        
        // Check each activated region
        for (const regionId of this.activatedRegions) {
            // Parse region coordinates from ID
            const match = regionId.match(/r(\d+)_(\d+)/);
            if (match) {
                const rx = parseInt(match[1]);
                const ry = parseInt(match[2]);
                
                // Calculate Manhattan distance
                const distance = Math.abs(rx - centerRx) + Math.abs(ry - centerRy);
                
                // If too far, deactivate
                if (distance > maxDistance) {
                    this.deactivateRegion(regionId);
                }
            }
        }
    }
    
    /**
     * Load a region into memory
     * @param {object} region - Region data
     */
    loadRegion(region) {
        console.log(`Loading region ${region.id} (${region.biome})`);
        
        // Create entities for all resources, structures, and NPCs in the region
        this.createRegionEntities(region);
        
        // Store the region
        this.regions.set(region.id, region);
    }
    
    /**
     * Create entities for a region's contents
     * @param {object} region - Region data
     */
    createRegionEntities(region) {
        // Create entities for resources
        if (region.resources) {
            region.resources.forEach(resource => {
                const worldX = region.x + region.width * resource.x;
                const worldY = region.y + region.height * resource.y;
                
                // Create resource entity via EntityManager
                // this.engine.entityManager.createResourceNode({
                //     type: resource.type,
                //     amount: resource.amount,
                //     position: { x: worldX, y: worldY }
                // });
            });
        }
        
        // Find structures in this region
        const structures = this.findStructuresInRegion(region);
        structures.forEach(structure => {
            // Create structure entity
            // this.engine.entityManager.createStructure({
            //     type: structure.type,
            //     name: structure.name,
            //     position: { x: structure.x, y: structure.y },
            //     width: structure.width,
            //     height: structure.height
            // });
        });
        
        // Spawn NPCs for this region
        this.spawnRegionNPCs(region);
    }
    
    /**
     * Find structures located in a region
     * @param {object} region - Region data
     * @returns {Array} - Array of structures in the region
     */
    findStructuresInRegion(region) {
        if (!this.worldData) return [];
        
        // Find villages that have structures in this region
        const structures = [];
        
        // Check all villages
        for (const village of this.worldData.villages || []) {
            for (const building of village.buildings || []) {
                // Check if the building is in this region
                if (building.x >= region.x && building.x < region.x + region.width &&
                    building.y >= region.y && building.y < region.y + region.height) {
                    structures.push(building);
                }
            }
        }
        
        // Add dungeons and other structures
        // To be implemented...
        
        return structures;
    }
    
    /**
     * Spawn NPCs for a region
     * @param {object} region - Region data
     */
    spawnRegionNPCs(region) {
        // Find villages in this region
        const villages = this.worldData.villages.filter(village => 
            village.regionId === region.id
        );
        
        // Spawn village NPCs
        villages.forEach(village => {
            // Determine number of NPCs based on village size
            const npcCount = village.size * 3 + 2; // Small: 5, Medium: 8, Large: 11
            
            // Create NPCs
            for (let i = 0; i < npcCount; i++) {
                const npcType = this.determineNPCType(i, village);
                const npcName = this.generateNPCName();
                
                // Position NPC near village buildings
                const building = village.buildings[i % village.buildings.length];
                const offsetX = (Math.random() - 0.5) * 10;
                const offsetY = (Math.random() - 0.5) * 10;
                
                const npcPosition = {
                    x: building.x + offsetX,
                    y: building.y + offsetY
                };
                
                // Create NPC via EntityManager
                // const npc = this.engine.entityManager.createNPC(
                //     npcType,
                //     npcName,
                //     npcPosition
                // );
                
                // // Add NPC to village data
                // village.npcs.push(npc.id);
            }
        });
        
        // Spawn wilderness NPCs based on biome
        this.spawnWildernessNPCs(region);
    }
    
    /**
     * Determine NPC type based on index and village
     * @param {number} index - Index of NPC
     * @param {object} village - Village data
     * @returns {string} - NPC type
     */
    determineNPCType(index, village) {
        // First few NPCs are special roles
        if (index === 0) return 'villager'; // Elder/Mayor
        if (index === 1) return 'merchant'; // Shopkeeper
        if (index === 2) return 'guard'; // Guard captain
        
        // Rest are random, weighted by village size
        const types = ['villager', 'farmer', 'guard', 'craftsman'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    /**
     * Generate a random NPC name
     * @returns {string} - Generated name
     */
    generateNPCName() {
        const firstNames = ['John', 'Emma', 'Aiden', 'Sophia', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Isabella'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        return `${firstName} ${lastName}`;
    }
    
    /**
     * Spawn wilderness NPCs (animals, monsters) based on region biome
     * @param {object} region - Region data
     */
    spawnWildernessNPCs(region) {
        // To be implemented: Generate appropriate wildlife based on biome
    }
    
    /**
     * Deactivate a region
     * @param {string} regionId - ID of the region to deactivate
     */
    deactivateRegion(regionId) {
        if (!this.activatedRegions.has(regionId)) return;
        
        console.log(`Deactivating region ${regionId}`);
        
        // Remove region from activated set
        this.activatedRegions.delete(regionId);
        
        // Remove entities belonging to this region
        // To be implemented: when entities have a regionId property
        
        // Optionally, fully unload the region to save memory
        // this.unloadRegion(regionId);
    }
    
    /**
     * Unload a region from memory
     * @param {string} regionId - ID of the region to unload
     */
    unloadRegion(regionId) {
        if (!this.regions.has(regionId)) return;
        
        console.log(`Unloading region ${regionId}`);
        
        // Remove the region from the loaded regions
        this.regions.delete(regionId);
    }
    
    /**
     * Get data about the current region
     * @returns {object|null} - Current region data or null if no region is active
     */
    getCurrentRegion() {
        return this.currentRegion;
    }
    
    /**
     * Get a list of all activated regions
     * @returns {Array} - Array of region IDs
     */
    getActivatedRegions() {
        return Array.from(this.activatedRegions);
    }
    
    /**
     * Get entities in the current region
     * @returns {Array} - Array of entities in the current region
     */
    getEntitiesInCurrentRegion() {
        if (!this.currentRegion) return [];
        
        // To be implemented: when entities have a regionId property
        return [];
    }
    
    /**
     * Update the world manager
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.engine.player || !this.worldData) return;
        
        // Check if player has moved to a new region
        const playerPos = this.engine.player.position;
        const regionId = this.getRegionIdForPosition(playerPos.x, playerPos.y);
        
        if (regionId && regionId !== this.currentRegion?.id) {
            // Player has entered a new region
            this.activateRegion(regionId);
        }
        
        // Update time-of-day based world effects
        this.updateWorldEffects(deltaTime);
    }
    
    /**
     * Update time-of-day and weather based world effects
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateWorldEffects(deltaTime) {
        // To be implemented: update lighting, ambient sounds, etc. based on time and weather
    }
    
    /**
     * Regenerate a specific region
     * @param {string} regionId - ID of region to regenerate
     * @returns {boolean} - True if region was regenerated
     */
    regenerateRegion(regionId) {
        if (!this.worldData) return false;
        
        // Find the region
        const regionIndex = this.worldData.regions.findIndex(r => r.id === regionId);
        if (regionIndex === -1) return false;
        
        console.log(`Regenerating region ${regionId}`);
        
        // Get the original region data
        const originalRegion = this.worldData.regions[regionIndex];
        
        // Remove all entities in this region
        // To be implemented
        
        // Generate new resources for the region
        const biome = this.engine.game.worldGenerator.biomes.find(b => b.name === originalRegion.biome);
        if (biome) {
            originalRegion.resources = this.engine.game.worldGenerator.generateRegionResources(biome);
        }
        
        // Update the region in the world data
        this.worldData.regions[regionIndex] = originalRegion;
        
        // If region is currently loaded, reload it
        if (this.regions.has(regionId)) {
            this.regions.delete(regionId);
            this.loadRegion(originalRegion);
        }
        
        return true;
    }
}
