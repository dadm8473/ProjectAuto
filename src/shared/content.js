export const GRADE_ORDER = ['Basic', 'Tuned', 'Prime', 'Core', 'Origin'];

export const GRADES = {
  Basic: { name: '기본', color: '#d8e4df', next: 'Tuned', power: 1.0 },
  Tuned: { name: '조율', color: '#4fd4c2', next: 'Prime', power: 1.35 },
  Prime: { name: '프라임', color: '#f4c95d', next: 'Core', power: 1.85 },
  Core: { name: '코어', color: '#ff6f59', next: 'Origin', power: 2.55 },
  Origin: { name: '기원', color: '#f5f0dc', next: null, power: 3.6 }
};

export const RELAY_TYPES = {
  needle_beam: {
    id: 'needle_beam',
    name: '니들 빔',
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
    skill: '초반 루프를 빠르게 잡는 정밀 빔.'
  },
  prism_lance: {
    id: 'prism_lance',
    name: '프리즘 랜스',
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
    skill: '보스를 우선 노리는 치명타 빔.'
  },
  split_ray: {
    id: 'split_ray',
    name: '분열 광선',
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
    skill: '근처 노이즈 둘까지 갈라져 타격.'
  },
  pulse_drum: {
    id: 'pulse_drum',
    name: '펄스 드럼',
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
    skill: '초반 밀집 웨이브에 강한 작은 범위 펄스.'
  },
  thunder_bowl: {
    id: 'thunder_bowl',
    name: '천둥 보울',
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
    skill: '노이즈가 모일수록 강해지는 큰 펄스.'
  },
  storm_heart: {
    id: 'storm_heart',
    name: '폭풍 심장',
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
    skill: '연쇄 번개를 내는 고열 핵심 딜러.'
  },
  amber_field: {
    id: 'amber_field',
    name: '앰버 필드',
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
    skill: '노이즈 무리에 표식을 남겨 후속 타격을 강화.'
  },
  gravity_loom: {
    id: 'gravity_loom',
    name: '중력 직조기',
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
    skill: '완전 정지가 아닌 감속으로 루프 시간을 벌어줌.'
  },
  null_cage: {
    id: 'null_cage',
    name: '널 케이지',
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
    skill: '널 위협을 우선 묶어 이동을 늦춤.'
  },
  coolant_moss: {
    id: 'coolant_moss',
    name: '냉각 이끼',
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
    skill: '연결된 릴레이의 열을 낮춰 위험한 배치를 안정화.'
  },
  rain_pump: {
    id: 'rain_pump',
    name: '레인 펌프',
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
    skill: '느리지만 강한 보드 냉각.'
  },
  root_clinic: {
    id: 'root_clinic',
    name: '루트 클리닉',
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
    skill: '위험한 오버드라이브 후 신호를 회복.'
  },
  signal_amp: {
    id: 'signal_amp',
    name: '신호 증폭기',
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
    skill: '연결 배치를 안정적인 피해로 전환.'
  },
  bloom_amp: {
    id: 'bloom_amp',
    name: '개화 증폭기',
    grade: 'Tuned',
    tags: ['Amp', 'Repair'],
    voltage: 0,
    repair: 1.2,
    cycle: 1.05,
    range: 0.16,
    heatPerAction: 1.6,
    target: 'repair',
    amp: 1.16,
    repairAmp: 1.18,
    linkShape: ['N', 'S'],
    palette: '#ff8fab',
    atlasIndex: 13,
    skill: '연결된 회복 라인을 증폭하는 지원 릴레이.'
  },
  aurora_amp: {
    id: 'aurora_amp',
    name: '오로라 증폭기',
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
    skill: '강력하지만 열 관리가 필요한 배치 증폭기.'
  },
  sink_stone: {
    id: 'sink_stone',
    name: '방열석',
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
    skill: '연결된 이웃 하나의 열을 배출.'
  },
  dusk_sink: {
    id: 'dusk_sink',
    name: '황혼 방열기',
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
    skill: '뜨거운 보드를 위한 강한 방열.'
  },
  mirror_port: {
    id: 'mirror_port',
    name: '미러 포트',
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
    skill: '파트너 보드에 작은 출력 반향을 공유.'
  },
  twin_gate: {
    id: 'twin_gate',
    name: '트윈 게이트',
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
    skill: '잘 배치하면 파트너 구원 시간이 늘어남.'
  },
  origin_seed: {
    id: 'origin_seed',
    name: '기원 씨앗',
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
    skill: '약해진 보스를 씨앗당 한 번 처형.'
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
  mergeOverdriveHeat: 8,
  mergeOverdriveDuration: 4,
  linkPulseOverdriveHeat: 6,
  linkPulseOverdriveDuration: 3.5,
  dualOverclockBossDuration: 4,
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
  onboardingWindow: 60,
  mergeCount: 3,
  mergeSurgeCharge: 12,
  mergeSurgeLink: 6,
  pityThreshold: 7,
  waveClearHeatDrop: 20,
  tickRate: 20
};

export const NOISE_TYPES = {
  flicker: { name: '플리커', hp: 34, speed: 38, rewardCharge: 4, rewardLink: 1, saturation: 1, color: '#ff6b6b', radius: 7, atlasIndex: 0 },
  crawler: { name: '크롤러', hp: 52, speed: 31, rewardCharge: 5, rewardLink: 1, saturation: 2, color: '#ffd166', radius: 8, atlasIndex: 1 },
  bulwark: { name: '불워크', hp: 132, speed: 22, rewardCharge: 11, rewardLink: 2, saturation: 4, color: '#7bdff2', radius: 12, atlasIndex: 2 },
  splitter: { name: '스플리터', hp: 88, speed: 29, rewardCharge: 8, rewardLink: 2, saturation: 3, color: '#f4a261', radius: 10, children: 2, atlasIndex: 3 },
  null: { name: '널', hp: 95, speed: 26, rewardCharge: 10, rewardLink: 3, saturation: 8, color: '#e76f51', radius: 11, atlasIndex: 4 },
  null_spore: { name: '널 포자', hp: 70, speed: 44, rewardCharge: 0, rewardLink: 0, saturation: 2, color: '#b44cff', radius: 9, atlasIndex: 5 },
  boss: { name: '보스', hp: 650, speed: 18, rewardCharge: 65, rewardLink: 22, saturation: 12, color: '#f72585', radius: 19, atlasIndex: 6 }
};

export const WAVE_PLAN = [
  {
    name: '보정 드리프트',
    intent: '가벼운 두 종류의 적으로 보급 리듬을 익히게 한다.',
    spawns: { flicker: 16, crawler: 8 },
    clearReward: { charge: 35, linkEnergy: 10, gems: 0 }
  },
  {
    name: '장갑 점검',
    intent: '불워크 압박으로 단일 공격과 범위 공격의 차이를 느끼게 한다.',
    spawns: { crawler: 18, bulwark: 4 },
    clearReward: { charge: 45, linkEnergy: 12, gems: 0 }
  },
  {
    name: '보스 오키드',
    intent: '첫 협동 위기: 파트너 구원과 합성 타이밍이 의미를 갖는다.',
    spawns: { crawler: 20, splitter: 8, boss: 1 },
    clearReward: { charge: 65, linkEnergy: 22, gems: 8 },
    bossTimer: 36
  },
  {
    name: '확산 신호',
    intent: '첫 보스 이후 범위 피해와 연결 배치 보상을 준다.',
    spawns: { flicker: 24, crawler: 16, bulwark: 5 },
    clearReward: { charge: 55, linkEnergy: 14, gems: 0 }
  },
  {
    name: '널 수업',
    intent: '두 번째 보스 전에 널 타깃팅과 감속 선택을 요구한다.',
    spawns: { splitter: 12, bulwark: 8, null: 6 },
    clearReward: { charge: 65, linkEnergy: 16, gems: 0 }
  },
  {
    name: '보스 미러',
    intent: '두 번째 협동 위기: 끊어진 연결이 파트너 구원 타이밍을 시험한다.',
    spawns: { crawler: 22, null: 12, boss: 1 },
    clearReward: { charge: 85, linkEnergy: 28, gems: 8 },
    bossTimer: 42
  },
  {
    name: '플리커 홍수',
    intent: '짧고 빠른 구간으로 범위 피해의 손맛을 보여준다.',
    spawns: { flicker: 24, bulwark: 12 },
    threatScale: 1.2,
    clearReward: { charge: 75, linkEnergy: 16, gems: 0 }
  },
  {
    name: '압박 직조',
    intent: '적 수는 줄이고 널과 불워크 압박을 섞어 지원 타이밍을 읽히게 한다.',
    spawns: { splitter: 10, null: 12, bulwark: 12 },
    threatScale: 1.55,
    clearReward: { charge: 85, linkEnergy: 18, gems: 8 }
  },
  {
    name: '마지막 보급 창',
    intent: '최종전 전 마지막 전력 보급과 합성 점검을 만든다.',
    spawns: { crawler: 20, splitter: 12, bulwark: 14 },
    threatScale: 1.65,
    clearReward: { charge: 95, linkEnergy: 22, gems: 0 }
  },
  {
    name: '기원 널',
    intent: '최종 보스는 널 제어, 합성과 구원 타이밍을 요구한다.',
    spawns: { null: 12, bulwark: 14, boss: 1 },
    threatScale: 1.45,
    clearReward: { charge: 0, linkEnergy: 0, gems: 0 },
    bossTimer: 55
  }
];

export const WAVES = WAVE_PLAN.map((wave) => wave.spawns);

export const SHOP = {
  currencies: {
    charge: { name: '전력', earned: true, description: '릴레이 보급에 쓰는 전투 자원.' },
    linkEnergy: { name: '협력', earned: true, description: '파트너 구원에 쓰는 협동 자원.' },
    gems: { name: '젬', earned: true, description: '미션과 웨이브에서만 얻는 해금 재화.' }
  },
  items: [
    {
      id: 'lucky-cache',
      name: '행운 캐시',
      price: { gems: 40 },
      grant: { charge: 90, linkEnergy: 12 },
      category: 'run_boost',
      realMoney: false,
      description: '밀리는 판을 되살리는 획득형 보급 묶음.'
    },
    {
      id: 'mythic-aura',
      name: '신화 오라',
      price: { gems: 90 },
      grant: { cosmetic: 'mythic-aura' },
      category: 'cosmetic',
      realMoney: false,
      description: '기원/코어 릴레이에 적용되는 외형 오라.'
    },
    {
      id: 'founder-board',
      name: '파운더 보드',
      price: { gems: 140 },
      grant: { cosmetic: 'founder-board' },
      category: 'cosmetic',
      realMoney: false,
      description: '협동 신호장 보드 스킨.'
    },
    {
      id: 'merge-effect',
      name: '합성 플레어',
      price: { gems: 55 },
      grant: { cosmetic: 'merge-effect' },
      category: 'cosmetic',
      realMoney: false,
      description: '합성 순간의 장난감 에너지 연출.'
    },
    {
      id: 'rescue-effect',
      name: '구원 빔',
      price: { gems: 65 },
      grant: { cosmetic: 'rescue-effect' },
      category: 'cosmetic',
      realMoney: false,
      description: '파트너를 구할 때 터지는 보호광 연출.'
    },
    {
      id: 'profile-frame',
      name: '파일럿 프레임',
      price: { gems: 75 },
      grant: { cosmetic: 'profile-frame' },
      category: 'cosmetic',
      realMoney: false,
      description: '홈과 매칭 화면에 쓰는 프로필 외형.'
    }
  ],
  pass: {
    id: 'season-zero',
    name: '시즌 제로: 신호 고정',
    realMoney: false,
    tiers: [
      { xp: 60, grant: { gems: 20 } },
      { xp: 160, grant: { cosmetic: 'golden-supply-flash' } },
      { xp: 320, grant: { gems: 80 } },
      { xp: 520, grant: { cosmetic: 'origin-loop-banner' } }
    ]
  },
  dailyMissions: [
    { id: 'merge-three', text: '한 전투에서 릴레이 3개를 합성.', reward: { gems: 15 } },
    { id: 'save-partner', text: '보스 웨이브에서 파트너 구원 발동.', reward: { gems: 20 } },
    { id: 'signal-clutch', text: '신호 35 이하로 웨이브 클리어.', reward: { gems: 25 } }
  ]
};

export const HEROES = RELAY_TYPES;
export const RARITIES = GRADES;
