// godfall/scripts/documents/item.mjs
/**
 * @extends {Item}
 */
export default class GodfallItem extends Item {
  
  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;
    const actor = this.actor;
    const system = item.system;

    // Basic template rendering data
    const templateData = {
      item: item,
      data: system,
      actor: actor
    };

    // Different item types have different roll behaviors
    if (item.type === 'weapon') {
      return this._rollWeapon(templateData);
    } else if (item.type === 'spell') {
      return this._rollSpell(templateData);
    } else {
      // Generic item use
      return this._rollGeneric(templateData);
    }
  }

  /**
   * Roll a weapon attack
   * @private
   */
  async _rollWeapon(templateData) {
    const item = this;
    const actor = this.actor;
    const system = item.system;

    // Create a simple damage roll if damage is specified
    let damageRoll = null;
    if (system.damage) {
      damageRoll = new Roll(system.damage);
      await damageRoll.evaluate();
    }

    // Create chat message
    const content = await renderTemplate('systems/godfall/templates/chat/weapon-card.html', {
      item: item,
      system: system,
      damageRoll: damageRoll
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `${item.name} Attack`,
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rolls: damageRoll ? [damageRoll] : []
    });
  }

  /**
   * Roll a spell
   * @private
   */
  async _rollSpell(templateData) {
    const item = this;
    const actor = this.actor;
    const system = item.system;

    // Create chat message
    const content = await renderTemplate('systems/godfall/templates/chat/spell-card.html', {
      item: item,
      system: system
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `${item.name} (${system.tradition})`,
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }

  /**
   * Roll a generic item
   * @private
   */
  async _rollGeneric(templateData) {
    const item = this;
    const actor = this.actor;
    const system = item.system;

    // Create chat message using the existing item card template
    const content = await renderTemplate('systems/godfall/templates/chat/item-card.html', {
      item: item,
      system: system
    });

    return ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: `${item.name}`,
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  }
}
