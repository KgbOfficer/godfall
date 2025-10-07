export class GodfallActor extends Actor {
  /** v13: prepare data on the document itself */
  prepareData() {
    super.prepareData();
    const sys = this.system;

    // Core mods (10–11 = +0)
    const mod = a => Math.floor((a - 10) / 2);
    sys.mods = {
      str: mod(sys.attributes.str),
      dex: mod(sys.attributes.dex),
      con: mod(sys.attributes.con),
      int: mod(sys.attributes.int),
      wis: mod(sys.attributes.wis),
      cha: mod(sys.attributes.cha)
    };

    // Derived values (example mapping; adjust to your exact rules as needed)
    const level = sys.level ?? 1;
    const isWar = sys.archetype === "warrior";
    const perLevel = isWar ? 2 : 1;

    sys.derived = sys.derived || {};
    sys.derived.dv = 10 + sys.mods.dex;
    sys.derived.evasion = sys.mods.dex;
    sys.derived.initiative = sys.mods.dex;

    const baseHP = 10 + sys.mods.con;
    sys.derived.maxHP = baseHP + Math.max(0, level - 1) * perLevel;
    if (sys.derived.hp == null) sys.derived.hp = sys.derived.maxHP;

    const wpStat = (sys.archetype === "spellcaster" || sys.archetype === "spirit")
      ? Math.max(sys.mods.wis, sys.mods.int)
      : sys.mods.wis;
    sys.derived.maxWP = 5 + wpStat;
    if (sys.derived.wp == null) sys.derived.wp = sys.derived.maxWP;

    // Armor DR (highest only)
    sys.derived.dr = this.items
      .filter(i => i.type === "armor")
      .reduce((max, a) => Math.max(max, a.system?.dr ?? 0), 0);

    // Shield stats
    const shield = this.items.find(i => i.type === "shield");
    sys.derived.shield = shield ? {
      hardness: shield.system?.hardness ?? 0,
      hp: shield.system?.hp ?? 0
    } : { hardness:0, hp:0 };
  }

  /** General d20 check with optional advantage/disadvantage and DC */
  async rollCheck({label="Check", attr="dex", bonus=0, adv=0, target=null}={}) {
    const mod = this.system.mods?.[attr] ?? 0;
    const formula = adv===-1 ? "2d20kl1" : adv===1 ? "2d20kh1" : "1d20";
    const totalBonus = mod + (bonus||0);
    const roll = await new Roll(`${formula} + ${totalBonus}`).evaluate({async:true});
    const nat = roll.dice?.[0]?.results?.[0]?.result;
    const isCrit = nat === 20;
    const isFumble = nat === 1;
    const pass = Number.isFinite(target) ? roll.total >= target : null;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor:this}),
      flavor: `${label} (${attr.toUpperCase()}) ${target!=null?`vs DC ${target}`:""}`
    });
    return {roll, isCrit, isFumble, pass};
  }

  /** Weapon-style attack; applies target DR after damage */
  async rollAttack({label="Attack", attr="str", skill=0, targetToken=null, damage="1d6"}={}) {
    const attack = await this.rollCheck({label, attr, bonus:skill});
    const dmgFormula = attack.isCrit ? damage.replace(/(\d+)d(\d+)/, (m,n,d)=>`${Number(n)*2}d${d}`) : damage;
    const dmgRoll = await new Roll(dmgFormula).evaluate({async:true});

    let dr = 0;
    const tgtActor = targetToken?.actor ?? Array.from(game.user.targets)[0]?.actor ?? null;
    if (tgtActor) dr = tgtActor.system?.derived?.dr ?? 0;
    const final = Math.max(0, dmgRoll.total - dr);

    dmgRoll.toMessage({
      speaker: ChatMessage.getSpeaker({actor:this}),
      flavor:`${label} Damage (after DR ${dr}) = ${final}`
    });
    return {attack, dmgRoll, final};
  }

  /** Spend WP if available; returns true when spent */
  spendWP(amount = 1) {
    const sys = this.system;
    const cur = sys.derived?.wp ?? sys.wp ?? 0;
    if (cur < amount) {
      ui.notifications.warn(`${this.name} lacks WP (${cur}/${amount}).`);
      return false;
    }
    const path = (sys.derived?.wp !== undefined) ? "system.derived.wp" : "system.wp";
    this.update({ [path]: cur - amount });
    return true;
  }

  /** Spell attack (caster-side); doubles damage dice on crit, subtracts DR from target if present */
  async rollSpellAttack({ label = "Spell Attack", attr = "int", damage = "" } = {}) {
    const attack = await this.rollCheck({ label, attr });
    if (!damage) return attack;

    const dmgFormula = attack.isCrit ? damage.replace(/(\d+)d(\d+)/, (m,n,d)=>`${Number(n)*2}d${d}`) : damage;
    const dmgRoll = await new Roll(dmgFormula, this.getRollData()).evaluate({ async: true });

    const tgt = Array.from(game.user.targets)[0]?.actor ?? Array.from(game.canvas.tokens.controlled)[0]?.actor;
    const dr = tgt?.system?.derived?.dr ?? 0;
    const final = Math.max(0, dmgRoll.total - dr);

    dmgRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: `${label} Damage (after DR ${dr}) = ${final}`
    });

    return { attack, dmgRoll, final };
  }
}
