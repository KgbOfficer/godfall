// godfall/scripts/sheets/item-sheet.mjs
/**
 * @extends {ItemSheet}
 */
export default class GodfallItemSheet extends foundry.applications.sheets.ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["godfall", "sheet", "item"],
      width: 520,
      height: 480
    });
  }

  /** @override */
  get template() {
    return `systems/godfall/templates/item/item-sheet.html`;
  }

  /** @override */
  async getData(options) {
    const context = await super.getData(options);
    context.system = this.item.system;
    return context;
  }
}
