// godfall/scripts/godfall.js
/**
 * Godfall RPG System v2.0
 * A comprehensive system for FoundryVTT v12+ with full automation
 */

import GodfallActor from "./documents/actor.mjs";
import GodfallItem from "./documents/item.mjs";
import GodfallActorSheet from "./sheets/actor-sheet.mjs";
import GodfallItemSheet from "./sheets/item-sheet.mjs";

// Import the item data
import { godfallItemsData } from "./items-data.mjs";

Hooks.once("init", () => {
  console.log(`Godfall | Initializing Godfall RPG System v2.0`);

  // Define custom document classes
  CONFIG.Actor.documentClass = GodfallActor;
  CONFIG.Item.documentClass = GodfallItem;

  // Define custom document type labels
  CONFIG.Actor.typeLabels = {
    character: "GODFALL.TypeLabels.Character"
  };
  
  CONFIG.Item.typeLabels = {
    weapon: "GODFALL.TypeLabels.Weapon",
    armor: "GODFALL.TypeLabels.Armor",
    shield: "GODFALL.TypeLabels.Shield",
    gear: "GODFALL.TypeLabels.Gear",
    service: "GODFALL.TypeLabels.Service",
    talent: "GODFALL.TypeLabels.Talent",
    spell: "GODFALL.TypeLabels.Spell"
  };

  // Create Godfall configuration object
  CONFIG.GODFALL = {
    heritages: {
      human: "Human",
      sylvanari: "Sylvanari (Elf)",
      khazad: "Khazad (Dwarf)",
      orc: "Orc"
    },
    
    archetypes: {
      warrior: "Warrior",
      rogue: "Rogue",
      spellcaster: "Spellcaster",
      "spirit-touched": "Spirit-Touched"
    },

    weaponSkills: {
      swords: "Swords",
      axes: "Axes", 
      polearms: "Polearms",
      bows: "Bows",
      shields: "Shields"
    },

    magicTraditions: {
      general: "General",
      elemental: "Elemental",
      conjuring: "Conjuring",
      mental: "Mental",
      life: "Life",
      "spirit-touched": "Spirit-Touched"
    },

    talentTypes: {
      general: "General",
      warrior: "Warrior",
      rogue: "Rogue",
      spellcaster: "Spellcaster",
      "spirit-touched": "Spirit-Touched"
    },

    conditions: {
      blinded: "Blinded",
      bleeding: "Bleeding",
      burning: "Burning",
      confused: "Confused",
      dazed: "Dazed",
      deafened: "Deafened",
      diseased: "Diseased",
      drained: "Drained",
      ethereal: "Ethereal",
      exposed: "Exposed",
      grappled: "Grappled",
      hobbled: "Hobbled",
      immobilized: "Immobilized",
      invisible: "Invisible",
      panicked: "Panicked",
      poisoned: "Poisoned",
      scared: "Scared",
      soulbound: "Soulbound",
      unconscious: "Unconscious"
    }
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

  Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });

  Handlebars.registerHelper('gt', function(a, b) {
    return a > b;
  });

  Handlebars.registerHelper('lt', function(a, b) {
    return a < b;
  });

  Handlebars.registerHelper('and', function(a, b) {
    return a && b;
  });

  Handlebars.registerHelper('or', function(a, b) {
    return a || b;
  });

  // Register sheet application classes
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
    types: ["weapon", "armor", "shield", "gear", "service", "talent", "spell"]
  });
});

// Hook for ready - setup additional functionality
Hooks.once("ready", () => {
  console.log("Godfall | System ready");
  
  // Register automation hooks
  registerAutomationHooks();
  
  // Check if we need to import items on first world load
  checkAndImportItems();
});

/**
 * Check if items need to be imported and do so if necessary
 */
async function checkAndImportItems() {
  // Check if this is the first time loading this world with Godfall
  const importFlag = game.settings.get("godfall", "itemsImported") ?? false;
  
  if (!importFlag) {
    console.log("Godfall | First time setup - importing items...");
    
    // Show a notification
    ui.notifications.info("First time setup: Importing Godfall items...", {permanent: false});
    
    try {
      await importGodfallItems();
      
      // Set the flag so we don't import again
      await game.settings.set("godfall", "itemsImported", true);
      
      ui.notifications.info("Godfall items imported successfully!", {permanent: false});
    } catch (error) {
      console.error("Godfall | Error importing items:", error);
      ui.notifications.error("Error importing Godfall items. See console for details.", {permanent: true});
    }
  }
}

/**
 * Import all Godfall items to the Items directory
 */
async function importGodfallItems() {
  console.log("Godfall | Starting automatic items import...");
  
  // Create folders for organization
  const folders = {};
  
  // Check if folders already exist
  const existingWeaponsFolder = game.folders.find(f => f.name === "Godfall Weapons" && f.type === "Item");
  const existingArmorFolder = game.folders.find(f => f.name === "Godfall Armor" && f.type === "Item");
  const existingShieldsFolder = game.folders.find(f => f.name === "Godfall Shields" && f.type === "Item");
  const existingGearFolder = game.folders.find(f => f.name === "Godfall Gear" && f.type === "Item");
  
  folders.weapons = existingWeaponsFolder || await Folder.create({name: "Godfall Weapons", type: "Item", parent: null});
  folders.armor = existingArmorFolder || await Folder.create({name: "Godfall Armor", type: "Item", parent: null});
  folders.shields = existingShieldsFolder || await Folder.create({name: "Godfall Shields", type: "Item", parent: null});
  folders.gear = existingGearFolder || await Folder.create({name: "Godfall Gear", type: "Item", parent: null});
  
  let totalImported = 0;
  
  // Import each category
  for (const [category, items] of Object.entries(godfallItemsData)) {
    console.log(`Godfall | Importing ${category}...`);
    const folder = folders[category];
    
    for (const itemData of items) {
      // Check if item already exists
      const existingItem = game.items.find(i => i.name === itemData.name && i.folder?.id === folder.id);
      
      if (!existingItem) {
        try {
          // Add folder reference
          itemData.folder = folder.id;
          
          // Create the item
          await Item.create(itemData);
          totalImported++;
        } catch (error) {
          console.error(`Godfall | Error importing ${itemData.name}:`, error);
        }
      }
    }
  }
  
  console.log(`Godfall | Import complete. Imported ${totalImported} new items.`);
}

// Register the settings
Hooks.once("init", () => {
  // Register the import flag setting
  game.settings.register("godfall", "itemsImported", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

/**
 * Register hooks for automation features
 */
function registerAutomationHooks() {
  
  // Automatic damage tracking for weapons/armor/shields
  Hooks.on("preUpdateItem", (item, updates, options, userId) => {
    // Auto-set max HP if HP is being set but max isn't
    if (updates.system?.hp?.value && !updates.system?.hp?.max && item.system.hp?.max) {
      updates.system.hp.max = updates.system.hp.value;
    }
  });

  // Token HP/WP bar automation
  Hooks.on("preUpdateActor", (actor, updates, options, userId) => {
    // Update token bars when HP/WP changes
    if (updates.system?.hp || updates.system?.wp) {
      const tokens = actor.getActiveTokens();
      tokens.forEach(token => {
        token.object.refresh();
      });
    }
  });

  // Combat automation hooks
  Hooks.on("createCombatant", (combatant, options, userId) => {
    // Auto-roll initiative if not set
    if (combatant.actor && !combatant.initiative) {
      const initiative = combatant.actor.system.initiative.value;
      combatant.update({ initiative: initiative });
    }
  });

  // Encumbrance penalties automation
  Hooks.on("updateActor", (actor, updates, options, userId) => {
    if (updates.system?.encumbrance) {
      applyEncumbrancePenalties(actor);
    }
  });

  // Death/dying automation
  Hooks.on("updateActor", (actor, updates, options, userId) => {
    if (updates.system?.hp?.value !== undefined) {
      const newHP = updates.system.hp.value;
      const oldHP = actor.system.hp.value;
      
      // Check for dropping to 0 or below
      if (oldHP > 0 && newHP <= 0) {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          content: `<div class="godfall chat-card"><strong>${actor.name}</strong> has fallen unconscious and is dying! Make stabilization checks.</div>`,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
      }
      
      // Check for death
      const maxHP = actor.system.hp.max;
      if (newHP <= -maxHP) {
        ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor: actor }),
          content: `<div class="godfall chat-card death"><strong>${actor.name}</strong> has died!</div>`,
          type: CONST.CHAT_MESSAGE_TYPES.OTHER
        });
      }
    }
  });
}

/**
 * Apply encumbrance penalties based on load level
 */
function applyEncumbrancePenalties(actor) {
  const encumbrance = actor.system.encumbrance;
  const level = encumbrance.level;
  
  let penalty = 0;
  let movementPenalty = 1;
  
  switch (level) {
    case "medium":
      penalty = -1;
      break;
    case "heavy":
      penalty = -2;
      movementPenalty = 0.5;
      break;
    case "overloaded":
      penalty = -3;
      movementPenalty = 0.25;
      break;
  }
  
  // Apply to token if present
  const tokens = actor.getActiveTokens();
  tokens.forEach(token => {
    if (level === "heavy" || level === "overloaded") {
      token.document.update({ 
        "flags.godfall.movementPenalty": movementPenalty 
      });
    }
  });
}

// Expose utility functions globally for macros
window.Godfall = {
  
  /**
   * Quick roll for attributes
   */
  rollAttribute: async function(actorId, attribute) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    return actor.rollAttribute(attribute);
  },

  /**
   * Quick rest functions
   */
  shortRest: async function(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    return actor.shortRest();
  },

  longRest: async function(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    return actor.longRest();
  },

  /**
   * Damage item function for GMs
   */
  damageItem: async function(itemId, damage) {
    const item = game.items.get(itemId);
    if (!item) return;
    return item.damageItem(damage);
  },

  /**
   * Apply condition to actor
   */
  applyCondition: async function(actorId, condition, duration = null) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    
    const updateData = {};
    updateData[`system.conditions.${condition}`] = {
      active: true,
      duration: duration
    };
    
    await actor.update(updateData);
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `<div class="godfall chat-card">${actor.name} is now ${condition}${duration ? ` for ${duration}` : ''}.</div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  },

  /**
   * Remove condition from actor
   */
  removeCondition: async function(actorId, condition) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    
    const updateData = {};
    updateData[`system.conditions.-=${condition}`] = null;
    
    await actor.update(updateData);
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      content: `<div class="godfall chat-card">${actor.name} is no longer ${condition}.</div>`,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    });
  },
  
  /**
   * Manually trigger item import (for GMs)
   */
  importItems: async function() {
    if (!game.user.isGM) {
      ui.notifications.error("Only GMs can import items.");
      return;
    }
    
    // Reset the flag and reimport
    await game.settings.set("godfall", "itemsImported", false);
    await checkAndImportItems();
  }
};
