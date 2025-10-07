export class GodfallItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["godfall", "sheet", "item"],
      width: 520,
      height: 520
    });
  }

  get template() {
    const type = this.item.type;
    return `systems/godfall/templates/items/${type}.hbs`;
  }

  getData() {
    return super.getData();
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find("[data-action='gf-spell-attack']").on("click", async () => {
      if (this.item.type !== "spell") return;
      const actor = this.item.parent;
      if (!actor) return ui.notifications.warn("This spell must be on an Actor to roll.");
      const attr = this.item.system.attackAttr || "int";
      const dmg = this.item.system.damage || "";
      const label = `Spell Attack — ${this.item.name}`;
      await actor.rollSpellAttack({ label, attr, damage: dmg });
    });

    html.find("[data-action='gf-spell-save']").on("click", async () => {
      if (this.item.type !== "spell") return;
      const actor = this.item.parent;
      if (!actor) return ui.notifications.warn("This spell must be on an Actor to prompt a save.");
      const saveStr = (this.item.system.save || "").trim();
      await game.godfall.roll.promptTargetSave(actor, { spell: this.item, saveStr });
    });
  }
}
