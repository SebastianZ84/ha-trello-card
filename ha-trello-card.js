// Trello Board Card v1.1.0
// Home Assistant custom card for displaying Trello boards with Mushroom design and editing
// https://github.com/SebastianZ84/ha-trello-card

class TrelloBoardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this.config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.config) {
      this.render();
    }
  }

  render() {
    if (!this.config || !this._hass) return;

    const boardId = this.config.board_id;
    const boardData = this._getBoardData(boardId);

    if (!boardData) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="card-content">
            <p>Board not found or not loaded yet</p>
          </div>
        </ha-card>
      `;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --spacing: 8px;
          --mushroom-spacing: calc(var(--spacing) * 2);
          --mushroom-border-radius: 12px;
          --mushroom-card-border-radius: 8px;
          --mushroom-shape-border-radius: 50%;
        }
        
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
      </style>
      
      <div class="board-container">
        <div class="board-header">
          <h2 class="board-title">${boardData.name}</h2>
        </div>
        <div class="board-lists">
          ${Object.values(boardData.lists).map(list => `
            <div class="list-column" data-list-id="${list.id}">
              <div class="list-header">
                <h3 class="list-title">${list.name}</h3>
                <span class="card-count">${list.card_count}</span>
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
                      ${card.desc ? `<div class="card-description">${card.desc}</div>` : '<div class="card-description" style="display: none;"></div>'}
                      <textarea class="card-description-input" placeholder="Add description...">${card.desc || ''}</textarea>
                      ${card.due ? `<div class="card-meta"><div class="card-due">Due: ${new Date(card.due).toLocaleDateString()}</div></div>` : ''}
                    </div>
                    <div class="card-edit-actions">
                      <button class="card-edit-btn primary save-btn">Save</button>
                      <button class="card-edit-btn cancel-btn">Cancel</button>
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
  }

  setupEventListeners() {
    // Drag and drop functionality
    const cards = this.shadowRoot.querySelectorAll('.trello-card');
    const containers = this.shadowRoot.querySelectorAll('.cards-container');
    const addButtons = this.shadowRoot.querySelectorAll('.add-card-btn');
    
    // Edit functionality
    const editButtons = this.shadowRoot.querySelectorAll('.edit-btn');
    const saveButtons = this.shadowRoot.querySelectorAll('.save-btn');
    const cancelButtons = this.shadowRoot.querySelectorAll('.cancel-btn');

    cards.forEach(card => {
      card.addEventListener('dragstart', this.handleDragStart.bind(this));
      card.addEventListener('dragend', this.handleDragEnd.bind(this));
      card.addEventListener('dblclick', this.handleCardDoubleClick.bind(this));
    });

    containers.forEach(container => {
      container.addEventListener('dragover', this.handleDragOver.bind(this));
      container.addEventListener('drop', this.handleDrop.bind(this));
      container.addEventListener('dragenter', this.handleDragEnter.bind(this));
      container.addEventListener('dragleave', this.handleDragLeave.bind(this));
    });

    addButtons.forEach(button => {
      button.addEventListener('click', this.handleAddCard.bind(this));
    });
    
    editButtons.forEach(button => {
      button.addEventListener('click', this.handleEditCard.bind(this));
    });
    
    saveButtons.forEach(button => {
      button.addEventListener('click', this.handleSaveCard.bind(this));
    });
    
    cancelButtons.forEach(button => {
      button.addEventListener('click', this.handleCancelEdit.bind(this));
    });
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
      
      if (cardId && targetListId) {
        this.moveCard(cardId, targetListId);
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

  moveCard(cardId, targetListId) {
    this._hass.callService('trello', 'move_card', {
      card_id: cardId,
      target_list_id: targetListId
    });
  }

  createCard(listId, name) {
    const description = prompt('Enter card description (optional):') || '';
    this._hass.callService('trello', 'create_card', {
      list_id: listId,
      name: name,
      description: description
    });
  }

  handleCardDoubleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.currentTarget;
    this.enterEditMode(card);
  }

  handleEditCard(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.trello-card');
    this.enterEditMode(card);
  }

  handleSaveCard(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.trello-card');
    this.saveCardChanges(card);
  }

  handleCancelEdit(e) {
    e.preventDefault();
    e.stopPropagation();
    const card = e.target.closest('.trello-card');
    this.exitEditMode(card);
  }

  enterEditMode(card) {
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
      description.textContent = newDesc;
      description.style.display = 'block';
    } else {
      description.style.display = 'none';
    }
    
    // Update data attributes
    card.dataset.cardName = newName;
    card.dataset.cardDesc = newDesc;
    
    this.exitEditMode(card);
  }

  updateCard(cardId, name, description) {
    this._hass.callService('trello', 'update_card', {
      card_id: cardId,
      name: name,
      description: description
    });
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = (textarea.scrollHeight) + 'px';
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
      board_id: ''
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