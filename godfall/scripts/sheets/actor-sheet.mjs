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
      width: 700,
      height: 720,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main"}]
    });
  }

  /** @override */
  async getData(options) {
    const context = super.getData(options);
    
    // Add the system data
    context.system = this.actor.system;
    
    // Prepare character items
    this._prepareCharacterItems(context);
    
    // Prepare custom skills arrays for template
    context.weaponSkillsArray = this._prepareCustomSkills(context.system.custom_weapon_skills);
    context.backgroundsArray = this._prepareCustomSkills(context.system.custom_backgrounds);
    
    return context;
  }
  
  _prepareCustomSkills(skillsObject) {
    if (!skillsObject || typeof skillsObject !== 'object') return [];
    
    return Object.keys(skillsObject).map(key => ({
      name: skillsObject[key].name || '',
      value: skillsObject[key].value || 0
    }));
  }
  
  _prepareCharacterItems(sheetData) {
    const combat = { weapons: [], armor: [] };
    const inventory = [];
    const spells = [];
    const talents = [];
    
    // Iterate through items and categorize them
    for (let i of sheetData.items) {
      i.img = i.img || "icons/svg/item-bag.svg";
      
      if (i.type === 'weapon' || i.type === 'shield') {
        combat.weapons.push(i);
      } else if (i.type === 'armor') {
        combat.armor.push(i);
      } else if (i.type === 'spell') {
        spells.push(i);
      } else if (i.type === 'talent') {
        talents.push(i);
      } else if (i.type === 'item') {
        inventory.push(i);
      }
    }

    // Add to sheet data
    sheetData.combat = combat;
    sheetData.inventory = inventory;
    sheetData.spells = spells;
    sheetData.talents = talents;
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
      item.delete();
      li.slideUp(200, () => this.render(false));
    });
    
    // Item Chat (for non-weapons)
    html.find('.item-chat').click(ev => this._onItemSummary(ev));
    
    // Weapon Rolling
    html.find('.weapon-roll').click(ev => this._onWeaponRoll(ev));
    
    // Rollable abilities
    html.find('.rollable').click(this._onAttributeRoll.bind(this));
    
    // Equipped toggles
    html.find('.equipped-toggle input').change(this._onEquippedToggle.bind(this));
    
    // Versatile toggles
    html.find('.versatile-toggle input').change(this._onVersatileToggle.bind(this));
    
    // Custom Skills Management
    html.find('.add-skill-btn').click(this._onAddCustomSkill.bind(this));
    html.find('.remove-skill-btn').click(this._onRemoveCustomSkill.bind(this));
    html.find('.skill-name-input, .skill-value-input').change(this._onCustomSkillChange.bind(this));
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
  
  async _onAttributeRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    if (dataset.roll) {
      let label = dataset.label ? `Rolling ${game.i18n.localize(dataset.label)}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.evaluate();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode')
      });
    }
  }

  async _onWeaponRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    
    if (!item) return;
    
    const weaponData = item.system;
    const actorData = this.actor.system;
    
    // Determine weapon skill from custom weapon skills
    let skillBonus = 0;
    const weaponSkillName = weaponData.weapon_type;
    
    // Look through custom weapon skills for a match
    if (actorData.custom_weapon_skills) {
      Object.values(actorData.custom_weapon_skills).forEach(skill => {
        if (skill.name && skill.name.toLowerCase().replace(/\s+/g, '_') === weaponSkillName) {
          skillBonus = skill.value || 0;
        }
      });
    }
    
    // Determine attribute (default to strength, but check for finesse, etc.)
    let attributeKey = weaponData.attribute || 'str';
    if (weaponData.properties && weaponData.properties.toLowerCase().includes('finesse')) {
      // For finesse weapons, use dex if higher than str
      if (actorData.attributes.dex.mod > actorData.attributes.str.mod) {
        attributeKey = 'dex';
      }
    }
    
    const attributeMod = actorData.attributes[attributeKey].mod;
    
    // Create attack roll
    const attackBonus = attributeMod + skillBonus;
    const attackRoll = new Roll(`1d20 + ${attackBonus}`, this.actor.getRollData());
    await attackRoll.evaluate();
    
    // Determine damage
    let damageFormula = weaponData.damage;
    if (weaponData.versatile && weaponData.two_handed && weaponData.versatile_damage) {
      damageFormula = weaponData.versatile_damage;
    }
    
    // Add attribute modifier to damage
    if (damageFormula && attributeMod !== 0) {
      damageFormula += ` + ${attributeMod}`;
    }
    
    let damageRoll = null;
    if (damageFormula) {
      damageRoll = new Roll(damageFormula, this.actor.getRollData());
      await damageRoll.evaluate();
    }
    
    // Create chat message
    const attributeName = game.i18n.localize(actorData.attributes[attributeKey].label);
    
    let content = `
      <div class="godfall chat-card weapon-attack">
        <header class="card-header">
          <img src="${item.img}" width="36" height="36"/>
          <h3>${item.name} Attack</h3>
        </header>
        <div class="card-content">
          <div class="attack-roll">
            <h4>Attack Roll: ${attackRoll.total}</h4>
            <p class="roll-breakdown">1d20 + ${attributeName} (${attributeMod}) + Skill (${skillBonus})</p>
          </div>
    `;
    
    if (damageRoll) {
      content += `
          <div class="damage-roll">
            <h4>Damage: ${damageRoll.total}</h4>
            <p class="roll-formula">${damageRoll.formula}</p>
          </div>
      `;
    }
    
    if (weaponData.properties) {
      content += `<div class="weapon-properties"><strong>Properties:</strong> ${weaponData.properties}</div>`;
    }
    
    content += `
        </div>
      </div>
    `;
    
    const rolls = [attackRoll];
    if (damageRoll) rolls.push(damageRoll);
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      rolls: rolls,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    });
  }

  async _onItemSummary(event) {
    event.preventDefault();
    const li = $(event.currentTarget).closest(".item");
    const item = this.actor.items.get(li.data("itemId"));
    
    if (!item) return;
    
    const content = await renderTemplate(`systems/godfall/templates/chat/item-card.html`, {
      item: item,
      system: item.system
    });
    
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content
    });
  }
  
  async _onEquippedToggle(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const itemId = input.name.split('.')[1];
    const item = this.actor.items.get(itemId);
    
    if (item) {
      await item.update({"system.equipped": input.checked});
    }
  }
  
  async _onVersatileToggle(event) {
    event.preventDefault();
    const input = event.currentTarget;
    const itemId = input.name.split('.')[1];
    const item = this.actor.items.get(itemId);
    
    if (item) {
      await item.update({"system.two_handed": input.checked});
    }
  }
  
  async _onAddCustomSkill(event) {
    event.preventDefault();
    const skillType = event.currentTarget.dataset.skillType;
    const fieldName = skillType === 'weapon' ? 'custom_weapon_skills' : 'custom_backgrounds';
    
    const currentSkills = this.actor.system[fieldName] || {};
    const newIndex = Object.keys(currentSkills).length;
    
    const updateData = {};
    updateData[`system.${fieldName}.${newIndex}`] = {
      name: '',
      value: 0
    };
    
    await this.actor.update(updateData);
  }
  
  async _onRemoveCustomSkill(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const skillType = event.currentTarget.dataset.skillType;
    const skillId = event.currentTarget.dataset.skillId;
    const fieldName = skillType === 'weapon' ? 'custom_weapon_skills' : 'custom_backgrounds';
    
    console.log(`Removing skill: ${skillType}, ID: ${skillId}, Field: ${fieldName}`);
    
    const currentSkills = foundry.utils.deepClone(this.actor.system[fieldName] || {});
    
    // Remove the specific skill
    delete currentSkills[skillId];
    
    // Rebuild the object with sequential indices
    const rebuiltSkills = {};
    let newIndex = 0;
    Object.values(currentSkills).forEach(skill => {
      if (skill.name || skill.value) { // Only keep non-empty skills
        rebuiltSkills[newIndex] = skill;
        newIndex++;
      }
    });
    
    const updateData = {};
    updateData[`system.${fieldName}`] = rebuiltSkills;
    
    console.log('Update data:', updateData);
    
    await this.actor.update(updateData);
  }
  
  async _onCustomSkillChange(event) {
    // This is handled automatically by Foundry's form handling
    // But we could add validation here if needed
  }
}
