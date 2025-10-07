export const GODFALL = {
  attributes: ["str","dex","con","int","wis","cha"],
  itemTypes: ["weapon","armor","shield","gear","talent","background","spell","spiritAbility"],
  // DCs as quick reference
  dcs: { easy:10, moderate:15, hard:20, extreme:25 },
  // Armor DR table helpers (does not change DV)
  armorProps: { drKey: "system.dr" },
  // Criticals
  crit: { nat20: true, nat1: true }
};
