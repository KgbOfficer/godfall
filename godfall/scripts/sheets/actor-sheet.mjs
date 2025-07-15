// godfall/scripts/sheets/actor-sheet.mjs
/**
 * @extends {ActorSheet}
 */
export default class GodfallActorSheet extends foundry.applications.sheets.ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["godfall", "sheet", "actor"],
      template: "systems/godfall/templates/actor/actor-sheet.html",
      width: 620,
      height: 680,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes"}]
    });
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    context.system = this.actor.system;
    this._prepareCharacterItems(context);
    return context;
  }
  
  _prepareCharacterItems(sheetData) {
    const combat = { weapons: [], armor: [] };
    const inventory = [];
    const spells = [];
    const talents = [];
    for (let i of sheetData.items) {
      i.img = i.img || CONST.DEFAULT_TOKEN;
      if (i.type === 'weapon' || i.type === 'shield') combat.weapons.push(i);
      else if (i.type === 'armor') combat.armor.push(i);
      else if (i.type === 'spell') spells.push(i);
      else if (i.type === 'talent') talents.push(i);
      else if (i.type === 'item') inventory.push(i);
    }

    sheetData.combat = combat;
    sheetData.inventory = inventory;
    sheetData.spells = spells;
    sheetData.talents = talents;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find('.item-create').click(this._onItemCreate.bind(this));
    html.find('.item-edit').click(ev => {
      const li = ev.currentTarget.closest(".item");
      this.actor.items.get(li.dataset.itemId).sheet.render(true);
    });
    html.find('.item-delete').click(ev => {
      const li = ev.currentTarget.closest(".item");
      this.actor.items.get(li.dataset.itemId).delete();
    });
    html.find('.item-chat').click(ev => this._onItemSummary(ev));
    html.find('.rollable').click(this._onAttributeRoll.bind(this));
  }
  
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      system: {}
    };
    await Item.create(itemData, {parent: this.actor});
  }
  
  async _onAttributeRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.system);
      let label = dataset.label ? `Rolling ${game.i18n.localize(dataset.label)}` : '';
      await roll.evaluate({async: true});
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }

  async _onItemSummary(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);
    const content = await renderTemplate(`systems/godfall/templates/chat/item-card.html`, {
      item: item,
      system: item.system
    });
    await ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }
}
