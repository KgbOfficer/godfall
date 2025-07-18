// godfall/scripts/sheets/item-sheet.mjs
/**
 * @extends {ItemSheet}
 */
export default class GodfallItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["godfall", "sheet", "item"],
      width: 520,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /** @override */
  get template() {
    return "systems/godfall/templates/item/item-sheet.html";
  }

  /** @override */
  async getData(options) {
    const context = super.getData(options);
    
    // Add the system data
    context.system = this.item.system;
    context.config = CONFIG.GODFALL;
    
    // Add roll data for TinyMCE editors
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add item type specific data
    context.isPhysicalItem = ["weapon", "armor", "shield", "gear"].includes(this.item.type);
    context.hasHP = ["weapon", "armor", "shield"].includes(this.item.type);
    context.isEquippable = ["weapon", "armor", "shield"].includes(this.item.type);

    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Handle versatile weapon toggle
    html.find('input[name="system.versatile"]').change(this._onVersatileToggle.bind(this));

    // Handle HP max auto-setting
    html.find('input[name="system.hp.value"]').change(this._onHPValueChange.bind(this));

    // Roll buttons for testing
    html.find('.test-roll').click(this._onTestRoll.bind(this));
  }

  /**
   * Handle toggling versatile weapon display
   * @private
   */
  async _onVersatileToggle(event) {
    // Re-render to show/hide versatile damage field
    this.render();
  }

  /**
   * Auto-set max HP when current HP is changed
   * @private
   */
  async _onHPValueChange(event) {
    const value = parseInt(event.currentTarget.value);
    const maxInput = event.currentTarget.form.querySelector('input[name="system.hp.max"]');
    
    if (maxInput && (!maxInput.value || parseInt(maxInput.value) < value)) {
      maxInput.value = value;
    }
  }

  /**
   * Handle test rolling for items
   * @private
   */
  async _onTestRoll(event) {
    event.preventDefault();
    
    if (this.item.actor) {
      return this.item.roll();
    } else {
      ui.notifications.warn("This item must be owned by an actor to be rolled.");
    }
  }
}
