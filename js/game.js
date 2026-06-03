const Game = {
  state: null,

  defaultState() {
    return {
      session: {
        id: `game_${Date.now()}`,
        campaignPrompt: '',
        currentScene: 0,
        phase: 'menu'
      },
      players: [],
      currentEvent: null,
      currentPlayerIndex: 0,
      log: []
    };
  },

  init() {
    const saved = localStorage.getItem('dm_game_state');
    if (saved) {
      try { this.state = JSON.parse(saved); return; } catch { /* ignore */ }
    }
    this.state = this.defaultState();
  },

  save() {
    try {
      localStorage.setItem('dm_game_state', JSON.stringify(this.state));
      AI.saveHistory();
    } catch { /* storage full */ }
  },

  reset() {
    this.state = this.defaultState();
    AI.conversationHistory = [];
    AI.systemPrompt = '';
    this.save();
  },

  hasSavedGame() {
    const saved = localStorage.getItem('dm_game_state');
    if (!saved) return false;
    try {
      const s = JSON.parse(saved);
      return s.session?.phase === 'game' && s.players?.length > 0;
    } catch { return false; }
  },

  setPhase(phase) {
    this.state.session.phase = phase;
    this.save();
  },

  setPlayers(players) {
    this.state.players = players;
    this.save();
  },

  setCurrentEvent(event) {
    this.state.currentEvent = event;
    this.state.session.currentScene++;
    this.save();
  },

  addLog(entry) {
    this.state.log.push({ ...entry, id: Date.now() });
    if (this.state.log.length > 500) this.state.log = this.state.log.slice(-500);
    this.save();
  },

  nextPlayer() {
    const count = this.state.players.length;
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % count;
    this.save();
  },

  getCurrentPlayer() {
    return this.state.players[this.state.currentPlayerIndex];
  },

  updatePlayerHP(playerId, delta) {
    const p = this.state.players.find(x => x.id === playerId);
    if (!p) return;
    p.hp.current = Math.max(0, Math.min(p.hp.max, p.hp.current + delta));
    this.save();
  },

  async startCampaign(campaignPrompt) {
    this.state.session.campaignPrompt = campaignPrompt;
    this.setPhase('game');
    const event = await AI.startCampaign(this.state.players, campaignPrompt);
    this.setCurrentEvent(event);
    if (event.narrative) this.addLog({ type: 'narrative', text: event.narrative });
    return event;
  },

  async submitAction(action, rollResult, stat, dc) {
    const player = this.getCurrentPlayer();
    const statVal = player.stats[stat.toLowerCase()] ?? 10;
    const modifier = CharacterSystem.getModifier(statVal);
    const check = DiceSystem.check(rollResult, modifier, player.proficiencyBonus, dc);

    this.addLog({
      type: check.success ? 'success' : 'failure',
      text: `${player.name}: "${action}" — Zar: ${rollResult} ${check.statModifier >= 0 ? '+' : ''}${check.statModifier} = ${check.total} vs DC ${dc} ${check.critical ? '⭐ Kritik!' : check.fumble ? '💀 Fümble!' : check.success ? '✅' : '❌'}`
    });

    const event = await AI.playerAction(
      player.name, action, check.total, stat, dc, check.success
    );

    this.setCurrentEvent(event);
    if (event.narrative) this.addLog({ type: 'narrative', text: event.narrative });
    this.nextPlayer();
    return { event, check };
  }
};
