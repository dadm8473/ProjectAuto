export const REBOOT_RULES = {
  screen: {
    width: 390,
    height: 844,
    combatHeight: 620,
    reference: '390x844'
  },
  path: {
    length: 640
  },
  summon: {
    startCurrency: 10,
    cost: 10,
    grants: [
      { at: 18, amount: 10 },
      { at: 32, amount: 10 },
      { at: 58, amount: 10 },
      { at: 92, amount: 10 }
    ]
  },
  merge: {
    requiredSameGrade: 2,
    revealMs: 700
  },
  rescue: {
    chargeRequired: 100,
    passiveChargeAt: 50,
    passiveChargeAmount: 55,
    partnerDangerChargeAmount: 45,
    tutorialWarningStart: 62,
    tutorialWindowStart: 76,
    tutorialWindowSeconds: 10,
    standardWindowSeconds: 6,
    partnerDangerWarning: 70,
    partnerDangerCritical: 80,
    dangerReduction: 45,
    knockbackPx: 120,
    slowSeconds: 3,
    slowPercent: 0.35
  },
  leakDamage: {
    normal: 12,
    heavy: 18,
    boss: 45
  },
  boss: {
    warningSeconds: 10,
    spawnAt: 102,
    expectedResolveStart: 114,
    expectedResolveEnd: 116
  },
  defeatDanger: 100
};

export const REBOOT_UNITS = {
  spark_pin: {
    id: 'spark_pin',
    name: '스파크 핀',
    grade: 1,
    role: 'attack',
    damage: 8,
    cycle: 0.8,
    range: 150,
    spriteKey: 'spark_pin'
  },
  toktok_amp: {
    id: 'toktok_amp',
    name: '톡톡 앰프',
    grade: 1,
    role: 'support',
    amp: 1.2,
    spriteKey: 'toktok_amp'
  },
  slow_coil: {
    id: 'slow_coil',
    name: '느림 코일',
    grade: 1,
    role: 'control',
    damage: 4,
    cycle: 1.1,
    slow: 0.2,
    slowSeconds: 1.5,
    spriteKey: 'slow_coil'
  },
  burst_pin: {
    id: 'burst_pin',
    name: '버스트 핀',
    grade: 2,
    role: 'attack',
    damage: 18,
    cycle: 0.75,
    range: 165,
    spriteKey: 'burst_pin'
  },
  rescue_coil: {
    id: 'rescue_coil',
    name: '구원 코일',
    grade: 2,
    role: 'rescue',
    damage: 10,
    rescueChargeOnPartnerDanger: 10,
    spriteKey: 'rescue_coil'
  }
};

export const REBOOT_ENEMIES = {
  noise_shard: {
    id: 'noise_shard',
    name: '잡음 조각',
    hp: 20,
    speed: 42,
    leakDamage: 12,
    reward: 1,
    spriteKey: 'noise_shard'
  },
  quick_noise: {
    id: 'quick_noise',
    name: '빠른 잡음',
    hp: 14,
    speed: 58,
    leakDamage: 12,
    reward: 1,
    spriteKey: 'quick_noise'
  },
  heavy_noise: {
    id: 'heavy_noise',
    name: '무거운 잡음',
    hp: 46,
    speed: 32,
    leakDamage: 18,
    reward: 2,
    spriteKey: 'heavy_noise'
  },
  mini_boss: {
    id: 'mini_boss',
    name: '소형 보스',
    hp: 220,
    speed: 24,
    leakDamage: 45,
    reward: 10,
    spriteKey: 'mini_boss'
  }
};

export const REBOOT_WAVES = [
  {
    at: 0,
    boards: {
      p1: [{ enemyId: 'noise_shard', count: 3, interval: 1.2 }],
      p2: []
    }
  },
  {
    at: 18,
    boards: {
      p1: [{ enemyId: 'noise_shard', count: 4, interval: 1.0 }],
      p2: [{ enemyId: 'noise_shard', count: 3, interval: 1.0 }]
    }
  },
  {
    at: 28,
    boards: {
      p1: [
        { enemyId: 'noise_shard', count: 4, interval: 1.0 },
        { enemyId: 'quick_noise', count: 2, interval: 0.9 }
      ],
      p2: [{ enemyId: 'noise_shard', count: 6, interval: 0.9 }]
    }
  },
  {
    at: 46,
    boards: {
      p1: [{ enemyId: 'heavy_noise', count: 2, interval: 1.1 }],
      p2: [
        { enemyId: 'noise_shard', count: 4, interval: 1.0 },
        { enemyId: 'quick_noise', count: 3, interval: 0.9 }
      ]
    }
  },
  {
    at: 62,
    boards: {
      p1: [{ enemyId: 'noise_shard', count: 5, interval: 0.9 }],
      p2: [{ enemyId: 'quick_noise', count: 6, interval: 0.75 }]
    }
  },
  {
    at: 88,
    boards: {
      p1: [{ enemyId: 'heavy_noise', count: 2, interval: 1.0 }],
      p2: [{ enemyId: 'heavy_noise', count: 2, interval: 1.0 }]
    }
  },
  {
    at: 102,
    boards: {
      p1: [
        { enemyId: 'mini_boss', count: 1, interval: 0 },
        { enemyId: 'noise_shard', count: 3, interval: 1.0 }
      ],
      p2: [{ enemyId: 'noise_shard', count: 4, interval: 1.0 }]
    }
  }
];

export const REBOOT_SEEDS = {
  tutorial_success: {
    id: 'tutorial_success',
    name: '첫 구원 성공',
    purpose: '첫 조작 학습',
    script: {
      summons: ['spark_pin', 'toktok_amp', 'spark_pin'],
      merges: ['burst_pin']
    },
    intendedResult: 'partner_rescued'
  },
  lucky_clutch: {
    id: 'lucky_clutch',
    name: '보스 막타',
    purpose: '대박 감정',
    script: {
      summons: ['spark_pin', 'spark_pin', 'rescue_coil'],
      merges: ['burst_pin']
    },
    intendedResult: 'boss_final_hit'
  },
  bad_recoverable: {
    id: 'bad_recoverable',
    name: '나쁜 운 회복',
    purpose: '나쁜 RNG 회복',
    script: {
      summons: ['toktok_amp', 'slow_coil', 'spark_pin'],
      merges: ['rescue_coil']
    },
    intendedResult: 'partner_rescued'
  },
  greed_loss: {
    id: 'greed_loss',
    name: '욕심 실패',
    purpose: '욕심 실패',
    script: {
      summons: ['spark_pin', 'spark_pin'],
      merges: []
    },
    intendedResult: 'greed'
  },
  rescue_miss: {
    id: 'rescue_miss',
    name: '구원 지연',
    purpose: '구원 지연 실패',
    script: {
      summons: ['spark_pin', 'toktok_amp', 'spark_pin'],
      merges: ['burst_pin']
    },
    intendedResult: 'rescue_missed'
  },
  boss_clutch: {
    id: 'boss_clutch',
    name: '보스 대응 선택',
    purpose: '보스 대응 선택',
    script: {
      summons: ['spark_pin', 'spark_pin'],
      merges: ['burst_pin']
    },
    intendedResult: 'branch',
    branches: {
      summonSlow: { action: 'summon', at: [92, 102], result: 'slow_coil', reason: 'boss_slowed' },
      summonBurst: { action: 'summon', at: [92, 102], result: 'burst_pin', reason: 'boss_final_hit' },
      merge: { action: 'merge', at: [92, 102], result: 'burst_pin', reason: 'boss_final_hit' },
      lateSummon: { action: 'summon', after: 102, reason: 'boss_leaked' },
      wait: { action: 'wait', at: [92, 116], reason: 'boss_leaked' }
    }
  }
};
