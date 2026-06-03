const UI = {
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(`screen-${id}`)?.classList.add('active');
  },

  showLoading(msg = 'Dungeon Master düşünüyor...') {
    document.getElementById('loading-overlay').classList.add('active');
    document.getElementById('loading-text').textContent = msg;
  },

  hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
  },

  showToast(msg, type = 'error') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast active toast-${type}`;
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('active'), 4000);
  },

  renderCharacterPanels(players, activeId) {
    const container = document.getElementById('character-panels');
    container.innerHTML = players.map(p => this._buildPanel(p, p.id === activeId)).join('');
  },

  _buildPanel(p, isActive) {
    const cls  = CLASSES.find(c => c.id === p.class) || {};
    const race = RACES.find(r => r.id === p.race) || {};
    const hpPct = Math.round((p.hp.current / p.hp.max) * 100);
    const hpClass = hpPct > 60 ? 'hp-good' : hpPct > 30 ? 'hp-warn' : 'hp-danger';

    const stats = STAT_KEYS.map(k => {
      const v = p.stats[k];
      const m = CharacterSystem.getModifier(v);
      return `<div class="stat-cell"><span class="stat-label">${STAT_LABELS[k]}</span><span class="stat-val">${v}</span><span class="stat-mod">${m >= 0 ? '+' : ''}${m}</span></div>`;
    }).join('');

    return `
      <div class="char-panel ${isActive ? 'active-player' : ''}" data-id="${p.id}">
        <div class="char-portrait">
          <img src="${ImageGen.portrait(p.race, p.class)}" alt="${p.name}"
               loading="lazy" onerror="this.style.display='none'">
          <div class="portrait-fallback">${race.emoji || '👤'}${cls.emoji || '⚔️'}</div>
        </div>
        <div class="char-name">${p.name}</div>
        <div class="char-sub">${race.name || p.race} · ${cls.name || p.class}</div>
        <div class="hp-row ${hpClass}">
          <div class="hp-bar"><div class="hp-fill" style="width:${hpPct}%"></div></div>
          <span>HP ${p.hp.current}/${p.hp.max}</span>
        </div>
        <div class="ac-badge">AC ${p.ac}</div>
        <div class="stat-grid">${stats}</div>
        ${isActive ? '<div class="active-badge">⚡ Sıra</div>' : ''}
      </div>
    `;
  },

  // ── Chat feed ───────────────────────────────────────────────────

  appendDMMessage(event) {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;

    const atmo    = event.atmosphere || 'exploration';
    const emoji   = ATMOSPHERE_EMOJI[atmo] || '🎲';
    const paras   = (event.narrative || '')
      .split('\n\n').filter(p => p.trim())
      .map(p => `<p>${p.trim()}</p>`).join('');

    const msg = document.createElement('div');
    msg.className = 'chat-msg dm';

    // Scene image inside message
    let imgHtml = '';
    if (event.imagePrompt) {
      const src = ImageGen.scene(event.imagePrompt);
      imgHtml = `<img class="msg-img" src="${src}" loading="lazy" onerror="this.remove()" alt="Sahne">`;
    }

    msg.innerHTML = `
      <div class="msg-header">
        <span class="msg-author">🎲 Dungeon Master</span>
        <span class="atmo-badge atmo-${atmo}">${emoji} ${atmo}</span>
      </div>
      ${imgHtml}
      <div class="msg-text">${paras}</div>
    `;

    feed.appendChild(msg);
    this._scrollFeed(feed);
  },

  appendPlayerMessage(playerName, actionDesc, check) {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;

    const msg = document.createElement('div');
    msg.className = 'chat-msg player';

    let rollClass = check.success ? 'roll-success' : 'roll-fail';
    if (check.critical) rollClass = 'roll-crit';
    if (check.fumble)   rollClass = 'roll-fumble';

    let rollText;
    if (check.critical)     rollText = `⭐ Kritik Başarı! (20 → Otomatik)`;
    else if (check.fumble)  rollText = `💀 Kritik Başarısızlık! (1 → Otomatik)`;
    else if (check.success) rollText = `✅ Zar ${check.dieResult} + mod(${check.statModifier}) + prof(${check.profBonus}) = <strong>${check.total}</strong> ≥ DC ${check.dc}`;
    else                    rollText = `❌ Zar ${check.dieResult} + mod(${check.statModifier}) + prof(${check.profBonus}) = <strong>${check.total}</strong> < DC ${check.dc}`;

    msg.innerHTML = `
      <div class="msg-header">
        <span class="msg-author player-author">⚔️ ${playerName}</span>
      </div>
      <div class="msg-action-text">"${actionDesc}"</div>
      <div class="msg-dice ${rollClass}">${rollText}</div>
    `;

    feed.appendChild(msg);
    this._scrollFeed(feed);
  },

  showChatLoading(show) {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;

    // Remove any existing typing indicator
    feed.querySelectorAll('.chat-loading').forEach(el => el.remove());

    if (show) {
      const el = document.createElement('div');
      el.className = 'chat-msg dm chat-loading';
      el.innerHTML = `
        <div class="msg-header"><span class="msg-author">🎲 Dungeon Master</span></div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
      `;
      feed.appendChild(el);
      this._scrollFeed(feed);
    }
  },

  _scrollFeed(feed) {
    requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  },

  // ── Event / actions area (bottom panel) ────────────────────────

  renderEventActions(event) {
    const atmoEl = document.getElementById('atmosphere-badge');
    if (atmoEl) {
      const atmo = event.atmosphere || 'exploration';
      atmoEl.textContent = `${ATMOSPHERE_EMOJI[atmo] || '🎲'} ${atmo}`;
      atmoEl.className = `atmo-badge atmo-${atmo}`;
    }

    const eventEl = document.getElementById('event-text');
    if (eventEl) eventEl.textContent = event.event || '';

    const actionsEl = document.getElementById('action-buttons');
    if (actionsEl) {
      actionsEl.innerHTML = (event.actions || []).map((a, i) => `
        <button class="action-btn" data-index="${i}"
                data-dc="${a.dc}" data-stat="${a.stat}" data-skill="${a.skill || ''}"
                data-desc="${(a.description || '').replace(/"/g, '&quot;')}">
          <span class="action-text">${a.description}</span>
          <span class="action-meta">DC ${a.dc} · ${a.stat}</span>
        </button>
      `).join('');
    }
  },

  // ── Dice modal ──────────────────────────────────────────────────

  showDiceModal({ dc, stat, playerName, onRoll }) {
    const modal = document.getElementById('dice-modal');
    modal.classList.add('active');
    document.getElementById('dice-dc-val').textContent = dc === 0 ? '?' : dc;
    document.getElementById('dice-stat-val').textContent = stat;
    document.getElementById('dice-player-name').textContent = playerName;
    document.getElementById('dice-result-area').textContent = '';
    document.getElementById('dice-display').textContent = '20';
    document.getElementById('dice-display').className = 'dice-display';

    const rollBtn = document.getElementById('roll-btn');
    const newBtn  = rollBtn.cloneNode(true);
    newBtn.disabled = false;
    rollBtn.parentNode.replaceChild(newBtn, rollBtn);

    newBtn.addEventListener('click', () => {
      newBtn.disabled = true;
      const result = DiceSystem.roll(20);
      this._animateDice(result, () => onRoll(result));
    });
  },

  _animateDice(finalResult, callback) {
    const die = document.getElementById('dice-display');
    die.classList.add('rolling');
    let tick = 0;

    const interval = setInterval(() => {
      die.textContent = Math.ceil(Math.random() * 20);
      tick++;
      if (tick >= 20) {
        clearInterval(interval);
        die.textContent = finalResult;
        die.classList.remove('rolling');
        // FIX: classList.add('') throws DOMException — only add non-empty class
        if (finalResult === 20) die.classList.add('crit');
        else if (finalResult === 1) die.classList.add('fumble');
        setTimeout(callback, 600);
      }
    }, 70);
  },

  showDiceResult({ dieResult, total, dc, success, critical, fumble }) {
    const el = document.getElementById('dice-result-area');
    if (!el) return;

    let text;
    if (critical)    text = `⭐ KRİTİK BAŞARI! (20 → Otomatik)`;
    else if (fumble) text = `💀 KRİTİK BAŞARISIZLIK! (1 → Otomatik)`;
    else if (success) text = `✅ Başarı! (${dieResult} + mod = ${total} ≥ DC ${dc})`;
    else              text = `❌ Başarısız. (${dieResult} + mod = ${total} < DC ${dc})`;

    el.textContent = text;
    el.className = `dice-result-area ${success ? 'result-success' : 'result-fail'}`;

    setTimeout(() => {
      const modal = document.getElementById('dice-modal');
      if (modal) modal.classList.remove('active');
    }, 2000);
  },

  // ── Player indicator ────────────────────────────────────────────

  updateCurrentPlayer(player) {
    const indicator = document.getElementById('current-player-indicator');
    if (indicator) indicator.textContent = `⚡ ${player.name}'ın sırası`;

    document.querySelectorAll('.char-panel').forEach(p => {
      p.classList.toggle('active-player', p.dataset.id === player.id);
    });

    document.querySelectorAll('.active-badge').forEach(b => b.remove());
    const activePanel = document.querySelector(`.char-panel[data-id="${player.id}"]`);
    if (activePanel) {
      const badge = document.createElement('div');
      badge.className = 'active-badge';
      badge.textContent = '⚡ Sıra';
      activePanel.appendChild(badge);
    }
  }
};
