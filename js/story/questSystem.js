/**
 * Manages quest tracking, objectives, and rewards
 */
export class QuestSystem {
    constructor(engine) {
        this.engine = engine;
        
        // Quest collections
        this.allQuests = new Map(); // Stores all quest templates by ID
        this.activeQuests = new Map(); // Quests the player is currently on
        this.completedQuests = new Map(); // Completed quests
        this.failedQuests = new Map(); // Failed quests
        
        // Current quest notifications
        this.questNotifications = [];
    }
    
    /**
     * Initialize quest system
     */
    initialize() {
        console.log('Quest system initialized');
    }
    
    /**
     * Register a quest template
     * @param {object} quest - Quest data object
     */
    registerQuest(quest) {
        if (!quest.id) {
            console.error('Cannot register quest without ID');
            return;
        }
        
        this.allQuests.set(quest.id, quest);
    }
    
    /**
     * Make a registered quest available to the player
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was made available
     */
    makeQuestAvailable(questId) {
        const quest = this.allQuests.get(questId);
        if (!quest) {
            console.error(`Quest ${questId} not found`);
            return false;
        }
        
        // Update status to available
        quest.status = 'available';
        
        // Notify UI of new available quest
        this.queueQuestNotification({
            type: 'new_quest',
            questId: questId,
            title: quest.title
        });
        
        return true;
    }
    
    /**
     * Assign a quest to the player
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was assigned successfully
     */
    assignQuest(questId) {
        // Check if quest exists
        const quest = this.allQuests.get(questId);
        if (!quest) {
            console.error(`Cannot assign quest ${questId}: Quest not found`);
            return false;
        }
        
        // Check if quest is already active
        if (this.activeQuests.has(questId)) {
            console.log(`Quest ${questId} is already active`);
            return false;
        }
        
        // Clone the quest to create an instance for this player
        const questInstance = JSON.parse(JSON.stringify(quest));
        questInstance.status = 'in_progress';
        questInstance.dateStarted = new Date();
        
        // Add to active quests
        this.activeQuests.set(questId, questInstance);
        
        // Notify UI
        this.queueQuestNotification({
            type: 'quest_started',
            questId: questId,
            title: questInstance.title
        });
        
        console.log(`Quest assigned: ${questInstance.title}`);
        return true;
    }
    
    /**
     * Update quest progress
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        // Check for quest objective updates
        this.updateQuestObjectives();
        
        // Check for timed quest status changes
        this.updateQuestTimers(deltaTime);
        
        // Process quest notifications
        this.processQuestNotifications();
    }
    
    /**
     * Update objectives for all active quests
     */
    updateQuestObjectives() {
        this.activeQuests.forEach((quest, questId) => {
            let allObjectivesComplete = true;
            let progress = 0;
            
            // Update each objective
            for (const objective of quest.objectives) {
                if (!objective.completed) {
                    this.updateObjective(quest, objective);
                    allObjectivesComplete = false;
                }
                
                // Calculate progress
                if (objective.completed) {
                    progress += 1;
                } else if (objective.current !== undefined && objective.required !== undefined) {
                    progress += objective.current / objective.required;
                }
            }
            
            // Calculate overall progress percentage
            quest.progress = Math.floor((progress / quest.objectives.length) * 100);
            
            // Check if all objectives are complete
            if (allObjectivesComplete && quest.status !== 'ready_to_complete') {
                this.setQuestReadyToComplete(questId);
            }
        });
    }
    
    /**
     * Update a specific quest objective
     * @param {object} quest - Quest object
     * @param {object} objective - Objective object
     */
    updateObjective(quest, objective) {
        switch (objective.type) {
            case 'collect':
                this.updateCollectionObjective(quest, objective);
                break;
            case 'kill':
                this.updateKillObjective(quest, objective);
                break;
            case 'talk':
                // Talking objectives are updated when the player talks to NPCs
                break;
            case 'location':
                this.updateLocationObjective(quest, objective);
                break;
            case 'escort':
                this.updateEscortObjective(quest, objective);
                break;
            case 'protect':
                this.updateProtectObjective(quest, objective);
                break;
            case 'time':
                // Time objectives are updated in updateQuestTimers
                break;
            default:
                // Unknown objective type
                break;
        }
    }
    
    /**
     * Update a collection objective
     * @param {object} quest - Quest object
     * @param {object} objective - Objective object
     */
    updateCollectionObjective(quest, objective) {
        if (!this.engine.player || !objective.itemId) return;
        
        // Count the items in player inventory
        const itemCount = this.getPlayerItemCount(objective.itemId);
        objective.current = itemCount;
        
        // Check if the objective is complete
        if (itemCount >= objective.required) {
            // Mark as complete but don't take items yet
            // Items will be taken when quest is completed
            objective.completed = true;
            
            this.queueQuestNotification({
                type: 'objective_complete',
                questId: quest.id,
                objective: objective.description
            });
        }
    }
    
    /**
     * Update a kill objective
     * @param {object} quest - Quest object
     * @param {object} objective - Objective object
     */
    updateKillObjective(quest, objective) {
        // Kill objectives are updated when the player kills an entity
        // For now, just keep track of the current count which is updated externally
    }
    
    /**
     * Update a location objective
     * @param {object} quest - Quest object
     * @param {object} objective - Objective object
     */
    updateLocationObjective(quest, objective) {
        if (!this.engine.player || !objective.targetLocation) return;
        
        // Check if player is at the target location
        const playerPos = this.engine.player.position;
        const targetPos = objective.targetLocation;
        const distance = Math.sqrt(
            Math.pow(targetPos.x - playerPos.x, 2) + 
            Math.pow(targetPos.y - playerPos.y, 2)
        );
        
        // If player is close enough to the target
        if (distance <= (objective.radius || 5)) {
            objective.completed = true;
            
            this.queueQuestNotification({
                type: 'objective_complete',
                questId: quest.id,
                objective: objective.description
            });
        }
    }
    
    /**
     * Update an escort objective
     * @param {object} quest - Quest object
     * @param {object} objective - Objective object
     */
    updateEscortObjective(quest, objective) {
        // Escort objectives are complex and involve checking:
        // 1. If the escort NPC is still alive
        // 2. If the escort NPC has reached their destination
        
        // For now, this is just a placeholder
    }
    
    /**
     * Update a protect objective
     * @param {object} quest - Quest object
     * @param {object} objective - Objective object
     */
    updateProtectObjective(quest, objective) {
        // Protect objectives are similar to escort but usually stationary
        // Needs to check if the protected entity/object is still alive/intact
        
        // For now, this is just a placeholder
    }
    
    /**
     * Update quest timers
     * @param {number} deltaTime - Time since last update in seconds
     */
    updateQuestTimers(deltaTime) {
        this.activeQuests.forEach((quest, questId) => {
            // Update time-based objectives
            for (const objective of quest.objectives) {
                if (objective.type === 'time' && !objective.completed) {
                    if (!objective.timeRemaining) {
                        objective.timeRemaining = objective.duration;
                    }
                    
                    objective.timeRemaining -= deltaTime;
                    
                    if (objective.timeRemaining <= 0) {
                        objective.completed = true;
                        
                        this.queueQuestNotification({
                            type: 'objective_complete',
                            questId: quest.id,
                            objective: objective.description
                        });
                    }
                }
            }
            
            // Check for quest expiration
            if (quest.expirationTime) {
                if (!quest.timeRemaining) {
                    quest.timeRemaining = quest.expirationTime;
                }
                
                quest.timeRemaining -= deltaTime;
                
                if (quest.timeRemaining <= 0) {
                    // Quest expired, mark as failed
                    this.failQuest(questId, 'expired');
                }
            }
        });
    }
    
    /**
     * Set a quest as ready to complete
     * @param {string} questId - Quest ID
     */
    setQuestReadyToComplete(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return;
        
        quest.status = 'ready_to_complete';
        
        // Notify UI
        this.queueQuestNotification({
            type: 'quest_ready',
            questId: questId,
            title: quest.title
        });
        
        console.log(`Quest ready to complete: ${quest.title}`);
    }
    
    /**
     * Complete a quest
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was completed successfully
     */
    completeQuest(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) {
            console.error(`Cannot complete quest ${questId}: Quest not found`);
            return false;
        }
        
        // Ensure quest can be completed
        if (quest.status !== 'ready_to_complete') {
            const allComplete = quest.objectives.every(obj => obj.completed);
            if (!allComplete) {
                console.log(`Cannot complete quest ${questId}: Not all objectives are complete`);
                return false;
            }
        }
        
        // Take any required items from player inventory
        for (const objective of quest.objectives) {
            if (objective.type === 'collect' && objective.itemId) {
                // Remove items from player inventory
                this.engine.player.inventory.removeItem(
                    objective.itemId,
                    objective.required
                );
            }
        }
        
        // Award quest rewards
        this.awardQuestRewards(quest);
        
        // Update quest status
        quest.status = 'completed';
        quest.dateCompleted = new Date();
        
        // Move from active to completed
        this.completedQuests.set(questId, quest);
        this.activeQuests.delete(questId);
        
        // Check for follow-up quests
        this.activateFollowupQuest(quest);
        
        // Notify UI
        this.queueQuestNotification({
            type: 'quest_completed',
            questId: questId,
            title: quest.title
        });
        
        console.log(`Quest completed: ${quest.title}`);
        return true;
    }
    
    /**
     * Fail a quest
     * @param {string} questId - Quest ID
     * @param {string} reason - Reason for failure
     * @returns {boolean} - True if quest was failed successfully
     */
    failQuest(questId, reason) {
        const quest = this.activeQuests.get(questId);
        if (!quest) {
            console.error(`Cannot fail quest ${questId}: Quest not found`);
            return false;
        }
        
        // Update quest status
        quest.status = 'failed';
        quest.failReason = reason;
        quest.dateFailed = new Date();
        
        // Move from active to failed
        this.failedQuests.set(questId, quest);
        this.activeQuests.delete(questId);
        
        // Notify UI
        this.queueQuestNotification({
            type: 'quest_failed',
            questId: questId,
            title: quest.title,
            reason: reason
        });
        
        console.log(`Quest failed: ${quest.title} (${reason})`);
        return true;
    }
    
    /**
     * Abandon a quest
     * @param {string} questId - Quest ID
     * @returns {boolean} - True if quest was abandoned successfully
     */
    abandonQuest(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) {
            console.error(`Cannot abandon quest ${questId}: Quest not found`);
            return false;
        }
        
        // Check if quest is abandonable
        if (quest.abandonable === false) {
            console.log(`Cannot abandon quest ${questId}: Quest is not abandonable`);
            return false;
        }
        
        // Update quest status
        quest.status = 'abandoned';
        quest.dateAbandoned = new Date();
        
        // Move from active to failed
        this.failedQuests.set(questId, quest);
        this.activeQuests.delete(questId);
        
        // Notify UI
        this.queueQuestNotification({
            type: 'quest_abandoned',
            questId: questId,
            title: quest.title
        });
        
        console.log(`Quest abandoned: ${quest.title}`);
        return true;
    }
    
    /**
     * Award quest rewards to the player
     * @param {object} quest - Quest object
     */
    awardQuestRewards(quest) {
        if (!quest.rewards || !Array.isArray(quest.rewards)) {
            return;
        }
        
        for (const reward of quest.rewards) {
            switch (reward.type) {
                case 'item':
                    // Give item to player
                    this.engine.givePlayerItem(reward.itemId, reward.amount);
                    break;
                    
                case 'gold':
                    // Give gold to player
                    // Placeholder for now as we don't have currency system yet
                    break;
                    
                case 'exp':
                    // Give experience to player
                    // Placeholder for now as we don't have player leveling yet
                    break;
                    
                case 'reputation':
                    // Increase faction reputation
                    // Placeholder for now
                    break;
                    
                case 'skill':
                    // Increase skill level
                    // Placeholder for now
                    break;
                    
                default:
                    console.log(`Unknown reward type: ${reward.type}`);
            }
        }
    }
    
    /**
     * Activate a follow-up quest
     * @param {object} completedQuest - Completed quest object
     */
    activateFollowupQuest(completedQuest) {
        if (!completedQuest.nextQuestId) {
            return;
        }
        
        // Make the next quest available
        this.makeQuestAvailable(completedQuest.nextQuestId);
    }
    
    /**
     * Queue a quest notification
     * @param {object} notification - Notification object
     */
    queueQuestNotification(notification) {
        this.questNotifications.push(notification);
    }
    
    /**
     * Process queued quest notifications
     */
    processQuestNotifications() {
        while (this.questNotifications.length > 0) {
            const notification = this.questNotifications.shift();
            
            // In a full implementation, we'd show these in the UI
            switch (notification.type) {
                case 'new_quest':
                    console.log(`New quest available: ${notification.title}`);
                    break;
                    
                case 'quest_started':
                    console.log(`Quest started: ${notification.title}`);
                    break;
                    
                case 'objective_complete':
                    console.log(`Objective completed: ${notification.objective}`);
                    break;
                    
                case 'quest_ready':
                    console.log(`Quest ready to complete: ${notification.title}`);
                    break;
                    
                case 'quest_completed':
                    console.log(`Quest completed: ${notification.title}`);
                    break;
                    
                case 'quest_failed':
                    console.log(`Quest failed: ${notification.title} (${notification.reason})`);
                    break;
                    
                case 'quest_abandoned':
                    console.log(`Quest abandoned: ${notification.title}`);
                    break;
            }
        }
    }
    
    /**
     * Get player's item count for specific item
     * @param {string} itemId - Item ID
     * @returns {number} - Item count
     */
    getPlayerItemCount(itemId) {
        // In a full implementation, we would check the player's inventory
        // For now, we'll return a placeholder value
        return 0;
    }
    
    /**
     * Get active quests
     * @returns {Array} - Array of active quests
     */
    getActiveQuests() {
        return Array.from(this.activeQuests.values());
    }
    
    /**
     * Get completed quests
     * @returns {Array} - Array of completed quests
     */
    getCompletedQuests() {
        return Array.from(this.completedQuests.values());
    }
    
    /**
     * Get failed quests
     * @returns {Array} - Array of failed quests
     */
    getFailedQuests() {
        return Array.from(this.failedQuests.values());
    }
    
    /**
     * Get all quests
     * @returns {Array} - Array of all quests
     */
    getAllQuests() {
        return Array.from(this.allQuests.values());
    }
    
    /**
     * Get quests by chapter
     * @param {number} chapter - Chapter number
     * @returns {Array} - Array of quests in the chapter
     */
    getQuestsByChapter(chapter) {
        return Array.from(this.allQuests.values())
            .filter(quest => quest.chapter === chapter);
    }
    
    /**
     * Get quests by story thread
     * @param {string} threadId - Story thread ID
     * @returns {Array} - Array of quests in the thread
     */
    getQuestsByThread(threadId) {
        return Array.from(this.allQuests.values())
            .filter(quest => quest.storyThread === threadId);
    }
    
    /**
     * Get a quest by ID
     * @param {string} questId - Quest ID
     * @returns {object|null} - Quest object or null if not found
     */
    getQuest(questId) {
        // Check active quests first
        if (this.activeQuests.has(questId)) {
            return this.activeQuests.get(questId);
        }
        
        // Then check completed quests
        if (this.completedQuests.has(questId)) {
            return this.completedQuests.get(questId);
        }
        
        // Then check failed quests
        if (this.failedQuests.has(questId)) {
            return this.failedQuests.get(questId);
        }
        
        // Finally check quest templates
        if (this.allQuests.has(questId)) {
            return this.allQuests.get(questId);
        }
        
        return null;
    }
}