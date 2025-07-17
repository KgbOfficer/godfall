// godfall/scripts/documents/item.mjs
/**
 * @extends {Item}
 */
export default class GodfallItem extends Item {
  
  /**
   * Prepare derived data for the item
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();
    
    // Set max HP equal to current HP if not set
    if (this.system.hp && typeof this.system.hp === 'object') {
      if (!this.system.hp.max && this.system.hp.value) {
        this.system.hp.max = this.system.hp.value;
      }
      // Ensure current doesn't exceed max
      if (this.system.hp.max) {
        this.system.hp.value = Math.min(this.system.hp.value || this.system.hp.max, this.system.hp.max);
      }
    }
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;
    const actor = this.actor;

    // Different item types have different roll behaviors
    if (item.type === 'weapon') {
      return this._rollWeaponAttack();
    } else if (item.type === 'spell') {
      return this._rollSpell();
    } else {
      // Generic item use
      return this._rollGeneric();
    }
  }

  /**
   * Roll a weapon attack with full automation
   * @private
   */
  async _rollWeaponAttack() {
    const actor = this.actor;
    if (!actor) return;

    const system = this.system;
    const actorSystem = actor.system;
    
    // Determine attribute (STR for most, DEX for finesse/ranged)
    let attributeKey = 'str';
    if (system.properties?.toLowerCase().includes('finesse') || 
        system.properties?.toLowerCase().includes('ranged')) {
      attributeKey = 'dex';
    }
    
    // For finesse weapons, use higher of STR or DEX
    if (system.properties?.toLowerCase().includes('finesse')) {
      if (actorSystem.attributes.dex.mod > actorSystem.attributes.str.mod) {
        attributeKey = 'dex';
      }
    }

    const attributeMod = actorSystem.attributes[attributeKey].mod;
    const weaponSkillBonus = actorSystem.weapon_skills[system.weaponSkill] || 0;
    
    // Calculate attack bonus
    const attackBonus = attributeMod + weaponSkillBonus;
    
    // Make attack roll
    const attackRoll = new Roll('1d20 + @bonus', { bonus: attackBonus });
    await attackRoll.evaluate();
    
    // Determine damage formula
    let damageFormula = system.damage;
    if (system.versatile && system.twoHanded && system.versatileDamage) {
      damageFormula = system.versatileDamage;
    }
    
    // Add attribute modifier to damage if it exists
    let damageRoll = null;
    if (damageFormula) {
      const fullDamageFormula = `${damageFormula} + @attr`;
      damageRoll = new Roll(fullDamageFormula, { attr: attributeMod });
      await damageRoll.evaluate();
    }

    // Create detailed chat message
    const content = await renderTemplate('systems/godfall/templates/chat/weapon-attack.html', {
      item: this,
      actor: actor,
      attackRoll: attackRoll,
      damageRoll: damageRoll,
      attackBonus: attackBonus,
      attributeMod: attributeMod,
      weaponSkillBonus: weaponSkillBonus,
      attributeName: game.i18n.localize(actorSystem.attributes[attributeKey].label)
    });

    const rolls = [attackRoll];
    if (damageRoll) rolls.push(damageRoll);

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: content,
      rolls: rolls,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    });
  }

  /**
   * Cast a spell with WP cost tracking
   * @private
   */
  async _rollSpell() {
    const actor = this.actor;
    if (!actor) return;

    const system = this.system;
    const actorSystem = actor.system;
    const wpCost = system.cost || 0;

    // Check if actor has enough WP
    if (wpCost > 0 && actorSystem.wp.value < wpCost) {
      ui.notifications.warn("Not enough Willpower Points to cast this spell!");
      return;
    }

    // Deduct WP cost
    if (wpCost > 0) {
      await actor.update({
        'system.wp.value': actorSystem.wp.value - wpCost
      });
    }

    // Handle damage spells
    let damageRoll = null;
    if (system.scaling && system.scaling.includes('d')) {
      // This is a damage spell
      const spellcastingMod = Math.max(actorSystem.attributes.wis.mod, actorSystem.attributes.int.mod);
      
      // Scale cantrips based on level
      let damageFormula = system.scaling;
      if (system.rank === 0) {
        const level = actorSystem.details.level || 1;
        if (level >= 9) {
          damageFormula = damageFormula.replace('1d4', '1d6');
        } else if (level >= 5) {
          damageFormula += ` + ${spellcastingMod}`;
        }
      }
      
      damageRoll = new Roll(damageFormula);
      await damageRoll.evaluate();
    }

    // Create chat message
    const content = await renderTemplate('systems/godfall/templates/chat/spell-cast.html', {
      item: this,
      actor: actor,
      damageRoll: damageRoll,
      wpCost: wpCost
    });

    const rolls = damageRoll ? [damageRoll] : [];

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: content,
      rolls: rolls,
      type: damageRoll ? CONST.CHAT_MESSAGE_TYPES.ROLL : CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Roll a generic item
   * @private
   */
  async _rollGeneric() {
    const content = await renderTemplate('systems/godfall/templates/chat/item-card.html', {
      item: this,
      system: this.system
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Damage this item (for weapons/armor/shields)
   */
  async damageItem(damage) {
    if (!this.system.hp || typeof this.system.hp !== 'object') return;
    
    let actualDamage = damage;
    
    // Apply hardness for shields
    if (this.type === 'shield' && this.system.hardness) {
      actualDamage = Math.max(0, damage - this.system.hardness);
    }
    
    const newHP = Math.max(0, this.system.hp.value - actualDamage);
    await this.update({ 'system.hp.value': newHP });
    
    // Notify if item is broken
    if (newHP === 0) {
      ui.notifications.warn(`${this.name} is broken!`);
    }
    
    return actualDamage;
  }

  /**
   * Repair this item
   */
  async repairItem(amount = null) {
    if (!this.system.hp || typeof this.system.hp !== 'object') return;
    
    const repairAmount = amount || this.system.hp.max;
    const newHP = Math.min(this.system.hp.max, this.system.hp.value + repairAmount);
    
    await this.update({ 'system.hp.value': newHP });
    
    if (newHP === this.system.hp.max) {
      ui.notifications.info(`${this.name} is fully repaired.`);
    }
  }

  /**
   * Toggle equipped status and handle mutual exclusions
   */
  async toggleEquipped() {
    const actor = this.actor;
    if (!actor) return;

    const newEquippedState = !this.system.equipped;
    
    // Handle mutual exclusions for armor
    if (newEquippedState && this.type === 'armor') {
      // Unequip other armor
      for (let item of actor.items) {
        if (item.type === 'armor' && item.system.equipped && item.id !== this.id) {
          await item.update({ 'system.equipped': false });
        }
      }
    }
    
    await this.update({ 'system.equipped': newEquippedState });
    
    // Trigger actor data preparation to recalculate derived stats
    actor.prepareDerivedData();
  }
}
