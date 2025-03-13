/**
 * Handles dialogue UI functionality
 */
export class DialogueUI {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.dialogueModal = document.getElementById('dialogue-modal');
        this.npcPortrait = document.querySelector('.npc-portrait');
        this.npcName = document.querySelector('.npc-name');
        this.dialogueText = document.querySelector('.dialogue-text');
        this.dialogueOptions = document.querySelector('.dialogue-options');
        
        // Dialogue state
        this.currentDialogue = null;
        this.currentNPC = null;
    }
    
    /**
     * Show dialogue with an NPC
     * @param {object} dialogueData - Dialogue data containing NPC info and dialogue
     */
    showDialogue(dialogueData) {
        this.currentDialogue = dialogueData.dialogue;
        this.currentNPC = dialogueData.npc;
        
        // Set NPC info
        this.npcName.textContent = this.currentNPC.name;
        this.setNPCPortrait(this.currentNPC);
        
        // Show initial dialogue
        this.showDialogueNode(this.currentDialogue.initial);
    }
    
    /**
     * Show a specific dialogue node
     * @param {string} nodeId - The ID of the dialogue node to show
     */
    showDialogueNode(nodeId) {
        const node = this.currentDialogue.nodes[nodeId];
        
        if (!node) {
            console.error(`Dialogue node ${nodeId} not found`);
            return;
        }
        
        // Set the dialogue text
        this.dialogueText.textContent = node.text;
        
        // Clear previous options
        this.dialogueOptions.innerHTML = '';
        
        // Add options
        if (node.options && node.options.length > 0) {
            node.options.forEach(option => {
                const optionButton = document.createElement('button');
                optionButton.className = 'dialogue-option-btn';
                optionButton.textContent = option.text;
                
                optionButton.addEventListener('click', () => {
                    // Handle option action
                    if (option.action) {
                        this.handleDialogueAction(option.action);
                    }
                    
                    // Go to next node if specified
                    if (option.next) {
                        this.showDialogueNode(option.next);
                    } else {
                        // No next node, close dialogue
                        this.closeDialogue();
                    }
                });
                
                this.dialogueOptions.appendChild(optionButton);
            });
        } else {
            // No options, add a continue/close button
            const continueButton = document.createElement('button');
            continueButton.className = 'dialogue-option-btn';
            continueButton.textContent = 'Continue';
            
            continueButton.addEventListener('click', () => {
                this.closeDialogue();
            });
            
            this.dialogueOptions.appendChild(continueButton);
        }
    }
    
    /**
     * Handle a dialogue action
     * @param {object} action - The action to perform
     */
    handleDialogueAction(action) {
        switch (action.type) {
            case 'give_quest':
                this.uiManager.game.engine.giveQuest(action.questId);
                this.uiManager.showNotification(`New quest: ${action.questName}`, 'success');
                break;
                
            case 'complete_quest':
                this.uiManager.game.engine.completeQuest(action.questId);
                this.uiManager.showNotification(`Quest completed: ${action.questName}`, 'success');
                break;
                
            case 'give_item':
                this.uiManager.game.engine.givePlayerItem(action.itemId, action.count || 1);
                this.uiManager.showNotification(`Received: ${action.itemName}`, 'success');
                break;
                
            case 'take_item':
                this.uiManager.game.engine.takePlayerItem(action.itemId, action.count || 1);
                this.uiManager.showNotification(`Gave: ${action.itemName}`, 'info');
                break;
                
            case 'trade':
                this.closeDialogue();
                this.uiManager.showTrading(this.currentNPC);
                break;
                
            case 'set_flag':
                this.uiManager.game.engine.setStoryFlag(action.flag, action.value);
                break;
                
            default:
                console.warn(`Unknown dialogue action type: ${action.type}`);
        }
    }
    
    /**
     * Close the dialogue
     */
    closeDialogue() {
        this.dialogueModal.classList.add('hidden');
        this.uiManager.activeModal = null;
        this.currentDialogue = null;
        this.currentNPC = null;
    }
    
    /**
     * Set the NPC portrait based on NPC data
     * @param {object} npc - The NPC data
     */
    setNPCPortrait(npc) {
        // In a real implementation, this would use actual character portraits
        // For now, we'll use a placeholder based on NPC type
        
        const portraitColor = this.getNPCTypeColor(npc.type);
        
        this.npcPortrait.style.backgroundColor = portraitColor;
        this.npcPortrait.innerHTML = `
            <div style="font-size: 32px; text-align: center; line-height: 100px;">
                ${this.getNPCTypeIcon(npc.type)}
            </div>
        `;
    }
    
    /**
     * Get an icon for an NPC type
     * @param {string} type - The NPC type
     * @returns {string} An emoji icon representing the NPC type
     */
    getNPCTypeIcon(type) {
        const iconMap = {
            'merchant': '💰',
            'quest_giver': '❗',
            'villager': '👤',
            'guard': '🛡️',
            'enemy': '👿',
            'craftsman': '⚒️',
            'farmer': '🌾'
        };
        
        return iconMap[type] || '👤';
    }
    
    /**
     * Get a color for an NPC type
     * @param {string} type - The NPC type
     * @returns {string} A CSS color value
     */
    getNPCTypeColor(type) {
        const colorMap = {
            'merchant': '#9b59b6', // Purple
            'quest_giver': '#f1c40f', // Yellow
            'villager': '#3498db', // Blue
            'guard': '#7f8c8d', // Gray
            'enemy': '#e74c3c', // Red
            'craftsman': '#e67e22', // Orange
            'farmer': '#2ecc71'  // Green
        };
        
        return colorMap[type] || '#3498db';
    }
}

