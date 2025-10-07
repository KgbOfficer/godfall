export class GodfallCharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["godfall", "sheet", "actor"],
      width: 700,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  get template() {
    return "systems/godfall/templates/actors/character.hbs";
  }

  getData() {
    const data = super.getData();
    data.actor = this.actor;
    data.sys = this.actor.system;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;

    html.find("[data-action='roll-check']").on("click", () => {
      this.actor.rollCheck({ label: "Check", attr: "dex" });
    });

    html.find("[data-action='roll-attack']").on("click", () => {
      this.actor.rollAttack({ label: "Attack", attr: "str", damage: "1d6" });
    });
  }
}
