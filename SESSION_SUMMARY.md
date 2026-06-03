# AI Dungeon Master — Faz 1 Oturum Özeti

## Proje Bilgileri

- **Konum:** `/Users/emrekoyuncu/Desktop/Codes/MyProjects/dungeon-game/`
- **GDD:** `/Users/emrekoyuncu/Downloads/AI_DUNGEON_MASTER_GDD.md`
- **Stack:** Saf HTML + CSS + Vanilla JS, Google Gemini 2.5 Flash API, Pollinations.ai
- **Sunucu:** `npx serve -l 7331 .` (`.claude/launch.json` mevcut)
- **Deploy:** Netlify önerilir — Vercel değil (Node.js odaklı, fazla karmaşık)

---

## Dosya Yapısı

```
dungeon-game/
├── index.html              ← 6 ekranlı SPA
├── style.css               ← Dark fantasy tema, chat bubbles
├── .claude/launch.json     ← npx serve port 7331
└── js/
    ├── data.js             ← 7 ırk, 8 sınıf inline veri (fetch yok)
    ├── character.js        ← Karakter oluşturma, stat/modifier hesaplama
    ├── dice.js             ← D20 sistemi, hasProficiency=true kullan
    ├── imageGen.js         ← Pollinations.ai URL üretimi
    ├── ai.js               ← Gemini 2.5 Flash API, JSON fallback sistemi
    ├── game.js             ← Game state yönetimi, localStorage
    ├── ui.js               ← Chat UI, dice modal, karakter panelleri
    └── main.js             ← Tüm ekran akışları, wizard, dice→AI zinciri
```

---

## Faz 1 MVP — Tamamlanan Özellikler

- **6 ekran akışı:** Menu → API Key → Lobby (1-6 oyuncu) → Karakter Wizard → Kampanya → Oyun
- **Karakter wizard (5 adım):** İsim → Irk (7) → Sınıf (8) → Stat (Roll/Standard/PointBuy) → Onay
- **7 ırk:** İnsan, Elf, Cüce, Halfling, Ork, Tiefling, Ejder Uyruklu
- **8 sınıf:** Savaşçı, Haydut, Büyücü, Rahip, Barbar, Bard, Paladin, İzci
- **Animasyonlu d20 zar** (kritik/fümble renk efekti)
- **Chat-tabanlı oyun ekranı** (DM bubble sol, oyuncu bubble sağ)
- **Gemini API entegrasyonu** (kullanıcı kendi key'ini girer, localStorage'da saklanır)
- **Pollinations.ai sahne görselleri** (DM bubble içinde lazy load)
- **localStorage kayıt/yükleme** + oyunu kaldığı yerden devam ettirme
- **Typing indicator** (DM yanıt üretirken)

---

## Düzeltilen 5 Kritik Bug

### 1. JSON Truncation (Kampanya başlamıyordu)
**Sebep:** `maxOutputTokens: 2000` çok düşüktü, Gemini yanıtı kesiyordu.  
**Düzeltme:**
- `maxOutputTokens` 2000 → **4096**
- Sistem prompt JSON şablonu kompaktlaştırıldı (tek satır)
- `AI._parseJson()` — 5 aşamalı fallback:
  1. Direkt `JSON.parse()`
  2. Markdown code fence strip
  3. `{` bloğu bulup parse
  4. Closing brace ekleme (truncated JSON için)
  5. Son `}` index'inden parse
- `AI._extractPartial()` — En kötü durumda regex ile `narrative`/`event` kurtarır

### 2. Ayarlar Butonu Oyunu Sıfırlıyordu
**Sebep:** Ayarlar → API ekranına navigate → "Devam Et" → `Game.reset()` çağrılıyordu.  
**Düzeltme:** `prompt()` dialog ile in-place key güncelleme — navigasyon yok, game state korunuyor.

### 3. Zar Sonrası Tamamen Askıda Kalma (Ana Bug)
**Sebep:** `die.classList.add('')` — zar 2-19 arası çıkınca boş string `DOMException` fırlatıyor, callback hiç çağrılmıyordu.

```js
// ÖNCE (bozuk — her normal zarda patlıyor)
die.classList.add(finalResult === 20 ? 'crit' : finalResult === 1 ? 'fumble' : '');

// SONRA (düzgün)
if (finalResult === 20) die.classList.add('crit');
else if (finalResult === 1) die.classList.add('fumble');
```

### 4. Proficiency Bonus Hiç Uygulanmıyordu
**Sebep:** `DiceSystem.check()` 5. parametresi `hasProficiency` default `false`.  
**Düzeltme:** Tüm çağrılarda `DiceSystem.check(roll, mod, profBonus, dc, true)` — FRP'de her aksiyon proficient kabul edilir.

### 5. Zar → AI Zinciri Sessiz Hata
**Sebep:** `onRoll` callback'i `async`'ti, içindeki hatalar unhandled Promise rejection olarak kayboluyordu.  
**Düzeltme:** `onRoll` sync yapıldı, 45 saniyelik safety timer eklendi.

---

## Oyun Akışı (Çalışır Durumda)

```
Menu → API Key gir → Lobby (oyuncu sayısı + isimler)
→ Karakter Wizard (her oyuncu için):
    İsim → Irk → Sınıf → Stat yöntemi seç → Onayla
→ Kampanya prompt yaz (veya hazır örnekten seç)
→ Oyun Ekranı:

  [Sol: Karakter panelleri]  [Sağ: Chat Feed]
                              ┌─────────────────────────┐
                              │ 🎲 DM  [🗺️ exploration] │ ← DM bubble
                              │ Narrative paragraflar... │
                              │ [sahne görseli]          │
                              ├─────────────────────────┤
                              │         ⚔️ Aragorn → │ ← Player bubble
                              │    "Ateşe yaklaş"        │
                              │ ❌ Zar 9+mod(3)+prof(2)  │
                              │    = 14 < DC 15          │
                              ├─────────────────────────┤
                              │ 🎲 DM  [⚔️ combat]      │ ← Yeni DM bubble
                              │ Başarısızlık anlatımı... │
                              ├─────────────────────────┤
                              │ [⚔️ combat] OLAY METNİ  │ ← Actions area
                              │ [Saldır  DC 14 · STR]   │
                              │ [Kaç     DC 12 · DEX]   │
                              ├─────────────────────────┤
                              │ [Kendi aksiyonunu yaz…] │ ← Custom input
                              └─────────────────────────┘
```

---

## Kritik Teknik Notlar

| Konu | Detay |
|------|-------|
| Gemini history formatı | `{role: "model"}` — OpenAI'daki `"assistant"` **değil** |
| Rate limit debounce | `MIN_INTERVAL_MS: 6000` — 10 req/dk limiti (GDD şartı) |
| Sistem prompt formatı | JSON şablonu tek satırda — response token tasarrufu |
| `submitAndGetEvent()` | `AI.playerAction()` direkt çağrısı, `Game.submitAction()`'ı bypass eder |
| `localStorage` key'leri | `dm_api_key`, `dm_game_state`, `dm_history`, `dm_sysprompt` |
| Sahne görselleri | Pollinations.ai — `https://image.pollinations.ai/prompt/{encoded}` |
| Proficiency | Her aksiyon için `hasProficiency: true` — FRP simplifikasyonu |

---

## Faz 2 Planları (GDD'den)

- [ ] Ses efektleri (zar, savaş, büyü)
- [ ] Inventory sistemi
- [ ] Seviye atlama
- [ ] Combat initiative tracker
- [ ] Türkçe / İngilizce dil toggle
- [ ] WebSocket multiplayer
- [ ] Electron wrapper (Steam hazırlığı)
