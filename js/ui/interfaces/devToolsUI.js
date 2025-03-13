/**
 * Handles developer tools UI functionality
 */
export class DevToolsUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.entityList = document.querySelector('#entity-inspector .entity-list');
        this.entityDetails = document.querySelector('#entity-inspector .entity-details');
        this.worldEditor = document.getElementById('world-editor');
        this.storyDebug = document.getElementById('story-debug');
        this.systemDebug = document.getElementById('system-debug');
        
        // Dev tools state
        this.selectedEntityId = null;
        this.inspectionInterval = null;
    }
    
    /**
     * Update the developer tools UI
     */
    update() {
        this.renderEntityList();
        this.renderWorldEditor();
        this.renderStoryDebug();
        this.renderSystemDebug();
        
        // Set up auto-refresh for entity details
        this.setupEntityInspector();
    }
    
    /**
     * Render the list of entities in the world
     */
    renderEntityList() {
        // Clear existing list
        this.entityList.innerHTML = '';
        
        // Get entities from game engine
        const entities = this.uiManager.game.engine.getAllEntities();
        
        // Sort entities by type
        const sortedEntities = [...entities].sort((a, b) => {
            if (a.type === b.type) {
                return a.name.localeCompare(b.name);
            }
            return a.type.localeCompare(b.type);
        });
        
        // Group entities by type
        const entityGroups = {};
        sortedEntities.forEach(entity => {
            if (!entityGroups[entity.type]) {
                entityGroups[entity.type] = [];
            }
            entityGroups[entity.type].push(entity);
        });
        
        // Create collapsible sections for each entity type
        Object.entries(entityGroups).forEach(([type, entities]) => {
            const groupSection = document.createElement('div');
            groupSection.className = 'entity-group';
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'entity-group-header';
            groupHeader.innerHTML = `
                <span class="group-toggle">▶</span>
                <span class="group-name">${type} (${entities.length})</span>
            `;
            
            // Toggle group expansion
            groupHeader.addEventListener('click', () => {
                const toggle = groupHeader.querySelector('.group-toggle');
                const entityItems = groupSection.querySelector('.entity-items');
                
                if (toggle.textContent === '▶') {
                    toggle.textContent = '▼';
                    entityItems.style.display = 'block';
                } else {
                    toggle.textContent = '▶';
                    entityItems.style.display = 'none';
                }
            });
            
            const entityItems = document.createElement('div');
            entityItems.className = 'entity-items';
            entityItems.style.display = 'none'; // Collapsed by default
            
            // Add entities to the group
            entities.forEach(entity => {
                const entityItem = document.createElement('div');
                entityItem.className = 'entity-item';
                entityItem.dataset.entityId = entity.id;
                entityItem.textContent = entity.name;
                
                // Select entity on click
                entityItem.addEventListener('click', () => {
                    // Remove selected class from all items
                    document.querySelectorAll('.entity-item').forEach(item => {
                        item.classList.remove('selected');
                    });
                    
                    // Add selected class to clicked item
                    entityItem.classList.add('selected');
                    
                    // Show entity details
                    this.selectedEntityId = entity.id;
                    this.showEntityDetails(entity.id);
                });
                
                entityItems.appendChild(entityItem);
            });
            
            groupSection.appendChild(groupHeader);
            groupSection.appendChild(entityItems);
            this.entityList.appendChild(groupSection);
        });
        
        // Expand player group by default
        const playerGroup = this.entityList.querySelector('.entity-group:first-child');
        if (playerGroup) {
            const groupHeader = playerGroup.querySelector('.entity-group-header');
            groupHeader.click();
        }
    }
    
    /**
     * Show details for a specific entity
     * @param {string} entityId - The entity ID
     */
    showEntityDetails(entityId) {
        // Get entity from game engine
        const entity = this.uiManager.game.engine.getEntityById(entityId);
        
        if (!entity) {
            this.entityDetails.innerHTML = '<p>Entity not found</p>';
            return;
        }
        
        // Format entity details based on entity type
        let detailsHTML = `
            <h3>${entity.name}</h3>
            <div class="entity-basic-details">
                <p><strong>ID:</strong> ${entity.id}</p>
                <p><strong>Type:</strong> ${entity.type}</p>
                <p><strong>Position:</strong> X: ${entity.position.x.toFixed(2)}, Y: ${entity.position.y.toFixed(2)}</p>
            </div>
        `;
        
        // Add stats if available
        if (entity.stats) {
            detailsHTML += `
                <div class="entity-stats">
                    <h4>Stats</h4>
                    <table>
                        <tr>
                            <td>Health:</td>
                            <td>${entity.stats.health} / ${entity.stats.maxHealth}</td>
                        </tr>
                        <tr>
                            <td>Energy:</td>
                            <td>${entity.stats.energy} / ${entity.stats.maxEnergy}</td>
                        </tr>
                        <tr>
                            <td>Strength:</td>
                            <td>${entity.stats.strength}</td>
                        </tr>
                        <tr>
                            <td>Dexterity:</td>
                            <td>${entity.stats.dexterity}</td>
                        </tr>
                        <tr>
                            <td>Intelligence:</td>
                            <td>${entity.stats.intelligence}</td>
                        </tr>
                        <tr>
                            <td>Vitality:</td>
                            <td>${entity.stats.vitality}</td>
                        </tr>
                    </table>
                </div>
            `;
        }
        
        // Add inventory if available
        if (entity.inventory) {
            detailsHTML += `
                <div class="entity-inventory">
                    <h4>Inventory (${entity.inventory.items.filter(i => i).length}/${entity.inventory.size})</h4>
                    <div class="inventory-list">
                        ${this.formatInventory(entity.inventory)}
                    </div>
                </div>
            `;
        }
        
        // Add NPC-specific details
        if (entity.type === 'npc') {
            detailsHTML += `
                <div class="npc-brain">
                    <h4>NPC Brain</h4>
                    <div class="brain-details">
                        <p><strong>Current State:</strong> ${entity.brain.currentState}</p>
                        <p><strong>Current Goal:</strong> ${entity.brain.currentGoal || 'None'}</p>
                        <div class="needs-section">
                            <h5>Needs</h5>
                            ${this.formatNeeds(entity.brain.needs)}
                        </div>
                        <div class="routine-section">
                            <h5>Daily Routine</h5>
                            ${this.formatRoutine(entity.brain.routine)}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add developer controls
        detailsHTML += `
            <div class="dev-controls">
                <h4>Developer Controls</h4>
                <div class="control-buttons">
                    <button class="teleport-to-btn">Teleport Player Here</button>
                    <button class="modify-stats-btn">Modify Stats</button>
                    <button class="delete-entity-btn">Delete Entity</button>
                </div>
            </div>
        `;
        
        this.entityDetails.innerHTML = detailsHTML;
        
        // Add event listeners to control buttons
        this.entityDetails.querySelector('.teleport-to-btn').addEventListener('click', () => {
            this.uiManager.game.engine.teleportPlayerTo(entity.position);
            this.uiManager.showNotification(`Teleported to ${entity.name}`, 'info');
        });
        
        this.entityDetails.querySelector('.modify-stats-btn').addEventListener('click', () => {
            this.showStatModifier(entity);
        });
        
        this.entityDetails.querySelector('.delete-entity-btn').addEventListener('click', () => {
            if (entity.type === 'player') {
                this.uiManager.showNotification('Cannot delete player character', 'error');
                return;
            }
            
            if (confirm(`Are you sure you want to delete ${entity.name}?`)) {
                this.uiManager.game.engine.removeEntity(entity.id);
                this.uiManager.showNotification(`Deleted entity: ${entity.name}`, 'info');
                this.selectedEntityId = null;
                this.update();
            }
        });
    }
    
    /**
     * Format inventory for display
     * @param {object} inventory - The inventory object
     * @returns {string} HTML representation of the inventory
     */
    formatInventory(inventory) {
        if (!inventory.items || inventory.items.length === 0) {
            return '<p>No items</p>';
        }
        
        let inventoryHTML = '<ul class="item-list">';
        
        inventory.items.forEach((item, index) => {
            if (!item) return;
            
            inventoryHTML += `
                <li class="inventory-item">
                    ${item.name} ${item.count > 1 ? `(${item.count})` : ''}
                </li>
            `;
        });
        
        inventoryHTML += '</ul>';
        return inventoryHTML;
    }
    
    /**
     * Format NPC needs for display
     * @param {object} needs - The NPC needs object
     * @returns {string} HTML representation of the needs
     */
    formatNeeds(needs) {
        if (!needs) {
            return '<p>No needs data</p>';
        }
        
        let needsHTML = '<div class="needs-bars">';
        
        Object.entries(needs).forEach(([needName, value]) => {
            const percentage = Math.round(value * 100);
            let barColor = '#2ecc71'; // Green
            
            if (percentage < 30) {
                barColor = '#e74c3c'; // Red
            } else if (percentage < 70) {
                barColor = '#f1c40f'; // Yellow
            }
            
            needsHTML += `
                <div class="need-item">
                    <div class="need-label">${needName}</div>
                    <div class="need-bar-container">
                        <div class="need-bar" style="width: ${percentage}%; background-color: ${barColor}"></div>
                    </div>
                    <div class="need-value">${percentage}%</div>
                </div>
            `;
        });
        
        needsHTML += '</div>';
        return needsHTML;
    }
    
    /**
     * Format NPC routine for display
     * @param {object} routine - The NPC routine object
     * @returns {string} HTML representation of the routine
     */
    formatRoutine(routine) {
        if (!routine || !routine.schedule) {
            return '<p>No routine data</p>';
        }
        
        let routineHTML = '<table class="routine-table">';
        routineHTML += `
            <tr>
                <th>Time</th>
                <th>Activity</th>
                <th>Location</th>
            </tr>
        `;
        
        Object.entries(routine.schedule).sort().forEach(([time, activity]) => {
            const [hours, minutes] = time.split(':').map(Number);
            const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            routineHTML += `
                <tr>
                    <td>${formattedTime}</td>
                    <td>${activity.action}</td>
                    <td>${activity.location || 'N/A'}</td>
                </tr>
            `;
        });
        
        routineHTML += '</table>';
        return routineHTML;
    }
    
    /**
     * Show a modal to modify entity stats
     * @param {object} entity - The entity to modify
     */
    showStatModifier(entity) {
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'dev-modal';
        
        // Create modal content
        let modalContent = `
            <div class="dev-modal-header">
                <h3>Modify Stats: ${entity.name}</h3>
                <button class="close-dev-modal">×</button>
            </div>
            <div class="dev-modal-body">
                <form id="modify-stats-form">
        `;
        
        // Add stats inputs
        Object.entries(entity.stats).forEach(([statName, value]) => {
            // Skip derived stats
            if (['attack', 'defense'].includes(statName)) return;
            
            modalContent += `
                <div class="stat-input-group">
                    <label for="stat-${statName}">${statName}:</label>
                    <input type="number" id="stat-${statName}" name="${statName}" value="${value}">
                </div>
            `;
        });
        
        modalContent += `
                    <div class="dev-modal-actions">
                        <button type="button" id="reset-stats-btn">Reset</button>
                        <button type="submit">Apply Changes</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.close-dev-modal').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('#reset-stats-btn').addEventListener('click', () => {
            Object.entries(entity.stats).forEach(([statName, value]) => {
                const input = document.getElementById(`stat-${statName}`);
                if (input) {
                    input.value = value;
                }
            });
        });
        
        modal.querySelector('#modify-stats-form').addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Collect new stat values
            const newStats = {};
            Object.keys(entity.stats).forEach(statName => {
                const input = document.getElementById(`stat-${statName}`);
                if (input) {
                    newStats[statName] = parseInt(input.value);
                } else {
                    newStats[statName] = entity.stats[statName];
                }
            });
            
            // Update entity stats
            this.uiManager.game.engine.updateEntityStats(entity.id, newStats);
            this.uiManager.showNotification(`Updated stats for ${entity.name}`, 'success');
            
            // Close modal
            modal.remove();
        });
    }
    
    /**
     * Render the world editor tab
     */
    renderWorldEditor() {
        const worldInfo = this.uiManager.game.engine.getWorldInfo();
        
        let worldEditorHTML = `
            <div class="world-editor-section">
                <h3>World Information</h3>
                <div class="world-info">
                    <p><strong>Seed:</strong> ${worldInfo.seed}</p>
                    <p><strong>Size:</strong> ${worldInfo.width} x ${worldInfo.height}</p>
                    <p><strong>Regions:</strong> ${worldInfo.regions.length}</p>
                    <p><strong>Current Time:</strong> Day ${worldInfo.time.day}, ${worldInfo.time.hour}:${worldInfo.time.minute.toString().padStart(2, '0')}</p>
                    <p><strong>Season:</strong> ${worldInfo.time.season}</p>
                    <p><strong>Weather:</strong> ${worldInfo.weather.current}</p>
                </div>
                
                <h3>Time Controls</h3>
                <div class="time-controls">
                    <button id="advance-time-btn">Advance Time (1 hour)</button>
                    <button id="next-day-btn">Skip to Next Day</button>
                    <button id="next-season-btn">Skip to Next Season</button>
                </div>
                
                <h3>Weather Controls</h3>
                <div class="weather-controls">
                    <select id="weather-select">
                        <option value="clear">Clear</option>
                        <option value="cloudy">Cloudy</option>
                        <option value="rain">Rain</option>
                        <option value="storm">Storm</option>
                        <option value="snow">Snow</option>
                    </select>
                    <button id="set-weather-btn">Set Weather</button>
                </div>
                
                <h3>Environment</h3>
                <div class="environment-controls">
                    <button id="spawn-npc-btn">Spawn Random NPC</button>
                    <button id="regenerate-region-btn">Regenerate Current Region</button>
                </div>
            </div>
        `;
        
        this.worldEditor.innerHTML = worldEditorHTML;
        
        // Add event listeners
        document.getElementById('advance-time-btn').addEventListener('click', () => {
            this.uiManager.game.engine.advanceTime(1);
            this.update();
        });
        
        document.getElementById('next-day-btn').addEventListener('click', () => {
            this.uiManager.game.engine.advanceTime(24);
            this.update();
        });
        
        document.getElementById('next-season-btn').addEventListener('click', () => {
            this.uiManager.game.engine.advanceTime(24 * 30); // Skip approximately a season
            this.update();
        });
        
        document.getElementById('set-weather-btn').addEventListener('click', () => {
            const weatherType = document.getElementById('weather-select').value;
            this.uiManager.game.engine.setWeather(weatherType);
            this.update();
            this.uiManager.showNotification(`Weather changed to ${weatherType}`, 'info');
        });
        
        document.getElementById('spawn-npc-btn').addEventListener('click', () => {
            const npcId = this.uiManager.game.engine.spawnRandomNPC();
            this.update();
            this.uiManager.showNotification('Random NPC spawned', 'info');
        });
        
        document.getElementById('regenerate-region-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to regenerate the current region? This may cause issues with quests or NPCs in the area.')) {
                this.uiManager.game.engine.regenerateCurrentRegion();
                this.update();
                this.uiManager.showNotification('Current region regenerated', 'info');
            }
        });
    }
    
    /**
     * Render the story debug tab
     */
    renderStoryDebug() {
        const storyState = this.uiManager.game.engine.getStoryState();
        const activeQuests = this.uiManager.game.engine.getActiveQuests();
        const completedQuests = this.uiManager.game.engine.getCompletedQuests();
        const storyFlags = this.uiManager.game.engine.getStoryFlags();
        
        let storyDebugHTML = `
            <div class="story-debug-section">
                <h3>Story State</h3>
                <div class="story-info">
                    <p><strong>Current Chapter:</strong> ${storyState.currentChapter}</p>
                    <p><strong>Main Quest Progress:</strong> ${storyState.mainQuestProgress}%</p>
                </div>
                
                <h3>Active Quests (${activeQuests.length})</h3>
                <div class="quest-list-debug">
                    ${this.formatQuestList(activeQuests)}
                </div>
                
                <h3>Completed Quests (${completedQuests.length})</h3>
                <div class="quest-list-debug">
                    ${this.formatQuestList(completedQuests)}
                </div>
                
                <h3>Story Flags</h3>
                <div class="story-flags">
                    ${this.formatStoryFlags(storyFlags)}
                </div>
                
                <h3>Story Controls</h3>
                <div class="story-controls">
                    <button id="add-quest-btn">Add Random Side Quest</button>
                    <button id="advance-story-btn">Advance Main Story</button>
                    <button id="reset-story-btn">Reset Story Progress</button>
                </div>
            </div>
        `;
        
        this.storyDebug.innerHTML = storyDebugHTML;
        
        // Add event listeners
        document.getElementById('add-quest-btn').addEventListener('click', () => {
            this.uiManager.game.engine.addRandomQuest();
            this.update();
            this.uiManager.showNotification('Random side quest added', 'info');
        });
        
        document.getElementById('advance-story-btn').addEventListener('click', () => {
            this.uiManager.game.engine.advanceMainStory();
            this.update();
            this.uiManager.showNotification('Main story advanced', 'info');
        });
        
        document.getElementById('reset-story-btn').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all story progress? This cannot be undone.')) {
                this.uiManager.game.engine.resetStoryProgress();
                this.update();
                this.uiManager.showNotification('Story progress reset', 'info');
            }
        });
    }
    
    /**
     * Format quest list for display
     * @param {Array} quests - List of quests
     * @returns {string} HTML representation of the quest list
     */
    formatQuestList(quests) {
        if (quests.length === 0) {
            return '<p>No quests</p>';
        }
        
        let questListHTML = '<ul class="quest-debug-list">';
        
        quests.forEach(quest => {
            questListHTML += `
                <li class="quest-debug-item">
                    <span class="quest-debug-title">${quest.title}</span>
                    <span class="quest-debug-type">${quest.isMainQuest ? 'Main' : 'Side'}</span>
                    <span class="quest-debug-progress">${quest.progress}%</span>
                </li>
            `;
        });
        
        questListHTML += '</ul>';
        return questListHTML;
    }
    
    /**
     * Format story flags for display
     * @param {object} flags - Story flags
     * @returns {string} HTML representation of the story flags
     */
    formatStoryFlags(flags) {
        if (Object.keys(flags).length === 0) {
            return '<p>No story flags set</p>';
        }
        
        let flagsHTML = '<table class="story-flags-table">';
        flagsHTML += `
            <tr>
                <th>Flag</th>
                <th>Value</th>
                <th>Actions</th>
            </tr>
        `;
        
        Object.entries(flags).forEach(([flagName, value]) => {
            flagsHTML += `
                <tr>
                    <td>${flagName}</td>
                    <td>${typeof value === 'boolean' ? (value ? 'True' : 'False') : value}</td>
                    <td>
                        <button class="toggle-flag-btn" data-flag="${flagName}">Toggle</button>
                    </td>
                </tr>
            `;
        });
        
        flagsHTML += '</table>';
        
        return flagsHTML;
    }
    
    /**
     * Render the system debug tab
     */
    renderSystemDebug() {
        const systemStats = this.uiManager.game.engine.getSystemStats();
        
        let systemDebugHTML = `
            <div class="system-debug-section">
                <h3>System Statistics</h3>
                <div class="system-stats">
                    <p><strong>FPS:</strong> <span id="fps-counter">${systemStats.fps.toFixed(1)}</span></p>
                    <p><strong>Active Entities:</strong> ${systemStats.entityCount}</p>
                    <p><strong>Memory Usage:</strong> ${(systemStats.memoryUsage / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Engine Uptime:</strong> ${this.formatTime(systemStats.uptime)}</p>
                </div>
                
                <h3>Performance</h3>
                <div class="performance-charts">
                    <div class="chart-container">
                        <canvas id="fps-chart" width="400" height="200"></canvas>
                    </div>
                </div>
                
                <h3>Debug Options</h3>
                <div class="debug-options">
                    <div class="debug-option">
                        <input type="checkbox" id="show-collision-boxes" ${systemStats.debugOptions.showCollisionBoxes ? 'checked' : ''}>
                        <label for="show-collision-boxes">Show Collision Boxes</label>
                    </div>
                    <div class="debug-option">
                        <input type="checkbox" id="show-path-finding" ${systemStats.debugOptions.showPathFinding ? 'checked' : ''}>
                        <label for="show-path-finding">Show Path Finding</label>
                    </div>
                    <div class="debug-option">
                        <input type="checkbox" id="show-npc-states" ${systemStats.debugOptions.showNPCStates ? 'checked' : ''}>
                        <label for="show-npc-states">Show NPC States</label>
                    </div>
                </div>
                
                <h3>System Actions</h3>
                <div class="system-actions">
                    <button id="clear-cache-btn">Clear Cache</button>
                    <button id="save-game-btn">Force Save Game</button>
                    <button id="toggle-god-mode-btn">Toggle God Mode</button>
                </div>
            </div>
        `;
        
        this.systemDebug.innerHTML = systemDebugHTML;
        
        // Add event listeners
        document.getElementById('show-collision-boxes').addEventListener('change', (e) => {
            this.uiManager.game.engine.setDebugOption('showCollisionBoxes', e.target.checked);
        });
        
        document.getElementById('show-path-finding').addEventListener('change', (e) => {
            this.uiManager.game.engine.setDebugOption('showPathFinding', e.target.checked);
        });
        
        document.getElementById('show-npc-states').addEventListener('change', (e) => {
            this.uiManager.game.engine.setDebugOption('showNPCStates', e.target.checked);
        });
        
        document.getElementById('clear-cache-btn').addEventListener('click', () => {
            this.uiManager.game.engine.clearCache();
            this.uiManager.showNotification('Cache cleared', 'info');
        });
        
        document.getElementById('save-game-btn').addEventListener('click', () => {
            this.uiManager.game.engine.saveGame();
            this.uiManager.showNotification('Game saved', 'success');
        });
        
        document.getElementById('toggle-god-mode-btn').addEventListener('click', () => {
            const isGodMode = this.uiManager.game.engine.toggleGodMode();
            this.uiManager.showNotification(isGodMode ? 'God Mode enabled' : 'God Mode disabled', 'info');
        });
    }
    
    /**
     * Format time in seconds to a readable format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    /**
     * Set up auto-refresh for entity inspector
     */
    setupEntityInspector() {
        // Clear existing interval
        if (this.inspectionInterval) {
            clearInterval(this.inspectionInterval);
        }
        
        // Refresh entity details every second
        this.inspectionInterval = setInterval(() => {
            if (this.selectedEntityId) {
                this.showEntityDetails(this.selectedEntityId);
            }
        }, 1000);
    }
}

