// godfall/scripts/sheets/actor-sheet.mjs
/**
 * @extends {ActorSheet}
 */
export default class GodfallActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["godfall", "sheet", "actor"],
      template: "systems/godfall/templates/actor/actor-sheet.html",
      width: 800,
      height: 850,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /** @override */
  async getData(options) {
    const context = super.getData(options);
    
    // Add the system data
    context.system = this.actor.system;
    context.config = CONFIG.GODFALL;
    
    // Prepare character items
    this._prepareCharacterItems(context);
    
    // Prepare backgrounds for display
    context.backgroundsArray = Object.entries(context.system.backgrounds || {}).map(([key, bg]) => ({
      key: key,
      name: bg.name || '',
      value: bg.value || 0
    }));
    
    // Calculate encumbrance percentage for display
    context.encumbrancePercent = Math.round((context.system.encumbrance.value / context.system.encumbrance.max) * 100);
    
    return context;
  }
  
  _prepareCharacterItems(sheetData) {
    const weapons = [];
    const armor = [];
    const shields = [];
    const gear = [];
    const spells = [];
    const talents = [];
    
    // Iterate through items and categorize them
    for (let i of sheetData.items) {
      i.img = i.img || "icons/svg/item-bag.svg";
      
      // Add damage status for items with HP
      if (i.system.hp && typeof i.system.hp === 'object') {
        i.damageStatus = this._getItemDamageStatus(i);
      }
      
      if (i.type === 'weapon') {
        weapons.push(i);
      } else if (i.type === 'armor') {
        armor.push(i);
      } else if (i.type === 'shield') {
        shields.push(i);
      } else if (i.type === 'gear') {
        gear.push(i);
      } else if (i.type === 'spell') {
        // Sort spells by tradition and rank
        i.rankDisplay = i.system.rank === 0 ? 'Cantrip' : `Rank ${i.system.rank}`;
        spells.push(i);
      } else if (i.type === 'talent') {
        talents.push(i);
      }
    }

    // Sort items
    weapons.sort((a, b) => a.name.localeCompare(b.name));
    armor.sort((a, b) => a.name.localeCompare(b.name));
    shields.sort((a, b) => a.name.localeCompare(b.name));
    gear.sort((a, b) => a.name.localeCompare(b.name));
    spells.sort((a, b) => {
      if (a.system.tradition !== b.system.tradition) {
        return a.system.tradition.localeCompare(b.system.tradition);
      }
      return a.system.rank - b.system.rank;
    });
    talents.sort((a, b) => a.name.localeCompare(b.name));

    // Add to sheet data
    sheetData.weapons = weapons;
    sheetData.armor = armor;
    sheetData.shields = shields;
    sheetData.gear = gear;
    sheetData.spells = spells;
    sheetData.talents = talents;
  }
  
  _getItemDamageStatus(item) {
    if (!item.system.hp || !item.system.hp.max) return 'pristine';
    
    const percent = (item.system.hp.value / item.system.hp.max) * 100;
    if (percent === 0) return 'broken';
    if (percent <= 25) return 'badly-damaged';
    if (percent <= 50) return 'damaged';
    if (percent <= 75) return 'worn';
    return 'pristine';
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));
    
    // Edit Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });
    
    // Delete Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).closest(".item");
      const item = this.actor.items.get(li.data("itemId"));
      this._confirmDelete(item);
    });
    
    // Item Chat
    html.find('.item-chat').click(ev => this._onItemSummary(ev));
    
    // Weapon/Spell Rolling
    html.find('.item-roll').click(ev => this._onItemRoll(ev));
    
    // Rollable abilities
    html.find('.rollable').click(this._onRollable.bind(this));
    
    // Equipped toggles
    html.find('.equipped-toggle').click(this._onEquippedToggle.bind(this));
    
    // Background management
    html.find('.background-roll').click(this._onBackgroundRoll.bind(this));
    html.find('.add-background').click(this._onAddBackground.bind(this));
    html.find('.delete-background').click(this._onDeleteBackground.bind(this));
    
    // Rest buttons
    html.find('.short-rest').click(this._onShortRest.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));
    
    // Stabilization check
    html.find('.stabilization-check').click(this._onStabilizationCheck.bind(this));
    
    // Item damage/repair
    html.find('.repair-item').click(this._onRepairItem.bind(this));
    
    // Import items
    html.find('.import-items').click(this._onImportItems.bind(this));
  }
  
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const data = duplicate(header.dataset);
    const name = `New ${type.capitalize()}`;
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    delete itemData.system["type"];
    return await Item.create(itemData, {parent: this.actor});
  }
  
  async _confirmDelete(item) {
    const confirmed = await Dialog.confirm({
      title: "Delete Item",
      content: `<p>Are you sure you want to delete <strong>${item.name}</strong>?</p>`,
      defaultYes: false
    });
    
    if (confirmed) {
      await item.delete();
    }
  }
  
  async _onRollable(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    if (dataset.attribute) {
      // Attribute roll
      return this.actor.rollAttribute(dataset.attribute);
    }
    
    if (dataset.roll) {
      // Generic roll
      let label = dataset.label ? game.i18n.localize(dataset.label) : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.evaluate();
      return roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode')
      });
    }
  }

  async _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    return item.roll();
  }

  async _onItemSummary(event) {
    event.preventDefault();
    const li = $(event.currentTarget).closest(".item");
    const item = this.actor.items.get(li.data("itemId"));
    
    if (!item) return;
    return item.roll();
  }
  
  async _onEquippedToggle(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (item) {
      return item.toggleEquipped();
    }
  }
  
  async _onBackgroundRoll(event) {
    event.preventDefault();
    const backgroundKey = event.currentTarget.dataset.background;
    const attributeKey = event.currentTarget.dataset.attribute || 'int';
    
    const background = this.actor.system.backgrounds[backgroundKey];
    if (!background) return;
    
    return this.actor.rollBackground(background.name, attributeKey);
  }
  
  async _onAddBackground(event) {
    event.preventDefault();
    
    const dialog = new Dialog({
      title: "Add Background",
      content: `
        <form>
          <div class="form-group">
            <label>Background Name:</label>
            <input type="text" name="name" placeholder="e.g., Former Soldier"/>
          </div>
          <div class="form-group">
            <label>Bonus:</label>
            <input type="number" name="value" value="1" min="1" max="5"/>
          </div>
        </form>
      `,
      buttons: {
        add: {
          label: "Add",
          callback: (html) => {
            const name = html.find('[name="name"]').val();
            const value = parseInt(html.find('[name="value"]').val());
            
            if (!name) return;
            
            const key = name.toLowerCase().replace(/\s+/g, '_');
            const updateData = {};
            updateData[`system.backgrounds.${key}`] = { name, value };
            
            this.actor.update(updateData);
          }
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "add"
    });
    
    dialog.render(true);
  }
  
  async _onDeleteBackground(event) {
    event.preventDefault();
    const backgroundKey = event.currentTarget.dataset.background;
    
    const confirmed = await Dialog.confirm({
      title: "Delete Background",
      content: `<p>Are you sure you want to delete this background?</p>`,
      defaultYes: false
    });
    
    if (confirmed) {
      const updateData = {};
      updateData[`system.backgrounds.-=${backgroundKey}`] = null;
      await this.actor.update(updateData);
    }
  }
  
  async _onShortRest(event) {
    event.preventDefault();
    return this.actor.shortRest();
  }
  
  async _onLongRest(event) {
    event.preventDefault();
    return this.actor.longRest();
  }
  
  async _onStabilizationCheck(event) {
    event.preventDefault();
    return this.actor.rollStabilization();
  }
  
  async _onRepairItem(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    return item.repairItem();
  }
  
  async _onImportItems(event) {
    event.preventDefault();
    const packType = event.currentTarget.dataset.pack;
    
    const dialog = new Dialog({
      title: `Import ${packType.capitalize()}`,
      content: `
        <p>This will import all items from the ${packType} compendium. Continue?</p>
        <p><em>Items with the same name will be updated, not duplicated.</em></p>
      `,
      buttons: {
        import: {
          label: "Import",
          callback: () => this._performImport(packType)
        },
        cancel: {
          label: "Cancel"
        }
      },
      default: "import"
    });
    
    dialog.render(true);
  }
  
  async _performImport(packType) {
    const pack = game.packs.get(`godfall.${packType}`);
    if (!pack) {
      ui.notifications.error(`Compendium 'godfall.${packType}' not found!`);
      return;
    }
    
    const documents = await pack.getDocuments();
    const itemsToCreate = [];
    const existingItems = new Map();
    
    // Map existing items by name for updates
    for (let item of this.actor.items) {
      existingItems.set(item.name, item);
    }
    
    for (let doc of documents) {
      const itemData = doc.toObject();
      
      if (existingItems.has(itemData.name)) {
        // Update existing item
        const existingItem = existingItems.get(itemData.name);
        await existingItem.update(itemData);
      } else {
        // Create new item
        itemsToCreate.push(itemData);
      }
    }
    
    if (itemsToCreate.length > 0) {
      await this.actor.createEmbeddedDocuments("Item", itemsToCreate);
    }
    
    ui.notifications.info(`Imported ${documents.length} items from ${packType} compendium.`);
  }
}
