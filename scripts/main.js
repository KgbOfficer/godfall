import { GODFALL } from "./config.js";
import { GodfallActor } from "./documents/actor.js";
import { GodfallItem } from "./documents/item.js";

// Correct imports
import { GodfallCharacterSheet } from "./sheets/actor-character-sheet.js";
import { GodfallItemSheet } from "./sheets/item-sheet.js";

import { registerChatCommands } from "./dice.js";

Hooks.once("init", () => {
  // Document classes
  CONFIG.Actor.documentClass = GodfallActor;
  CONFIG.Item.documentClass = GodfallItem;

  // **Critical defaults** so Actor.create({name}) always has a valid type
  CONFIG.Actor.defaultType = "character";
  CONFIG.Item.defaultType = "gear";

  // Type labels for create dialog
  CONFIG.Actor.typeLabels = { character: "Character", npc: "NPC" };

  // Classic sheet registration (stable on 13.346)
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("godfall", GodfallCharacterSheet, {
    types: ["character", "npc"],
    makeDefault: true
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("godfall", GodfallItemSheet, {
    types: ["weapon","armor","shield","gear","talent","background","spell","spiritAbility"],
    makeDefault: true
  });

  // Handlebars helpers
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("upper", s => (s ?? "").toString().toUpperCase());

  // Expose config & advertise types defensively
  game.godfall = game.godfall || {};
  game.godfall.config = GODFALL;
  game.system.documentTypes = game.system.documentTypes || {};
  game.system.documentTypes.Actor = ["character","npc"];
  game.system.documentTypes.Item = ["weapon","armor","shield","gear","talent","background","spell","spiritAbility"];

  console.log("Godfall | init complete");
});

Hooks.once("ready", () => registerChatCommands(game));

// Extra safety: if something still omits type, force default
Hooks.on("preCreateActor", (doc, data) => {
  if (!data.type) doc.updateSource({ type: CONFIG.Actor.defaultType || "character" });
});
