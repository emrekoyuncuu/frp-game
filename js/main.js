// ─── Wizard State ────────────────────────────────────────────────
let lobby = { playerCount: 1, names: [], currentIndex: 0, characters: [] };

let wizard = {
  step: 1, playerIndex: 0, playerName: '',
  name: '', race: null, charClass: null, background: null, alignment: 'true-neutral',
  statMethod: null, statPool: [], statAssignment: {},
  statAssignmentMap: {}, pointBuyStats: { str:8, dex:8, con:8, int:8, wis:8, cha:8 }
};

let selectedPoolIndex = null;
let pendingDiceAction = null;

// ─── Boot ─────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  Game.init();
  AI.loadApiKey();
  AI.loadHistory();
  bindMenuScreen();
  bindApiScreen();
  bindLobbyScreen();
  bindCharacterScreen();
  bindCampaignScreen();
  bindGameScreen();
  bindDiceModal();

  if (Game.hasSavedGame() && AI.apiKey) {
    document.getElementById('continue-btn').style.display = 'inline-block';
  }
  UI.showScreen('menu');
});

// ─── Menu ─────────────────────────────────────────────────────────
function bindMenuScreen() {
  document.getElementById('new-game-btn').addEventListener('click', () => {
    if (!AI.apiKey) { UI.showScreen('api'); return; }
    Game.reset();
    UI.showScreen('lobby');
    resetLobbyUI();
  });

  document.getElementById('continue-btn').addEventListener('click', () => {
    if (!Game.hasSavedGame()) return;
    UI.showScreen('game');
    restoreGameScreen();
  });
}

// ─── API Key ──────────────────────────────────────────────────────
function bindApiScreen() {
  document.getElementById('api-back-btn').addEventListener('click', () => UI.showScreen('menu'));

  document.getElementById('api-save-btn').addEventListener('click', () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) { UI.showToast('Lütfen API anahtarınızı girin.'); return; }
    AI.setApiKey(key);
    Game.reset();
    UI.showScreen('lobby');
    resetLobbyUI();
  });
}

// ─── Lobby ────────────────────────────────────────────────────────
function bindLobbyScreen() {
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      lobby.playerCount = parseInt(btn.dataset.count);
      renderNameFields();
    });
  });

  document.getElementById('lobby-start-btn').addEventListener('click', () => {
    const inputs = [...document.querySelectorAll('.name-input')];
    const names = inputs.map(i => i.value.trim()).filter(Boolean);
    if (names.length < lobby.playerCount) {
      UI.showToast('Tüm oyuncular için isim girin.');
      return;
    }
    lobby.names = names;
    lobby.currentIndex = 0;
    lobby.characters = [];
    beginCharacterCreation(0);
  });
}

function resetLobbyUI() {
  lobby = { playerCount: 1, names: [], currentIndex: 0, characters: [] };
  document.querySelector('.count-btn[data-count="1"]')?.click();
}

function renderNameFields() {
  const container = document.getElementById('name-fields');
  container.innerHTML = '';
  for (let i = 0; i < lobby.playerCount; i++) {
    container.innerHTML += `
      <div class="name-row">
        <label>Oyuncu ${i + 1}</label>
        <input class="name-input parchment-input" type="text"
               placeholder="Oyuncu ${i + 1} adı..." maxlength="20"
               value="${lobby.names[i] || ''}">
      </div>`;
  }
}

// ─── Character Creation Wizard ────────────────────────────────────
function beginCharacterCreation(idx) {
  wizard = {
    step: 1, playerIndex: idx, playerName: lobby.names[idx],
    name: '', race: null, charClass: null, background: null, alignment: 'true-neutral',
    statMethod: null, statPool: [], statAssignment: {},
    statAssignmentMap: {}, pointBuyStats: { str:8, dex:8, con:8, int:8, wis:8, cha:8 }
  };
  selectedPoolIndex = null;
  document.getElementById('char-for-label').textContent =
    `${lobby.names[idx]} için karakter oluştur (${idx + 1}/${lobby.playerCount})`;
  renderWizardStep();
  UI.showScreen('character');
}

function bindCampaignScreen() {
  document.getElementById('campaign-back-btn').addEventListener('click', () => {
    UI.showScreen('lobby');
  });

  document.getElementById('campaign-examples').addEventListener('click', e => {
    const btn = e.target.closest('.example-btn');
    if (!btn) return;
    document.getElementById('campaign-textarea').value = btn.dataset.prompt;
  });

  document.getElementById('campaign-start-btn').addEventListener('click', async () => {
    const promptText = document.getElementById('campaign-textarea').value.trim();
    if (!promptText) { UI.showToast('Lütfen kampanya açıklaması yazın.'); return; }

    UI.showLoading('Dungeon Master dünyanı oluşturuyor...');

    const safetyTimer = setTimeout(() => {
      UI.hideLoading();
      UI.showToast('Yanıt zaman aşımına uğradı. API anahtarını kontrol edin ve tekrar deneyin.');
    }, 60_000);

    try {
      const event = await Game.startCampaign(promptText);
      clearTimeout(safetyTimer);
      UI.hideLoading();
      enterGameScreen(event);
    } catch (err) {
      clearTimeout(safetyTimer);
      UI.hideLoading();
      const msg = err.message.length > 120 ? err.message.slice(0, 120) + '…' : err.message;
      UI.showToast('Hata: ' + msg);
    }
  });
}

function bindCharacterScreen() {
  document.getElementById('char-next-btn').addEventListener('click', handleWizardNext);
  document.getElementById('char-back-btn').addEventListener('click', handleWizardBack);
  document.getElementById('char-random-btn').addEventListener('click', handleRandomCharacter);
}

function handleRandomCharacter() {
  const snap = CharacterSystem.randomSnapshot();

  // Fill wizard state
  wizard.name        = snap.name;
  wizard.race        = snap.raceId;
  wizard.charClass   = snap.classId;
  wizard.background  = snap.backgroundId;
  wizard.alignment   = snap.alignmentId;
  wizard.statMethod  = 'roll';
  wizard.statAssignment    = snap.stats;
  wizard.statAssignmentMap = {};
  wizard.statPool    = Object.values(snap.stats);

  // Jump to confirm step
  wizard.step = 6;
  renderWizardStep();
  UI.showToast(`🎲 ${snap.name} oluşturuldu!`, 'success');
}

function renderWizardStep() {
  updateStepIndicator();
  const content = document.getElementById('char-step-content');

  switch (wizard.step) {
    case 1: renderStepName(content); break;
    case 2: renderStepRace(content); break;
    case 3: renderStepClass(content); break;
    case 4: renderStepBackground(content); break;
    case 5: renderStepStats(content); break;
    case 6: renderStepConfirm(content); break;
  }

  document.getElementById('char-back-btn').style.display = wizard.step > 1 ? '' : 'none';
  document.getElementById('char-next-btn').textContent =
    wizard.step === 6 ? '✅ Karakteri Oluştur' : 'İleri →';
}

function updateStepIndicator() {
  document.querySelectorAll('.step-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i + 1 === wizard.step);
    dot.classList.toggle('done', i + 1 < wizard.step);
  });
}

function renderStepName(c) {
  c.innerHTML = `
    <h3 class="step-title">Karakterin Adı</h3>
    <p class="step-desc">Kahramanının ne adla anılmasını istersin?</p>
    <input id="name-input" class="parchment-input big-input" type="text"
           placeholder="Karakter adı..." maxlength="30" value="${wizard.name}">
  `;
}

function renderStepRace(c) {
  c.innerHTML = `
    <h3 class="step-title">Irk Seç</h3>
    <p class="step-desc">Karakterinin kökenini ve doğuştan gelen yeteneklerini belirler.</p>
    <div class="selection-grid">
      ${RACES.map(r => `
        <div class="sel-card ${wizard.race === r.id ? 'selected' : ''}" data-val="${r.id}">
          <div class="sel-emoji">${r.emoji}</div>
          <div class="sel-name">${r.name}</div>
          <div class="sel-desc">${r.description}</div>
          <div class="sel-bonus">
            ${Object.entries(r.stats).filter(([,v]) => v !== 0)
              .map(([k,v]) => `<span>${STAT_LABELS[k]} ${v > 0 ? '+' : ''}${v}</span>`).join('')}
          </div>
          <div class="sel-divider"></div>
          <div class="sel-special">✨ ${r.special}</div>
        </div>
      `).join('')}
    </div>
  `;
  c.querySelectorAll('.sel-card').forEach(card => {
    card.addEventListener('click', () => {
      c.querySelectorAll('.sel-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      wizard.race = card.dataset.val;
    });
  });
}

function renderStepBackground(c) {
  c.innerHTML = `
    <h3 class="step-title">Geçmiş Seç</h3>
    <p class="step-desc">Karakterinin maceradan önce ne yaptığını ve hangi becerileri edindiğini belirler.</p>
    <div class="selection-grid">
      ${BACKGROUNDS.map(b => `
        <div class="sel-card ${wizard.background === b.id ? 'selected' : ''}" data-val="${b.id}">
          <div class="sel-emoji">${b.emoji}</div>
          <div class="sel-name">${b.name}</div>
          <div class="sel-desc">${b.description}</div>
          <div class="sel-bonus">
            ${b.skills.map(s => `<span>📖 ${s}</span>`).join('')}
          </div>
          <div class="sel-divider"></div>
          <div class="sel-special">🏅 ${b.feature}</div>
        </div>
      `).join('')}
    </div>
  `;
  c.querySelectorAll('.sel-card').forEach(card => {
    card.addEventListener('click', () => {
      c.querySelectorAll('.sel-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      wizard.background = card.dataset.val;
    });
  });
}

function renderStepClass(c) {
  c.innerHTML = `
    <h3 class="step-title">Sınıf Seç</h3>
    <p class="step-desc">Karakterinin dövüş stilini, yeteneklerini ve ana statını belirler.</p>
    <div class="selection-grid">
      ${CLASSES.map(cl => `
        <div class="sel-card ${wizard.charClass === cl.id ? 'selected' : ''}" data-val="${cl.id}">
          <div class="sel-emoji">${cl.emoji}</div>
          <div class="sel-name">${cl.name}</div>
          <div class="sel-desc">${cl.description}</div>
          <div class="sel-bonus">
            <span>🎲 d${cl.hitDie} HP</span>
            <span>⭐ ${cl.primaryStat}</span>
          </div>
          <div class="sel-divider"></div>
          <div class="sel-special">⚔️ ${cl.special}</div>
        </div>
      `).join('')}
    </div>
  `;
  c.querySelectorAll('.sel-card').forEach(card => {
    card.addEventListener('click', () => {
      c.querySelectorAll('.sel-card').forEach(x => x.classList.remove('selected'));
      card.classList.add('selected');
      wizard.charClass = card.dataset.val;
    });
  });
}

function renderStepStats(c) {
  const cls = CLASSES.find(cl => cl.id === wizard.charClass);
  const primaryStat = cls ? cls.primaryStat : null;
  c.innerHTML = `
    <h3 class="step-title">Stat Belirleme</h3>
    ${primaryStat ? `<p class="step-desc">Seçtiğin sınıf (<strong>${cls.emoji} ${cls.name}</strong>) için önerilen ana stat: <span class="stat-recommend">${primaryStat}</span></p>` : ''}
    <div class="method-row">
      <button class="method-btn ${wizard.statMethod === 'roll' ? 'active' : ''}" data-m="roll">🎲 Zar At</button>
      <button class="method-btn ${wizard.statMethod === 'standard' ? 'active' : ''}" data-m="standard">📊 Standart Dizi</button>
      <button class="method-btn ${wizard.statMethod === 'pointbuy' ? 'active' : ''}" data-m="pointbuy">💰 Point Buy</button>
    </div>
    <div id="stats-area"></div>
  `;

  c.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      c.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      wizard.statMethod = btn.dataset.m;

      if (wizard.statMethod === 'roll') {
        wizard.statPool = CharacterSystem.rollStats();
        wizard.statAssignment = {};
        wizard.statAssignmentMap = {};
        selectedPoolIndex = null;
        renderPoolAssignment();
      } else if (wizard.statMethod === 'standard') {
        wizard.statPool = CharacterSystem.standardArray();
        wizard.statAssignment = {};
        wizard.statAssignmentMap = {};
        selectedPoolIndex = null;
        renderPoolAssignment();
      } else {
        wizard.pointBuyStats = { str:8, dex:8, con:8, int:8, wis:8, cha:8 };
        renderPointBuy();
      }
    });
  });

  if (wizard.statMethod === 'roll' || wizard.statMethod === 'standard') renderPoolAssignment();
  else if (wizard.statMethod === 'pointbuy') renderPointBuy();
}

function renderPoolAssignment() {
  const area = document.getElementById('stats-area');
  if (!area) return;

  const cls2 = CLASSES.find(cl => cl.id === wizard.charClass);
  const primaryStat = cls2 ? cls2.primaryStat : null;
  const assignedIndices = Object.values(wizard.statAssignmentMap);

  area.innerHTML = `
    <p class="pool-hint">Havuzdan bir değere tıkla, sonra stat satırına tıkla:</p>
    <div class="pool-chips">
      ${wizard.statPool.map((v, i) => `
        <button class="pool-chip ${assignedIndices.includes(i) ? 'used' : ''} ${selectedPoolIndex === i ? 'picked' : ''}"
                data-i="${i}" ${assignedIndices.includes(i) ? 'disabled' : ''}>
          ${v}
        </button>
      `).join('')}
    </div>
    <div class="stat-slots">
      ${STAT_KEYS.map(k => {
        const mapIdx = wizard.statAssignmentMap[k];
        const val = mapIdx !== undefined ? wizard.statPool[mapIdx] : null;
        const canClick = selectedPoolIndex !== null && val === null;
        const isPrimary = primaryStat && STAT_LABELS[k] === primaryStat;
        return `
          <div class="stat-slot ${val ? 'filled' : ''} ${canClick ? 'droppable' : ''} ${isPrimary ? 'primary-stat' : ''}" data-stat="${k}">
            <span class="slot-label">${STAT_LABELS[k]}${isPrimary ? ' ⭐' : ''}</span>
            <span class="slot-full">${STAT_FULL[k]}</span>
            <span class="slot-val">${val !== null ? val : '—'}</span>
            ${val !== null ? `<button class="slot-clear" data-stat="${k}">×</button>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  area.querySelectorAll('.pool-chip:not([disabled])').forEach(chip => {
    chip.addEventListener('click', () => {
      const i = parseInt(chip.dataset.i);
      selectedPoolIndex = selectedPoolIndex === i ? null : i;
      renderPoolAssignment();
    });
  });

  area.querySelectorAll('.stat-slot.droppable').forEach(slot => {
    slot.addEventListener('click', () => {
      if (selectedPoolIndex === null) return;
      const k = slot.dataset.stat;
      wizard.statAssignmentMap[k] = selectedPoolIndex;
      wizard.statAssignment[k] = wizard.statPool[selectedPoolIndex];
      selectedPoolIndex = null;
      renderPoolAssignment();
    });
  });

  area.querySelectorAll('.slot-clear').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const k = btn.dataset.stat;
      delete wizard.statAssignmentMap[k];
      delete wizard.statAssignment[k];
      selectedPoolIndex = null;
      renderPoolAssignment();
    });
  });
}

function renderPointBuy() {
  const area = document.getElementById('stats-area');
  if (!area) return;

  const pb = wizard.pointBuyStats;
  const used = Object.values(pb).reduce((s, v) => s + (POINT_BUY_COSTS[v] ?? 0), 0);
  const remaining = POINT_BUY_TOTAL - used;

  area.innerHTML = `
    <div class="pb-header">Kalan Puan: <strong class="${remaining < 0 ? 'over' : ''}">${remaining}</strong> / ${POINT_BUY_TOTAL}</div>
    <div class="pb-grid">
      ${STAT_KEYS.map(k => {
        const v = pb[k];
        const mod = CharacterSystem.getModifier(v);
        return `
          <div class="pb-row">
            <span class="pb-label">${STAT_LABELS[k]}<small>${STAT_FULL[k]}</small></span>
            <button class="pb-btn" data-stat="${k}" data-d="-1" ${v <= 8 ? 'disabled' : ''}>−</button>
            <span class="pb-val">${v} <em>${mod >= 0 ? '+' : ''}${mod}</em></span>
            <button class="pb-btn" data-stat="${k}" data-d="1" ${v >= 15 ? 'disabled' : ''}>+</button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  area.querySelectorAll('.pb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.stat;
      const d = parseInt(btn.dataset.d);
      const cur = pb[k];
      const next = cur + d;
      if (next < 8 || next > 15) return;
      const costDiff = (POINT_BUY_COSTS[next] ?? 0) - (POINT_BUY_COSTS[cur] ?? 0);
      if (used + costDiff > POINT_BUY_TOTAL) return;
      pb[k] = next;
      wizard.statAssignment = { ...pb };
      renderPointBuy();
    });
  });
}

function renderStepConfirm(c) {
  const race  = RACES.find(r => r.id === wizard.race) || {};
  const cls   = CLASSES.find(cl => cl.id === wizard.charClass) || {};
  const bg    = BACKGROUNDS.find(b => b.id === wizard.background) || {};
  const base  = wizard.statMethod === 'pointbuy' ? wizard.pointBuyStats : wizard.statAssignment;
  const final = CharacterSystem.applyRaceBonuses(base, race);
  const conMod = CharacterSystem.getModifier(final.con);
  const dexMod = CharacterSystem.getModifier(final.dex);
  const hp = CharacterSystem.calculateHP(cls, conMod);
  const ac = CharacterSystem.calculateAC(cls, dexMod, conMod);

  const statRows = STAT_KEYS.map(k => {
    const v = final[k];
    const m = CharacterSystem.getModifier(v);
    const bonus = race.stats?.[k];
    const isPrimary = cls.primaryStat === STAT_LABELS[k];
    return `<div class="conf-stat ${isPrimary ? 'conf-stat-primary' : ''}">
      <span class="cs-label">${STAT_LABELS[k]}${isPrimary ? '⭐' : ''}</span>
      <span class="cs-val">${v}</span>
      <span class="cs-mod">${m >= 0 ? '+' : ''}${m}</span>
      ${bonus ? `<span class="cs-race">${bonus > 0 ? '+' : ''}${bonus}</span>` : ''}
    </div>`;
  }).join('');

  const displayName = wizard.name || wizard.playerName;

  const alignmentGrid = ALIGNMENTS.map(a => `
    <div class="align-cell ${wizard.alignment === a.id ? 'selected' : ''}" data-id="${a.id}" title="${a.desc}">
      <span class="align-short">${a.short}</span>
      <span class="align-name">${a.name}</span>
    </div>
  `).join('');

  c.innerHTML = `
    <h3 class="step-title">Karakter Özeti</h3>
    <div class="confirm-card">
      <div class="confirm-portrait">
        <img src="${ImageGen.portrait(wizard.race, wizard.charClass)}"
             alt="portrait" loading="lazy" onerror="this.style.display='none'">
        <div class="portrait-fallback-big">${race.emoji || '👤'}${cls.emoji || '⚔️'}</div>
      </div>
      <div class="confirm-info">
        <h2 class="conf-name">${displayName}</h2>
        <p class="conf-identity">${race.emoji} ${race.name} · ${cls.emoji} ${cls.name} · ${bg.emoji || ''} ${bg.name || ''}</p>
        <div class="conf-vitals">
          <span>❤️ HP: ${hp}</span>
          <span>🛡️ AC: ${ac}</span>
          <span>🎯 Prof: +2</span>
        </div>
        <div class="conf-stats">${statRows}</div>
        <div class="conf-traits">
          <p class="conf-special">✨ ${race.special}</p>
          <p class="conf-special">⚔️ ${cls.special}</p>
          ${bg.feature ? `<p class="conf-special">🏅 ${bg.feature}</p>` : ''}
        </div>
      </div>
    </div>
    <div class="alignment-section">
      <p class="align-label">HİZA (opsiyonel — DM roleplaying için kullanır)</p>
      <div class="alignment-grid">${alignmentGrid}</div>
    </div>
  `;

  c.querySelectorAll('.align-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      c.querySelectorAll('.align-cell').forEach(x => x.classList.remove('selected'));
      cell.classList.add('selected');
      wizard.alignment = cell.dataset.id;
    });
  });
}

function handleWizardNext() {
  switch (wizard.step) {
    case 1: {
      const v = document.getElementById('name-input')?.value.trim();
      if (!v) { UI.showToast('Lütfen bir karakter adı girin.'); return; }
      wizard.name = v;
      break;
    }
    case 2:
      if (!wizard.race) { UI.showToast('Lütfen bir ırk seçin.'); return; }
      break;
    case 3:
      if (!wizard.charClass) { UI.showToast('Lütfen bir sınıf seçin.'); return; }
      break;
    case 4:
      if (!wizard.background) { UI.showToast('Lütfen bir geçmiş seçin.'); return; }
      break;
    case 5: {
      if (!wizard.statMethod) { UI.showToast('Lütfen bir stat metodu seçin.'); return; }
      const base = wizard.statMethod === 'pointbuy' ? wizard.pointBuyStats : wizard.statAssignment;
      const allFilled = STAT_KEYS.every(k => base[k] && base[k] > 0);
      if (!allFilled) { UI.showToast('Tüm statlara değer atayın.'); return; }
      break;
    }
    case 6: {
      const base = wizard.statMethod === 'pointbuy' ? wizard.pointBuyStats : wizard.statAssignment;
      const char = CharacterSystem.createCharacter(
        wizard.name || wizard.playerName,
        wizard.race,
        wizard.charClass,
        base,
        wizard.background,
        wizard.alignment
      );
      lobby.characters.push(char);

      const next = wizard.playerIndex + 1;
      if (next < lobby.playerCount) {
        beginCharacterCreation(next);
      } else {
        Game.setPlayers(lobby.characters);
        UI.showScreen('campaign');
      }
      return;
    }
  }
  wizard.step++;
  renderWizardStep();
}

function handleWizardBack() {
  if (wizard.step > 1) { wizard.step--; renderWizardStep(); }
}

// ─── Game Screen ──────────────────────────────────────────────────
function enterGameScreen(event) {
  UI.showScreen('game');
  UI.renderCharacterPanels(Game.state.players, Game.getCurrentPlayer().id);
  UI.updateCurrentPlayer(Game.getCurrentPlayer());
  document.getElementById('chat-feed').innerHTML = '';
  UI.appendDMMessage(event);
  UI.renderEventActions(event);
}

function restoreGameScreen() {
  UI.showScreen('game');
  UI.renderCharacterPanels(Game.state.players, Game.getCurrentPlayer().id);
  UI.updateCurrentPlayer(Game.getCurrentPlayer());

  // Rebuild chat from saved log
  const feed = document.getElementById('chat-feed');
  feed.innerHTML = '';
  Game.state.log.forEach(entry => {
    const msg = document.createElement('div');
    if (entry.type === 'narrative') {
      msg.className = 'chat-msg dm';
      msg.innerHTML = `
        <div class="msg-header"><span class="msg-author">🎲 Dungeon Master</span></div>
        <div class="msg-text"><p>${entry.text}</p></div>`;
    } else {
      msg.className = `chat-msg player`;
      const cls = entry.type === 'success' ? 'roll-success' : 'roll-fail';
      msg.innerHTML = `<div class="msg-text msg-dice ${cls}" style="padding:10px 14px">${entry.text}</div>`;
    }
    feed.appendChild(msg);
  });
  feed.scrollTop = feed.scrollHeight;

  if (Game.state.currentEvent) UI.renderEventActions(Game.state.currentEvent);
}

function bindGameScreen() {
  document.getElementById('action-buttons').addEventListener('click', e => {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;
    openDiceForAction({
      desc: btn.dataset.desc,
      dc: parseInt(btn.dataset.dc),
      stat: btn.dataset.stat
    });
  });

  document.getElementById('custom-action-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = document.getElementById('custom-action-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    openDiceForAction({ desc: text, dc: 0, stat: 'STR', isCustom: true });
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    const newKey = prompt('Gemini API anahtarını güncelle (iptal etmek için boş bırak):', AI.apiKey || '');
    if (newKey !== null && newKey.trim()) {
      AI.setApiKey(newKey.trim());
      UI.showToast('API anahtarı güncellendi.', 'success');
    }
  });
}

function openDiceForAction({ desc, dc, stat, isCustom = false }) {
  const player = Game.getCurrentPlayer();
  if (!player) { UI.showToast('Oyuncu bulunamadı.'); return; }

  const normalizedStat = (stat || 'STR').toUpperCase();
  const effectiveDC    = isCustom ? 12 : (parseInt(dc) || 12);

  UI.showDiceModal({
    dc: effectiveDC,
    stat: normalizedStat,
    playerName: player.name,
    onRoll: (rollResult) => {
      // SYNC callback — no silent async errors
      const statKey  = normalizedStat.toLowerCase();
      const statVal  = player.stats[statKey] ?? 10;
      const modifier = CharacterSystem.getModifier(statVal);
      const check    = DiceSystem.check(rollResult, modifier, player.proficiencyBonus, effectiveDC, true);

      UI.showDiceResult({ ...check, dc: effectiveDC });

      // After modal closes (2000ms), show player bubble then call AI
      setTimeout(() => {
        UI.appendPlayerMessage(player.name, desc, check);
        submitActionToAI({ desc, stat: normalizedStat, dc: effectiveDC, check });
      }, 2200);
    }
  });
}

async function submitActionToAI({ desc, stat, dc, check }) {
  UI.showChatLoading(true);

  const safetyTimer = setTimeout(() => {
    UI.showChatLoading(false);
    UI.showToast('Yanıt zaman aşımına uğradı. Tekrar deneyin.');
  }, 45_000);

  try {
    const player = Game.getCurrentPlayer();
    if (!player) throw new Error('Geçerli oyuncu bulunamadı.');

    const event = await submitAndGetEvent(player, desc, stat, dc, check.total, check.success);

    clearTimeout(safetyTimer);
    UI.showChatLoading(false);

    UI.renderCharacterPanels(Game.state.players, Game.getCurrentPlayer().id);
    UI.appendDMMessage(event);
    UI.renderEventActions(event);
    UI.updateCurrentPlayer(Game.getCurrentPlayer());

  } catch (err) {
    clearTimeout(safetyTimer);
    UI.showChatLoading(false);
    const msg = err.message.length > 120 ? err.message.slice(0, 120) + '…' : err.message;
    UI.showToast('DM hatası: ' + msg);
    console.error('[submitActionToAI]', err);
  }
}

async function submitAndGetEvent(player, desc, stat, dc, checkTotal, wasSuccess) {
  Game.addLog({
    type: wasSuccess ? 'success' : 'failure',
    text: `${player.name}: "${desc}" — Toplam: ${checkTotal} vs DC ${dc} ${wasSuccess ? '✅' : '❌'}`
  });

  const event = await AI.playerAction(player.name, desc, checkTotal, stat, dc, wasSuccess);

  Game.setCurrentEvent(event);
  if (event.narrative) Game.addLog({ type: 'narrative', text: event.narrative });
  Game.nextPlayer();
  Game.save();

  return event;
}

// ─── Dice Modal ───────────────────────────────────────────────────
function bindDiceModal() {
  document.getElementById('dice-modal-close').addEventListener('click', () => {
    document.getElementById('dice-modal').classList.remove('active');
  });
}

