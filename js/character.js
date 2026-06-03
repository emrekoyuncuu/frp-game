const CharacterSystem = {
  getRace(id) { return RACES.find(r => r.id === id); },
  getClass(id) { return CLASSES.find(c => c.id === id); },

  getModifier(stat) {
    return Math.floor((stat - 10) / 2);
  },

  modStr(stat) {
    const m = this.getModifier(stat);
    return m >= 0 ? `+${m}` : `${m}`;
  },

  rollStats() {
    const results = [];
    for (let i = 0; i < 6; i++) {
      const rolls = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6));
      rolls.sort((a, b) => a - b);
      results.push(rolls.slice(1).reduce((a, b) => a + b, 0));
    }
    return results;
  },

  standardArray() {
    return [15, 14, 13, 12, 10, 8];
  },

  calculateHP(charClass, conModifier) {
    return charClass.hitDie + conModifier;
  },

  calculateAC(charClass, dexModifier, conModifier) {
    if (charClass.acFormula) {
      return 10 + dexModifier + conModifier;
    }
    return charClass.ac;
  },

  applyRaceBonuses(baseStats, race) {
    const result = {};
    for (const key of STAT_KEYS) {
      result[key] = (baseStats[key] || 0) + (race.stats[key] || 0);
    }
    return result;
  },

  randomSnapshot() {
    const race       = RACES[Math.floor(Math.random() * RACES.length)];
    const cls        = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const background = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    const alignment  = ALIGNMENTS[Math.floor(Math.random() * ALIGNMENTS.length)];

    const pool = this.rollStats().sort((a, b) => b - a);
    const primaryKey = cls.primaryStat.toLowerCase();
    const ordered = [primaryKey, ...STAT_KEYS.filter(k => k !== primaryKey)];
    const stats = {};
    ordered.forEach((k, i) => { stats[k] = pool[i]; });

    const names = RANDOM_NAMES[race.id] || ['Kahraman'];
    const name  = names[Math.floor(Math.random() * names.length)];

    return { name, raceId: race.id, classId: cls.id, backgroundId: background.id, alignmentId: alignment.id, stats };
  },

  createCharacter(name, raceId, classId, baseStats, backgroundId = null, alignmentId = 'true-neutral') {
    const race = this.getRace(raceId);
    const charClass = this.getClass(classId);
    const finalStats = this.applyRaceBonuses(baseStats, race);

    const conMod = this.getModifier(finalStats.con);
    const dexMod = this.getModifier(finalStats.dex);
    const maxHP = this.calculateHP(charClass, conMod);

    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name,
      race: raceId,
      class: classId,
      background: backgroundId,
      alignment: alignmentId,
      level: 1,
      hp: { current: maxHP, max: maxHP },
      stats: finalStats,
      ac: this.calculateAC(charClass, dexMod, conMod),
      proficiencyBonus: charClass.proficiencyBonus,
      inventory: [],
      conditions: [],
      spellSlots: {}
    };
  }
};
