// godfall/scripts/godfall.js
/**
 * Godfall RPG
 * A system for FoundryVTT v12+
 */

import GodfallActor from "./documents/actor.mjs";
import GodfallItem from "./documents/item.mjs";
import GodfallActorSheet from "./sheets/actor-sheet.mjs";
import GodfallItemSheet from "./sheets/item-sheet.mjs";

Hooks.once("init", () => {
  console.log(`Godfall | Initializing Godfall RPG System`);

  // Define custom document classes.
  CONFIG.Actor.documentClass = GodfallActor;
  CONFIG.Item.documentClass = GodfallItem;

  // Define custom document type labels.
  CONFIG.Actor.typeLabels = {
    character: "GODFALL.TypeLabels.Character"
  };
  CONFIG.Item.typeLabels = {
    item: "GODFALL.TypeLabels.Item",
    weapon: "GODFALL.TypeLabels.Weapon",
    armor: "GODFALL.TypeLabels.Armor",
    shield: "GODFALL.TypeLabels.Shield",
    talent: "GODFALL.TypeLabels.Talent",
    spell: "GODFALL.TypeLabels.Spell"
  };

  // Register Handlebars helpers
  Handlebars.registerHelper('replace', function(str, search, replace) {
    if (typeof str !== 'string') return str;
    return str.replace(new RegExp(search, 'g'), replace);
  });

  Handlebars.registerHelper('titleCase', function(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  });

  // Register sheet application classes.
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("godfall", GodfallActorSheet, {
    makeDefault: true,
    label: "GODFALL.SheetLabels.Character",
    types: ["character"]
  });

  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("godfall", GodfallItemSheet, {
    makeDefault: true,
    label: "GODFALL.SheetLabels.Item",
    types: ["item", "weapon", "armor", "shield", "talent", "spell"]
  });
});
