export const GRADE_ORDER = ['Basic', 'Tuned', 'Prime', 'Core', 'Origin'];

export const GRADES = {
  Basic: { name: 'Basic', color: '#d8e4df', next: 'Tuned', power: 1.0 },
  Tuned: { name: 'Tuned', color: '#4fd4c2', next: 'Prime', power: 1.35 },
  Prime: { name: 'Prime', color: '#f4c95d', next: 'Core', power: 1.85 },
  Core: { name: 'Core', color: '#ff6f59', next: 'Origin', power: 2.55 },
  Origin: { name: 'Origin', color: '#f5f0dc', next: null, power: 3.6 }
};

export const RELAY_TYPES = {
  needle_beam: {
    id: 'needle_beam',
    name: 'Needle Beam',
    grade: 'Basic',
    tags: ['Beam'],
    voltage: 12,
    cycle: 0.62,
    range: 0.2,
    heatPerAction: 3.2,
    target: 'front',
    linkShape: ['N', 'E'],
    palette: '#58d7ff',
    atlasIndex: 0,
    skill: 'Fast precision beam for early loop control.'
  },
  prism_lance: {
    id: 'prism_lance',
    name: 'Prism Lance',
    grade: 'Tuned',
    tags: ['Beam'],
    voltage: 23,
    cycle: 0.86,
    range: 0.25,
    heatPerAction: 4.2,
    target: 'boss',
    crit: 0.22,
    linkShape: ['W', 'E'],
    palette: '#8df1ff',
    atlasIndex: 1,
    skill: 'Boss-focused beam with visible crit spikes.'
  },
  split_ray: {
    id: 'split_ray',
    name: 'Split Ray',
    grade: 'Prime',
    tags: ['Beam'],
    voltage: 26,
    cycle: 1.05,
    range: 0.23,
    heatPerAction: 5.0,
    target: 'front',
    chain: 2,
    linkShape: ['N', 'S', 'E'],
    palette: '#7cc7ff',
    atlasIndex: 2,
    skill: 'Branches into two nearby Noise bodies.'
  },
  pulse_drum: {
    id: 'pulse_drum',
    name: 'Pulse Drum',
    grade: 'Basic',
    tags: ['Pulse'],
    voltage: 10,
    cycle: 0.78,
    range: 0.2,
    heatPerAction: 3.0,
    target: 'cluster',
    splash: 0.05,
    linkShape: ['S', 'E'],
    palette: '#f8b84e',
    atlasIndex: 3,
    skill: 'Small area pulse for packed early waves.'
  },
  thunder_bowl: {
    id: 'thunder_bowl',
    name: 'Thunder Bowl',
    grade: 'Tuned',
    tags: ['Pulse'],
    voltage: 21,
    cycle: 1.0,
    range: 0.22,
    heatPerAction: 4.8,
    target: 'cluster',
    splash: 0.08,
    linkShape: ['N', 'W', 'E'],
    palette: '#ffd166',
    atlasIndex: 4,
    skill: 'Larger pulse that rewards clean loop grouping.'
  },
  storm_heart: {
    id: 'storm_heart',
    name: 'Storm Heart',
    grade: 'Core',
    tags: ['Pulse'],
    voltage: 47,
    cycle: 0.95,
    range: 0.27,
    heatPerAction: 7.0,
    target: 'cluster',
    splash: 0.1,
    chain: 3,
    linkShape: ['N', 'S', 'W', 'E'],
    palette: '#ffb703',
    atlasIndex: 5,
    skill: 'High-heat carry pulse with chain lightning.'
  },
  amber_field: {
    id: 'amber_field',
    name: 'Amber Field',
    grade: 'Basic',
    tags: ['Field'],
    voltage: 8,
    cycle: 1.1,
    range: 0.18,
    heatPerAction: 2.4,
    target: 'cluster',
    saturationMark: 1,
    linkShape: ['N', 'S'],
    palette: '#f4a261',
    atlasIndex: 6,
    skill: 'Marks clusters so later hits pay off.'
  },
  gravity_loom: {
    id: 'gravity_loom',
    name: 'Gravity Loom',
    grade: 'Prime',
    tags: ['Field'],
    voltage: 20,
    cycle: 1.15,
    range: 0.24,
    heatPerAction: 4.5,
    target: 'front',
    slow: 0.28,
    linkShape: ['W', 'E'],
    palette: '#b8f2e6',
    atlasIndex: 7,
    skill: 'Slows the signal loop without becoming a hard stun.'
  },
  null_cage: {
    id: 'null_cage',
    name: 'Null Cage',
    grade: 'Tuned',
    tags: ['Field'],
    voltage: 16,
    cycle: 1.25,
    range: 0.25,
    heatPerAction: 4.0,
    target: 'null',
    slow: 0.36,
    linkShape: ['N', 'W'],
    palette: '#e76f51',
    atlasIndex: 8,
    skill: 'Prioritizes Null threats and cages them in place.'
  },
  coolant_moss: {
    id: 'coolant_moss',
    name: 'Coolant Moss',
    grade: 'Basic',
    tags: ['Repair'],
    voltage: 0,
    repair: 1.7,
    cycle: 0.82,
    range: 0,
    heatPerAction: -3.6,
    target: 'repair',
    linkShape: ['N', 'E'],
    palette: '#65e6a5',
    atlasIndex: 9,
    skill: 'Cools linked relays and stabilizes bad heat rolls.'
  },
  rain_pump: {
    id: 'rain_pump',
    name: 'Rain Pump',
    grade: 'Tuned',
    tags: ['Repair'],
    voltage: 0,
    repair: 2.5,
    cycle: 1.0,
    range: 0,
    heatPerAction: -5.0,
    target: 'repair',
    linkShape: ['S', 'W', 'E'],
    palette: '#7ee7c4',
    atlasIndex: 10,
    skill: 'Stronger board cooling with slower cadence.'
  },
  root_clinic: {
    id: 'root_clinic',
    name: 'Root Clinic',
    grade: 'Prime',
    tags: ['Repair'],
    voltage: 0,
    repair: 3.4,
    cycle: 1.18,
    range: 0,
    heatPerAction: -6.0,
    target: 'repair',
    linkShape: ['N', 'S', 'E'],
    palette: '#95d5b2',
    atlasIndex: 11,
    skill: 'Repairs Signal after risky Overclock play.'
  },
  signal_amp: {
    id: 'signal_amp',
    name: 'Signal Amp',
    grade: 'Basic',
    tags: ['Amp'],
    voltage: 6,
    cycle: 0.9,
    range: 0.16,
    heatPerAction: 2.2,
    target: 'front',
    amp: 1.12,
    linkShape: ['W', 'E'],
    palette: '#5eead4',
    atlasIndex: 12,
    skill: 'Turns link geometry into stable damage.'
  },
  bloom_amp: {
    id: 'bloom_amp',
    name: 'Bloom Amp',
    grade: 'Tuned',
    tags: ['Amp', 'Repair'],
    voltage: 5,
    repair: 1.2,
    cycle: 1.05,
    range: 0.16,
    heatPerAction: 1.6,
    target: 'front',
    amp: 1.16,
    linkShape: ['N', 'S'],
    palette: '#ff8fab',
    atlasIndex: 13,
    skill: 'Hybrid support relay for linked carries.'
  },
  aurora_amp: {
    id: 'aurora_amp',
    name: 'Aurora Amp',
    grade: 'Core',
    tags: ['Amp'],
    voltage: 14,
    cycle: 1.2,
    range: 0.18,
    heatPerAction: 3.8,
    target: 'front',
    amp: 1.25,
    linkShape: ['N', 'S', 'W', 'E'],
    palette: '#bde0fe',
    atlasIndex: 14,
    skill: 'Premium geometry amplifier with heat liability.'
  },
  sink_stone: {
    id: 'sink_stone',
    name: 'Sink Stone',
    grade: 'Basic',
    tags: ['Sink'],
    voltage: 5,
    cycle: 1.05,
    range: 0.14,
    heatPerAction: -2.4,
    target: 'front',
    sink: 4,
    linkShape: ['W'],
    palette: '#a7c957',
    atlasIndex: 15,
    skill: 'Vents heat from one linked neighbor.'
  },
  dusk_sink: {
    id: 'dusk_sink',
    name: 'Dusk Sink',
    grade: 'Prime',
    tags: ['Sink'],
    voltage: 12,
    cycle: 1.05,
    range: 0.16,
    heatPerAction: -4.0,
    target: 'front',
    sink: 7,
    linkShape: ['N', 'W', 'E'],
    palette: '#8ecae6',
    atlasIndex: 16,
    skill: 'Strong venting for boards that run hot.'
  },
  mirror_port: {
    id: 'mirror_port',
    name: 'Mirror Port',
    grade: 'Prime',
    tags: ['Support'],
    voltage: 18,
    cycle: 1.1,
    range: 0.2,
    heatPerAction: 4.0,
    target: 'front',
    supportPower: 1.08,
    linkShape: ['S', 'E'],
    palette: '#cdb4db',
    atlasIndex: 17,
    skill: 'Shares a small output echo with the partner board.'
  },
  twin_gate: {
    id: 'twin_gate',
    name: 'Twin Gate',
    grade: 'Core',
    tags: ['Support'],
    voltage: 24,
    cycle: 1.0,
    range: 0.22,
    heatPerAction: 5.0,
    target: 'front',
    pulseDurationBonus: 3,
    linkShape: ['N', 'S', 'W', 'E'],
    palette: '#80ffdb',
    atlasIndex: 18,
    skill: 'Extends Link Pulse saves when placed well.'
  },
  origin_seed: {
    id: 'origin_seed',
    name: 'Origin Seed',
    grade: 'Origin',
    tags: ['Origin', 'Beam'],
    voltage: 58,
    cycle: 1.25,
    range: 0.28,
    heatPerAction: 8.0,
    target: 'boss',
    execute: 0.15,
    linkShape: ['N', 'S', 'W', 'E'],
    palette: '#fff3b0',
    atlasIndex: 19,
    skill: 'Executes weakened bosses once per Origin Seed.'
  }
};

export const RELAY_ROSTER = Object.keys(RELAY_TYPES);

export const SUPPLY_TABLE = {
  Basic: 0.62,
  Tuned: 0.27,
  Prime: 0.09,
  Core: 0.019,
  Origin: 0.001
};

export const GAME_RULES = {
  boardSlots: 12,
  boardColumns: 4,
  supplyPlacementPriority: [5, 4, 6, 1, 9, 0, 2, 8, 10, 3, 7, 11],
  supplyBaseCost: 20,
  supplyCostInterval: 5,
  supplyCostStep: 3,
  supplyCostCap: 47,
  bossSupplyMultiplier: 1.2,
  supplyFocusCost: 55,
  linkPulseCost: 40,
  linkPulseCooldown: 12,
  overclockHeat: 20,
  overclockDuration: 5,
  overclockStallDuration: 3,
  linkPulseHeatDrop: 35,
  linkPulseTwinGateHeatDrop: 53,
  linkPulseDuration: 6,
  linkPulseTwinGateDuration: 9,
  shutdownHeat: 100,
  shutdownDuration: 4.5,
  signalMax: 100,
  saturationLimit: 100,
  bossTimer: 34,
  maxWave: 10,
  mergeCount: 3,
  pityThreshold: 7,
  tickRate: 20
};

export const NOISE_TYPES = {
  flicker: { name: 'Flicker', hp: 34, speed: 38, rewardCharge: 4, rewardLink: 1, saturation: 1, color: '#ff6b6b', radius: 7 },
  crawler: { name: 'Crawler', hp: 52, speed: 31, rewardCharge: 5, rewardLink: 1, saturation: 2, color: '#ffd166', radius: 8 },
  bulwark: { name: 'Bulwark', hp: 132, speed: 22, rewardCharge: 11, rewardLink: 2, saturation: 4, color: '#7bdff2', radius: 12 },
  splitter: { name: 'Splitter', hp: 88, speed: 29, rewardCharge: 8, rewardLink: 2, saturation: 3, color: '#f4a261', radius: 10, children: 2 },
  null: { name: 'Null', hp: 95, speed: 26, rewardCharge: 10, rewardLink: 3, saturation: 8, color: '#e76f51', radius: 11 },
  null_spore: { name: 'Null Spore', hp: 70, speed: 44, rewardCharge: 0, rewardLink: 0, saturation: 2, color: '#b44cff', radius: 9 },
  boss: { name: 'Boss', hp: 650, speed: 18, rewardCharge: 65, rewardLink: 22, saturation: 12, color: '#f72585', radius: 19 }
};

export const WAVES = [
  { flicker: 18 },
  { flicker: 14, crawler: 12 },
  { crawler: 18, splitter: 5, boss: 1 },
  { flicker: 22, bulwark: 6 },
  { splitter: 12, bulwark: 8, null: 4 },
  { crawler: 24, null: 8, boss: 1 },
  { flicker: 30, splitter: 16, bulwark: 10 },
  { splitter: 24, null: 16, bulwark: 10 },
  { crawler: 40, splitter: 20, bulwark: 16 },
  { bulwark: 26, null: 20, boss: 1 }
];

export const SHOP = {
  currencies: {
    charge: { name: 'Charge', earned: true, description: 'Run resource used for Supply and Supply Focus.' },
    linkEnergy: { name: 'Link Energy', earned: true, description: 'Co-op action resource used for Link Pulse.' },
    gems: { name: 'Gems', earned: true, description: 'Premium-style currency; only earned in this build.' }
  },
  items: [
    {
      id: 'lucky-cache',
      name: 'Lucky Cache',
      price: { gems: 40 },
      grant: { charge: 90, linkEnergy: 12 },
      category: 'run_boost',
      realMoney: false,
      description: 'Earned comeback bundle for a tense run.'
    },
    {
      id: 'mythic-aura',
      name: 'Mythic Aura',
      price: { gems: 90 },
      grant: { cosmetic: 'mythic-aura' },
      category: 'cosmetic',
      realMoney: false,
      description: 'Cosmetic aura for Origin and Core relays.'
    },
    {
      id: 'founder-board',
      name: 'Founder Board',
      price: { gems: 140 },
      grant: { cosmetic: 'founder-board' },
      category: 'cosmetic',
      realMoney: false,
      description: 'Board skin for the co-op signal field.'
    }
  ],
  pass: {
    id: 'season-zero',
    name: 'Season Zero: Signal Lock',
    realMoney: false,
    tiers: [
      { xp: 60, grant: { gems: 20 } },
      { xp: 160, grant: { cosmetic: 'golden-supply-flash' } },
      { xp: 320, grant: { gems: 80 } },
      { xp: 520, grant: { cosmetic: 'origin-loop-banner' } }
    ]
  },
  dailyMissions: [
    { id: 'merge-three', text: 'Merge three Relays in one run.', reward: { gems: 15 } },
    { id: 'save-partner', text: 'Trigger a Link Pulse save during a boss wave.', reward: { gems: 20 } },
    { id: 'signal-clutch', text: 'Clear a wave below 35 Signal integrity.', reward: { gems: 25 } }
  ]
};

export const HEROES = RELAY_TYPES;
export const RARITIES = GRADES;
