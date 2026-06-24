import { EventCategory, type GameEventDefinition } from '@football-life/shared';

const C = EventCategory;

/**
 * License-free MVP event catalogue. Triggers reference EventContext fields;
 * consequences are deltas applied by the event resolver. Kept data-only so the
 * set can grow without touching the engine.
 */
export const EVENT_DEFINITIONS: GameEventDefinition[] = [
  // ---------------------------------------------------------------- FOOTBALL
  {
    id: 'fb-training-breakthrough',
    category: C.Football,
    title: 'Training breakthrough',
    descriptionTemplate: 'A great week on the training pitch turns heads.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 8,
    cooldownWeeks: 8,
    choices: [
      {
        key: 'push',
        label: 'Push even harder',
        consequences: { motivation: 6, stress: 4 },
      },
      { key: 'steady', label: 'Keep it measured', consequences: { morale: 3 } },
    ],
  },
  {
    id: 'fb-bad-week',
    category: C.Football,
    title: 'Rough patch',
    descriptionTemplate: 'Nothing comes off in training this week.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 6,
    cooldownWeeks: 6,
    choices: [
      {
        key: 'work',
        label: 'Put in extra hours',
        consequences: { motivation: 4, stress: 5 },
      },
      {
        key: 'rest',
        label: 'Take a breather',
        consequences: { morale: 2, stress: -4 },
      },
    ],
  },
  {
    id: 'fb-youth-tournament',
    category: C.Football,
    title: 'Youth tournament',
    descriptionTemplate: 'Scouts gather to watch a youth showcase.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: false }] },
    weight: 5,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'shine',
        label: 'Play for yourself',
        consequences: { reputation: 30, morale: 4 },
      },
      {
        key: 'team',
        label: 'Play for the team',
        consequences: { reputation: 15, morale: 6 },
      },
    ],
  },
  {
    id: 'fb-penalty-duty',
    category: C.Football,
    title: 'Penalty duty',
    descriptionTemplate: 'The coach offers you penalty-taking duties.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 4,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'accept',
        label: 'Take the responsibility',
        consequences: { reputation: 20, stress: 4 },
      },
      {
        key: 'decline',
        label: 'Leave it to others',
        consequences: { stress: -2 },
      },
    ],
  },
  {
    id: 'fb-captain-talk',
    category: C.Football,
    title: 'Leadership role',
    descriptionTemplate: 'Senior players want you to lead by example.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 55 }] },
    weight: 3,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'embrace',
        label: 'Embrace it',
        consequences: { reputation: 25, motivation: 5 },
      },
      { key: 'modest', label: 'Stay modest', consequences: { morale: 3 } },
    ],
  },
  {
    id: 'fb-derby-week',
    category: C.Football,
    title: 'Derby week',
    descriptionTemplate: 'The biggest game of the season looms.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 5,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'focus',
        label: 'Lock in',
        consequences: { motivation: 6, stress: 6 },
      },
      {
        key: 'relax',
        label: 'Treat it like any game',
        consequences: { stress: -3 },
      },
    ],
  },

  // ------------------------------------------------------------------- COACH
  {
    id: 'coach-praise',
    category: C.Coach,
    title: 'Coach praise',
    descriptionTemplate: 'The coach singles you out for praise.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 6,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'grateful',
        label: 'Thank them',
        consequences: { morale: 6, motivation: 3 },
      },
      { key: 'humble', label: 'Stay grounded', consequences: { morale: 3 } },
    ],
  },
  {
    id: 'coach-criticism',
    category: C.Coach,
    title: 'Harsh words',
    descriptionTemplate:
      'The coach criticises your attitude in front of the squad.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 8,
    choices: [
      {
        key: 'accept',
        label: 'Take it on the chin',
        consequences: { motivation: 4, morale: -2 },
      },
      {
        key: 'argue',
        label: 'Answer back',
        consequences: { morale: -4, reputation: -10, stress: 5 },
      },
    ],
  },
  {
    id: 'coach-position-change',
    category: C.Coach,
    title: 'New position',
    descriptionTemplate: 'The coach wants to try you in a new role.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 4,
    cooldownWeeks: 24,
    choices: [
      {
        key: 'adapt',
        label: 'Give it a go',
        consequences: { motivation: 4, stress: 3 },
      },
      {
        key: 'resist',
        label: 'Prefer your role',
        consequences: { morale: -3 },
      },
    ],
  },
  {
    id: 'coach-extra-sessions',
    category: C.Coach,
    title: 'Extra sessions',
    descriptionTemplate: 'The coach offers one-to-one sessions.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 23 }] },
    weight: 4,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'in',
        label: 'Show up early',
        consequences: { motivation: 5, stress: 3 },
      },
      {
        key: 'out',
        label: 'Skip them',
        consequences: { morale: 2, motivation: -3 },
      },
    ],
  },
  {
    id: 'coach-trust',
    category: C.Coach,
    title: 'Vote of confidence',
    descriptionTemplate: 'The coach publicly backs you.',
    trigger: { all: [{ field: 'morale', op: 'lt', value: 45 }] },
    weight: 5,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'lift',
        label: 'Feel the support',
        consequences: { morale: 10, stress: -3 },
      },
    ],
  },

  // --------------------------------------------------------------- TEAMMATES
  {
    id: 'team-welcome',
    category: C.Teammates,
    title: 'Dressing-room welcome',
    descriptionTemplate: 'Team-mates make an effort to welcome you.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 6,
    cooldownWeeks: 30,
    maxOccurrencesPerCareer: 3,
    choices: [
      {
        key: 'join',
        label: 'Join in',
        consequences: { morale: 6, happiness: 5 },
      },
      { key: 'reserved', label: 'Stay reserved', consequences: { morale: 1 } },
    ],
  },
  {
    id: 'team-night-out',
    category: C.Teammates,
    title: 'Night out',
    descriptionTemplate: 'The squad plans a night out.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'go',
        label: 'Go out',
        consequences: { happiness: 6, stress: -4, money: -300 },
      },
      {
        key: 'stay',
        label: 'Stay home',
        consequences: { stress: -1, motivation: 2 },
      },
    ],
  },
  {
    id: 'team-rivalry',
    category: C.Teammates,
    title: 'Internal rivalry',
    descriptionTemplate: 'A team-mate sees you as a threat.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 50 }] },
    weight: 4,
    cooldownWeeks: 18,
    choices: [
      { key: 'defuse', label: 'Defuse it', consequences: { morale: 3 } },
      {
        key: 'compete',
        label: 'Out-compete them',
        consequences: { motivation: 5, stress: 4 },
      },
    ],
  },
  {
    id: 'team-support',
    category: C.Teammates,
    title: 'A shoulder to lean on',
    descriptionTemplate: 'A senior team-mate checks in on you.',
    trigger: { all: [{ field: 'stress', op: 'gte', value: 60 }] },
    weight: 5,
    cooldownWeeks: 8,
    choices: [
      {
        key: 'open',
        label: 'Open up',
        consequences: { stress: -8, mentalHealth: 6, morale: 4 },
      },
      { key: 'brush', label: 'Brush it off', consequences: { stress: -2 } },
    ],
  },

  // ------------------------------------------------------------------ FAMILY
  {
    id: 'fam-support',
    category: C.Family,
    title: 'Family support',
    descriptionTemplate: 'Your family travels to watch you.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 6,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'cherish',
        label: 'Cherish the moment',
        consequences: { happiness: 8, morale: 5 },
      },
    ],
  },
  {
    id: 'fam-pressure',
    category: C.Family,
    title: 'Family expectations',
    descriptionTemplate: 'Relatives pile on the pressure to succeed.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 20 }] },
    weight: 5,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'embrace',
        label: 'Use it as fuel',
        consequences: { motivation: 5, stress: 5 },
      },
      {
        key: 'distance',
        label: 'Set boundaries',
        consequences: { stress: -4, happiness: -2 },
      },
    ],
  },
  {
    id: 'fam-illness',
    category: C.Family,
    title: 'Family illness',
    descriptionTemplate: 'A close relative falls ill.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 3,
    cooldownWeeks: 40,
    maxOccurrencesPerCareer: 2,
    choices: [
      {
        key: 'home',
        label: 'Go home for a while',
        consequences: { happiness: -4, stress: 6, morale: -3 },
      },
      {
        key: 'focus',
        label: 'Channel it into football',
        consequences: { motivation: 4, mentalHealth: -4 },
      },
    ],
  },
  {
    id: 'fam-celebration',
    category: C.Family,
    title: 'Family celebration',
    descriptionTemplate: 'A big family celebration lifts your spirits.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'enjoy',
        label: 'Enjoy it fully',
        consequences: { happiness: 7, stress: -3 },
      },
    ],
  },

  // ------------------------------------------------------------------ SCHOOL
  {
    id: 'school-exams',
    category: C.School,
    title: 'Exam season',
    descriptionTemplate: 'School exams clash with training.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 18 }] },
    weight: 6,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'study',
        label: 'Prioritise study',
        consequences: { stress: 4, happiness: 2, motivation: -2 },
      },
      {
        key: 'football',
        label: 'Prioritise football',
        consequences: { motivation: 4, stress: 3 },
      },
    ],
  },
  {
    id: 'school-mentor',
    category: C.School,
    title: 'A helpful teacher',
    descriptionTemplate: 'A teacher mentors you through a tough term.',
    trigger: { all: [{ field: 'age', op: 'lte', value: 18 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'accept',
        label: 'Accept the help',
        consequences: { mentalHealth: 5, stress: -3 },
      },
    ],
  },
  {
    id: 'school-dropout-pressure',
    category: C.School,
    title: 'Leave school early?',
    descriptionTemplate: 'Some suggest leaving school to focus on football.',
    trigger: {
      all: [
        { field: 'age', op: 'gte', value: 16 },
        { field: 'age', op: 'lte', value: 18 },
      ],
    },
    weight: 3,
    cooldownWeeks: 52,
    maxOccurrencesPerCareer: 1,
    choices: [
      {
        key: 'leave',
        label: 'Leave school',
        consequences: { motivation: 5, happiness: -3 },
      },
      {
        key: 'stay',
        label: 'Finish your studies',
        consequences: { mentalHealth: 4, motivation: -2 },
      },
    ],
  },
  {
    id: 'school-balance',
    category: C.School,
    title: 'Juggling act',
    descriptionTemplate: 'Balancing school and football wears you down.',
    trigger: {
      all: [
        { field: 'age', op: 'lte', value: 18 },
        { field: 'stress', op: 'gte', value: 50 },
      ],
    },
    weight: 4,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'plan',
        label: 'Make a schedule',
        consequences: { stress: -6, motivation: 3 },
      },
    ],
  },

  // -------------------------------------------------------------------- LOVE
  {
    id: 'love-new',
    category: C.Love,
    title: 'A new relationship',
    descriptionTemplate: 'You meet someone special.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 30,
    maxOccurrencesPerCareer: 3,
    choices: [
      {
        key: 'commit',
        label: 'Commit to it',
        consequences: { happiness: 10, stress: -2 },
      },
      {
        key: 'casual',
        label: 'Keep it casual',
        consequences: { happiness: 4 },
      },
    ],
  },
  {
    id: 'love-distance',
    category: C.Love,
    title: 'Long distance',
    descriptionTemplate: 'A move strains your relationship.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 18 }] },
    weight: 3,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'work',
        label: 'Make it work',
        consequences: { happiness: 3, stress: 3 },
      },
      {
        key: 'end',
        label: 'Call it off',
        consequences: { happiness: -6, motivation: 3 },
      },
    ],
  },
  {
    id: 'love-support',
    category: C.Love,
    title: 'A steadying presence',
    descriptionTemplate: 'Your partner helps you through a slump.',
    trigger: {
      all: [
        { field: 'morale', op: 'lt', value: 50 },
        { field: 'age', op: 'gte', value: 18 },
      ],
    },
    weight: 4,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'lean',
        label: 'Lean on them',
        consequences: { morale: 8, mentalHealth: 5 },
      },
    ],
  },
  {
    id: 'love-proposal',
    category: C.Love,
    title: 'A big step',
    descriptionTemplate: 'You consider proposing.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 23 }] },
    weight: 2,
    cooldownWeeks: 52,
    maxOccurrencesPerCareer: 1,
    choices: [
      {
        key: 'propose',
        label: 'Propose',
        consequences: { happiness: 14, money: -8000 },
      },
      { key: 'wait', label: 'Wait a while', consequences: { happiness: -1 } },
    ],
  },

  // ------------------------------------------------------------------- AGENT
  {
    id: 'agent-offer',
    category: C.Agent,
    title: 'A new agent calls',
    descriptionTemplate: 'A well-known agent wants to represent you.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 45 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'sign',
        label: 'Sign with them',
        consequences: { reputation: 25, money: -2000 },
      },
      {
        key: 'pass',
        label: 'Stick with who you have',
        consequences: { morale: 2 },
      },
    ],
  },
  {
    id: 'agent-advice',
    category: C.Agent,
    title: 'Career advice',
    descriptionTemplate: 'Your agent maps out a career plan.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 18,
    choices: [
      {
        key: 'follow',
        label: 'Follow the plan',
        consequences: { motivation: 4 },
      },
      {
        key: 'own',
        label: 'Go your own way',
        consequences: { morale: 2, motivation: 2 },
      },
    ],
  },
  {
    id: 'agent-greedy',
    category: C.Agent,
    title: 'Commission dispute',
    descriptionTemplate: 'Your agent demands a bigger cut.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 500 }] },
    weight: 3,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'pay',
        label: 'Pay up',
        consequences: { money: -5000, stress: -2 },
      },
      {
        key: 'refuse',
        label: 'Refuse',
        consequences: { stress: 5, reputation: -5 },
      },
    ],
  },
  {
    id: 'agent-media-push',
    category: C.Agent,
    title: 'Media push',
    descriptionTemplate: 'Your agent lines up media appearances.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 300 }] },
    weight: 4,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'accept',
        label: 'Do the rounds',
        consequences: { popularity: 40, stress: 3 },
      },
      { key: 'decline', label: 'Stay low-key', consequences: { stress: -2 } },
    ],
  },

  // ------------------------------------------------------------------- MEDIA
  {
    id: 'media-interview',
    category: C.Media,
    title: 'Local interview',
    descriptionTemplate: 'A local outlet requests an interview.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 15 }] },
    weight: 5,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'charm',
        label: 'Charm them',
        consequences: { popularity: 25, reputation: 10 },
      },
      {
        key: 'guarded',
        label: 'Stay guarded',
        consequences: { popularity: 5 },
      },
    ],
  },
  {
    id: 'media-rumour',
    category: C.Media,
    title: 'Transfer rumour',
    descriptionTemplate: 'The press links you with a move.',
    trigger: {
      all: [
        { field: 'hasClub', op: 'eq', value: true },
        { field: 'currentAbility', op: 'gte', value: 55 },
      ],
    },
    weight: 4,
    cooldownWeeks: 14,
    choices: [
      {
        key: 'fuel',
        label: 'Fuel the speculation',
        consequences: { popularity: 30, stress: 5 },
      },
      {
        key: 'deny',
        label: 'Deny everything',
        consequences: { stress: -2, reputation: 5 },
      },
    ],
  },
  {
    id: 'media-controversy',
    category: C.Media,
    title: 'Controversial quote',
    descriptionTemplate: 'A quote of yours is taken out of context.',
    trigger: { all: [{ field: 'popularity', op: 'gte', value: 200 }] },
    weight: 3,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'apologise',
        label: 'Apologise',
        consequences: { reputation: -5, popularity: -10, stress: 4 },
      },
      {
        key: 'double',
        label: 'Double down',
        consequences: { popularity: 20, reputation: -15, stress: 6 },
      },
    ],
  },
  {
    id: 'media-award-talk',
    category: C.Media,
    title: 'Talk of awards',
    descriptionTemplate: 'Pundits mention you as an award contender.',
    trigger: { all: [{ field: 'currentAbility', op: 'gte', value: 75 }] },
    weight: 3,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'enjoy',
        label: 'Enjoy the buzz',
        consequences: { morale: 6, popularity: 30 },
      },
      {
        key: 'ignore',
        label: 'Block out the noise',
        consequences: { motivation: 4 },
      },
    ],
  },

  // ----------------------------------------------------------------- SPONSOR
  {
    id: 'sponsor-boots',
    category: C.Sponsor,
    title: 'Boot deal',
    descriptionTemplate: 'A brand offers you a boot deal.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 400 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'sign',
        label: 'Sign the deal',
        consequences: { money: 20000, popularity: 15 },
      },
      { key: 'wait', label: 'Hold out for more', consequences: { stress: 2 } },
    ],
  },
  {
    id: 'sponsor-local',
    category: C.Sponsor,
    title: 'Local sponsor',
    descriptionTemplate: 'A local business wants to sponsor you.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 5,
    cooldownWeeks: 20,
    choices: [
      {
        key: 'accept',
        label: 'Accept',
        consequences: { money: 5000, popularity: 8 },
      },
      { key: 'decline', label: 'Decline', consequences: { morale: 1 } },
    ],
  },
  {
    id: 'sponsor-risky',
    category: C.Sponsor,
    title: 'Questionable brand',
    descriptionTemplate: 'A controversial brand offers big money.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 600 }] },
    weight: 3,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'take',
        label: 'Take the money',
        consequences: { money: 50000, reputation: -20 },
      },
      {
        key: 'refuse',
        label: 'Protect your image',
        consequences: { reputation: 10 },
      },
    ],
  },
  {
    id: 'sponsor-charity',
    category: C.Sponsor,
    title: 'Charity campaign',
    descriptionTemplate: 'You are invited to front a charity campaign.',
    trigger: { all: [{ field: 'popularity', op: 'gte', value: 150 }] },
    weight: 4,
    cooldownWeeks: 24,
    choices: [
      {
        key: 'lead',
        label: 'Lead it',
        consequences: { reputation: 20, popularity: 20, money: -3000 },
      },
      {
        key: 'support',
        label: 'Lend your name',
        consequences: { reputation: 8 },
      },
    ],
  },

  // ------------------------------------------------------------------ HEALTH
  {
    id: 'health-flu',
    category: C.Health,
    title: 'Down with the flu',
    descriptionTemplate: 'A nasty bug knocks you out for a few days.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'rest',
        label: 'Rest fully',
        consequences: { stress: -3, motivation: -2 },
      },
      {
        key: 'train',
        label: 'Train through it',
        consequences: { stress: 4, mentalHealth: -2 },
      },
    ],
  },
  {
    id: 'health-nutrition',
    category: C.Health,
    title: 'Nutrition plan',
    descriptionTemplate: 'A nutritionist offers a tailored plan.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 15 }] },
    weight: 4,
    cooldownWeeks: 30,
    choices: [
      {
        key: 'commit',
        label: 'Commit fully',
        consequences: { motivation: 4, money: -1000 },
      },
      {
        key: 'ignore',
        label: 'Eat what you like',
        consequences: { happiness: 2, motivation: -2 },
      },
    ],
  },
  {
    id: 'health-burnout',
    category: C.Health,
    title: 'Signs of burnout',
    descriptionTemplate: 'You feel mentally drained.',
    trigger: { all: [{ field: 'mentalHealth', op: 'lt', value: 45 }] },
    weight: 5,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'help',
        label: 'Seek support',
        consequences: { mentalHealth: 10, stress: -8 },
      },
      {
        key: 'hide',
        label: 'Bottle it up',
        consequences: { mentalHealth: -5, stress: 5 },
      },
    ],
  },
  {
    id: 'health-sleep',
    category: C.Health,
    title: 'Sleep trouble',
    descriptionTemplate: 'Stress is keeping you up at night.',
    trigger: { all: [{ field: 'stress', op: 'gte', value: 55 }] },
    weight: 4,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'routine',
        label: 'Fix your routine',
        consequences: { stress: -6, mentalHealth: 4 },
      },
    ],
  },

  // ----------------------------------------------------------------- FINANCE
  {
    id: 'fin-first-wage',
    category: C.Finance,
    title: 'First proper wage',
    descriptionTemplate: 'Your first real pay packet arrives.',
    trigger: { all: [{ field: 'hasClub', op: 'eq', value: true }] },
    weight: 4,
    cooldownWeeks: 52,
    maxOccurrencesPerCareer: 1,
    choices: [
      {
        key: 'save',
        label: 'Save sensibly',
        consequences: { money: 2000, happiness: 2 },
      },
      {
        key: 'spend',
        label: 'Treat yourself',
        consequences: { money: -1500, happiness: 6 },
      },
    ],
  },
  {
    id: 'fin-investment',
    category: C.Finance,
    title: 'Investment tip',
    descriptionTemplate: 'A friend pitches an investment opportunity.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 18 }] },
    weight: 4,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'invest',
        label: 'Invest',
        consequences: { money: -10000, stress: 4 },
      },
      { key: 'pass', label: 'Pass', consequences: { morale: 1 } },
    ],
  },
  {
    id: 'fin-tax',
    category: C.Finance,
    title: 'Tax bill',
    descriptionTemplate: 'An unexpected tax bill lands.',
    trigger: { all: [{ field: 'reputation', op: 'gte', value: 400 }] },
    weight: 3,
    cooldownWeeks: 40,
    choices: [
      {
        key: 'pay',
        label: 'Pay it',
        consequences: { money: -8000, stress: 3 },
      },
    ],
  },
  {
    id: 'fin-car',
    category: C.Finance,
    title: 'A flashy car',
    descriptionTemplate: 'You spot the car of your dreams.',
    trigger: {
      all: [
        { field: 'age', op: 'gte', value: 18 },
        { field: 'reputation', op: 'gte', value: 300 },
      ],
    },
    weight: 3,
    cooldownWeeks: 40,
    choices: [
      {
        key: 'buy',
        label: 'Buy it',
        consequences: { money: -40000, happiness: 10, popularity: 10 },
      },
      {
        key: 'resist',
        label: 'Resist',
        consequences: { money: 0, motivation: 2 },
      },
    ],
  },

  // --------------------------------------------------------------- BEHAVIOUR
  {
    id: 'beh-late',
    category: C.Behaviour,
    title: 'Late for training',
    descriptionTemplate: 'You oversleep and miss the start of training.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 12,
    choices: [
      {
        key: 'apologise',
        label: 'Apologise sincerely',
        consequences: { reputation: -5, morale: -2 },
      },
      {
        key: 'excuse',
        label: 'Make an excuse',
        consequences: { reputation: -12, stress: 3 },
      },
    ],
  },
  {
    id: 'beh-charity-visit',
    category: C.Behaviour,
    title: 'Hospital visit',
    descriptionTemplate: 'You are asked to visit sick children in hospital.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 16 }] },
    weight: 4,
    cooldownWeeks: 26,
    choices: [
      {
        key: 'go',
        label: 'Go gladly',
        consequences: { reputation: 15, happiness: 6 },
      },
    ],
  },
  {
    id: 'beh-social-media',
    category: C.Behaviour,
    title: 'Social media slip',
    descriptionTemplate: 'A post of yours sparks debate.',
    trigger: { all: [{ field: 'popularity', op: 'gte', value: 100 }] },
    weight: 4,
    cooldownWeeks: 16,
    choices: [
      {
        key: 'delete',
        label: 'Delete and apologise',
        consequences: { popularity: -5, reputation: -3 },
      },
      {
        key: 'keep',
        label: 'Stand by it',
        consequences: { popularity: 15, reputation: -8 },
      },
    ],
  },
  {
    id: 'beh-discipline',
    category: C.Behaviour,
    title: 'Dressing-room clash',
    descriptionTemplate: 'A heated argument breaks out.',
    trigger: { all: [{ field: 'stress', op: 'gte', value: 65 }] },
    weight: 3,
    cooldownWeeks: 18,
    choices: [
      {
        key: 'cool',
        label: 'Cool it down',
        consequences: { stress: -5, reputation: 5 },
      },
      {
        key: 'escalate',
        label: 'Escalate',
        consequences: { stress: 6, reputation: -12 },
      },
    ],
  },
  {
    id: 'beh-professional',
    category: C.Behaviour,
    title: 'Extra professionalism',
    descriptionTemplate: 'You consider going the extra mile in preparation.',
    trigger: { all: [{ field: 'age', op: 'gte', value: 14 }] },
    weight: 5,
    cooldownWeeks: 10,
    choices: [
      {
        key: 'commit',
        label: 'Commit to it',
        consequences: { motivation: 5, stress: 2 },
      },
      { key: 'relax', label: 'Stay relaxed', consequences: { happiness: 3 } },
    ],
  },
];
