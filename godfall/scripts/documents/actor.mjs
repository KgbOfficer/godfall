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

    // Calculate derived stats
    system.dv.value = 10 + system.attributes.dex.mod;
    system.hp.max = 10 + system.attributes.con.mod;
    system.wp.max = 5 + system.attributes.wis.mod;
    
    // Ensure current values don't exceed max
    system.hp.value = Math.min(system.hp.value, system.hp.max);
    system.wp.value = Math.min(system.wp.value, system.wp.max);
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Actor
   * @override
   */
  getRollData() {
    const data = super.getRollData();

    // Copy the attribute modifiers to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    return data;
  }
}
