const AI = {
  apiKey: null,
  conversationHistory: [],
  systemPrompt: '',
  lastCallTime: 0,
  MIN_INTERVAL_MS: 6000,

  GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  setApiKey(key) {
    this.apiKey = key;
    localStorage.setItem('dm_api_key', key);
  },

  loadApiKey() {
    this.apiKey = localStorage.getItem('dm_api_key');
    return this.apiKey;
  },

  estimateTokens(history) {
    return history.reduce((sum, msg) => {
      const text = (msg.parts?.[0]?.text) || '';
      return sum + Math.ceil(text.length / 4);
    }, 0);
  },

  async compressIfNeeded() {
    const THRESHOLD = 800_000;
    if (this.estimateTokens(this.conversationHistory) < THRESHOLD) return;

    const half = Math.floor(this.conversationHistory.length / 2);
    const toSummarize = this.conversationHistory.slice(0, half);

    const summaryHistory = [
      { role: 'user', parts: [{ text: 'Şu kampanya geçmişini 500 kelimede özetle, önemli olayları ve karakter gelişimlerini koru: ' + JSON.stringify(toSummarize) }] }
    ];

    try {
      const raw = await this._fetchGemini('Sen bir masaüstü rol yapma oyunu tarihçisisin.', summaryHistory, 0.3, false);
      const summary = typeof raw === 'string' ? raw : (raw.narrative || JSON.stringify(raw));

      this.conversationHistory = [
        { role: 'user', parts: [{ text: '[KAMPANYA ÖZETİ — önceki olaylar]: ' + summary }] },
        { role: 'model', parts: [{ text: 'Özet alındı. Kampanyaya kaldığımız yerden devam ediyoruz.' }] },
        ...this.conversationHistory.slice(half)
      ];
    } catch {
      // If compression fails, just trim the history
      this.conversationHistory = this.conversationHistory.slice(half);
    }
  },

  buildSystemPrompt(players, campaignPrompt) {
    const playerList = players.map(p => {
      const mod = s => CharacterSystem.getModifier(s);
      const bg  = (typeof BACKGROUNDS !== 'undefined') ? BACKGROUNDS.find(b => b.id === p.background) : null;
      const al  = (typeof ALIGNMENTS  !== 'undefined') ? ALIGNMENTS.find(a => a.id === p.alignment)  : null;
      const extra = [
        bg  ? `Geçmiş:${bg.name}`  : '',
        al  ? `Hiza:${al.name}`    : ''
      ].filter(Boolean).join(' ');
      return `• ${p.name} (${p.race} ${p.class}${extra ? ' · ' + extra : ''}) — HP:${p.hp.current}/${p.hp.max} AC:${p.ac} | STR:${p.stats.str}(${mod(p.stats.str) >= 0 ? '+' : ''}${mod(p.stats.str)}) DEX:${p.stats.dex}(${mod(p.stats.dex) >= 0 ? '+' : ''}${mod(p.stats.dex)}) CON:${p.stats.con} INT:${p.stats.int} WIS:${p.stats.wis} CHA:${p.stats.cha}`;
    }).join('\n');

    return `Sen yetenekli, yaratıcı ve eğlenceli bir Dungeon Master'sın. D&D 5e kurallarına göre Türkçe bir masaüstü rol yapma oyunu yönetiyorsun.

KAMPANYA TANITIMI:
${campaignPrompt}

OYUNCULAR:
${playerList}

DM KURALLARI:
- Her event sonrası 2-4 aksiyon seçeneği sun (oyuncular serbest yazma da yapabilir)
- Her aksiyon için DC belirle: 5=çok kolay, 10=kolay, 15=orta, 20=zor, 25=çok zor, 30=neredeyse imkânsız
- Hangi stat kullanılacağını belirt (STR/DEX/CON/INT/WIS/CHA)
- Anlatıyı dramatik, eğlenceli ve atmosferik tut, Türkçe yaz
- Karakterlerin statlarını hikâye kararlarında hesaba kat
- %15 ihtimalle tamamen beklenmedik, komik veya şaşırtıcı bir random event ekle
- Oyuncular 0 HP'ye düşerse tehlikeli ama ölümcül olmayan durumlar yarat (Faz 1 için)

ZORUNLU JSON ÇIKTI FORMATI — SADECE JSON döndür, başka metin ekleme, markdown kullanma:
{"narrative":"Anlatım metni (2-3 paragraf, max 200 kelime)","event":"Kısa durum özeti (1 cümle)","actions":[{"description":"Aksiyon","dc":12,"stat":"STR","skill":"Athletics"},{"description":"Aksiyon","dc":15,"stat":"CHA","skill":"Persuasion"}],"imagePrompt":"English scene description","atmosphere":"combat","playerTurn":"all"}
Atmosphere: combat|exploration|social|puzzle|random`;
  },

  async _fetchGemini(systemPrompt, history, temperature = 0.9, expectJson = true, _attempt = 0) {
    const now = Date.now();
    const wait = this.MIN_INTERVAL_MS - (now - this.lastCallTime);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this.lastCallTime = Date.now();

    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: history,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature
      }
    };

    if (expectJson) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const res = await fetch(`${this.GEMINI_URL}?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Retry on 503 / 429 with exponential backoff (max 3 retries)
    if ((res.status === 503 || res.status === 429) && _attempt < 3) {
      const delay = (2 ** _attempt) * 4000; // 4s, 8s, 16s
      await new Promise(r => setTimeout(r, delay));
      return this._fetchGemini(systemPrompt, history, temperature, expectJson, _attempt + 1);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      throw new Error(`Gemini boş yanıt döndürdü (${finishReason || 'bilinmeyen sebep'})`);
    }

    if (!expectJson) return text;

    return this._parseJson(text);
  },

  _parseJson(text) {
    // 1. Direct parse
    try { return JSON.parse(text); } catch {}

    // 2. Strip markdown code fences
    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    try { return JSON.parse(stripped); } catch {}

    // 3. Extract first {...} block
    const start = stripped.indexOf('{');
    if (start !== -1) {
      const block = stripped.slice(start);
      // Try as-is
      try { return JSON.parse(block); } catch {}
      // Try closing with extra braces (truncated response)
      for (const suffix of ['}', ']}', ']}}'  ]) {
        try { return JSON.parse(block + suffix); } catch {}
      }
      // Try greedy match up to last }
      const lastBrace = block.lastIndexOf('}');
      if (lastBrace !== -1) {
        try { return JSON.parse(block.slice(0, lastBrace + 1)); } catch {}
      }
    }

    // 4. Build fallback from partial fields
    return this._extractPartial(text);
  },

  _extractPartial(text) {
    const get = (key) => {
      const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      return m ? m[1].replace(/\\n/g, '\n') : null;
    };
    const narrative = get('narrative') || get('event') || 'Dungeon Master yanıt üretiyor, lütfen tekrar deneyin.';
    const event = get('event') || narrative.slice(0, 80) + '...';
    return {
      narrative,
      event,
      actions: [
        { description: 'Devam et', dc: 10, stat: 'STR', skill: 'Athletics' },
        { description: 'Etrafı gözlemle', dc: 8, stat: 'WIS', skill: 'Perception' }
      ],
      imagePrompt: 'fantasy dungeon scene',
      atmosphere: 'exploration',
      playerTurn: 'all'
    };
  },

  async startCampaign(players, campaignPrompt) {
    this.conversationHistory = [];
    this.systemPrompt = this.buildSystemPrompt(players, campaignPrompt);

    const startMsg = 'Kampanyayı başlat. Oyuncuları tanıştıran, dünyayı betimleyen ve gerilim yaratan bir giriş sahnesi yaz. Ardından ilk eventi başlat.';
    const userMsg = { role: 'user', parts: [{ text: startMsg }] };

    const result = await this._fetchGemini(this.systemPrompt, [userMsg]);

    this.conversationHistory = [
      userMsg,
      { role: 'model', parts: [{ text: JSON.stringify(result) }] }
    ];

    return result;
  },

  async playerAction(playerName, action, rollTotal, stat, dc, wasSuccess) {
    await this.compressIfNeeded();

    const outcome = wasSuccess ? 'BAŞARI' : 'BAŞARISIZLIK';
    const msg = `${playerName} şunu yapıyor: "${action}"\nZar sonucu: ${rollTotal} (${stat} vs DC ${dc}) → ${outcome}\nBu sonuca göre hikâyeyi anlatarak devam et ve bir sonraki eventi başlat.`;

    const userMsg = { role: 'user', parts: [{ text: msg }] };
    const history = [...this.conversationHistory, userMsg];

    const result = await this._fetchGemini(this.systemPrompt, history);

    this.conversationHistory = [
      ...history,
      { role: 'model', parts: [{ text: JSON.stringify(result) }] }
    ];

    return result;
  },

  saveHistory() {
    try {
      localStorage.setItem('dm_history', JSON.stringify(this.conversationHistory));
      localStorage.setItem('dm_sysprompt', this.systemPrompt);
    } catch { /* storage full */ }
  },

  loadHistory() {
    try {
      const h = localStorage.getItem('dm_history');
      const s = localStorage.getItem('dm_sysprompt');
      if (h) this.conversationHistory = JSON.parse(h);
      if (s) this.systemPrompt = s;
    } catch { /* ignore */ }
  }
};
