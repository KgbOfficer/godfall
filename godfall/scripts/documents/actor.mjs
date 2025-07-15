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
    for ( let attr of Object.values(system.attributes) ) {
      attr.mod = Math.floor((attr.value - 10) / 2);
    }

    // Calculate derived stats
    system.dv.value = 10 + system.attributes.dex.mod;
    system.hp.max = 10 + system.attributes.con.mod;
    system.wp.max = 5 + system.attributes.wis.mod;
  }
}
