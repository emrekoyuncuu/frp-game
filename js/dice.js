const DiceSystem = {
  roll(sides) {
    return Math.ceil(Math.random() * sides);
  },

  rollMultiple(count, sides) {
    return Array.from({ length: count }, () => this.roll(sides));
  },

  check(dieResult, statModifier, proficiencyBonus, dc, hasProficiency = false) {
    const profBonus = hasProficiency ? proficiencyBonus : 0;
    const total = dieResult + statModifier + profBonus;
    return {
      success: dieResult === 20 || (dieResult !== 1 && total >= dc),
      critical: dieResult === 20,
      fumble: dieResult === 1,
      total,
      dc,
      dieResult,
      statModifier,
      profBonus
    };
  }
};
