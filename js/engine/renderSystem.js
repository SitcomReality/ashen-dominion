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
     * Reset camera to default position
     */
    resetCamera() {
        this.camera.x = 0;
        this.camera.y = 0;
        this.camera.zoom = 1;
        this.camera.targetZoom = 1;
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
            return;
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
     * Render the background (sky, distant features)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderBackground(ctx) {
        // Get time of day for sky color
        const timeData = this.engine.timeManager?.getCurrentTime();
        const isDaytime = timeData?.isDaytime ?? true;
        
        // Get weather for sky effects
        const currentWeather = this.engine.weatherSystem?.getCurrentWeather() ?? 'clear';
        
        // Render cyberpunk sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height * 0.5);
        
        if (isDaytime) {
            // Daytime cyberpunk sky
            skyGradient.addColorStop(0, '#0a1721'); // Dark blue
            skyGradient.addColorStop(0.5, '#193852'); // Mid blue
            skyGradient.addColorStop(1, '#621c49'); // Purple tint
        } else {
            // Night cyberpunk sky
            skyGradient.addColorStop(0, '#0C1445'); // Dark blue
            skyGradient.addColorStop(0.5, '#243165'); // Medium blue
            skyGradient.addColorStop(1, '#5e1b35'); // Deep red
        }
        
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height * 0.5);
        this.metrics.drawCalls++;
        
        // Draw distant department store ceiling structures
        this.renderDistantStructures(ctx);
    }
    
    /**
     * Render distant ceiling structures
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderDistantStructures(ctx) {
        // Draw ceiling lights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 12; i++) {
            const x = this.canvas.width * (i / 12);
            const y = this.canvas.height * 0.2;
            const width = 10;
            const height = 40;
            
            ctx.fillRect(x - width/2, y - height/2, width, height);
        }
        
        // Draw distant air ducts
        ctx.fillStyle = '#344';
        ctx.fillRect(this.canvas.width * 0.2, this.canvas.height * 0.1, 100, 20);
        ctx.fillRect(this.canvas.width * 0.7, this.canvas.height * 0.15, 80, 15);
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render the terrain (ground tiles)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderTerrain(ctx) {
        // Get current region
        const currentRegion = this.engine.worldManager?.getCurrentRegion();
        if (!currentRegion) return;
        
        // Get world data
        const worldData = this.engine.worldManager.worldData;
        if (!worldData) return;
        
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
     * Get tile type based on world coordinates
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {string} - Tile type
     */
    getTileType(x, y) {
        // Try to get biome data from world data
        const worldData = this.engine.worldManager?.worldData;
        if (!worldData || !worldData.regions) {
            // Fallback to checkerboard if no world data
            return (x + y) % 2 === 0 ? 'grass' : 'dirt';
        }
        
        // Find the region containing this position
        const region = worldData.regions.find(r => 
            x >= r.x && x < (r.x + r.width) && 
            y >= r.y && y < (r.y + r.height)
        );
        
        if (!region) {
            // Outside of any defined region
            return 'stone';
        }
        
        // Different tile types based on biome
        switch (region.biome) {
            case 'MallPlaza':
                return 'grass';
            case 'ElectronicsDept':
                return (x + y) % 2 === 0 ? 'dirt' : 'stone';
            case 'Storage':
                return 'stone';
            case 'FoodCourt':
                return (x + y) % 3 === 0 ? 'grass' : 'dirt';
            case 'Restricted':
                return 'water';
            case 'LuxuryDept':
                return (x + y) % 2 === 0 ? 'grass' : 'sand';
            case 'MaintenanceTunnels':
                return 'stone';
            default:
                return (x + y) % 2 === 0 ? 'grass' : 'dirt';
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
        
        // Get screen position for tile
        const screenPos = this.worldToScreenPosition(x, y);
        
        // Render tile
        const tileWidth = this.isometric.tileWidth * this.camera.zoom;
        const tileHeight = this.isometric.tileHeight * this.camera.zoom;
        
        // Set tile color based on type
        switch (tileType) {
            case 'grass':
                ctx.fillStyle = '#7CBA35';
                break;
            case 'dirt':
                ctx.fillStyle = '#A97642';
                break;
            case 'sand':
                ctx.fillStyle = '#E5D19A';
                break;
            case 'water':
                ctx.fillStyle = '#4A99D5';
                break;
            case 'stone':
                ctx.fillStyle = '#8A8A8A';
                break;
            default:
                ctx.fillStyle = '#7CBA35'; // Default to grass
        }
        
        // Draw isometric tile
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - tileHeight / 2);
        ctx.lineTo(screenPos.x + tileWidth / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + tileHeight / 2);
        ctx.lineTo(screenPos.x - tileWidth / 2, screenPos.y);
        ctx.closePath();
        ctx.fill();
        
        // Add tile border for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        this.metrics.drawCalls++;
    }
    
    /**
     * Render all entities
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
        // In a real implementation, this would render the player sprite
        // For now, just draw a colorful circle
        
        const size = 20 * this.camera.zoom;
        
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
        
        // Draw player
        ctx.fillStyle = '#E74C3C'; // Red
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y - size * 0.5, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#C0392B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render NPC entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderNPCEntity(ctx, entity, screenPos) {
        // In a real implementation, this would render the NPC sprite
        // For now, just draw a colorful circle with different colors for NPC types
        
        const size = 16 * this.camera.zoom;
        
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
        
        // Set color based on NPC type
        let fillColor = '#3498DB'; // Default blue
        let strokeColor = '#2980B9';
        
        if (entity.brain && entity.brain.type) {
            switch (entity.brain.type) {
                case 'villager':
                    fillColor = '#3498DB'; // Blue
                    strokeColor = '#2980B9';
                    break;
                case 'merchant':
                    fillColor = '#9B59B6'; // Purple
                    strokeColor = '#8E44AD';
                    break;
                case 'guard':
                    fillColor = '#7F8C8D'; // Gray
                    strokeColor = '#6C7A89';
                    break;
                case 'enemy':
                    fillColor = '#E74C3C'; // Red
                    strokeColor = '#C0392B';
                    break;
            }
        }
        
        // Draw NPC
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y - size * 0.5, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        this.metrics.drawCalls += 2;
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
        // In a real implementation, this would render the structure sprite
        // For now, just draw a simple building
        
        const width = (entity.width || 2) * this.isometric.tileWidth * this.camera.zoom;
        const height = (entity.height || 2) * this.isometric.tileHeight * this.camera.zoom;
        const buildingHeight = (entity.buildingHeight || 2) * this.isometric.tileDepth * this.camera.zoom;
        
        // Draw structure base
        ctx.fillStyle = '#95A5A6'; // Concrete color
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y);
        ctx.closePath();
        ctx.fill();
        
        // Draw structure walls
        ctx.fillStyle = '#BDC3C7'; // Light gray
        
        // Front wall (isometric trapezoid)
        ctx.beginPath();
        ctx.moveTo(screenPos.x - width / 2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2 - buildingHeight);
        ctx.lineTo(screenPos.x - width / 2, screenPos.y - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        // Side wall (isometric trapezoid)
        ctx.fillStyle = '#ECF0F1'; // Lighter gray for side
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y + height / 2);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y);
        ctx.lineTo(screenPos.x + width / 2, screenPos.y - buildingHeight);
        ctx.lineTo(screenPos.x, screenPos.y + height / 2 - buildingHeight);
        ctx.closePath();
        ctx.fill();
        
        // Roof (isometric diamond)
        ctx.fillStyle = '#E74C3C'; // Red roof
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
     * Render resource entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderResourceEntity(ctx, entity, screenPos) {
        // In a real implementation, this would render the resource sprite
        // For now, draw based on resource type
        
        const size = 15 * this.camera.zoom;
        
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
        
        // Set color based on resource type
        let fillColor = '#2ECC71'; // Default green
        let shape = 'circle';
        
        if (entity.resourceType) {
            switch (entity.resourceType) {
                case 'tree':
                    fillColor = '#27AE60'; // Green
                    shape = 'tree';
                    break;
                case 'rock':
                    fillColor = '#7F8C8D'; // Gray
                    shape = 'pentagon';
                    break;
                case 'ore':
                    fillColor = '#E67E22'; // Orange
                    shape = 'pentagon';
                    break;
                case 'herb':
                    fillColor = '#2ECC71'; // Green
                    shape = 'star';
                    break;
                case 'berry_bush':
                    fillColor = '#9B59B6'; // Purple
                    shape = 'bush';
                    break;
            }
        }
        
        // Draw resource based on shape
        ctx.fillStyle = fillColor;
        
        switch (shape) {
            case 'tree':
                // Draw a simple tree
                // Trunk
                ctx.fillStyle = '#8B4513'; // Brown
                ctx.fillRect(screenPos.x - size * 0.2, screenPos.y - size, size * 0.4, size);
                
                // Foliage
                ctx.fillStyle = '#27AE60'; // Green
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y - size * 1.5, size, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'pentagon':
                // Draw a pentagon
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = (Math.PI * 2 * i / 5) - Math.PI / 2;
                    const x = screenPos.x + Math.cos(angle) * size;
                    const y = (screenPos.y - size * 0.5) + Math.sin(angle) * size;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'star':
                // Draw a simple star-like shape
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const outerAngle = (Math.PI * 2 * i / 5) - Math.PI / 2;
                    const innerAngle = outerAngle + Math.PI / 5;
                    
                    const outerX = screenPos.x + Math.cos(outerAngle) * size;
                    const outerY = (screenPos.y - size * 0.5) + Math.sin(outerAngle) * size;
                    const innerX = screenPos.x + Math.cos(innerAngle) * (size * 0.4);
                    const innerY = (screenPos.y - size * 0.5) + Math.sin(innerAngle) * (size * 0.4);
                    
                    if (i === 0) {
                        ctx.moveTo(outerX, outerY);
                    } else {
                        ctx.lineTo(outerX, outerY);
                    }
                    
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'bush':
                // Draw a simple bush
                for (let i = 0; i < 3; i++) {
                    const offsetX = (i - 1) * size * 0.5;
                    ctx.beginPath();
                    ctx.arc(screenPos.x + offsetX, screenPos.y - size * 0.7, size * 0.6, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
                
            case 'circle':
            default:
                // Draw a circle
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y - size * 0.5, size, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render default entity
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render
     * @param {object} screenPos - Screen position
     */
    renderDefaultEntity(ctx, entity, screenPos) {
        // Draw a simple square for any other entity type
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
        
        // Draw entity
        ctx.fillStyle = '#3498DB'; // Blue
        ctx.fillRect(screenPos.x - size, screenPos.y - size, size * 2, size * 2);
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render entity name for debugging
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     * @param {object} entity - Entity to render name for
     * @param {object} screenPos - Screen position
     */
    renderEntityName(ctx, entity, screenPos) {
        const name = entity.name || entity.id || 'Unknown';
        
        ctx.font = `${12 * this.camera.zoom}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        // Draw text background
        const textWidth = ctx.measureText(name).width;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(
            screenPos.x - textWidth / 2 - 2,
            screenPos.y - 30 * this.camera.zoom,
            textWidth + 4,
            16 * this.camera.zoom
        );
        
        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(name, screenPos.x, screenPos.y - 15 * this.camera.zoom);
        
        this.metrics.drawCalls += 2;
    }
    
    /**
     * Render visual effects (particles, weather, etc.)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
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
        // In a real implementation, this would flash the screen
        // when lightning strikes
        
        // Check if we have an active lightning effect from weather system
        const lightningActive = this.engine.weatherSystem?.lightningActive || false;
        const lightningIntensity = this.engine.weatherSystem?.lightningIntensity || 0;
        
        if (lightningActive && lightningIntensity > 0) {
            // Draw lightning flash
            ctx.fillStyle = `rgba(255, 255, 255, ${lightningIntensity * 0.3})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.metrics.drawCalls++;
        }
    }
    
    /**
     * Render particle effects
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
        
        const minX = Math.floor(topLeft.x);
        const minY = Math.floor(topLeft.y);
        const maxX = Math.ceil(bottomRight.x);
        const maxY = Math.ceil(bottomRight.y);
        
        // Set grid style
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        
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
        
        // Set collider style
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        
        // Draw each collider
        for (const entity of entities) {
            const screenPos = this.worldToScreenPosition(entity.position.x, entity.position.y);
            
            // Check if entity is visible on screen
            if (this.isOffscreen(screenPos)) continue;
            
            const width = (entity.collider.width || 1) * this.isometric.tileWidth * this.camera.zoom;
            const height = (entity.collider.height || 1) * this.isometric.tileHeight * this.camera.zoom;
            
            // Apply collider offset if specified
            const offsetX = (entity.collider.offset?.x || 0) * this.isometric.tileWidth * this.camera.zoom;
            const offsetY = (entity.collider.offset?.y || 0) * this.isometric.tileHeight * this.camera.zoom;
            
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
}