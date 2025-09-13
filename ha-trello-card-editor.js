class TrelloBoardCardEditor extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="card-config">
        <paper-input
          label="Board ID"
          .value="${this.config.board_id || ''}"
          .configValue="${'board_id'}"
          @value-changed="${this.valueChanged}"
        ></paper-input>
      </div>
    `;
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
      }
    }
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
  }
}

customElements.define('ha-trello-card-editor', TrelloBoardCardEditor);