// Trello Board Card v1.0.0
// Home Assistant custom card for displaying Trello boards
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
          --mdc-theme-primary: var(--primary-color);
        }
        
        .board-container {
          padding: 16px;
          background: var(--card-background-color);
          border-radius: 8px;
          box-shadow: var(--ha-card-box-shadow);
        }
        
        .board-header {
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--divider-color);
        }
        
        .board-title {
          font-size: 24px;
          font-weight: 500;
          margin: 0;
          color: var(--primary-text-color);
        }
        
        .board-lists {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        
        .list-column {
          flex: 0 0 300px;
          background: var(--secondary-background-color);
          border-radius: 8px;
          padding: 12px;
        }
        
        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--divider-color);
        }
        
        .list-title {
          font-weight: 500;
          color: var(--primary-text-color);
          margin: 0;
        }
        
        .card-count {
          background: var(--primary-color);
          color: var(--text-primary-color);
          border-radius: 12px;
          padding: 2px 8px;
          font-size: 12px;
        }
        
        .cards-container {
          min-height: 100px;
          border: 2px dashed transparent;
          transition: all 0.2s ease;
          border-radius: 4px;
        }
        
        .cards-container.drag-over {
          border-color: var(--primary-color);
          background-color: var(--primary-color-alpha);
        }
        
        .trello-card {
          background: var(--card-background-color);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: move;
          transition: all 0.2s ease;
          border: 1px solid var(--divider-color);
        }
        
        .trello-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          transform: translateY(-1px);
        }
        
        .trello-card.dragging {
          opacity: 0.5;
          transform: rotate(5deg);
        }
        
        .card-title {
          font-weight: 500;
          margin: 0 0 4px 0;
          color: var(--primary-text-color);
        }
        
        .card-description {
          font-size: 13px;
          color: var(--secondary-text-color);
          margin: 0;
          line-height: 1.3;
        }
        
        .card-due {
          font-size: 11px;
          color: var(--warning-color);
          margin-top: 4px;
        }
        
        .add-card-btn {
          width: 100%;
          padding: 8px;
          border: 2px dashed var(--divider-color);
          background: transparent;
          border-radius: 4px;
          color: var(--secondary-text-color);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .add-card-btn:hover {
          border-color: var(--primary-color);
          color: var(--primary-color);
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
                  <div class="trello-card" draggable="true" data-card-id="${card.id}">
                    <div class="card-title">${card.name}</div>
                    ${card.desc ? `<div class="card-description">${card.desc}</div>` : ''}
                    ${card.due ? `<div class="card-due">Due: ${new Date(card.due).toLocaleDateString()}</div>` : ''}
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

    cards.forEach(card => {
      card.addEventListener('dragstart', this.handleDragStart.bind(this));
      card.addEventListener('dragend', this.handleDragEnd.bind(this));
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