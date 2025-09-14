class TrelloBoardCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.render();
  }

  render() {
    if (!this.hass) {
      return;
    }

    // Get all Trello board entities
    const trelloEntities = Object.keys(this.hass.states).filter(entityId => 
      entityId.startsWith('sensor.trello_') && 
      (this.hass.states[entityId].attributes.board_data || this.hass.states[entityId].attributes.board_id)
    );

    this.innerHTML = `
      <div class="card-config">
        <style>
          .card-config {
            padding: 16px;
          }
          .input-group {
            margin-bottom: 16px;
          }
          .helper-text {
            font-size: 12px;
            color: var(--secondary-text-color);
            margin-top: 4px;
          }
          ha-entity-picker {
            width: 100%;
          }
        </style>
        
        <div class="input-group">
          <ha-entity-picker
            .hass="${this.hass}"
            .value="${this.config.entity_id || ''}"
            .includeDomains="${['sensor']}"
            .entityFilter="${(entity) => entity.entity_id.startsWith('sensor.trello_') && (entity.attributes.board_data || entity.attributes.board_id)}"
            label="Trello Board Entity (Recommended)"
            @value-changed="${this.entityChanged}"
          ></ha-entity-picker>
          <div class="helper-text">Select your Trello board entity from the dropdown</div>
        </div>

        <div class="input-group">
          <paper-input
            label="Board ID (Legacy)"
            .value="${this.config.board_id || ''}"
            .configValue="${'board_id'}"
            @value-changed="${this.valueChanged}"
            .disabled="${!!this.config.entity_id}"
          ></paper-input>
          <div class="helper-text">
            ${this.config.entity_id ? 'Disabled when entity is selected' : 'Alternatively, use the raw board ID (not recommended)'}
          </div>
        </div>
      </div>
    `;
  }

  entityChanged(ev) {
    const entityId = ev.detail.value;
    if (entityId) {
      this.config = {
        ...this.config,
        entity_id: entityId
      };
      // Remove board_id when entity_id is set
      if (this.config.board_id) {
        delete this.config.board_id;
      }
    } else {
      delete this.config.entity_id;
    }
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
    this.render(); // Re-render to update disabled state
  }

  valueChanged(ev) {
    if (!this.config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === '') {
        delete this.config[target.configValue];
      } else {
        this.config = {
          ...this.config,
          [target.configValue]: target.value,
        };
        // Remove entity_id when board_id is manually set
        if (target.configValue === 'board_id' && this.config.entity_id) {
          delete this.config.entity_id;
          this.render(); // Re-render to update UI
        }
      }
    }
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
  }
}

customElements.define('ha-trello-card-editor', TrelloBoardCardEditor);