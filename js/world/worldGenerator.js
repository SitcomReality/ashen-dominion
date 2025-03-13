/**
 * Generates the game world
 */
export class WorldGenerator {
    constructor(engine) {
        this.engine = engine;
        this.random = null;
        
        // World generation parameters
        this.worldParams = {
            width: 1000,           // World width
            height: 1000,          // World height
            regionSize: 100,       // Size of each region
            biomeSmoothness: 0.5,  // How smooth biome transitions are (0-1)
            mountaininess: 0.4,    // How mountainous the terrain is (0-1)
            waterCoverage: 0.1,    // Percentage of world covered by water (0-1)
            forestCoverage: 0.1,   // Percentage of land covered by forest (0-1)
            villageCount: 7,       // Number of villages to generate
            dungeonCount: 5,       // Number of dungeons to generate
            pointsOfInterest: 15   // Number of misc points of interest
        };
        
        // Biomes and their properties
        this.biomes = [
            {
                name: 'MallPlaza',
                color: '#A8D87E',
                walkSpeed: 1.0,
                vegetation: 0.3,
                resources: ['electronics', 'clothing', 'food_samples'],
                spawnChance: {
                    shopper: 0.5,
                    security: 0.2,
                    janitor: 0.3
                }
            },
            {
                name: 'Residential',
                color: '#4B8A37',
                walkSpeed: 0.8,
                vegetation: 0.5,
                resources: ['furniture', 'decorations', 'appliances'],
                spawnChance: {
                    resident: 0.6,
                    maintenance: 0.2,
                    visitor: 0.2
                }
            },
            {
                name: 'Storage',
                color: '#8A8A8A',
                walkSpeed: 0.6,
                vegetation: 0.0,
                resources: ['boxes', 'metal_parts', 'plastic'],
                spawnChance: {
                    worker: 0.4,
                    robot: 0.3
                }
            },
            {
                name: 'FoodCourt',
                color: '#E1BE7D',
                walkSpeed: 0.7,
                vegetation: 0.2,
                resources: ['food', 'utensils', 'cleaning_supplies'],
                spawnChance: {
                    chef: 0.3,
                    customer: 0.5
                }
            },
            {
                name: 'Restricted',
                color: '#4A99D5',
                walkSpeed: 0.3,
                vegetation: 0.0,
                resources: ['tech_parts', 'security_cards', 'documents'],
                spawnChance: {
                    executive: 0.1,
                    security: 0.7
                }
            }
        ];
        
        // Faction system
        this.factions = [
            { id: 'mallcorp', name: 'MallCorp', color: '#3498db' },
            { id: 'shoppers_union', name: 'Shoppers Union', color: '#e74c3c' },
            { id: 'security_force', name: 'Security Force', color: '#34495e' },
            { id: 'free_samplers', name: 'Free Samplers', color: '#f1c40f' },
            { id: 'tech_rebels', name: 'Tech Rebels', color: '#9b59b6' },
            { id: 'maintenance_crew', name: 'Maintenance Crew', color: '#2ecc71' },
            { id: 'luxury_elite', name: 'Luxury Elite', color: '#e67e22' }
        ];
        
        // Relationship matrix will be generated randomly
        this.factionRelationships = null;
    }
    
    /**
     * Generate the world
     * @param {string} seed - Seed for random generation
     * @returns {object} - Generated world
     */
    generateWorld(seed) {
        console.log(`Generating Requiemporium with seed: ${seed}`);
        
        // Initialize random generator with seed
        this.random = function() {
            return Math.random();
        };
        
        try {
            if (typeof window.seedrandom === 'function') {
                const seededRandom = new window.seedrandom(seed);
                this.random = seededRandom;
            }
        } catch (e) {
            console.warn("Seedrandom not available, using Math.random instead", e);
        }
        
        // Generate faction relationships
        this.generateFactionRelationships();
        
        // Create world object
        const world = {
            seed: seed,
            width: this.worldParams.width,
            height: this.worldParams.height,
            regions: [],
            villages: [],
            dungeons: [],
            pointsOfInterest: [],
            factions: this.factions,
            factionRelationships: this.factionRelationships
        };
        
        // Generate heightmap and moisture map
        const heightMap = this.generateHeightMap(world.width, world.height);
        const moistureMap = this.generateMoistureMap(world.width, world.height);
        
        // Generate regions
        world.regions = this.generateRegions(world, heightMap, moistureMap);
        
        // Generate settlements
        world.villages = this.generateVillages(world);
        
        // Generate dungeons
        world.dungeons = this.generateDungeons(world);
        
        // Generate points of interest
        world.pointsOfInterest = this.generatePointsOfInterest(world);
        
        // Connect regions with roads
        world.roads = this.generateRoads(world);
        
        // Set player starting location
        world.playerStart = this.determinePlayerStart(world);
        
        return world;
    }
    
    /**
     * Generate a height map
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Array} - 2D height map
     */
    generateHeightMap(width, height) {
        // In a real implementation, this would use a noise function like Perlin or Simplex
        // For the placeholder, we'll just create a simple randomized height map
        
        const heightMap = Array(height).fill().map(() => Array(width).fill(0));
        
        // Create some random "mountains"
        const numMountains = Math.floor(10 + this.random() * 10);
        
        for (let i = 0; i < numMountains; i++) {
            const mX = Math.floor(this.random() * width);
            const mY = Math.floor(this.random() * height);
            const mHeight = 0.7 + this.random() * 0.3; // Mountain peak height (0.7-1.0)
            const mRadius = 50 + Math.floor(this.random() * 100); // Mountain radius
            
            // Create mountain with exponential falloff
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const distance = Math.sqrt(Math.pow(x - mX, 2) + Math.pow(y - mY, 2));
                    if (distance < mRadius) {
                        // Exponential falloff from peak
                        const h = mHeight * Math.exp(-distance / (mRadius * 0.5));
                        heightMap[y][x] = Math.max(heightMap[y][x], h);
                    }
                }
            }
        }
        
        // Normalize height map to 0-1 range
        let minHeight = 1, maxHeight = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                minHeight = Math.min(minHeight, heightMap[y][x]);
                maxHeight = Math.max(maxHeight, heightMap[y][x]);
            }
        }
        
        // Normalize and apply water level
        const waterLevel = this.worldParams.waterCoverage;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Normalize to 0-1
                if (maxHeight > minHeight) {
                    heightMap[y][x] = (heightMap[y][x] - minHeight) / (maxHeight - minHeight);
                } else {
                    heightMap[y][x] = 0.5;
                }
                
                // Areas below water level are set to water level
                if (heightMap[y][x] < waterLevel) {
                    heightMap[y][x] = waterLevel;
                }
            }
        }
        
        return heightMap;
    }
    
    /**
     * Generate a moisture map
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Array} - 2D moisture map
     */
    generateMoistureMap(width, height) {
        // Similar to height map, this would use noise in a real implementation
        
        const moistureMap = Array(height).fill().map(() => Array(width).fill(0));
        
        // Create some random "moisture centers"
        const numCenters = Math.floor(5 + this.random() * 10);
        
        for (let i = 0; i < numCenters; i++) {
            const mX = Math.floor(this.random() * width);
            const mY = Math.floor(this.random() * height);
            const mIntensity = 0.5 + this.random() * 0.5; // Moisture intensity (0.5-1.0)
            const mRadius = 100 + Math.floor(this.random() * 200); // Moisture radius
            
            // Create moisture center with linear falloff
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const distance = Math.sqrt(Math.pow(x - mX, 2) + Math.pow(y - mY, 2));
                    if (distance < mRadius) {
                        // Linear falloff from center
                        const m = mIntensity * (1 - distance / mRadius);
                        moistureMap[y][x] = Math.max(moistureMap[y][x], m);
                    }
                }
            }
        }
        
        return moistureMap;
    }
    
    /**
     * Determine biome based on height and moisture
     * @param {number} height - Terrain height
     * @param {number} moisture - Terrain moisture
     * @returns {object} - Biome object
     */
    determineBiome(height, moisture) {
        if (height <= this.worldParams.waterCoverage) {
            return this.biomes[4]; // Water
        }
        
        if (height > 0.8) {
            return this.biomes[2]; // Mountain
        }
        
        if (moisture < 0.3) {
            return this.biomes[3]; // Desert
        }
        
        if (moisture > 0.6 && height < 0.7) {
            return this.biomes[1]; // Forest
        }
        
        return this.biomes[0]; // Plains
    }
    
    /**
     * Generate world regions
     * @param {object} world - World object
     * @param {Array} heightMap - Height map
     * @param {Array} moistureMap - Moisture map
     * @returns {Array} - Array of regions
     */
    generateRegions(world, heightMap, moistureMap) {
        const regions = [];
        const regionSize = this.worldParams.regionSize;
        
        // Calculate number of regions in each dimension
        const regionsX = Math.ceil(world.width / regionSize);
        const regionsY = Math.ceil(world.height / regionSize);
        
        // Generate regions
        for (let ry = 0; ry < regionsY; ry++) {
            for (let rx = 0; rx < regionsX; rx++) {
                // Region bounds
                const left = rx * regionSize;
                const top = ry * regionSize;
                const right = Math.min(left + regionSize, world.width);
                const bottom = Math.min(top + regionSize, world.height);
                
                // Sample height and moisture from center of region
                const centerX = Math.floor(left + (right - left) / 2);
                const centerY = Math.floor(top + (bottom - top) / 2);
                const height = heightMap[centerY][centerX];
                const moisture = moistureMap[centerY][centerX];
                
                // Determine primary biome
                const biome = this.determineBiome(height, moisture);
                
                // Create region
                const region = {
                    id: `r${rx}_${ry}`,
                    x: left,
                    y: top,
                    width: right - left,
                    height: bottom - top,
                    biome: biome.name,
                    height: height,
                    moisture: moisture,
                    resources: this.generateRegionResources(biome),
                    entities: []
                };
                
                regions.push(region);
            }
        }
        
        return regions;
    }
    
    /**
     * Generate resources for a region
     * @param {object} biome - Biome object
     * @returns {Array} - Array of resources
     */
    generateRegionResources(biome) {
        const resources = [];
        
        // Each resource has a chance to appear based on the biome
        biome.resources.forEach(resourceType => {
            // Random number of resource nodes
            const count = Math.floor(this.random() * 5) + 1;
            
            for (let i = 0; i < count; i++) {
                if (this.random() < 0.7) { // 70% chance for each potential resource
                    resources.push({
                        type: resourceType,
                        amount: Math.floor(this.random() * 10) + 5, // Random amount between 5-15
                        x: this.random(),  // Relative position within region (0-1)
                        y: this.random()
                    });
                }
            }
        });
        
        return resources;
    }
    
    /**
     * Generate villages for the world
     * @param {object} world - World object
     * @returns {Array} - Array of villages
     */
    generateVillages(world) {
        const villages = [];
        const villageCount = this.worldParams.villageCount;
        
        // Find suitable regions for villages (Plains or Forest, not water or mountains)
        const suitableRegions = world.regions.filter(region => 
            region.biome === 'MallPlaza' || region.biome === 'Residential'
        );
        
        // If no suitable regions, return empty array
        if (suitableRegions.length === 0) return villages;
        
        // Generate villages
        for (let i = 0; i < villageCount; i++) {
            // Pick a random suitable region
            const regionIndex = Math.floor(this.random() * suitableRegions.length);
            const region = suitableRegions[regionIndex];
            
            // Remove the region from suitable regions to avoid multiple villages in the same region
            suitableRegions.splice(regionIndex, 1);
            
            // If no more suitable regions, break
            if (suitableRegions.length === 0) break;
            
            // Random position within region
            const x = region.x + Math.floor(this.random() * region.width);
            const y = region.y + Math.floor(this.random() * region.height);
            
            // Generate village name
            const villageName = this.generateVillageName();
            
            // Create village
            const village = {
                id: `village_${i}`,
                name: villageName,
                x: x,
                y: y,
                size: Math.floor(this.random() * 3) + 1, // 1=small, 2=medium, 3=large
                regionId: region.id,
                biome: region.biome,
                buildings: this.generateVillageBuildings(x, y, villageName),
                npcs: []
            };
            
            villages.push(village);
        }
        
        return villages;
    }
    
    /**
     * Generate buildings for a village
     * @param {number} villageX - Village X position
     * @param {number} villageY - Village Y position
     * @param {string} villageName - Village name
     * @returns {Array} - Array of buildings
     */
    generateVillageBuildings(villageX, villageY, villageName) {
        const buildings = [];
        
        // Essential buildings
        buildings.push({
            type: 'town_hall',
            name: `${villageName} Town Hall`,
            x: villageX,
            y: villageY,
            width: 5,
            height: 5
        });
        
        buildings.push({
            type: 'shop',
            name: 'General Store',
            x: villageX + 8,
            y: villageY + 3,
            width: 4,
            height: 4
        });
        
        // Add more buildings based on village size
        const numHouses = 3 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numHouses; i++) {
            const offsetX = -15 + Math.floor(Math.random() * 30);
            const offsetY = -15 + Math.floor(Math.random() * 30);
            
            buildings.push({
                type: 'house',
                name: 'House',
                x: villageX + offsetX,
                y: villageY + offsetY,
                width: 3,
                height: 3
            });
        }
        
        return buildings;
    }
    
    /**
     * Generate a village name
     * @returns {string} - Generated village name
     */
    generateVillageName() {
        const prefixes = ['Neo', 'Cyber', 'Neon', 'Digi', 'Synth', 'Tech', 'Circuit', 'Pixel', 'Data', 'Virtual'];
        const suffixes = ['Market', 'Plaza', 'Sector', 'Floor', 'Wing', 'Section', 'Boutique', 'Outlet', 'Zone', 'Court'];
        
        const prefix = prefixes[Math.floor(this.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(this.random() * suffixes.length)];
        
        return prefix + ' ' + suffix;
    }
    
    /**
     * Generate dungeons for the world
     * @param {object} world - World object
     * @returns {Array} - Array of dungeons
     */
    generateDungeons(world) {
        const dungeons = [];
        const dungeonCount = this.worldParams.dungeonCount;
        
        // Implementation details would go here
        
        return dungeons;
    }
    
    /**
     * Generate points of interest
     * @param {object} world - World object
     * @returns {Array} - Array of points of interest
     */
    generatePointsOfInterest(world) {
        const pois = [];
        
        // Implementation details would go here
        
        return pois;
    }
    
    /**
     * Generate roads connecting regions
     * @param {object} world - World object
     * @returns {Array} - Array of road segments
     */
    generateRoads(world) {
        const roads = [];
        
        // Implementation details would go here
        
        return roads;
    }
    
    /**
     * Determine player starting location
     * @param {object} world - World object
     * @returns {object} - Player start position {x, y}
     */
    determinePlayerStart(world) {
        // Default to center of first village if exists
        if (world.villages.length > 0) {
            const startVillage = world.villages[0];
            return {
                x: startVillage.x,
                y: startVillage.y
            };
        }
        
        // Otherwise start in the middle
        return {
            x: Math.floor(world.width / 2),
            y: Math.floor(world.height / 2)
        };
    }
    
    /**
     * Generate faction relationships
     */
    generateFactionRelationships() {
        // Initialize relationship matrix
        this.factionRelationships = {};
        
        // For each pair of factions, assign a relationship value
        for (let i = 0; i < this.factions.length; i++) {
            const faction1 = this.factions[i].id;
            this.factionRelationships[faction1] = {};
            
            for (let j = 0; j < this.factions.length; j++) {
                const faction2 = this.factions[j].id;
                
                // Self-relationship is always 100 (allied)
                if (i === j) {
                    this.factionRelationships[faction1][faction2] = 100;
                    continue;
                }
                
                // If relationship is already defined, use it
                if (j < i && this.factionRelationships[faction2] && this.factionRelationships[faction2][faction1] !== undefined) {
                    this.factionRelationships[faction1][faction2] = this.factionRelationships[faction2][faction1];
                    continue;
                }
                
                // Generate random relationship value
                // -100 to -30 = hostile, -29 to 29 = neutral, 30 to 100 = allied
                let value;
                const roll = this.random();
                
                if (roll < 0.33) {
                    // Hostile: -100 to -30
                    value = -100 + Math.floor(this.random() * 70);
                } else if (roll < 0.67) {
                    // Neutral: -29 to 29
                    value = -29 + Math.floor(this.random() * 59);
                } else {
                    // Allied: 30 to 100
                    value = 30 + Math.floor(this.random() * 70);
                }
                
                this.factionRelationships[faction1][faction2] = value;
            }
        }
        
        // Make sure we have at least one pair of hostile factions
        let hasHostile = false;
        for (const faction1 in this.factionRelationships) {
            for (const faction2 in this.factionRelationships[faction1]) {
                if (faction1 !== faction2 && this.factionRelationships[faction1][faction2] <= -30) {
                    hasHostile = true;
                    break;
                }
            }
            if (hasHostile) break;
        }
        
        // If no hostile relationships, create one
        if (!hasHostile) {
            const faction1 = this.factions[0].id;
            const faction2 = this.factions[1].id;
            const value = -100 + Math.floor(this.random() * 70);
            this.factionRelationships[faction1][faction2] = value;
            this.factionRelationships[faction2][faction1] = value;
        }
        
        // Make sure we have at least one pair of allied factions
        let hasAllied = false;
        for (const faction1 in this.factionRelationships) {
            for (const faction2 in this.factionRelationships[faction1]) {
                if (faction1 !== faction2 && this.factionRelationships[faction1][faction2] >= 30) {
                    hasAllied = true;
                    break;
                }
            }
            if (hasAllied) break;
        }
        
        // If no allied relationships, create one
        if (!hasAllied) {
            const faction1 = this.factions[2].id;
            const faction2 = this.factions[3].id;
            const value = 30 + Math.floor(this.random() * 70);
            this.factionRelationships[faction1][faction2] = value;
            this.factionRelationships[faction2][faction1] = value;
        }
    }
}