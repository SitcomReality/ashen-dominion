/**
 * Handles rendering the game world and UI
 */
export class RenderSystem {
    constructor(engine) {
        this.engine = engine;
        this.canvas = engine.canvas;
        this.ctx = engine.ctx;
        
        // Camera properties
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            targetZoom: 1,
            zoomSpeed: 5,
            minZoom: 0.5,
            maxZoom: 2.0,
            width: this.canvas.width,
            height: this.canvas.height,
            shake: {
                active: false,
                intensity: 0,
                duration: 0,
                timer: 0
            }
        };
        
        // Rendering layers
        this.layers = {
            background: 0,
            terrain: 1,
            shadows: 2,
            structures: 3,
            objects: 4,
            characters: 5,
            effects: 6,
            ui: 7
        };
        
        // Sprite cache
        this.sprites = new Map();
        
        // Isometric projection properties
        this.isometric = {
            tileWidth: 64,
            tileHeight: 32,
            tileDepth: 16
        };
        
        // Debug rendering options
        this.debug = {
            showColliders: false,
            showGrid: false,
            showEntityNames: false,
            showPath: false
        };
        
        // Lighting system
        this.lighting = {
            enabled: true,
            ambientLight: 0.5,
            dayNightCycle: true,
            lightSources: []
        };
        
        // Weather effects
        this.weatherEffects = {
            rainDrops: [],
            snowflakes: [],
            clouds: [],
            lightning: {
                active: false,
                intensity: 0
            }
        };
        
        // Post-processing effects
        this.postProcessing = {
            enabled: true,
            blur: 0,
            vignette: 0.3,
            chromaticAberration: 0
        };
        
        // Performance metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            entitiesRendered: 0,
            drawCalls: 0
        };
    }
    
    /**
     * Initialize the render system
     */
    initialize() {
        // Set up initial camera position
        this.resetCamera();
        
        // Load any necessary graphics or shaders
        this.loadAssets();
        
        console.log('Render system initialized');
    }
    
    /**
     * Reset camera to default position and zoom
     */
    resetCamera() {
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.zoom = 1;
        this.camera.targetZoom = 1;
        this.camera.shakeOffsetX = 0;
        this.camera.shakeOffsetY = 0;
        this.camera.shake.active = false;
        this.camera.shake.intensity = 0;
    }

    /**
     * Load rendering assets
     */
    loadAssets() {
        // In a real implementation, this would load sprites, textures, etc.
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Update camera dimensions
        this.camera.width = this.canvas.width;
        this.camera.height = this.canvas.height;
    }
    
    /**
     * Focus camera on a specific position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    focusCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    /**
     * Follow entity with camera
     * @param {object} entity - Entity to focus on
     */
    followEntity(entity) {
        if (!entity || !entity.position) return;
        
        // For player, center the view on player
        if (entity === this.engine.player) {
            // Ensure camera stays centered on player
            this.camera.x = entity.position.x;
            this.camera.y = entity.position.y;
            return;
        }
        
        // Smoothly move camera towards other entities
        const smoothFactor = 0.1;
        this.camera.x += (entity.position.x - this.camera.x) * smoothFactor;
        this.camera.y += (entity.position.y - this.camera.y) * smoothFactor;
    }
    
    /**
     * Zoom camera in
     * @param {number} amount - Amount to zoom in
     */
    zoomIn(amount = 0.1) {
        this.camera.targetZoom = Math.min(this.camera.targetZoom + amount, this.camera.maxZoom);
    }
    
    /**
     * Zoom camera out
     * @param {number} amount - Amount to zoom out
     */
    zoomOut(amount = 0.1) {
        this.camera.targetZoom = Math.max(this.camera.targetZoom - amount, this.camera.minZoom);
    }
    
    /**
     * Set camera zoom level
     * @param {number} zoom - Zoom level
     */
    setZoom(zoom) {
        this.camera.targetZoom = Math.max(
            this.camera.minZoom,
            Math.min(zoom, this.camera.maxZoom)
        );
    }
    
    /**
     * Apply camera shake effect
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in seconds
     */
    shakeCamera(intensity, duration) {
        this.camera.shake.active = true;
        this.camera.shake.intensity = intensity;
        this.camera.shake.duration = duration;
        this.camera.shake.timer = duration;
    }
    
    /**
     * Update camera shake effect
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateCameraShake(deltaTime) {
        if (!this.camera.shake.active) return;
        
        // Update shake timer
        this.camera.shake.timer -= deltaTime;
        
        if (this.camera.shake.timer <= 0) {
            // Shake finished
            this.camera.shake.active = false;
            this.camera.shake.intensity = 0;
        }
        
        // Calculate shake offset
        const remainingFactor = this.camera.shake.timer / this.camera.shake.duration;
        const intensity = this.camera.shake.intensity * remainingFactor;
        
        // Apply random shake offset
        this.camera.shakeOffsetX = (Math.random() * 2 - 1) * intensity;
        this.camera.shakeOffsetY = (Math.random() * 2 - 1) * intensity;
    }
    
    /**
     * Update zoom smoothly
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateZoom(deltaTime) {
        if (this.camera.zoom !== this.camera.targetZoom) {
            // Smooth zoom transition
            const zoomDiff = this.camera.targetZoom - this.camera.zoom;
            this.camera.zoom += zoomDiff * this.camera.zoomSpeed * deltaTime;
            
            // Snap to target if very close
            if (Math.abs(zoomDiff) < 0.001) {
                this.camera.zoom = this.camera.targetZoom;
            }
        }
    }
    
    /**
     * Convert screen coordinates to world coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {object} - World coordinates {x, y}
     */
    screenToWorldPosition(screenX, screenY) {
        // Calculate world coordinates
        const canvasCenter = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
        
        // Apply camera zoom
        const zoomedX = (screenX - canvasCenter.x) / this.camera.zoom;
        const zoomedY = (screenY - canvasCenter.y) / this.camera.zoom;
        
        // Convert from isometric to cartesian
        const cartX = (zoomedX / this.isometric.tileWidth + zoomedY / this.isometric.tileHeight) / 2;
        const cartY = (zoomedY / this.isometric.tileHeight - zoomedX / this.isometric.tileWidth) / 2;
        
        // Add camera offset
        return {
            x: cartX + this.camera.x,
            y: cartY + this.camera.y
        };
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} worldZ - World Z coordinate (height)
     * @returns {object} - Screen coordinates {x, y}
     */
    worldToScreenPosition(worldX, worldY, worldZ = 0) {
        // Calculate offset from camera
        const offsetX = worldX - this.camera.x;
        const offsetY = worldY - this.camera.y;
        
        // Convert from cartesian to isometric
        const isoX = (offsetX - offsetY) * this.isometric.tileWidth / 2;
        const isoY = (offsetX + offsetY) * this.isometric.tileHeight / 2;
        
        // Apply height (Z) offset
        const isoZ = worldZ * this.isometric.tileDepth;
        
        // Apply camera zoom and canvas center
        const canvasCenter = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2
        };
        
        // Apply camera shake
        const shakeX = this.camera.shake.active ? this.camera.shakeOffsetX : 0;
        const shakeY = this.camera.shake.active ? this.camera.shakeOffsetY : 0;
        
        return {
            x: canvasCenter.x + isoX * this.camera.zoom + shakeX,
            y: canvasCenter.y + (isoY - isoZ) * this.camera.zoom + shakeY
        };
    }
    
    /**
     * Render the game world
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        // Start measuring performance
        const startTime = performance.now();
        this.metrics.drawCalls = 0;
        this.metrics.entitiesRendered = 0;
        
        // Clear canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update camera
        this.updateZoom(1/60); // Assuming 60 FPS for smooth zoom
        this.updateCameraShake(1/60);
        
        // Follow player if exists
        if (this.engine.player) {
            this.followEntity(this.engine.player);
        }
        
        // Render world
        this.renderBackground(ctx);
        this.renderTerrain(ctx);
        this.renderEntities(ctx);
        this.renderEffects(ctx);
        
        // Render debug information if enabled
        if (this.debug.showGrid) this.renderGrid(ctx);
        if (this.debug.showColliders) this.renderColliders(ctx);
        
        // Update performance metrics
        const endTime = performance.now();
        this.metrics.frameTime = endTime - startTime;
        this.metrics.fps = 1000 / this.metrics.frameTime;
    }
    
    /**
     * Render the background (indoor mall ceiling and atmosphere)
     */
    renderBackground(ctx) {
        // Get time of day for lighting state
        const timeData = this.engine.timeManager?.getCurrentTime();
        const isDaytime = timeData?.isDaytime ?? true;

        // Get weather for ambient effects
        const currentWeather = this.engine.weatherSystem?.getCurrentWeather() ?? 'clear';

        // Render indoor ceiling gradient — the Requiemporium is an enclosed mega-mall
        const ceilGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.5);

        if (isDaytime) {
            // Operating hours — fluorescent / atrium lighting
            switch (currentWeather) {
                case 'clear':
                    ceilGradient.addColorStop(0, '#D8D4CC'); // warm off-white ceiling
                    ceilGradient.addColorStop(1, '#E8E4DC'); // lighter haze toward horizon
                    break;
                case 'cloudy':
                    ceilGradient.addColorStop(0, '#C8C4BC');
                    ceilGradient.addColorStop(1, '#D8D4CC');
                    break;
                case 'rain':
                    // Water dripping through damaged ceiling
                    ceilGradient.addColorStop(0, '#B0ACA4');
                    ceilGradient.addColorStop(1, '#C8C4BC');
                    break;
                case 'storm':
                    // Power surge — darker emergency lighting
                    ceilGradient.addColorStop(0, '#706860');
                    ceilGradient.addColorStop(1, '#908880');
                    break;
                case 'snow':
                    // Warm incandescent backup lights
                    ceilGradient.addColorStop(0, '#F0ECE4');
                    ceilGradient.addColorStop(1, '#FAF6EE');
                    break;
                default:
                    ceilGradient.addColorStop(0, '#D8D4CC');
                    ceilGradient.addColorStop(1, '#E8E4DC');
            }
        } else {
            // After-hours — emergency lighting only
            ceilGradient.addColorStop(0, '#1A1828');
            ceilGradient.addColorStop(1, '#2A2438');
        }

        ctx.fillStyle = ceilGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.5);
        this.metrics.drawCalls++;

        // Subtle ceiling light strip along the horizon line
        const horizonY = this.canvas.height * 0.5;
        const lightStrip = ctx.createLinearGradient(0, horizonY - 20, 0, horizonY + 8);
        if (isDaytime) {
            lightStrip.addColorStop(0, 'rgba(255,248,220,0.18)');
            lightStrip.addColorStop(1, 'rgba(255,248,220,0)');
        } else {
            lightStrip.addColorStop(0, 'rgba(80,160,120,0.12)');
            lightStrip.addColorStop(1, 'rgba(80,160,120,0)');
        }
        ctx.fillStyle = lightStrip;
        ctx.fillRect(0, horizonY - 20, this.canvas.width, 28);
        this.metrics.drawCalls++;
    }
    
    /**
     * Render the terrain (ground tiles)
     */
    renderTerrain(ctx) {
        // Get current region
        const currentRegion = this.engine.worldManager?.getCurrentRegion();
        if (!currentRegion) return;
        
        // Calculate visible tiles range
        const screenToWorld = (x, y) => this.screenToWorldPosition(x, y);
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(this.canvas.width, this.canvas.height);
        
        // Expand range to ensure offscreen tiles are rendered
        const expandAmount = 5; // Tiles to expand in each direction
        const minX = Math.floor(topLeft.x) - expandAmount;
        const minY = Math.floor(topLeft.y) - expandAmount;
        const maxX = Math.ceil(bottomRight.x) + expandAmount;
        const maxY = Math.ceil(bottomRight.y) + expandAmount;
        
        // Render terrain tiles
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.renderTerrainTile(ctx, x, y);
            }
        }
    }
    
    /**
     * Get the tile type for a given world position based on the biome of the region it belongs to.
     * Returns null when the position is outside the generated world bounds.
     * @param {number} x - World X coordinate (integer tile coordinate)
     * @param {number} y - World Y coordinate (integer tile coordinate)
     * @returns {string|null} Tile type string or null if out of bounds
     */
    getTileType(x, y) {
        const worldManager = this.engine.worldManager;
        if (!worldManager || !worldManager.worldData) return null;

        const { width: worldWidth, height: worldHeight, regions } = worldManager.worldData;
        const regionSize = regions[0]?.width || 100;

        // Outside generated world bounds — nothing to render
        if (x < 0 || x >= worldWidth || y < 0 || y >= worldHeight) return null;

        // O(1) region lookup using the regular grid layout
        const rx = Math.floor(x / regionSize);
        const ry = Math.floor(y / regionSize);
        const regionId = `r${rx}_${ry}`;
        const region = regions.find(r => r.id === regionId);
        if (!region) return null;

        // Map biome name → tile material type
        switch (region.biome) {
            case 'MallPlaza':          return 'tile';
            case 'ElectronicsDept':    return 'tech_floor';
            case 'Storage':            return 'concrete';
            case 'FoodCourt':          return 'carpet';
            case 'Restricted':         return 'marble';
            case 'LuxuryDept':         return 'marble';
            case 'MaintenanceTunnels': return 'grate';
            default:                   return 'tile';
        }
    }

    /**
     * Render a single terrain tile
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {number} x - Tile X coordinate
     * @param {number} y - Tile Y coordinate
     */
    renderTerrainTile(ctx, x, y) {
        // Get tile type based on world position
        const tileType = this.getTileType(x, y);

        // Don't render tiles that are outside the generated world
        if (tileType === null) return;

        // Get screen position for tile
        const screenPos = this.worldToScreenPosition(x, y);

        // Render tile
        const tileWidth = this.isometric.tileWidth * this.camera.zoom;
        const tileHeight = this.isometric.tileHeight * this.camera.zoom;

        // Map tile type to fill colour
        let fillColor;
        switch (tileType) {
            case 'marble':     fillColor = '#EDEAE4'; break; // warm white marble
            case 'tech_floor': fillColor = '#2870A8'; break; // rich tech-blue
            case 'concrete':   fillColor = '#8A8A80'; break; // cool concrete
            case 'tile':       fillColor = '#D8C8A0'; break; // warm mall tile
            case 'metal':      fillColor = '#6888A0'; break; // brushed steel
            case 'carpet':     fillColor = '#5844A0'; break; // deep purple carpet
            case 'grate':      fillColor = '#383830'; break; // dark metal grate
            default:           fillColor = '#B8B0A8';        // neutral floor stone
        }

        // Draw isometric tile diamond
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
        ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
        ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Draw surface pattern clipped to tile shape
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
        ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
        ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y);
        ctx.closePath();
        ctx.clip();

        ctx.strokeStyle = this.adjustBrightness(fillColor, -22);
        ctx.lineWidth = 1;

        switch (tileType) {
            case 'marble':
                // Alternating lighter / base tile for checkerboard
                if ((x + y) % 2 === 0) {
                    ctx.fillStyle = this.adjustBrightness(fillColor, 12);
                    ctx.fillRect(
                        screenPos.x - tileWidth / 2,
                        screenPos.y - tileHeight / 2,
                        tileWidth,
                        tileHeight
                    );
                }
                break;
            case 'tech_floor':
                // Cross-hair grid lines
                ctx.beginPath();
                ctx.moveTo(screenPos.x - tileWidth / 2, screenPos.y);
                ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
                ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
                ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
                ctx.stroke();
                // Bright corner accent dot
                ctx.fillStyle = this.adjustBrightness(fillColor, 50);
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, tileHeight * 0.12, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'concrete':
                // Horizontal score lines
                ctx.beginPath();
                {
                    const ls = tileHeight / 4;
                    for (let i = -2; i <= 2; i++) {
                        ctx.moveTo(screenPos.x - tileWidth / 2, screenPos.y + i * ls);
                        ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y + i * ls);
                    }
                }
                ctx.stroke();
                break;
            case 'tile':
                // Small corner dots
                {
                    const dotR = Math.max(1, 1.5 * this.camera.zoom);
                    ctx.fillStyle = this.adjustBrightness(fillColor, -18);
                    for (let dotX = -1; dotX <= 1; dotX++) {
                        for (let dotY = -1; dotY <= 1; dotY++) {
                            ctx.beginPath();
                            ctx.arc(
                                screenPos.x + dotX * (tileWidth / 4),
                                screenPos.y + dotY * (tileHeight / 4),
                                dotR, 0, Math.PI * 2
                            );
                            ctx.fill();
                        }
                    }
                }
                break;
            case 'metal':
                // Diagonal scratch lines
                ctx.beginPath();
                ctx.moveTo(screenPos.x - tileWidth / 2, screenPos.y - tileHeight / 2);
                ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y + tileHeight / 2);
                ctx.moveTo(screenPos.x + tileWidth / 2, screenPos.y - tileHeight / 2);
                ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y + tileHeight / 2);
                ctx.stroke();
                break;
            case 'carpet':
                // Small woven-dot pattern
                {
                    const dotR = Math.max(0.8, 1.2 * this.camera.zoom);
                    ctx.fillStyle = this.adjustBrightness(fillColor, 24);
                    const offsets = [-tileWidth / 3, 0, tileWidth / 3];
                    const offY = [-tileHeight / 3, 0, tileHeight / 3];
                    for (const ox of offsets) {
                        for (const oy of offY) {
                            ctx.beginPath();
                            ctx.arc(screenPos.x + ox, screenPos.y + oy, dotR, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
                break;
            case 'grate':
                // Diamond grid lines
                ctx.strokeStyle = this.adjustBrightness(fillColor, 30);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenPos.x - tileWidth / 2, screenPos.y);
                ctx.lineTo(screenPos.x, screenPos.y - tileHeight / 2);
                ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
                ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
                ctx.closePath();
                ctx.moveTo(screenPos.x - tileWidth / 4, screenPos.y - tileHeight / 4);
                ctx.lineTo(screenPos.x + tileWidth / 4, screenPos.y - tileHeight / 4);
                ctx.moveTo(screenPos.x - tileWidth / 4, screenPos.y + tileHeight / 4);
                ctx.lineTo(screenPos.x + tileWidth / 4, screenPos.y + tileHeight / 4);
                ctx.stroke();
                break;
        }

        ctx.restore();
        
        // Add tile border for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render entities
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderEntities(ctx) {
        // Get all entities
        const entities = this.engine.entityManager?.getAllEntities() || [];
        
        // Sort entities by Y position for proper isometric rendering
        const sortedEntities = [...entities].sort((a, b) => {
            // Sort by layer first
            const layerA = a.renderLayer || this.layers.characters;
            const layerB = b.renderLayer || this.layers.characters;
            
            if (layerA !== layerB) {
                return layerA - layerB;
            }
            
            // Then sort by Y position for proper overlap
            return a.position.y - b.position.y;
        });
        
        // Render each entity
        for (const entity of sortedEntities) {
            this.renderEntity(ctx, entity);
            this.metrics.entitiesRendered++;
        }
    }
    
    /**
     * Render a single entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     */
    renderEntity(ctx, entity) {
        if (!entity.position) return;
        
        // Get screen position
        const screenPos = this.worldToScreenPosition(
            entity.position.x, 
            entity.position.y,
            entity.height || 0
        );
        
        // Check if entity is visible on screen
        if (this.isOffscreen(screenPos)) return;
        
        // Render entity based on type
        switch (entity.type) {
            case 'player':
                this.renderPlayerEntity(ctx, entity, screenPos);
                break;
            case 'npc':
                this.renderNPCEntity(ctx, entity, screenPos);
                break;
            case 'item':
                this.renderItemEntity(ctx, entity, screenPos);
                break;
            case 'structure':
                this.renderStructureEntity(ctx, entity, screenPos);
                break;
            case 'resource':
                this.renderResourceEntity(ctx, entity, screenPos);
                break;
            default:
                this.renderDefaultEntity(ctx, entity, screenPos);
        }
        
        // Render entity name if debug option is enabled
        if (this.debug.showEntityNames && entity.name) {
            this.renderEntityName(ctx, entity, screenPos);
        }
    }
    
    /**
     * Render player entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderPlayerEntity(ctx, entity, screenPos) {
        const size = 20 * this.camera.zoom;
        const lw = Math.max(1, this.camera.zoom);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + size * 0.15, size * 0.55, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body (blue jacket — a shopper/adventurer in the mall)
        ctx.fillStyle = '#2060C8';
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y - size * 0.42, size * 0.52, size * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1448A8';
        ctx.lineWidth = 1.5 * lw;
        ctx.stroke();

        // Head
        const headY = screenPos.y - size * 1.28;
        const headR = size * 0.38;
        ctx.fillStyle = '#F4C07A';
        ctx.beginPath();
        ctx.arc(screenPos.x, headY, headR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D49858';
        ctx.lineWidth = 1 * lw;
        ctx.stroke();

        // Gold marker dot above head to distinguish the player
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(screenPos.x, headY - headR - size * 0.18, size * 0.11, 0, Math.PI * 2);
        ctx.fill();

        this.metrics.drawCalls += 4;
    }

    /**
     * Render NPC entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderNPCEntity(ctx, entity, screenPos) {
        const size = 16 * this.camera.zoom;
        const lw = Math.max(1, this.camera.zoom);

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + size * 0.15, size * 0.5, size * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body colour keyed to NPC role
        let bodyColor = '#4A8CD8';
        let strokeColor = '#2A6CB8';

        if (entity.brain && entity.brain.type) {
            switch (entity.brain.type) {
                case 'villager':
                    bodyColor = '#5B9BD5'; strokeColor = '#3A7BB4'; break;
                case 'merchant':
                    bodyColor = '#9B59B6'; strokeColor = '#7D3A9A'; break;
                case 'guard':
                    bodyColor = '#485060'; strokeColor = '#2C3240'; break;
                case 'enemy':
                    bodyColor = '#C0392B'; strokeColor = '#922B21'; break;
            }
        }

        // Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y - size * 0.38, size * 0.44, size * 0.62, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5 * lw;
        ctx.stroke();

        // Head
        ctx.fillStyle = '#F0C07A';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y - size * 1.12, size * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#D09858';
        ctx.lineWidth = 1 * lw;
        ctx.stroke();

        this.metrics.drawCalls += 4;
    }
    
    /**
     * Render item entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderItemEntity(ctx, entity, screenPos) {
        // In a real implementation, this would render the item sprite
        // For now, just draw a simple shape
        
        const size = 10 * this.camera.zoom;
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenPos.x, 
            screenPos.y + size * 0.1, 
            size * 0.6, 
            size * 0.3, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw item - rotated square
        ctx.fillStyle = '#F1C40F'; // Yellow
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y - size * 0.5);
        ctx.rotate(Math.PI / 4); // 45 degrees
        ctx.fillRect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4);
        ctx.restore();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render structure entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderStructureEntity(ctx, entity, screenPos) {
        // Determine structure style based on type
        let fillColor = '#95A5A6'; // Default concrete color
        let strokeColor = '#7F8C8D';
        
        if (entity.type === 'structure') {
            switch (entity.storeType || entity.subType || entity.type) {
                case 'kiosk':
                    fillColor = '#3498DB'; // Blue for info kiosks
                    strokeColor = '#2980B9';
                    break;
                case 'shop':
                case 'store':
                    fillColor = '#16A085'; // Teal for general stores
                    strokeColor = '#1ABC9C';
                    break;
                case 'electronics':
                    fillColor = '#9B59B6'; // Purple for electronics
                    strokeColor = '#8E44AD';
                    break;
                case 'food':
                    fillColor = '#F1C40F'; // Yellow for food
                    strokeColor = '#F39C12';
                    break;
                case 'fashion':
                    fillColor = '#E74C3C'; // Red for fashion
                    strokeColor = '#C0392B';
                    break;
                case 'faction_hub':
                    fillColor = '#34495E'; // Dark blue for faction areas
                    strokeColor = '#2C3E50';
                    break;
                case 'rest_area':
                    fillColor = '#27AE60'; // Green for rest areas
                    strokeColor = '#2ECC71';
                    break;
            }
        }

        const width = (entity.width || 2) * this.isometric.tileWidth * this.camera.zoom;
        const height = (entity.height || 2) * this.isometric.tileHeight * this.camera.zoom;
        const buildingHeight = (entity.buildingHeight || 2) * this.isometric.tileDepth * this.camera.zoom;
        
        // Draw structure base
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y);
        ctx.closePath();
        ctx.fill();
        
        // Draw structure walls with slightly lighter color
        const lighterFill = this.lightenColor(fillColor, 20);
        ctx.fillStyle = lighterFill;
        
        // Front wall (isometric trapezoid)
        ctx.beginPath();
        ctx.moveTo(screenPos.x - width / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2 - buildingHeight);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        // Side wall (isometric trapezoid) with even lighter color for contrast
        const lighterFill2 = this.lightenColor(fillColor, 40);
        ctx.fillStyle = lighterFill2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y - buildingHeight);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2 - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        // Roof 
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - buildingHeight - height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y - buildingHeight);
        ctx.lineTo(screenPos.x, screenPos.y - buildingHeight + height / 2);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        this.metrics.drawCalls += 4;
    }
    
    /**
     * Render visual effects (particles, weather, etc.)
     */
    renderEffects(ctx) {
        // Get current weather
        const currentWeather = this.engine.weatherSystem?.getCurrentWeather() || 'clear';
        
        // Render weather effects
        switch (currentWeather) {
            case 'rain':
                this.renderRain(ctx);
                break;
            case 'snow':
                this.renderSnow(ctx);
                break;
            case 'storm':
                this.renderRain(ctx);
                this.renderLightning(ctx);
                break;
        }
        
        // Render any active particles or effects
        this.renderParticles(ctx);
    }

    /**
     * Render resource entity (ore nodes, loot crates, etc.)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderResourceEntity(ctx, entity, screenPos) {
        const size = 11 * this.camera.zoom;
        const lw = Math.max(1, this.camera.zoom);

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + size * 0.15, size * 0.55, size * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();

        // Colour by resource type
        let fillColor = '#2ECC71'; // Default green
        const rType = entity.resourceType || entity.resource?.type || '';
        switch (rType) {
            case 'electronics': case 'rare_parts': case 'gadgets':
                fillColor = '#3498DB'; break;
            case 'food': case 'food_samples':
                fillColor = '#F1C40F'; break;
            case 'metal_parts': case 'pipes': case 'tools':
                fillColor = '#95A5A6'; break;
            case 'jewelry': case 'designer_clothes':
                fillColor = '#E67E22'; break;
        }

        // Diamond shape
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(screenPos.x,           screenPos.y - size);
        ctx.lineTo(screenPos.x + size * 0.7, screenPos.y);
        ctx.lineTo(screenPos.x,           screenPos.y + size * 0.5);
        ctx.lineTo(screenPos.x - size * 0.7, screenPos.y);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.adjustBrightness(fillColor, -30);
        ctx.lineWidth = 1.5 * lw;
        ctx.stroke();

        this.metrics.drawCalls += 3;
    }

    /**
     * Render a generic entity as a plain circle indicator
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderDefaultEntity(ctx, entity, screenPos) {
        const size = 10 * this.camera.zoom;

        ctx.fillStyle = '#BDC3C7';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#95A5A6';
        ctx.lineWidth = Math.max(1, this.camera.zoom);
        ctx.stroke();

        this.metrics.drawCalls++;
    }

    /**
     * Render an entity's name as a floating label (debug / interaction hint)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity whose name to display
     * @param {object} screenPos - Screen position of the entity
     */
    renderEntityName(ctx, entity, screenPos) {
        const fontSize = Math.max(10, Math.round(12 * this.camera.zoom));
        const labelY = screenPos.y - 28 * this.camera.zoom;

        ctx.save();
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Soft drop-shadow for readability
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillText(entity.name, screenPos.x + 1, labelY + 1);

        ctx.fillStyle = 'rgba(240, 240, 255, 0.95)';
        ctx.fillText(entity.name, screenPos.x, labelY);

        ctx.restore();
        this.metrics.drawCalls++;
    }

    /**
     * Render rain effect
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderRain(ctx) {
        // In a real implementation, this would render rain particles
        // For now, just draw some simple lines
        
        ctx.strokeStyle = 'rgba(200, 200, 255, 0.7)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const length = 10 + Math.random() * 10;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - length, y + length);
            ctx.stroke();
        }
        
        this.metrics.drawCalls++;
    }
    
    /**
     * Render snow effect
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderSnow(ctx) {
        // In a real implementation, this would render snow particles
        // For now, just draw some simple circles
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            const size = 1 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        this.metrics.drawCalls++;
    }
    
    /**
     * Render lightning effect
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderLightning(ctx) {
        // Check if we have an active lightning effect from weather system
        const lightningActive = this.engine.weatherSystem?.lightningActive || false;
        const lightningIntensity = this.engine.weatherSystem?.lightningIntensity || 0;
        
        // If there's an active lightning effect, flash the screen
        if (lightningActive && lightningIntensity > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${lightningIntensity * 0.3})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.metrics.drawCalls++;
        }
    }
    
    /**
     * Render particles
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderParticles(ctx) {
        // In a real implementation, this would render various particle effects
        // For now, just a placeholder
    }
    
    /**
     * Render debugging grid
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderGrid(ctx) {
        // Get visible grid range
        const screenToWorld = (x, y) => this.screenToWorldPosition(x, y);
        const topLeft = screenToWorld(0, 0);
        const bottomRight = screenToWorld(this.canvas.width, this.canvas.height);
        
        // Expand range to ensure offscreen tiles are rendered
        const expandAmount = 5; // Tiles to expand in each direction
        const minX = Math.floor(topLeft.x) - expandAmount;
        const minY = Math.floor(topLeft.y) - expandAmount;
        const maxX = Math.ceil(bottomRight.x) + expandAmount;
        const maxY = Math.ceil(bottomRight.y) + expandAmount;
        
        // Draw vertical grid lines
        for (let x = minX; x <= maxX; x++) {
            const startPos = this.worldToScreenPosition(x, minY);
            const endPos = this.worldToScreenPosition(x, maxY);
            
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = minY; y <= maxY; y++) {
            const startPos = this.worldToScreenPosition(minX, y);
            const endPos = this.worldToScreenPosition(maxX, y);
            
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(endPos.x, endPos.y);
            ctx.stroke();
        }
        
        this.metrics.drawCalls += (maxX - minX + 1) + (maxY - minY + 1);
    }
    
    /**
     * Render entity colliders for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderColliders(ctx) {
        // Get all entities with colliders
        const entities = this.engine.entityManager?.getAllEntities().filter(e => e.collider) || [];
        
        // Sort entities by layer first
        const sortedEntities = [...entities].sort((a, b) => {
            // Sort by layer
            const layerA = a.collisionLayer || this.layers.characters;
            const layerB = b.collisionLayer || this.layers.characters;
            
            if (layerA !== layerB) {
                return layerA - layerB;
            }
            
            // Then sort by Y position
            return a.position.y - b.position.y;
        });
        
        // Draw each collider
        for (const entity of sortedEntities) {
            const screenPos = this.worldToScreenPosition(entity.position.x, entity.position.y);
            
            // Check if entity is visible on screen
            if (this.isOffscreen(screenPos)) continue;
            
            const width = (entity.collider.width || 1) * this.isometric.tileWidth * this.camera.zoom;
            const height = (entity.collider.height || 1) * this.isometric.tileHeight * this.camera.zoom;
            
            // Apply collider offset if specified
            const offsetX = entity.collider.offset?.x || 0;
            const offsetY = entity.collider.offset?.y || 0;
            
            // Draw isometric collider
            ctx.beginPath();
            ctx.moveTo(screenPos.x + offsetX, screenPos.y + offsetY - height / 2);
            ctx.lineTo(screenPos.x + offsetX + width / 2, screenPos.y + offsetY);
            ctx.lineTo(screenPos.x + offsetX, screenPos.y + offsetY + height / 2);
            ctx.lineTo(screenPos.x + offsetX - width / 2, screenPos.y + offsetY);
            ctx.closePath();
            ctx.stroke();
        }
    }
    
    /**
     * Check if a screen position is off screen
     * @param {object} screenPos - Screen position {x, y}
     * @returns {boolean} - True if position is off screen
     */
    isOffscreen(screenPos) {
        const padding = 100; // Extra padding to account for entity size
        
        return (
            screenPos.x < -padding ||
            screenPos.y < -padding ||
            screenPos.x > this.canvas.width + padding ||
            screenPos.y > this.canvas.height + padding
        );
    }
    
    /**
     * Get current render metrics
     * @returns {object} - Render metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * Set debug rendering options
     * @param {object} options - Debug options to set
     */
    setDebugOptions(options) {
        this.debug = { ...this.debug, ...options };
    }
    
    /**
     * Lighten a color
     * @param {string} hex - Hex color string
     * @param {number} percent - Amount to lighten (0-100)
     * @returns {string} - Lightened color
     */
    lightenColor(hex, percent) {
        // Convert hex to RGB
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);
        
        // Lighten
        r = Math.min(255, Math.floor(r * (1 + percent / 100)));
        g = Math.min(255, Math.floor(g * (1 + percent / 100)));
        b = Math.min(255, Math.floor(b * (1 + percent / 100)));
        
        // Convert back to hex
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    /**
     * Adjust a hex colour's brightness by a fixed amount
     * @param {string} hex - Hex colour string (e.g. '#RRGGBB')
     * @param {number} amount - Positive to lighten, negative to darken (-255 to 255)
     * @returns {string} - Adjusted hex colour
     */
    adjustBrightness(hex, amount) {
        let r = parseInt(hex.substr(1, 2), 16);
        let g = parseInt(hex.substr(3, 2), 16);
        let b = parseInt(hex.substr(5, 2), 16);

        r = Math.max(0, Math.min(255, r + amount));
        g = Math.max(0, Math.min(255, g + amount));
        b = Math.max(0, Math.min(255, b + amount));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
}
