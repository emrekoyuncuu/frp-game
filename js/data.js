const RACES = [
  {
    id: "human", name: "İnsan", emoji: "👤",
    description: "Çok yönlü ve uyumlu bir ırk. Her alanda yetkin.",
    stats: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    special: "Çok Yönlülük: Herhangi bir stata +2 bonus"
  },
  {
    id: "elf", name: "Elf", emoji: "🧝",
    description: "Zarif ve uzun ömürlü bir ırk. Büyü ve çeviklikte üstün.",
    stats: { str: 0, dex: 2, con: 0, int: 1, wis: 1, cha: 1 },
    special: "Karanlık Görüşü · Büyüye Direnç"
  },
  {
    id: "dwarf", name: "Cüce", emoji: "⛏️",
    description: "Dayanıklı ve inatçı bir ırk. Güç ve CON'da üstün.",
    stats: { str: 2, dex: -1, con: 2, int: 0, wis: 1, cha: 0 },
    special: "Zehir Direnci · Taş Bilgisi"
  },
  {
    id: "halfling", name: "Halfling", emoji: "🍀",
    description: "Küçük ve şanslı bir ırk. Gizlenme ve çeviklikte usta.",
    stats: { str: 0, dex: 2, con: 0, int: 0, wis: 1, cha: 1 },
    special: "Şans (1/gün yeniden at) · Doğal Gizlenme"
  },
  {
    id: "orc", name: "Ork", emoji: "💪",
    description: "Güçlü ve savaşçı bir ırk. Ham güçte rakipsiz.",
    stats: { str: 3, dex: 0, con: 2, int: -1, wis: 0, cha: -1 },
    special: "Vahşi Saldırı · Ölüm Direnci"
  },
  {
    id: "tiefling", name: "Tiefling", emoji: "😈",
    description: "Şeytan kanı taşıyan gizemli bir ırk. Karizma ve büyüde güçlü.",
    stats: { str: 0, dex: 1, con: 0, int: 1, wis: 0, cha: 2 },
    special: "Karanlık Vizyon · Ateş Direnci"
  },
  {
    id: "dragonborn", name: "Ejder Uyruklu", emoji: "🐉",
    description: "Ejderha kanı taşıyan asil bir ırk. Çok yönlü ve güçlü.",
    stats: { str: 1, dex: 0, con: 1, int: 1, wis: 0, cha: 1 },
    special: "Nefes Silahı (element seç)"
  }
];

const CLASSES = [
  {
    id: "fighter", name: "Savaşçı", emoji: "⚔️",
    primaryStat: "STR", hitDie: 10, ac: 16, proficiencyBonus: 2,
    description: "Dövüş sanatlarında uzmanlaşmış güçlü bir savaşçı.",
    special: "Ekstra Saldırı · Action Surge"
  },
  {
    id: "rogue", name: "Haydut", emoji: "🗡️",
    primaryStat: "DEX", hitDie: 8, ac: 14, proficiencyBonus: 2,
    description: "Gizlilik ve hilede uzmanlaşmış hızlı bir savaşçı.",
    special: "Hain Saldırı · Çabuk Refleks"
  },
  {
    id: "wizard", name: "Büyücü", emoji: "🧙",
    primaryStat: "INT", hitDie: 6, ac: 11, proficiencyBonus: 2,
    description: "Arcane büyülerde uzmanlaşmış güçlü bir sihirbaz.",
    special: "Büyü Yuvası · Büyü Kitabı"
  },
  {
    id: "cleric", name: "Rahip", emoji: "✨",
    primaryStat: "WIS", hitDie: 8, ac: 13, proficiencyBonus: 2,
    description: "İlahi güçlerde uzmanlaşmış şifacı bir din adamı.",
    special: "İyileştirme · Kutsal Alan"
  },
  {
    id: "barbarian", name: "Barbar", emoji: "🪓",
    primaryStat: "STR", hitDie: 12, ac: 0, proficiencyBonus: 2,
    description: "Öfke ve ham güce dayalı vahşi bir savaşçı.",
    special: "Öfke · Acımasız Saldırı",
    acFormula: "10+DEX+CON"
  },
  {
    id: "bard", name: "Bard", emoji: "🎵",
    primaryStat: "CHA", hitDie: 8, ac: 12, proficiencyBonus: 2,
    description: "Müzik ve büyüde uzmanlaşmış karizmatik bir sanatçı.",
    special: "İlham · Büyü Çalma"
  },
  {
    id: "paladin", name: "Paladin", emoji: "🛡️",
    primaryStat: "STR", hitDie: 10, ac: 18, proficiencyBonus: 2,
    description: "İlahi destekli adaletli bir şövalye.",
    special: "Kutsal Darbe · Şifa Eli"
  },
  {
    id: "ranger", name: "İzci", emoji: "🏹",
    primaryStat: "DEX", hitDie: 10, ac: 14, proficiencyBonus: 2,
    description: "Doğa ve izcilik konularında uzmanlaşmış bir avcı.",
    special: "Favori Düşman · Doğa Sezgisi"
  }
];

const BACKGROUNDS = [
  {
    id: 'soldier', name: 'Asker', emoji: '⚔️',
    description: 'Savaş alanlarında pişmiş, disiplinli ve güçlü bir savaşçı.',
    skills: ['Athletics', 'Intimidation'],
    feature: 'Askeri Rütbe: Askeri üs ve birliklerden destek alabilirsin'
  },
  {
    id: 'scholar', name: 'Bilgin', emoji: '📚',
    description: 'Kadim bilgileri araştıran, derin bilgi sahibi meraklı bir akademisyen.',
    skills: ['History', 'Investigation'],
    feature: 'Araştırmacı: Kütüphane ve akademilere ücretsiz erişim'
  },
  {
    id: 'criminal', name: 'Suçlu', emoji: '🗡️',
    description: 'Yeraltı dünyasında büyümüş, gizlilik ve hile konusunda usta.',
    skills: ['Stealth', 'Deception'],
    feature: 'Suç Bağlantıları: Kara pazara ve yeraltı örgütlerine erişim'
  },
  {
    id: 'traveler', name: 'Gezgin', emoji: '🗺️',
    description: 'Binlerce mil yol kat etmiş, doğayı içgüdüsel bilen yolcu.',
    skills: ['Survival', 'Perception'],
    feature: "Gezgin'in Sezgisi: Kaybolmazsın, hava durumunu sezinlersin"
  },
  {
    id: 'noble', name: 'Asil', emoji: '👑',
    description: 'Soylu bir ailede büyümüş, görgü ve siyaset konusunda deneyimli.',
    skills: ['History', 'Persuasion'],
    feature: 'Ayrıcalıklı Konum: Soylular ve saray çevresi seni kabul eder'
  },
  {
    id: 'merchant', name: 'Tüccar', emoji: '💰',
    description: 'Pazarlık sanatında usta, geniş ticari ağlara sahip iş insanı.',
    skills: ['Insight', 'Persuasion'],
    feature: 'Pazar Bağlantıları: Nadir eşyalara normal fiyatın altında ulaşırsın'
  },
  {
    id: 'acolyte', name: 'Rahiplik Adayı', emoji: '🕊️',
    description: 'Tanrıya adanmış, tapınakta yetişmiş inançlı bir din adamı.',
    skills: ['Insight', 'Religion'],
    feature: 'Sığınak: Tapınaklarda ücretsiz barınak ve yemek bulabilirsin'
  },
  {
    id: 'folk-hero', name: 'Halk Kahramanı', emoji: '🌾',
    description: 'Köyünü bir felaketten kurtarmış, halkın kalbinde yer eden sıradan kahraman.',
    skills: ['Animal Handling', 'Survival'],
    feature: "Halkın Sempatisi: Köylüler seni korur, saklar ve destekler"
  }
];

const ALIGNMENTS = [
  { id: 'lawful-good',     name: 'Düzenci İyi',       short: 'Dİ', desc: 'Yasa ve ahlak çerçevesinde iyilik yapar' },
  { id: 'neutral-good',    name: 'Tarafsız İyi',       short: 'Tİ', desc: 'İyilik için en doğru yolu seçer' },
  { id: 'chaotic-good',    name: 'Kaotik İyi',         short: 'Kİ', desc: 'Özgürlükçü ama iyi kalpli' },
  { id: 'lawful-neutral',  name: 'Düzenci Tarafsız',   short: 'DT', desc: 'Yasa ve düzeni her şeyin üstünde tutar' },
  { id: 'true-neutral',    name: 'Gerçek Tarafsız',    short: 'GT', desc: 'Dengeyi korur, taraf tutmaz' },
  { id: 'chaotic-neutral', name: 'Kaotik Tarafsız',    short: 'KT', desc: 'Özgürlük ve keyfi her şeyin önünde' },
  { id: 'lawful-evil',     name: 'Düzenci Kötü',       short: 'DK', desc: 'Kural ve yasayla kötülük işler' },
  { id: 'neutral-evil',    name: 'Tarafsız Kötü',      short: 'TK', desc: 'Sadece kendi çıkarını düşünür' },
  { id: 'chaotic-evil',    name: 'Kaotik Kötü',        short: 'KK', desc: 'Tamamen kaotik, acımasız ve tahmin edilemez' }
];

const RANDOM_NAMES = {
  human:     ['Aldric', 'Mira', 'Gareth', 'Lena', 'Edric', 'Vala', 'Dorian', 'Sera'],
  elf:       ['Aelindra', 'Sylvanos', 'Eryndel', 'Caladwen', 'Thalion', 'Nimriel', 'Erevan', 'Lúthiel'],
  dwarf:     ['Dolgrin', 'Brynna', 'Thorek', 'Hilda', 'Gimrak', 'Brunhild', 'Balin', 'Dagna'],
  halfling:  ['Milo', 'Rosie', 'Tobias', 'Petra', 'Finnan', 'Calla', 'Merric', 'Lidda'],
  orc:       ['Grommash', 'Gorgona', 'Brulfar', 'Krulla', 'Vorgak', 'Shraka', 'Durgan', 'Mora'],
  tiefling:  ['Zephyros', 'Lilith', 'Malachar', 'Selene', 'Damakos', 'Kallista', 'Zariel', 'Nemeia'],
  dragonborn:['Arjhan', 'Biri', 'Donaar', 'Farideh', 'Ghesh', 'Havilar', 'Kriv', 'Mishann']
};

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const STAT_FULL  = { str: 'Güç', dex: 'Çeviklik', con: 'Dayanıklılık', int: 'Zeka', wis: 'Bilgelik', cha: 'Karizma' };

const ATMOSPHERE_EMOJI = {
  combat: '⚔️', exploration: '🗺️', social: '💬', puzzle: '🧩', random: '🎲'
};

const POINT_BUY_COSTS = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };
const POINT_BUY_TOTAL = 27;
