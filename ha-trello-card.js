// Trello Board Card v1.3.7
// Home Assistant custom card for displaying Trello boards with drag & drop functionality
// Author: Sebastian Zabel
// https://github.com/SebastianZ84/ha-trello-card

class TrelloBoardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isEditing = false;
    this._scrollPosition = 0;
    this._lastRenderData = null;
  }

  setConfig(config) {
    this.config = config;
    this._validateConfig(config);
    this.render();
  }

  _validateConfig(config) {
    if (!config.entity_id && !config.board_id) {
      throw new Error('entity_id or board_id is required');
    }
    
    // Set defaults for styling - safely handle undefined styles
    const userStyles = config.styles || {};
    
    this.config = {
      show_header: true,
      show_card_counts: true,
      card_background: '',
      card_transparency: 1,
      ...config,
      styles: {
        card: {},
        board_container: {},
        board_header: {},
        board_title: {},
        list_column: {},
        list_header: {},
        list_title: {},
        card_count: {},
        trello_card: {},
        card_title: {},
        card_description: {},
        add_card_btn: {},
        ...userStyles
      }
    };
  }

  set hass(hass) {
    const oldHass = this._hass;
    this._hass = hass;
    
    if (this.config) {
      // Don't re-render if we're currently editing
      if (this._isEditing) {
        console.log('[Trello Card] Skipping render - currently editing');
        return;
      }
      
      // Check if any card is in editing mode in the DOM
      const editingCard = this.shadowRoot?.querySelector('.trello-card.editing');
      if (editingCard) {
        console.log('[Trello Card] Skipping render - found editing card in DOM');
        return;
      }
      
      // Only re-render if board data actually changed
      // Use the same logic as render() - check entity_id first, then board_id
      let newBoardData;
      if (this.config.entity_id) {
        console.log('[Trello Card] Using entity_id:', this.config.entity_id);
        newBoardData = this._getBoardDataByEntityId(this.config.entity_id);
      } else if (this.config.board_id) {
        newBoardData = this._getBoardData(this.config.board_id);
      }
      
      if (this._hasDataChanged(newBoardData)) {
        console.log('[Trello Card] Data changed, full render');
        // Save scroll position before render
        this._saveScrollPosition();
        this.render();
        // Restore scroll position after render
        setTimeout(() => this._restoreScrollPosition(), 10);
      }
      // Remove the else clause completely to stop the infinite loop
    }
  }

  _formatDescription(desc) {
    if (!desc) return '';
    
    // Handle different types of line breaks
    return desc
      .replace(/\r\n/g, '<br>')  // Windows line breaks
      .replace(/\n/g, '<br>')    // Unix line breaks
      .replace(/\r/g, '<br>');   // Mac line breaks
  }

  _hasDataChanged(newBoardData) {
    if (!this._lastRenderData && newBoardData) {
      console.log('[Trello Card] First render');
      return true; // First render
    }
    
    if (!newBoardData) {
      console.log('[Trello Card] Board disappeared - no board data found');
      console.log('[Trello Card] Config used:', this.config);
      console.log('[Trello Card] Has hass:', !!this._hass);
      
      // Show all available board entities for debugging
      if (this._hass && this._hass.states) {
        const boardEntities = Object.keys(this._hass.states)
          .filter(id => {
            const entity = this._hass.states[id];
            return entity.attributes.board_data || entity.attributes.board_id || id.includes('trello');
          })
          .map(id => ({
            entity_id: id,
            state: this._hass.states[id].state,
            attributes: Object.keys(this._hass.states[id].attributes),
            has_board_data: !!this._hass.states[id].attributes.board_data,
            has_board_id: !!this._hass.states[id].attributes.board_id
          }));
        console.log('[Trello Card] Available board entities:', boardEntities);
        
        // Specifically check the requested entity
        if (this.config.entity_id && this._hass.states[this.config.entity_id]) {
          console.log(`[Trello Card] Requested entity ${this.config.entity_id} EXISTS:`, this._hass.states[this.config.entity_id]);
        } else if (this.config.entity_id) {
          console.log(`[Trello Card] Requested entity ${this.config.entity_id} NOT FOUND`);
        }
      }
      
      return this._lastRenderData !== null; // Board disappeared
    }
    
    if (!this._lastRenderData) {
      console.log('[Trello Card] No previous data to compare');
      return true;
    }
    
    // More robust comparison - ignore timestamp-like fields that might change
    const normalizeData = (data) => {
      if (!data) return null;
      
      // Create a normalized copy
      const normalized = JSON.parse(JSON.stringify(data));
      
      // Recursively remove timestamp-like properties that cause unnecessary re-renders
      const removeTimestamps = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;
        
        for (const key in obj) {
          if (key.includes('last_') || key.includes('updated_') || key.includes('timestamp')) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            removeTimestamps(obj[key]);
          }
        }
        return obj;
      };
      
      return removeTimestamps(normalized);
    };
    
    const newDataString = JSON.stringify(normalizeData(newBoardData));
    const oldDataString = JSON.stringify(normalizeData(this._lastRenderData));
    
    const hasChanged = newDataString !== oldDataString;
    
    if (hasChanged) {
      console.log('[Trello Card] Data changed, re-rendering');
    } else {
      console.log('[Trello Card] Data unchanged, skipping render');
    }
    
    return hasChanged;
  }

  _saveScrollPosition() {
    const boardLists = this.shadowRoot?.querySelector('.board-lists');
    if (boardLists) {
      this._scrollPosition = boardLists.scrollLeft;
    }
  }

  _restoreScrollPosition() {
    const boardLists = this.shadowRoot?.querySelector('.board-lists');
    if (boardLists && this._scrollPosition > 0) {
      boardLists.scrollLeft = this._scrollPosition;
    }
  }

  // Removed _reapplyStyles method as it was causing infinite loops
  // Styles are properly applied during render() via _generateCustomStyles()

  render() {
    if (!this.config || !this._hass) return;

    console.log('[Trello Card] Render called with config:', this.config);

    // Use entity_id if provided, otherwise fall back to board_id
    let boardData;
    if (this.config.entity_id) {
      console.log('[Trello Card] *** RENDER: Using entity_id:', this.config.entity_id);
      boardData = this._getBoardDataByEntityId(this.config.entity_id);
    } else if (this.config.board_id) {
      console.log('[Trello Card] Using board_id:', this.config.board_id);
      boardData = this._getBoardData(this.config.board_id);
    } else {
      console.error('[Trello Card] No entity_id or board_id provided in config');
    }

    if (!boardData) {
      this._lastRenderData = null;
      const identifier = this.config.entity_id ? `entity "${this.config.entity_id}"` : `board ID "${this.config.board_id}"`;
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="card-content">
            <p>Board not found for ${identifier}</p>
            <p style="font-size: 12px; color: var(--secondary-text-color);">
              Make sure the Trello integration is configured and the ${this.config.entity_id ? 'entity exists' : 'board ID is correct'}.
            </p>
          </div>
        </ha-card>
      `;
      return;
    }

    // Store the current board data for comparison
    this._lastRenderData = JSON.parse(JSON.stringify(boardData));

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --spacing: 8px;
          --mushroom-spacing: calc(var(--spacing) * 2);
          --mushroom-border-radius: 12px;
          --mushroom-card-border-radius: 8px;
          --mushroom-shape-border-radius: 50%;
        }
        
        ${this._generateCustomStyles()}
        
        .board-container {
          background: var(--card-background-color);
          border-radius: var(--mushroom-border-radius);
          border-width: var(--ha-card-border-width, 1px);
          border-style: solid;
          border-color: var(--divider-color);
          box-shadow: none;
          padding: var(--mushroom-spacing);
        }
        
        .board-header {
          display: flex;
          align-items: center;
          padding: var(--mushroom-spacing);
          margin-bottom: var(--spacing);
          background: var(--secondary-background-color);
          border-radius: var(--mushroom-card-border-radius);
        }
        
        .board-title {
          font-size: 16px;
          font-weight: 500;
          margin: 0;
          color: var(--primary-text-color);
          flex: 1;
        }
        
        .board-lists {
          display: flex;
          gap: var(--spacing);
          overflow-x: auto;
          padding-bottom: var(--spacing);
        }
        
        .list-column {
          flex: 0 0 280px;
          background: var(--secondary-background-color);
          border-radius: var(--mushroom-card-border-radius);
          padding: var(--spacing);
          border: 1px solid var(--divider-color);
        }
        
        .list-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--spacing);
          padding: var(--spacing);
          background: rgba(var(--rgb-primary-color), 0.1);
          border-radius: var(--mushroom-card-border-radius);
        }
        
        .list-title {
          font-weight: 500;
          color: var(--primary-text-color);
          margin: 0;
          font-size: 14px;
        }
        
        .card-count {
          background: rgba(var(--rgb-primary-color), 0.2);
          color: var(--primary-color);
          border-radius: var(--mushroom-shape-border-radius);
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 500;
          min-width: 20px;
          text-align: center;
        }
        
        .cards-container {
          min-height: 60px;
          border: 2px dashed transparent;
          transition: all 0.2s ease;
          border-radius: var(--mushroom-card-border-radius);
          padding: 2px;
        }
        
        .cards-container.drag-over {
          border-color: rgba(var(--rgb-primary-color), 0.5);
          background-color: rgba(var(--rgb-primary-color), 0.1);
        }
        
        .trello-card {
          background: var(--card-background-color);
          border-radius: var(--mushroom-card-border-radius);
          padding: var(--spacing);
          margin-bottom: var(--spacing);
          border: 1px solid var(--divider-color);
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        
        .trello-card:hover {
          background: var(--secondary-background-color);
          border-color: rgba(var(--rgb-primary-color), 0.3);
        }
        
        .trello-card.dragging {
          opacity: 0.6;
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .trello-card.moving {
          opacity: 0.8;
          position: relative;
        }
        
        .trello-card.moving::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(var(--rgb-primary-color), 0.1);
          border-radius: inherit;
          pointer-events: none;
        }
        
        .trello-card.editing {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 2px rgba(var(--rgb-primary-color), 0.2);
        }
        
        .card-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .card-title {
          font-weight: 500;
          margin: 0;
          color: var(--primary-text-color);
          font-size: 14px;
          line-height: 1.3;
          word-wrap: break-word;
        }
        
        .card-title.editing {
          display: none;
        }
        
        .card-title-input {
          display: none;
          width: 100%;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 500;
          color: var(--primary-text-color);
          font-family: inherit;
          resize: none;
          outline: none;
          padding: 0;
          margin: 0;
          line-height: 1.3;
        }
        
        .card-title-input.editing {
          display: block;
        }
        
        .card-description {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin: 0;
          line-height: 1.4;
          word-wrap: break-word;
        }
        
        .card-description.editing {
          display: none;
        }
        
        .card-description-input {
          display: none;
          width: 100%;
          border: none;
          background: transparent;
          font-size: 12px;
          color: var(--secondary-text-color);
          font-family: inherit;
          resize: none;
          outline: none;
          padding: 0;
          margin: 0;
          line-height: 1.4;
          min-height: 40px;
        }
        
        .card-description-input.editing {
          display: block;
        }
        
        .card-meta {
          display: flex;
          align-items: center;
          gap: var(--spacing);
          margin-top: 4px;
        }
        
        .card-due {
          font-size: 11px;
          color: var(--warning-color);
          background: rgba(var(--rgb-warning-color), 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .card-actions {
          position: absolute;
          top: 4px;
          right: 4px;
          display: none;
          gap: 2px;
        }
        
        .trello-card:hover .card-actions {
          display: flex;
        }
        
        .card-action-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(var(--rgb-primary-color), 0.1);
          color: var(--primary-color);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        
        .card-action-btn:hover {
          background: rgba(var(--rgb-primary-color), 0.2);
        }
        
        .card-edit-actions {
          display: none;
          gap: var(--spacing);
          margin-top: var(--spacing);
          padding-top: var(--spacing);
          border-top: 1px solid var(--divider-color);
        }
        
        .card-edit-actions.editing {
          display: flex;
        }
        
        .card-edit-btn {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        
        .card-edit-btn.primary {
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-color: var(--primary-color);
        }
        
        .card-edit-btn.danger {
          background: var(--error-color, #f44336);
          color: white;
          border-color: var(--error-color, #f44336);
        }
        
        .card-edit-btn.danger:hover {
          background: var(--error-color-dark, #d32f2f);
          border-color: var(--error-color-dark, #d32f2f);
        }
        
        .card-edit-btn:hover {
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-color: var(--primary-color);
        }
        
        .add-card-btn {
          width: 100%;
          padding: var(--spacing);
          border: 1px dashed var(--divider-color);
          background: transparent;
          border-radius: var(--mushroom-card-border-radius);
          color: var(--secondary-text-color);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
        }
        
        .add-card-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
          background: rgba(var(--rgb-primary-color), 0.05);
        }
        
        .error-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: var(--error-color);
          color: var(--text-primary-color);
          padding: 12px 16px;
          border-radius: var(--mushroom-card-border-radius);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 1000;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      </style>
      
      <div class="board-container">
        ${this.config.show_header ? `
          <div class="board-header">
            <h2 class="board-title">${boardData.name}</h2>
          </div>
        ` : ''}
        <div class="board-lists">
          ${Object.values(boardData.lists).map(list => `
            <div class="list-column" data-list-id="${list.id}">
              <div class="list-header">
                <h3 class="list-title">${list.name}</h3>
                ${this.config.show_card_counts ? `<span class="card-count">${list.card_count}</span>` : ''}
              </div>
              <div class="cards-container" data-list-id="${list.id}">
                ${list.cards.map(card => `
                  <div class="trello-card" draggable="true" data-card-id="${card.id}" data-card-name="${card.name}" data-card-desc="${card.desc || ''}">
                    <div class="card-actions">
                      <button class="card-action-btn edit-btn" title="Edit card">✏️</button>
                    </div>
                    <div class="card-content">
                      <div class="card-title">${card.name}</div>
                      <textarea class="card-title-input" rows="1">${card.name}</textarea>
                      ${card.desc ? `<div class="card-description">${this._formatDescription(card.desc)}</div>` : '<div class="card-description" style="display: none;"></div>'}
                      <textarea class="card-description-input" placeholder="Add description...">${card.desc || ''}</textarea>
                      ${card.due ? `<div class="card-meta"><div class="card-due">Due: ${new Date(card.due).toLocaleDateString()}</div></div>` : ''}
                    </div>
                    <div class="card-edit-actions">
                      <button class="card-edit-btn primary save-btn">Save</button>
                      <button class="card-edit-btn cancel-btn">Cancel</button>
                      <button class="card-edit-btn danger delete-btn">Delete</button>
                    </div>
                  </div>
                `).join('')}
              </div>
              <button class="add-card-btn" data-list-id="${list.id}">
                + Add a card
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.setupEventListeners();
    // Force event listener refresh even if in edit mode
    this._settingUpListeners = false;
    this._setupScrollHandling();
  }

  removeEventListeners() {
    // Store references to bound functions for proper removal
    if (!this._boundHandlers) {
      this._boundHandlers = {
        dragStart: this.handleDragStart.bind(this),
        dragEnd: this.handleDragEnd.bind(this),
        dragOver: this.handleDragOver.bind(this),
        dragEnter: this.handleDragEnter.bind(this),
        dragLeave: this.handleDragLeave.bind(this),
        drop: this.handleDrop.bind(this),
        cardDoubleClick: this.handleCardDoubleClick.bind(this),
        addCard: this.handleAddCard.bind(this),
        editCard: this.handleEditCard.bind(this),
        saveCard: this.handleSaveCard.bind(this),
        cancelEdit: this.handleCancelEdit.bind(this),
        deleteCard: this.handleDeleteCard.bind(this)
      };
    }

    // Remove listeners from all elements
    const cards = this.shadowRoot.querySelectorAll('.trello-card');
    const containers = this.shadowRoot.querySelectorAll('.cards-container');
    const addButtons = this.shadowRoot.querySelectorAll('.add-card-btn');
    const editButtons = this.shadowRoot.querySelectorAll('.edit-btn');
    const saveButtons = this.shadowRoot.querySelectorAll('.save-btn');
    const cancelButtons = this.shadowRoot.querySelectorAll('.cancel-btn');
    const deleteButtons = this.shadowRoot.querySelectorAll('.delete-btn');

    cards.forEach(card => {
      card.removeEventListener('dragstart', this._boundHandlers.dragStart);
      card.removeEventListener('dragend', this._boundHandlers.dragEnd);
      card.removeEventListener('dblclick', this._boundHandlers.cardDoubleClick);
    });

    containers.forEach(container => {
      container.removeEventListener('dragover', this._boundHandlers.dragOver);
      container.removeEventListener('drop', this._boundHandlers.drop);
      container.removeEventListener('dragenter', this._boundHandlers.dragEnter);
      container.removeEventListener('dragleave', this._boundHandlers.dragLeave);
    });

    addButtons.forEach(button => {
      button.removeEventListener('click', this._boundHandlers.addCard);
    });

    editButtons.forEach(button => {
      button.removeEventListener('click', this._boundHandlers.editCard);
    });

    saveButtons.forEach(button => {
      button.removeEventListener('click', this._boundHandlers.saveCard);
    });

    cancelButtons.forEach(button => {
      button.removeEventListener('click', this._boundHandlers.cancelEdit);
    });

    deleteButtons.forEach(button => {
      button.removeEventListener('click', this._boundHandlers.deleteCard);
    });
  }

  setupEventListeners() {
    // Skip if already setting up to prevent infinite loops
    if (this._settingUpListeners) return;
    this._settingUpListeners = true;
    
    // Ensure bound handlers exist
    if (!this._boundHandlers) {
      this._boundHandlers = {
        dragStart: this.handleDragStart.bind(this),
        dragEnd: this.handleDragEnd.bind(this),
        dragOver: this.handleDragOver.bind(this),
        dragEnter: this.handleDragEnter.bind(this),
        dragLeave: this.handleDragLeave.bind(this),
        drop: this.handleDrop.bind(this),
        cardDoubleClick: this.handleCardDoubleClick.bind(this),
        addCard: this.handleAddCard.bind(this),
        editCard: this.handleEditCard.bind(this),
        saveCard: this.handleSaveCard.bind(this),
        cancelEdit: this.handleCancelEdit.bind(this),
        deleteCard: this.handleDeleteCard.bind(this)
      };
    }
    
    // Remove any existing event listeners to prevent duplicates
    this.removeEventListeners();
    
    // Drag and drop functionality
    const cards = this.shadowRoot.querySelectorAll('.trello-card');
    const containers = this.shadowRoot.querySelectorAll('.cards-container');
    const addButtons = this.shadowRoot.querySelectorAll('.add-card-btn');
    
    // Edit functionality
    const editButtons = this.shadowRoot.querySelectorAll('.edit-btn');
    const saveButtons = this.shadowRoot.querySelectorAll('.save-btn');
    const cancelButtons = this.shadowRoot.querySelectorAll('.cancel-btn');
    const deleteButtons = this.shadowRoot.querySelectorAll('.delete-btn');
    

    cards.forEach(card => {
      card.addEventListener('dragstart', this._boundHandlers.dragStart);
      card.addEventListener('dragend', this._boundHandlers.dragEnd);
      card.addEventListener('dblclick', this._boundHandlers.cardDoubleClick);
    });

    containers.forEach(container => {
      container.addEventListener('dragover', this._boundHandlers.dragOver);
      container.addEventListener('drop', this._boundHandlers.drop);
      container.addEventListener('dragenter', this._boundHandlers.dragEnter);
      container.addEventListener('dragleave', this._boundHandlers.dragLeave);
    });

    addButtons.forEach(button => {
      button.addEventListener('click', this._boundHandlers.addCard);
    });
    
    editButtons.forEach(button => {
      button.addEventListener('click', this._boundHandlers.editCard);
    });
    
    saveButtons.forEach(button => {
      button.addEventListener('click', this._boundHandlers.saveCard);
    });
    
    cancelButtons.forEach(button => {
      button.addEventListener('click', this._boundHandlers.cancelEdit);
    });
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', this._boundHandlers.deleteCard);
    });
    
    // Reset the flag
    this._settingUpListeners = false;
  }

  handleDragStart(e) {
    this.draggedCard = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.cardId);
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    this.draggedCard = null;
  }

  handleDragOver(e) {
    e.preventDefault();
  }

  handleDragEnter(e) {
    if (e.target.classList.contains('cards-container')) {
      e.target.classList.add('drag-over');
    }
  }

  handleDragLeave(e) {
    if (e.target.classList.contains('cards-container')) {
      e.target.classList.remove('drag-over');
    }
  }

  handleDrop(e) {
    e.preventDefault();
    const container = e.target.closest('.cards-container');
    if (container) {
      container.classList.remove('drag-over');
      const targetListId = container.dataset.listId;
      const cardId = e.dataTransfer.getData('text/plain');
      
      if (cardId && targetListId && this.draggedCard) {
        // Get source list ID for potential rollback
        const sourceContainer = this.draggedCard.closest('.cards-container');
        const sourceListId = sourceContainer?.dataset.listId;
        
        if (sourceListId !== targetListId) {
          // Optimistically move the card immediately
          this.moveCardOptimistically(this.draggedCard, container, cardId, targetListId, sourceContainer, sourceListId);
        }
      }
    }
  }

  handleAddCard(e) {
    const listId = e.target.dataset.listId;
    const cardName = prompt('Enter card name:');
    if (cardName && listId) {
      this.createCard(listId, cardName);
    }
  }

  moveCardOptimistically(cardElement, targetContainer, cardId, targetListId, sourceContainer, sourceListId) {
    // Add loading state
    cardElement.classList.add('moving');
    
    // Create a clone for animation if desired
    const cardClone = cardElement.cloneNode(true);
    
    // Immediately move the card in the DOM for instant feedback
    targetContainer.appendChild(cardElement);
    
    // Update the UI card counts optimistically  
    this.updateCardCountsOptimistically(sourceContainer, targetContainer, -1, 1);
    
    // Call the API in the background
    this.moveCard(cardId, targetListId, cardElement, sourceContainer, sourceListId);
  }

  updateCardCountsOptimistically(sourceContainer, targetContainer, sourceChange, targetChange) {
    // Update source list count
    if (sourceContainer) {
      const sourceListHeader = sourceContainer.closest('.list-column')?.querySelector('.card-count');
      if (sourceListHeader) {
        const currentCount = parseInt(sourceListHeader.textContent) || 0;
        sourceListHeader.textContent = Math.max(0, currentCount + sourceChange);
      }
    }
    
    // Update target list count  
    if (targetContainer) {
      const targetListHeader = targetContainer.closest('.list-column')?.querySelector('.card-count');
      if (targetListHeader) {
        const currentCount = parseInt(targetListHeader.textContent) || 0;
        targetListHeader.textContent = currentCount + targetChange;
      }
    }
  }

  moveCard(cardId, targetListId, cardElement = null, sourceContainer = null, sourceListId = null) {
    const serviceCall = this._hass.callService('trello', 'move_card', {
      card_id: cardId,
      target_list_id: targetListId
    });
    
    // Handle both Promise and non-Promise returns from callService
    if (serviceCall && typeof serviceCall.then === 'function') {
      serviceCall.then(() => {
        // Success - remove loading state
        if (cardElement) {
          cardElement.classList.remove('moving');
          console.log('[Trello Card] Move successful');
        }
      }).catch((error) => {
        // Error - rollback the optimistic update
        console.error('[Trello Card] Move failed, rolling back:', error);
        if (cardElement && sourceContainer) {
          // Move card back to original position
          sourceContainer.appendChild(cardElement);
          cardElement.classList.remove('moving');
          
          // Rollback count changes
          const targetContainer = cardElement.closest('.cards-container');
          this.updateCardCountsOptimistically(targetContainer, sourceContainer, -1, 1);
          
          // Show error message
          this.showErrorMessage('Failed to move card. Please try again.');
        }
      });
    } else {
      // callService doesn't return a Promise, just remove loading state after a delay
      if (cardElement) {
        setTimeout(() => {
          cardElement.classList.remove('moving');
          console.log('[Trello Card] Move completed (no promise)');
        }, 1000);
      }
    }
  }

  createCard(listId, name) {
    const description = prompt('Enter card description (optional):') || '';
    
    // Find the target container
    const targetContainer = this.shadowRoot.querySelector(`[data-list-id="${listId}"]`);
    if (!targetContainer) return;
    
    // Create temporary card element for optimistic update
    const tempCardId = 'temp_' + Date.now();
    const tempCardElement = this.createTempCardElement(tempCardId, name, description);
    
    // Add to DOM immediately
    targetContainer.appendChild(tempCardElement);
    
    // Update card count optimistically
    this.updateCardCountsOptimistically(null, targetContainer, 0, 1);
    
    // Call API
    const serviceCall = this._hass.callService('trello', 'create_card', {
      list_id: listId,
      name: name,
      description: description
    });
    
    if (serviceCall && typeof serviceCall.then === 'function') {
      serviceCall.then(() => {
        console.log('[Trello Card] Create successful');
        // The real card will appear with the next data refresh
        // Remove temp card after a delay to avoid flicker
        setTimeout(() => {
          if (tempCardElement.parentNode) {
            tempCardElement.remove();
          }
        }, 2000);
      }).catch((error) => {
        console.error('[Trello Card] Create failed:', error);
        // Remove temp card and rollback count
        if (tempCardElement.parentNode) {
          tempCardElement.remove();
          this.updateCardCountsOptimistically(targetContainer, null, -1, 0);
        }
        this.showErrorMessage('Failed to create card. Please try again.');
      });
    } else {
      // No promise, just remove temp card after delay
      setTimeout(() => {
        if (tempCardElement.parentNode) {
          tempCardElement.remove();
        }
        console.log('[Trello Card] Create completed (no promise)');
      }, 2000);
    }
  }

  createTempCardElement(cardId, name, description) {
    const cardElement = document.createElement('div');
    cardElement.className = 'trello-card moving';
    cardElement.setAttribute('data-card-id', cardId);
    cardElement.setAttribute('data-card-name', name);
    cardElement.setAttribute('data-card-desc', description);
    cardElement.innerHTML = `
      <div class="card-content">
        <div class="card-title">${name}</div>
        ${description ? `<div class="card-description">${this._formatDescription(description)}</div>` : ''}
      </div>
    `;
    return cardElement;
  }

  handleCardDoubleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't start editing if already editing another card
    if (this._isEditing) {
      return;
    }
    
    const card = e.currentTarget;
    this.enterEditMode(card);
  }

  handleEditCard(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't start editing if already editing another card
    if (this._isEditing) {
      return;
    }
    
    const card = e.target.closest('.trello-card');
    this.enterEditMode(card);
  }

  handleSaveCard(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.trello-card');
    this.saveCardChanges(card);
  }

  handleDeleteCard(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.trello-card');
    this.deleteCard(card);
  }

  handleCancelEdit(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.trello-card');
    this.exitEditMode(card);
  }

  enterEditMode(card) {
    // Set editing state to prevent re-renders
    this._isEditing = true;
    
    // Store original hass setter and override it
    if (!this._originalHassSetter) {
      this._originalHassSetter = Object.getOwnPropertyDescriptor(this.constructor.prototype, 'hass').set;
    }
    
    // Override hass setter to do nothing while editing
    Object.defineProperty(this, 'hass', {
      set: (hass) => {
        console.log('[Trello Card] Ignoring hass update during editing');
        this._hass = hass; // Still store the value but don't trigger render
      },
      get: () => this._hass,
      configurable: true
    });
    
    // Disable dragging during edit
    card.setAttribute('draggable', 'false');
    card.classList.add('editing');
    
    // Show input fields, hide display elements
    const title = card.querySelector('.card-title');
    const titleInput = card.querySelector('.card-title-input');
    const description = card.querySelector('.card-description');
    const descriptionInput = card.querySelector('.card-description-input');
    const editActions = card.querySelector('.card-edit-actions');
    
    title.classList.add('editing');
    titleInput.classList.add('editing');
    description.classList.add('editing');
    descriptionInput.classList.add('editing');
    editActions.classList.add('editing');
    
    // Focus on title input
    titleInput.focus();
    titleInput.select();
    
    // Auto-resize textareas
    this.autoResizeTextarea(titleInput);
    this.autoResizeTextarea(descriptionInput);
    
    // Handle enter key in title (save), escape (cancel)
    titleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.saveCardChanges(card);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.exitEditMode(card);
      }
    });
    
    descriptionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.exitEditMode(card);
      }
    });
    
    // Auto-resize on input
    titleInput.addEventListener('input', () => this.autoResizeTextarea(titleInput));
    descriptionInput.addEventListener('input', () => this.autoResizeTextarea(descriptionInput));
  }

  exitEditMode(card) {
    // Clear editing state to allow re-renders
    this._isEditing = false;
    
    // Restore original hass setter
    if (this._originalHassSetter) {
      Object.defineProperty(this, 'hass', {
        set: this._originalHassSetter,
        get: () => this._hass,
        configurable: true
      });
    }
    
    // Re-enable dragging
    card.setAttribute('draggable', 'true');
    card.classList.remove('editing');
    
    // Hide input fields, show display elements
    const title = card.querySelector('.card-title');
    const titleInput = card.querySelector('.card-title-input');
    const description = card.querySelector('.card-description');
    const descriptionInput = card.querySelector('.card-description-input');
    const editActions = card.querySelector('.card-edit-actions');
    
    title.classList.remove('editing');
    titleInput.classList.remove('editing');
    description.classList.remove('editing');
    descriptionInput.classList.remove('editing');
    editActions.classList.remove('editing');
    
    // Restore original values
    const originalName = card.dataset.cardName;
    const originalDesc = card.dataset.cardDesc;
    titleInput.value = originalName;
    descriptionInput.value = originalDesc;
  }

  saveCardChanges(card) {
    const cardId = card.dataset.cardId;
    const titleInput = card.querySelector('.card-title-input');
    const descriptionInput = card.querySelector('.card-description-input');
    const newName = titleInput.value.trim();
    const newDesc = descriptionInput.value.trim();
    
    if (!newName) {
      alert('Card name cannot be empty');
      titleInput.focus();
      return;
    }
    
    // Update the card via Home Assistant service
    // Note: Trello API typically requires separate calls for name and description
    // For now, we'll create a custom service call or use existing ones
    this.updateCard(cardId, newName, newDesc);
    
    // Update UI immediately for better UX
    const title = card.querySelector('.card-title');
    const description = card.querySelector('.card-description');
    
    title.textContent = newName;
    if (newDesc) {
      description.innerHTML = this._formatDescription(newDesc);
      description.style.display = 'block';
    } else {
      description.style.display = 'none';
    }
    
    // Update data attributes
    card.dataset.cardName = newName;
    card.dataset.cardDesc = newDesc;
    
    this.exitEditMode(card);
  }

  // Handle global scroll position saving
  _setupScrollHandling() {
    const boardLists = this.shadowRoot?.querySelector('.board-lists');
    if (boardLists) {
      boardLists.addEventListener('scroll', () => {
        this._scrollPosition = boardLists.scrollLeft;
      });
    }
  }

  updateCard(cardId, name, description) {
    this._hass.callService('trello', 'update_card', {
      card_id: cardId,
      name: name,
      description: description
    });
  }

  deleteCard(card) {
    const cardId = card.dataset.cardId;
    const cardName = card.dataset.cardName;
    
    // Exit edit mode if we're currently editing this or any card
    if (this._isEditing) {
      this.exitEditMode(card);
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the card "${cardName}"?`)) {
      return;
    }
    
    // Add deleting state
    card.classList.add('deleting');
    card.style.opacity = '0.5';
    
    // Update card count optimistically
    const container = card.closest('.cards-container');
    this.updateCardCountsOptimistically(container, null, -1, 0);
    
    // Remove card from UI immediately (optimistic update)
    card.remove();
    
    // Reattach event listeners to remaining cards
    this.setupEventListeners();
    // Force event listener refresh even if in edit mode
    this._settingUpListeners = false;
    
    // Call delete service
    const serviceCall = this._hass.callService('trello', 'delete_card', {
      card_id: cardId
    });
    
    if (serviceCall && typeof serviceCall.then === 'function') {
      serviceCall.catch((error) => {
        console.error('Failed to delete card:', error);
        // Since we already removed the card, we can't easily restore it
        // Show error and suggest refresh
        this.showErrorMessage('Failed to delete card. Please refresh the page to see the current state.');
      });
    }
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
  }

  showErrorMessage(message) {
    // Remove any existing error toasts
    const existingToast = document.querySelector('.error-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // Create new error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 4000);
  }

  _generateCustomStyles() {
    if (!this.config || !this.config.styles) return '';
    
    let customStyles = '';
    
    // Debug: console.log('[Trello Card] Generating custom styles:', this.config.styles);
    
    // Card-level background and transparency
    if (this.config.card_background || this.config.card_transparency !== undefined) {
      customStyles += `
        :host {`;
      
      if (this.config.card_background) {
        customStyles += `
          --card-background-color: ${this.config.card_background} !important;
          background: ${this.config.card_background} !important;`;
      }
      
      if (this.config.card_transparency !== undefined && this.config.card_transparency !== 1) {
        customStyles += `
          opacity: ${this.config.card_transparency};`;
      }
      
      customStyles += `
        }
        :host .board-container {`;
      
      if (this.config.card_background) {
        customStyles += `
          background: ${this.config.card_background} !important;`;
      }
      
      customStyles += `
        }`;
    }
    
    // Generate styles for each configured element
    Object.entries(this.config.styles).forEach(([selector, styles]) => {
      // Debug: console.log(`[Trello Card] Processing selector "${selector}" with styles:`, styles, 'Array?', Array.isArray(styles));
      if (styles && (Array.isArray(styles) ? styles.length > 0 : Object.keys(styles).length > 0)) {
        const cssSelector = this._getCSSSelector(selector);
        customStyles += `
        ${cssSelector} {`;
        
        // Handle array format (mushroom card style) vs object format
        if (Array.isArray(styles)) {
          // Debug: console.log(`[Trello Card] Array format for ${selector}:`, styles);
          // Array format: ['background: red', 'border: 1px solid blue']
          styles.forEach(styleString => {
            // Debug: console.log(`[Trello Card] Processing style string:`, styleString, typeof styleString);
            
            if (typeof styleString === 'string' && styleString && styleString.includes(':')) {
              // Handle string format: "color: red"
              const [property, ...valueParts] = styleString.split(':');
              const value = valueParts.join(':').trim();
              // Add !important to override default styles
              customStyles += `
          ${property.trim()}: ${value} !important;`;
            } else if (typeof styleString === 'object' && styleString !== null) {
              // Handle object format: {color: "red"} (from YAML without quotes)
              Object.entries(styleString).forEach(([property, value]) => {
                // Add !important to override default styles
                customStyles += `
          ${property}: ${value} !important;`;
              });
            } else {
              // Debug: console.warn(`[Trello Card] Invalid style string for ${selector}:`, styleString);
            }
          });
        } else {
          // Object format: {background: 'red', border: '1px solid blue'}
          Object.entries(styles).forEach(([property, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => {
                // Add !important to override default styles
                customStyles += `
          ${property}: ${v} !important;`;
              });
            } else {
              // Add !important to override default styles (except for card background which already has it)
              const important = (selector === 'card' && property === 'background') ? ' !important' : ' !important';
              customStyles += `
          ${property}: ${value}${important};`;
            }
          });
        }
        
        customStyles += `
        }`;
      }
    });
    
    if (customStyles.trim()) {
      console.log('[Trello Card] Generated CSS:', customStyles);
    }
    return customStyles;
  }

  _getCSSSelector(elementName) {
    const selectorMap = {
      'card': ':host, :host .board-container', // Target both host and main container
      'board_container': '.board-container',
      'board_header': '.board-header', 
      'board_title': '.board-title',
      'list_column': '.list-column',
      'list_header': '.list-header',
      'list_title': '.list-title',
      'card_count': '.card-count',
      'trello_card': '.trello-card',
      'card_title': '.card-title',
      'card_description': '.card-description',
      'add_card_btn': '.add-card-btn',
      'board_lists': '.board-lists',
      'cards_container': '.cards-container'
    };
    
    return selectorMap[elementName] || `.${elementName}`;
  }

  _getBoardDataByEntityId(entityId) {
    // Direct lookup by entity ID
    console.log(`[Trello Card] Looking up entity: ${entityId}`);
    const entity = this._hass.states[entityId];
    
    if (!entity) {
      console.error(`[Trello Card] Entity ${entityId} not found`);
      console.log('[Trello Card] Available entities:', Object.keys(this._hass.states).filter(id => id.includes('trello')));
      return null;
    }
    
    console.log(`[Trello Card] Found entity:`, entity);
    console.log(`[Trello Card] Entity attributes:`, entity.attributes);
    
    // Check if entity has board_data attribute (new format)
    if (entity.attributes.board_data) {
      console.log(`[Trello Card] Using board_data from entity`);
      return entity.attributes.board_data;
    }
    
    // Check if entity has board_id (legacy format) 
    if (entity.attributes.board_id) {
      console.log(`[Trello Card] Entity has board_id, looking up board data:`, entity.attributes.board_id);
      return this._getBoardData(entity.attributes.board_id);
    }
    
    console.error(`[Trello Card] Entity ${entityId} does not appear to be a Trello board sensor`);
    console.error(`[Trello Card] Expected board_data or board_id attribute, got:`, Object.keys(entity.attributes));
    return null;
  }

  _getBoardData(boardId) {
    // Look for the board sensor
    const boardSensor = Object.values(this._hass.states).find(
      entity => entity.entity_id.includes(`board_${boardId}`) && 
      entity.attributes.board_data
    );

    if (boardSensor && boardSensor.attributes.board_data) {
      return boardSensor.attributes.board_data;
    }

    // Fallback: try to find any sensor with matching board_id
    const fallbackSensor = Object.values(this._hass.states).find(
      entity => entity.attributes.board_id === boardId
    );

    if (fallbackSensor && fallbackSensor.attributes.board_id === boardId) {
      // Try to construct board data from individual list sensors
      const listSensors = Object.values(this._hass.states).filter(
        entity => entity.attributes.board_id === boardId && entity.attributes.cards
      );

      if (listSensors.length > 0) {
        const lists = {};
        listSensors.forEach(sensor => {
          lists[sensor.attributes.list_id] = {
            id: sensor.attributes.list_id,
            name: sensor.attributes.list_name,
            card_count: sensor.state,
            cards: sensor.attributes.cards
          };
        });

        return {
          id: boardId,
          name: fallbackSensor.attributes.board_name,
          lists: lists
        };
      }
    }

    return null;
  }

  getCardSize() {
    return 1;
  }

  static getConfigElement() {
    return document.createElement('ha-trello-card-editor');
  }

  static getStubConfig() {
    return {
      entity_id: '',
      show_header: true,
      show_card_counts: true,
      card_background: '',
      card_transparency: 1,
      styles: {}
    };
  }
}

customElements.define('trello-board', TrelloBoardCard);

// Register the card
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'trello-board',
  name: 'Trello Board Card',
  description: 'A card to display a Trello board with drag and drop functionality'
});