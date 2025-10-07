export function registerChatCommands(game) {
  game.godfall = game.godfall || {};
  game.godfall.roll = {
    check: (actor, opts) => actor.rollCheck(opts),
    attack: (actor, opts) => actor.rollAttack(opts),
    promptTargetSave: promptTargetSave
  };
}

/**
 * Prompt a save for a selected/targeted token (or roll a generic save if none is targeted).
 * saveStr examples:
 *  - "WIS vs DC 15"
 *  - "DEX vs 10 + INT"
 *  - "CON vs 8 + WIS"
 */
async function promptTargetSave(caster, { spell, saveStr }) {
  const target =
    Array.from(game.user.targets)[0]?.actor ??
    Array.from(game.canvas.tokens.controlled)[0]?.actor;

  const parsed = parseSaveFormula(saveStr || "");
  const flavorPrefix = `Save vs ${spell?.name ?? "Effect"}`;

  if (!parsed) {
    return ui.notifications.info("No save formula set. Example: WIS vs DC 15 or DEX vs 10 + INT");
  }

  const dc = computeDC(caster, parsed.dcParts);
  const label = `${flavorPrefix}: ${parsed.ability.toUpperCase()} vs DC ${dc}`;

  if (!target) {
    const roll = await new Roll(`1d20 + @mod`, { mod: abilityModFromActor(caster, parsed.ability) })
      .evaluate({ async: true });
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: caster }),
      flavor: `${label} (no target selected)`
    });
    return { dc, roll };
  }

  const saveMod = abilityModFromActor(target, parsed.ability);
  const roll = await new Roll(`1d20 + @mod`, { mod: saveMod }).evaluate({ async: true });
  const pass = roll.total >= dc;

  roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor: target }),
    flavor: `${label} — ${target.name} ${pass ? "succeeds" : "fails"}`
  });

  return { target, dc, roll, pass };
}

function abilityModFromActor(actor, abilityKey) {
  return actor?.system?.mods?.[abilityKey] ?? 0;
}

/** Parse "DEX vs 10 + INT" / "WIS vs DC 15" into { ability, dcParts:[{type,value}...] } */
function parseSaveFormula(str) {
  if (!str) return null;

  const abilMatch = str.match(/\b(str|dex|con|int|wis|cha)\b/i);
  if (!abilMatch) return null;
  const ability = abilMatch[0].toLowerCase();

  const rhs = str.split(/vs/i)[1]?.trim() ?? "";
  if (!rhs) return { ability, dcParts: [{ type: "number", value: 10 }] };

  const clean = rhs.replace(/\bdc\b/i, "").trim();

  const parts = clean
    .split(/\+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(tok => {
      const abil = tok.match(/^(str|dex|con|int|wis|cha)$/i);
      if (abil) return { type: "ability", value: abil[0].toLowerCase() };
      const num = parseInt(tok, 10);
      if (!Number.isNaN(num)) return { type: "number", value: num };
      return null;
    })
    .filter(Boolean);

  if (!parts.length) parts.push({ type: "number", value: 10 });
  return { ability, dcParts: parts };
}

function computeDC(actor, parts) {
  return parts.reduce((sum, p) => {
    if (p.type === "number") return sum + p.value;
    if (p.type === "ability") return sum + abilityModFromActor(actor, p.value);
    return sum;
  }, 0);
}
