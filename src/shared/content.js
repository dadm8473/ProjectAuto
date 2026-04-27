export const TOWERS = {
  pulse: {
    id: 'pulse',
    name: 'Pulse Relay',
    cost: 60,
    range: 92,
    damage: 18,
    fireRate: 1.15,
    color: '#2fd6c5',
    role: 'reliable single-target burst'
  },
  spark: {
    id: 'spark',
    name: 'Spark Fan',
    cost: 75,
    range: 76,
    damage: 8,
    fireRate: 3.2,
    color: '#ffc857',
    role: 'fast rhythm damage'
  },
  frost: {
    id: 'frost',
    name: 'Frost Anchor',
    cost: 90,
    range: 82,
    damage: 9,
    fireRate: 0.85,
    slow: 0.42,
    slowTime: 1.35,
    color: '#8fd3ff',
    role: 'control and setup'
  }
};

export const ENEMIES = {
  runner: { hp: 42, speed: 54, reward: 8, damage: 1, color: '#ff6b6b', radius: 10 },
  brute: { hp: 125, speed: 32, reward: 18, damage: 2, color: '#b069ff', radius: 14 },
  shield: { hp: 82, speed: 40, reward: 13, damage: 1, color: '#f7f1a8', radius: 12 }
};

export const LEVELS = [
  {
    id: 'harbor-spiral',
    name: 'Harbor Spiral',
    bounds: { w: 390, h: 720 },
    baseHp: 24,
    startScrap: 180,
    startCores: 25,
    path: [
      { x: 20, y: 88 },
      { x: 116, y: 88 },
      { x: 116, y: 180 },
      { x: 286, y: 180 },
      { x: 286, y: 286 },
      { x: 88, y: 286 },
      { x: 88, y: 420 },
      { x: 320, y: 420 },
      { x: 320, y: 560 },
      { x: 194, y: 650 }
    ],
    buildPads: [
      { x: 90, y: 210 }, { x: 176, y: 134 }, { x: 252, y: 118 },
      { x: 210, y: 244 }, { x: 334, y: 238 }, { x: 156, y: 354 },
      { x: 300, y: 350 }, { x: 130, y: 492 }, { x: 244, y: 504 },
      { x: 338, y: 630 }
    ],
    waves: [
      { runner: 12 },
      { runner: 15, shield: 4 },
      { runner: 18, shield: 7 },
      { runner: 10, shield: 8, brute: 3 },
      { shield: 12, brute: 5 },
      { runner: 24, brute: 7 },
      { runner: 22, shield: 12, brute: 9 }
    ]
  },
  {
    id: 'neon-garden',
    name: 'Neon Garden',
    bounds: { w: 390, h: 720 },
    baseHp: 26,
    startScrap: 190,
    startCores: 25,
    path: [
      { x: 18, y: 132 },
      { x: 224, y: 132 },
      { x: 224, y: 232 },
      { x: 72, y: 232 },
      { x: 72, y: 360 },
      { x: 314, y: 360 },
      { x: 314, y: 492 },
      { x: 154, y: 492 },
      { x: 154, y: 642 },
      { x: 314, y: 662 }
    ],
    buildPads: [
      { x: 90, y: 74 }, { x: 170, y: 194 }, { x: 292, y: 188 },
      { x: 132, y: 304 }, { x: 248, y: 300 }, { x: 348, y: 424 },
      { x: 246, y: 552 }, { x: 82, y: 554 }, { x: 308, y: 624 }
    ],
    waves: [
      { runner: 10, shield: 3 },
      { runner: 18, shield: 5 },
      { runner: 12, brute: 4 },
      { runner: 20, shield: 8, brute: 4 },
      { shield: 15, brute: 7 },
      { runner: 28, shield: 12, brute: 8 }
    ]
  }
];

export const SHOP = {
  currencies: {
    scrap: { name: 'Scrap', earned: true, description: 'Match resource shared by the squad.' },
    cores: { name: 'Cores', earned: true, description: 'Premium-style currency earned in play; platform billing can fund it later.' }
  },
  items: [
    {
      id: 'starter-cache',
      name: 'Starter Cache',
      price: { cores: 50 },
      grant: { scrap: 100 },
      category: 'boost',
      description: 'A co-op comeback bundle for the current run.'
    },
    {
      id: 'relay-skin-seafoam',
      name: 'Seafoam Relay Skin',
      price: { cores: 90 },
      grant: { cosmetic: 'seafoam' },
      category: 'cosmetic',
      description: 'Account cosmetic structure; local unlock in this build.'
    }
  ],
  pass: {
    id: 'founder-pass',
    name: 'Founder Route',
    tiers: [
      { xp: 50, grant: { cores: 20 } },
      { xp: 140, grant: { cosmetic: 'amber-trail' } },
      { xp: 260, grant: { cores: 60 } }
    ]
  },
  dailyMissions: [
    { id: 'hold-line', text: 'Clear wave 3 with the base above 15 HP.', reward: { cores: 15 } },
    { id: 'dual-build', text: 'Both players build at least two towers.', reward: { cores: 15 } }
  ]
};
