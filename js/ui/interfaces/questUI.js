/**
 * Handles quest UI functionality
 */
export class QuestUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.questModal = document.getElementById('quest-modal');
        this.questList = document.querySelector('.quest-list');
        this.questDetails = document.querySelector('.quest-details');
        
        // Quest state
        this.selectedQuestId = null;
    }
    
    /**
     * Update the quest display
     */
    update() {
        this.renderQuestList();
        
        // If a quest was previously selected, try to select it again
        if (this.selectedQuestId) {
            const questElement = document.querySelector(`[data-quest-id="${this.selectedQuestId}"]`);
            if (questElement) {
                questElement.click();
            } else {
                this.questDetails.innerHTML = '<p>Select a quest to view details</p>';
            }
        } else {
            this.questDetails.innerHTML = '<p>Select a quest to view details</p>';
        }
    }
    
    /**
     * Render the list of active quests
     */
    renderQuestList() {
        // Clear existing quest list
        this.questList.innerHTML = '';
        
        // Get active quests from game engine
        const activeQuests = this.uiManager.game.engine.getActiveQuests();
        
        if (activeQuests.length === 0) {
            this.questList.innerHTML = '<p>No active quests</p>';
            return;
        }
        
        // Create a list item for each quest
        activeQuests.forEach(quest => {
            const questItem = document.createElement('div');
            questItem.className = 'quest-item';
            questItem.dataset.questId = quest.id;
            
            // Add quest status indicator
            const statusClass = this.getQuestStatusClass(quest.status);
            
            questItem.innerHTML = `
                <div class="quest-status ${statusClass}"></div>
                <div class="quest-item-content">
                    <h4 class="quest-title">${quest.title}</h4>
                    <p class="quest-source">From: ${quest.giver}</p>
                </div>
            `;
            
            // Add click event to show quest details
            questItem.addEventListener('click', () => {
                // Remove active class from all quest items
                document.querySelectorAll('.quest-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Add active class to clicked item
                questItem.classList.add('active');
                
                // Show quest details
                this.selectedQuestId = quest.id;
                this.showQuestDetails(quest);
            });
            
            this.questList.appendChild(questItem);
        });
    }
    
    /**
     * Show details for a specific quest
     * @param {object} quest - The quest data
     */
    showQuestDetails(quest) {
        // Format quest objectives
        const objectivesHTML = quest.objectives.map(objective => {
            const isComplete = objective.completed;
            const checkmark = isComplete ? '✓' : '○';
            const statusClass = isComplete ? 'complete' : 'incomplete';
            
            let progressText = '';
            if (objective.type === 'collect' || objective.type === 'kill') {
                progressText = ` (${objective.current}/${objective.required})`;
            }
            
            return `
                <div class="objective ${statusClass}">
                    <span class="objective-check">${checkmark}</span>
                    <span class="objective-text">${objective.description}${progressText}</span>
                </div>
            `;
        }).join('');
        
        // Format rewards
        const rewardsHTML = quest.rewards.map(reward => {
            let rewardText = '';
            
            switch (reward.type) {
                case 'item':
                    rewardText = `${reward.amount}x ${reward.name}`;
                    break;
                case 'gold':
                    rewardText = `${reward.amount} gold`;
                    break;
                case 'exp':
                    rewardText = `${reward.amount} experience`;
                    break;
            }
            
            return `<div class="reward-item">${rewardText}</div>`;
        }).join('');
        
        // Create quest details HTML
        const questDetailsHTML = `
            <h3>${quest.title}</h3>
            <div class="quest-description">${quest.description}</div>
            
            <h4>Objectives:</h4>
            <div class="quest-objectives">
                ${objectivesHTML}
            </div>
            
            <h4>Rewards:</h4>
            <div class="quest-rewards">
                ${rewardsHTML}
            </div>
            
            <div class="quest-location">
                <h4>Location:</h4>
                <p>${quest.location}</p>
            </div>
        `;
        
        // Add abandon quest button if the quest is abandonable
        if (quest.abandonable) {
            const abandonButtonHTML = `
                <button id="abandon-quest-btn" class="abandon-quest">Abandon Quest</button>
            `;
            
            this.questDetails.innerHTML = questDetailsHTML + abandonButtonHTML;
            
            // Add event listener to abandon button
            document.getElementById('abandon-quest-btn').addEventListener('click', () => {
                // Show confirmation dialog
                if (confirm(`Are you sure you want to abandon the quest "${quest.title}"?`)) {
                    this.uiManager.game.engine.abandonQuest(quest.id);
                    this.update();
                    this.uiManager.showNotification(`Abandoned quest: ${quest.title}`, 'info');
                }
            });
        } else {
            this.questDetails.innerHTML = questDetailsHTML;
        }
    }
    
    /**
     * Get the CSS class for a quest status
     * @param {string} status - The quest status
     * @returns {string} CSS class for the status
     */
    getQuestStatusClass(status) {
        switch (status) {
            case 'in_progress':
                return 'in-progress';
            case 'ready_to_complete':
                return 'ready-complete';
            case 'completed':
                return 'completed';
            default:
                return 'in-progress';
        }
    }
}

