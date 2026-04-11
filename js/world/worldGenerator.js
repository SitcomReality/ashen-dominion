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
                name: 'ElectronicsDept',
                color: '#4B8A9F',
                walkSpeed: 0.9,
                vegetation: 0.1,
                resources: ['electronics', 'rare_parts', 'gadgets'],
                spawnChance: {
                    tech_expert: 0.4,
                    shopper: 0.4,
                    security: 0.2
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
            },
            {
                name: 'LuxuryDept',
                color: '#C0A080',
                walkSpeed: 1.0,
                vegetation: 0.4,
                resources: ['jewelry', 'designer_clothes', 'perfumes'],
                spawnChance: {
                    elite_shopper: 0.6,
                    concierge: 0.4
                }
            },
            {
                name: 'MaintenanceTunnels',
                color: '#555555',
                walkSpeed: 0.5,
                vegetation: 0.0,
                resources: ['tools', 'pipes', 'wiring'],
                spawnChance: {
                    maintenance: 0.7,
                    robot: 0.3
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
        // For department store setting: use height and moisture metaphorically
        // Height = floor level (higher = more exclusive/expensive areas)
        // Moisture = population density/traffic
        
        if (height < 0.2) {
            return this.biomes[6]; // MaintenanceTunnels - basement level
        }
        
        if (height > 0.85) {
            return this.biomes[5]; // LuxuryDept - top floor luxury
        }
        
        if (height > 0.7 && moisture < 0.4) {
            return this.biomes[4]; // Restricted - executive/staff areas
        }
        
        if (moisture > 0.7) {
            return this.biomes[3]; // FoodCourt - high traffic
        }
        
        if (height < 0.4 && moisture < 0.3) {
            return this.biomes[2]; // Storage - low-traffic back areas
        }
        
        if (height > 0.5 && moisture > 0.5) {
            return this.biomes[1]; // ElectronicsDept
        }
        
        return this.biomes[0]; // MallPlaza - default general shopping area
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
                    terrainHeight: height,
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
        
        // Main kiosk/hub
        buildings.push({
            type: 'kiosk',
            name: `${villageName} Information Hub`,
            x: villageX,
            y: villageY,
            width: 5,
            height: 5
        });
        
        buildings.push({
            type: 'shop',
            name: 'Mini-Mart',
            x: villageX + 8,
            y: villageY + 3,
            width: 4,
            height: 4
        });
        
        // Add department stores
        const numStores = 3 + Math.floor(this.random() * 5);
        for (let i = 0; i < numStores; i++) {
            const angle = (i / numStores) * Math.PI * 2;
            const distance = 12 + this.random() * 8;
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            
            const storeTypes = ['fashion', 'electronics', 'food', 'entertainment', 'gadgets', 'home'];
            const storeType = storeTypes[Math.floor(this.random() * storeTypes.length)];
            
            buildings.push({
                type: 'store',
                storeType: storeType,
                name: `${storeType.charAt(0).toUpperCase() + storeType.slice(1)} Store`,
                x: villageX + offsetX,
                y: villageY + offsetY,
                width: 4 + Math.floor(this.random() * 3),
                height: 4 + Math.floor(this.random() * 3)
            });
        }
        
        // Add faction hangout spot
        if (this.random() < 0.7) {
            const hangoutFaction = this.factions[Math.floor(this.random() * this.factions.length)];
            
            buildings.push({
                type: 'faction_hub',
                factionId: hangoutFaction.id,
                name: `${hangoutFaction.name} Hub`,
                x: villageX - 10 - this.random() * 5,
                y: villageY - 5 - this.random() * 5,
                width: 6,
                height: 6
            });
        }
        
        // Add rest areas
        const numRestAreas = 1 + Math.floor(this.random() * 3);
        for (let i = 0; i < numRestAreas; i++) {
            const offsetX = -20 + Math.floor(this.random() * 40);
            const offsetY = -20 + Math.floor(this.random() * 40);
            
            buildings.push({
                type: 'rest_area',
                name: 'Customer Lounge',
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
        
        // For our department store setting, "dungeons" are restricted/abandoned areas
        const dungeonTypes = [
            { type: 'abandoned_stockroom', name: 'Abandoned Stockroom', danger: 2 },
            { type: 'security_complex', name: 'Security Complex', danger: 3 },
            { type: 'maintenance_tunnels', name: 'Maintenance Tunnels', danger: 1 },
            { type: 'executive_offices', name: 'Executive Offices', danger: 3 },
            { type: 'power_station', name: 'Power Station', danger: 4 },
            { type: 'server_room', name: 'Server Room', danger: 2 }
        ];
        
        // Find suitable regions for dungeons (prefer Storage or Restricted areas)
        const suitableRegions = world.regions.filter(region => 
            region.biome === 'Storage' || 
            region.biome === 'Restricted' ||
            region.biome === 'MaintenanceTunnels'
        );
        
        // If no suitable regions, use any region
        const targetRegions = suitableRegions.length > 0 ? suitableRegions : world.regions;
        
        // Generate dungeons
        for (let i = 0; i < dungeonCount; i++) {
            // Pick a random suitable region
            const regionIndex = Math.floor(this.random() * targetRegions.length);
            const region = targetRegions[regionIndex];
            
            // Random position within region
            const x = region.x + Math.floor(this.random() * (region.width * 0.8)) + region.width * 0.1;
            const y = region.y + Math.floor(this.random() * (region.height * 0.8)) + region.height * 0.1;
            
            // Choose a random dungeon type
            const dungeonType = dungeonTypes[Math.floor(this.random() * dungeonTypes.length)];
            
            // Generate unique dungeon name
            const adjectives = ['Forgotten', 'Secured', 'Restricted', 'Abandoned', 'Hidden', 'Locked'];
            const adj = adjectives[Math.floor(this.random() * adjectives.length)];
            
            // Create dungeon
            const dungeon = {
                id: `dungeon_${i}`,
                name: `${adj} ${dungeonType.name}`,
                type: dungeonType.type,
                x: x,
                y: y,
                width: 10 + Math.floor(this.random() * 10),
                height: 10 + Math.floor(this.random() * 10),
                dangerLevel: dungeonType.danger,
                regionId: region.id,
                guardFaction: this.random() < 0.7 ? 
                    this.factions[Math.floor(this.random() * this.factions.length)].id : null,
                loot: {
                    quality: 1 + Math.floor(this.random() * dungeonType.danger),
                    quantity: 3 + Math.floor(this.random() * 5) // 3-7 loot containers
                }
            };
            
            dungeons.push(dungeon);
            
            // Remove the region from suitable regions to reduce clustering
            targetRegions.splice(regionIndex, 1);
            
            // If no more suitable regions, break
            if (targetRegions.length === 0) break;
        }
        
        return dungeons;
    }
    
    /**
     * Generate points of interest
     * @param {object} world - World object
     * @returns {Array} - Array of points of interest
     */
    generatePointsOfInterest(world) {
        const pois = [];
        const poiCount = this.worldParams.pointsOfInterest;
        
        // Define POI types
        const poiTypes = [
            { type: 'vending_machine', name: 'Vending Machine', icon: 'machine' },
            { type: 'atm', name: 'Mall ATM', icon: 'money' },
            { type: 'charging_station', name: 'Charging Station', icon: 'energy' },
            { type: 'interactive_display', name: 'Interactive Display', icon: 'display' },
            { type: 'water_fountain', name: 'Water Fountain', icon: 'water' },
            { type: 'decorative_sculpture', name: 'Decorative Sculpture', icon: 'art' },
            { type: 'bench', name: 'Seating Area', icon: 'bench' },
            { type: 'directory', name: 'Mall Directory', icon: 'map' },
            { type: 'security_camera', name: 'Security Camera', icon: 'camera' },
            { type: 'advertisement', name: 'Advertisement Billboard', icon: 'ad' },
            { type: 'sample_stand', name: 'Free Sample Stand', icon: 'food' }
        ];
        
        // Generate POIs
        for (let i = 0; i < poiCount; i++) {
            // Pick a random region
            const region = world.regions[Math.floor(this.random() * world.regions.length)];
            
            // Random position within region
            const x = region.x + Math.floor(this.random() * region.width);
            const y = region.y + Math.floor(this.random() * region.height);
            
            // Choose a random POI type
            const poiType = poiTypes[Math.floor(this.random() * poiTypes.length)];
            
            // Create POI
            const poi = {
                id: `poi_${i}`,
                name: poiType.name,
                type: poiType.type,
                icon: poiType.icon,
                x: x,
                y: y,
                regionId: region.id,
                interactable: this.random() > 0.3, // 70% are interactable
                factionTag: this.random() > 0.7 ? // 30% are faction-related
                    this.factions[Math.floor(this.random() * this.factions.length)].id : null
            };
            
            pois.push(poi);
        }
        
        return pois;
    }
    
    /**
     * Generate roads connecting regions
     * @param {object} world - World object
     * @returns {Array} - Array of road segments
     */
    generateRoads(world) {
        const roads = [];
        
        // In a department store we have corridors, not roads
        
        // Connect all villages with main corridors
        const villages = world.villages;
        
        if (villages.length > 1) {
            // Create a minimum spanning tree to ensure all villages are connected
            for (let i = 1; i < villages.length; i++) {
                const from = villages[i];
                
                // Find closest connected village
                let closestDist = Infinity;
                let closestVillage = null;
                
                for (let j = 0; j < i; j++) {
                    const to = villages[j];
                    const dist = Math.sqrt(
                        Math.pow(to.x - from.x, 2) + 
                        Math.pow(to.y - from.y, 2)
                    );
                    
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestVillage = to;
                    }
                }
                
                if (closestVillage) {
                    // Create corridor segment
                    roads.push({
                        from: { x: from.x, y: from.y },
                        to: { x: closestVillage.x, y: closestVillage.y },
                        width: 2,
                        type: 'main_corridor'
                    });
                }
            }
            
            // Add some additional connections for alternate routes (about 20% extra)
            const extraConnections = Math.max(1, Math.floor(villages.length * 0.2));
            
            for (let i = 0; i < extraConnections; i++) {
                const fromIndex = Math.floor(this.random() * villages.length);
                let toIndex;
                
                do {
                    toIndex = Math.floor(this.random() * villages.length);
                } while (toIndex === fromIndex);
                
                const from = villages[fromIndex];
                const to = villages[toIndex];
                
                // Check if connection already exists
                const existingConnection = roads.some(road => 
                    (road.from.x === from.x && road.from.y === from.y && 
                     road.to.x === to.x && road.to.y === to.y) ||
                    (road.from.x === to.x && road.from.y === to.y && 
                     road.to.x === from.x && road.to.y === from.y)
                );
                
                if (!existingConnection) {
                    roads.push({
                        from: { x: from.x, y: from.y },
                        to: { x: to.x, y: to.y },
                        width: 1.5,
                        type: 'side_corridor'
                    });
                }
            }
        }
        
        // Connect dungeons to nearest village or corridor
        for (const dungeon of world.dungeons) {
            let closestPoint = null;
            let closestDist = Infinity;
            
            // Check distance to villages
            for (const village of villages) {
                const dist = Math.sqrt(
                    Math.pow(village.x - dungeon.x, 2) + 
                    Math.pow(village.y - dungeon.y, 2)
                );
                
                if (dist < closestDist) {
                    closestDist = dist;
                    closestPoint = { x: village.x, y: village.y };
                }
            }
            
            // Add connection if we found a close point
            if (closestPoint) {
                roads.push({
                    from: { x: dungeon.x, y: dungeon.y },
                    to: closestPoint,
                    width: 1,
                    type: 'service_corridor'
                });
            }
        }
        
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