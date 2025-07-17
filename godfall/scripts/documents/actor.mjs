// godfall/scripts/documents/actor.mjs
/**
 * @extends {Actor}
 */
export default class GodfallActor extends Actor {

  /**
   * Prepare data derived from the base actor data.
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    const system = this.system;

    // Calculate attribute modifiers
    for (let [key, attr] of Object.entries(system.attributes)) {
      attr.mod = Math.floor((attr.value - 10) / 2);
    }

    // Calculate derived stats based on archetype
    this._calculateDerivedStats();
    
    // Calculate encumbrance
    this._calculateEncumbrance();
    
    // Apply equipment bonuses
    this._applyEquipmentBonuses();
    
    // Ensure current values don't exceed max
    system.hp.value = Math.min(system.hp.value, system.hp.max);
    system.wp.value = Math.min(system.wp.value, system.wp.max);
  }

  /**
   * Calculate derived statistics based on character level and archetype
   * @private
   */
  _calculateDerivedStats() {
    const system = this.system;
    const level = system.details.level || 1;
    const archetype = system.details.archetype;

    // Base HP calculation
    let baseHP = 10 + system.attributes.con.mod;
    
    // Warrior gets +2 HP per level
    if (archetype === 'warrior') {
      baseHP += 2 * level;
    }
    
    system.hp.max = baseHP;

    // Base WP calculation - Spellcasters and Spirit-Touched can use higher of WIS or INT
    let wpMod = system.attributes.wis.mod;
    if (archetype === 'spellcaster' || archetype === 'spirit-touched') {
      wpMod = Math.max(system.attributes.wis.mod, system.attributes.int.mod);
    }
    system.wp.max = 5 + wpMod;

    // Base Defense Value
    system.dv.base = 10 + system.attributes.dex.mod;
    system.dv.value = system.dv.base + system.dv.armor + system.dv.shield;

    // Initiative
    system.initiative.value = system.attributes.dex.mod;

    // Base Evasion Bonus
    system.evasion.base = system.attributes.dex.mod;
    system.evasion.value = system.evasion.base + system.evasion.armor;
  }

  /**
   * Calculate encumbrance based on carried items
   * @private
   */
  _calculateEncumbrance() {
    const system = this.system;
    const strScore = system.attributes.str.value;
    
    // Calculate carrying capacity
    system.encumbrance.max = strScore * 10;
    
    // Calculate current weight
    let totalWeight = 0;
    for (let item of this.items) {
      if (item.system.weight && item.system.quantity) {
        totalWeight += item.system.weight * item.system.quantity;
      }
    }
    
    system.encumbrance.value = totalWeight;
    
    // Determine encumbrance level
    const lightLoad = system.encumbrance.max / 3;
    const mediumLoad = (system.encumbrance.max * 2) / 3;
    
    if (totalWeight <= lightLoad) {
      system.encumbrance.level = "light";
    } else if (totalWeight <= mediumLoad) {
      system.encumbrance.level = "medium";
    } else if (totalWeight <= system.encumbrance.max) {
      system.encumbrance.level = "heavy";
    } else {
      system.encumbrance.level = "overloaded";
    }
  }

  /**
   * Apply bonuses from equipped items
   * @private
   */
  _applyEquipmentBonuses() {
    const system = this.system;
    let armorDR = 0;
    let armorEvasionPenalty = 0;
    
    // Reset equipment bonuses
    system.dv.armor = 0;
    system.evasion.armor = 0;
    
    for (let item of this.items) {
      if (!item.system.equipped) continue;
      
      if (item.type === 'armor') {
        armorDR = Math.max(armorDR, item.system.dr || 0);
        armorEvasionPenalty = Math.min(armorEvasionPenalty, item.system.evasionPenalty || 0);
      }
    }
    
    // Apply armor penalties to evasion
    system.evasion.armor = armorEvasionPenalty;
  }

  /**
   * Make an attribute roll
   * @param {string} attributeKey - The attribute to roll (str, dex, etc.)
   * @param {object} options - Additional options for the roll
   */
  async rollAttribute(attributeKey, options = {}) {
    const attr = this.system.attributes[attributeKey];
    if (!attr) return;

    const roll = new Roll('1d20 + @mod', { mod: attr.mod });
    await roll.evaluate();

    const label = game.i18n.localize(attr.label);
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${label} Check`,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  /**
   * Make a background roll
   * @param {string} backgroundName - The name of the background
   * @param {string} attributeKey - The attribute to use for the roll
   */
  async rollBackground(backgroundName, attributeKey = 'int') {
    const background = this.system.backgrounds[backgroundName];
    if (!background) return;

    const attrMod = this.system.attributes[attributeKey].mod;
    const backgroundBonus = background.value || 0;
    const total = attrMod + backgroundBonus;

    const roll = new Roll('1d20 + @total', { total });
    await roll.evaluate();

    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${backgroundName} (${game.i18n.localize(this.system.attributes[attributeKey].label)})`,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  /**
   * Take a short rest
   */
  async shortRest() {
    const roll = new Roll('1d6');
    await roll.evaluate();
    
    const healAmount = roll.total;
    const newHP = Math.min(this.system.hp.value + healAmount, this.system.hp.max);
    
    await this.update({
      'system.hp.value': newHP
    });

    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `Short Rest - Healed ${healAmount} HP`,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  /**
   * Take a long rest
   */
  async longRest() {
    const updates = {
      'system.hp.value': this.system.hp.max,
      'system.wp.value': this.system.wp.max
    };

    // Remove most levels of exhaustion
    if (this.system.exhaustion.level > 0) {
      const newLevel = this.system.exhaustion.level === 4 ? 2 : 0; // Extreme becomes Mild, others are removed
      updates['system.exhaustion.level'] = newLevel;
    }

    await this.update(updates);

    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `${this.name} takes a long rest and recovers all HP and WP.`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Make a stabilization check when dying
   */
  async rollStabilization() {
    const currentHP = this.system.hp.value;
    const dc = 10 + Math.abs(currentHP); // DC increases with negative HP
    
    const roll = new Roll('1d20 + @con', { con: this.system.attributes.con.mod });
    await roll.evaluate();
    
    const success = roll.total >= dc;
    let message = `Stabilization Check (DC ${dc}): ${success ? 'Success' : 'Failure'}`;
    
    if (roll.dice[0].results[0].result === 20) {
      // Natural 20 - stand up with 1 HP
      await this.update({ 'system.hp.value': 1 });
      message += ' - Natural 20! Stands up with 1 HP!';
    } else if (roll.dice[0].results[0].result === 1) {
      // Natural 1 - lose 2 HP and stabilize
      await this.update({ 'system.hp.value': currentHP - 2 });
      message += ' - Natural 1! Loses 2 HP but stabilizes with permanent injury.';
    } else if (!success) {
      // Failed - lose 1 HP
      await this.update({ 'system.hp.value': currentHP - 1 });
      message += ' - Loses 1 HP.';
    }

    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: message,
      rollMode: game.settings.get('core', 'rollMode')
    });
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Actor
   * @override
   */
  getRollData() {
    const data = super.getRollData();

    // Copy the attribute modifiers to the top level
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add weapon skills to roll data
    if (data.weapon_skills) {
      for (let [k, v] of Object.entries(data.weapon_skills)) {
        data[`skill_${k}`] = v;
      }
    }

    return data;
  }
}
