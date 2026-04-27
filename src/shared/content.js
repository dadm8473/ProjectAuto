export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const RARITIES = {
  common: { name: 'Common', color: '#d6e5db', next: 'rare', power: 1 },
  rare: { name: 'Rare', color: '#4ecdc4', next: 'epic', power: 1.55 },
  epic: { name: 'Epic', color: '#ffcf5a', next: 'legendary', power: 2.35 },
  legendary: { name: 'Legendary', color: '#ff7a59', next: 'mythic', power: 3.6 },
  mythic: { name: 'Mythic', color: '#a77bff', next: null, power: 5.3 }
};

export const HEROES = {
  sprout: {
    id: 'sprout',
    name: 'Sprout Guard',
    rarity: 'common',
    family: 'nature',
    damage: 9,
    speed: 0.78,
    target: 'front',
    color: '#6ee787',
    shape: 'leaf',
    skill: 'Fast starter that turns bad early luck into stable clears.'
  },
  tin: {
    id: 'tin',
    name: 'Tin Knight',
    rarity: 'common',
    family: 'guard',
    damage: 12,
    speed: 1.0,
    target: 'front',
    color: '#b7c9d6',
    shape: 'shield',
    skill: 'Solid single-target pressure.'
  },
  volt: {
    id: 'volt',
    name: 'Volt Imp',
    rarity: 'rare',
    family: 'storm',
    damage: 16,
    speed: 0.52,
    target: 'lowest',
    chain: 2,
    color: '#49d7ff',
    shape: 'bolt',
    skill: 'Chains into packed lanes.'
  },
  bloom: {
    id: 'bloom',
    name: 'Bloom Witch',
    rarity: 'rare',
    family: 'nature',
    damage: 14,
    speed: 0.9,
    target: 'front',
    slow: 0.24,
    color: '#ff8bd1',
    shape: 'flower',
    skill: 'Slows bosses so both players can recover.'
  },
  cannon: {
    id: 'cannon',
    name: 'Cannon Chef',
    rarity: 'epic',
    family: 'blast',
    damage: 30,
    speed: 1.2,
    target: 'cluster',
    splash: 42,
    color: '#ff9f43',
    shape: 'burst',
    skill: 'Splash damage turns crowded waves into reward bursts.'
  },
  broker: {
    id: 'broker',
    name: 'Luck Broker',
    rarity: 'epic',
    family: 'fortune',
    damage: 7,
    speed: 1.4,
    target: 'front',
    income: 0.45,
    color: '#ffe66d',
    shape: 'coin',
    skill: 'Converts time alive into extra gold.'
  },
  oracle: {
    id: 'oracle',
    name: 'Moon Oracle',
    rarity: 'legendary',
    family: 'fortune',
    damage: 38,
    speed: 0.95,
    target: 'boss',
    crit: 0.28,
    color: '#d0a2ff',
    shape: 'moon',
    skill: 'High-roll boss killer with visible crit spikes.'
  },
  phoenix: {
    id: 'phoenix',
    name: 'Neon Phoenix',
    rarity: 'mythic',
    family: 'mythic',
    damage: 72,
    speed: 0.7,
    target: 'front',
    splash: 58,
    execute: 0.18,
    color: '#ff4d7d',
    shape: 'wing',
    skill: 'Mythic carry that executes weakened enemies.'
  }
};

export const SUMMON_TABLE = {
  common: 0.7,
  rare: 0.23,
  epic: 0.06,
  legendary: 0.01,
  mythic: 0
};

export const GAME_RULES = {
  boardSlots: 12,
  summonBaseCost: 20,
  chanceUpCost: 55,
  partnerBoostCost: 35,
  pressureLimit: 100,
  bossEvery: 5,
  bossTimer: 34,
  maxWave: 18,
  mergeCount: 3,
  pityThreshold: 7
};

export const ENEMIES = {
  creep: { hp: 42, speed: 36, reward: 4, pressure: 1, color: '#ff6b6b', radius: 8 },
  swarm: { hp: 26, speed: 50, reward: 3, pressure: 1, color: '#ffd166', radius: 7 },
  brute: { hp: 130, speed: 25, reward: 10, pressure: 3, color: '#7bdff2', radius: 12 },
  boss: { hp: 780, speed: 20, reward: 70, pressure: 12, color: '#b892ff', radius: 18 }
};

export const WAVES = [
  { creep: 18 },
  { creep: 22, swarm: 12 },
  { creep: 18, swarm: 18, brute: 3 },
  { swarm: 35, brute: 5 },
  { creep: 20, brute: 6, boss: 1 },
  { creep: 28, swarm: 25, brute: 6 },
  { swarm: 45, brute: 8 },
  { creep: 35, swarm: 20, brute: 11 },
  { swarm: 60, brute: 12 },
  { creep: 38, brute: 14, boss: 1 },
  { swarm: 68, brute: 15 },
  { creep: 48, swarm: 40, brute: 18 },
  { swarm: 76, brute: 20 },
  { creep: 58, brute: 24 },
  { swarm: 90, brute: 28, boss: 1 },
  { creep: 70, swarm: 65, brute: 30 },
  { swarm: 110, brute: 35 },
  { creep: 88, swarm: 80, brute: 42, boss: 1 }
];

export const SHOP = {
  currencies: {
    gold: { name: 'Gold', earned: true, description: 'Run resource used for summons and chance upgrades.' },
    mana: { name: 'Mana', earned: true, description: 'Co-op skill resource used for partner support.' },
    gems: { name: 'Gems', earned: true, description: 'Premium-style currency; only earned in this build.' }
  },
  items: [
    {
      id: 'lucky-cache',
      name: 'Lucky Cache',
      price: { gems: 40 },
      grant: { gold: 120, mana: 20 },
      category: 'run_boost',
      description: 'A comeback bundle for a tense run.'
    },
    {
      id: 'mythic-aura',
      name: 'Mythic Aura',
      price: { gems: 90 },
      grant: { cosmetic: 'mythic-aura' },
      category: 'cosmetic',
      description: 'Permanent-style aura unlock for mythic units.'
    },
    {
      id: 'founder-board',
      name: 'Founder Board',
      price: { gems: 140 },
      grant: { cosmetic: 'founder-board' },
      category: 'cosmetic',
      description: 'Board skin for the co-op field.'
    }
  ],
  pass: {
    id: 'season-zero',
    name: 'Season Zero: First High Roll',
    tiers: [
      { xp: 60, grant: { gems: 20 } },
      { xp: 160, grant: { cosmetic: 'golden-summon-flash' } },
      { xp: 320, grant: { gems: 80 } },
      { xp: 520, grant: { cosmetic: 'phoenix-banner' } }
    ]
  },
  dailyMissions: [
    { id: 'merge-three', text: 'Merge three units in one run.', reward: { gems: 15 } },
    { id: 'save-partner', text: 'Cast Partner Boost during a boss wave.', reward: { gems: 20 } },
    { id: 'pressure-clutch', text: 'Clear a wave above 70 pressure.', reward: { gems: 25 } }
  ]
};
