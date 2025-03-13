import * as seedrandom from 'seedrandom';

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
            waterCoverage: 0.3,    // Percentage of world covered by water (0-1)
            forestCoverage: 0.3,   // Percentage of land covered by forest (0-1)
            villageCount: 5,       // Number of villages to generate
            dungeonCount: 3,       // Number of dungeons to generate
            pointsOfInterest: 10   // Number of misc points of interest
        };
        
        // Biomes and their properties
        this.biomes = [
            {
                name: 'Plains',
                color: '#A8D87E',
                walkSpeed: 1.0,
                vegetation: 0.3,
                resources: ['wheat', 'berry_bush', 'herbs'],
                spawnChance: {
                    deer: 0.3,
                    rabbit: 0.5,
                    wolf: 0.1
                }
            },
            {
                name: 'Forest',
                color: '#4B8A37',
                walkSpeed: 0.8,
                vegetation: 0.8,
                resources: ['wood', 'mushrooms', 'herbs'],
                spawnChance: {
                    bear: 0.2,
                    wolf: 0.3,
                    deer: 0.4,
                    fox: 0.3
                }
            },
            {
                name: 'Mountain',
                color: '#8A8A8A',
                walkSpeed: 0.6,
                vegetation: 0.2,
                resources: ['stone', 'iron_ore', 'coal'],
                spawnChance: {
                    goat: 0.3,
                    eagle: 0.2
                }
            },
            {
                name: 'Desert',
                color: '#E1BE7D',
                walkSpeed: 0.7,
                vegetation: 0.1,
                resources: ['cactus_fruit', 'sand', 'clay'],
                spawnChance: {
                    scorpion: 0.3,
                    snake: 0.2
                }
            },
            {
                name: 'Water',
                color: '#4A99D5',
                walkSpeed: 0.3,
                vegetation: 0.2,
                resources: ['fish', 'water_lily', 'reed'],
                spawnChance: {
                    fish: 0.7,
                    duck: 0.3
                }
            }
        ];
    }
    
    /**
     * Generate the world
     * @param {string} seed - Seed for random generation
     * @returns {object} - Generated world
     */
    generateWorld(seed) {
        console.log(`Generating world with seed: ${seed}`);
        
        // Initialize random generator with seed
        this.random = seedrandom(seed);
        
        // Create world object
        const world = {
            seed: seed,
            width: this.worldParams.width,
            height: this.worldParams.height,
            regions: [],
            villages: [],
            dungeons: [],
            pointsOfInterest: []
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
            region.biome === 'Plains' || region.biome === 'Forest'
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
        const prefixes = ['Green', 'Oak', 'Silver', 'Gold', 'Stone', 'Black', 'White', 'Red', 'Blue', 'North', 'South', 'East', 'West'];
        const suffixes = ['field', 'wood', 'haven', 'vale', 'ford', 'bridge', 'ton', 'wick', 'shire', 'hall', 'mill', 'pond'];
        
        const prefix = prefixes[Math.floor(this.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(this.random() * suffixes.length)];
        
        return prefix + suffix;
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
}