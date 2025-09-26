// Fake data generators for demo tables

export const fakeSessions = [
  {
    id: 'demo-1',
    sessionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    trainer: {
      name: 'Sarah Chen',
      email: 'sarah@demo.com'
    },
    client: {
      name: 'Michael Johnson',
      email: 'michael@demo.com'
    },
    location: {
      name: 'Downtown Gym'
    },
    package: {
      name: '10 Session Package'
    },
    sessionValue: 75,
    validated: true,
    validatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'demo-2', 
    sessionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    trainer: {
      name: 'Alex Rivera',
      email: 'alex@demo.com'
    },
    client: {
      name: 'Emma Wilson',
      email: 'emma@demo.com'
    },
    location: {
      name: 'Westside Studio'
    },
    package: {
      name: '5 Session Package'
    },
    sessionValue: 60,
    validated: false,
    validatedAt: null
  },
  {
    id: 'demo-3',
    sessionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    trainer: {
      name: 'James Park',
      email: 'james@demo.com'
    },
    client: {
      name: 'Sophia Martinez',
      email: 'sophia@demo.com'
    },
    location: {
      name: 'Downtown Gym'
    },
    package: {
      name: '20 Session Package'
    },
    sessionValue: 55,
    validated: true,
    validatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'demo-4',
    sessionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
    trainer: {
      name: 'Lisa Thompson',
      email: 'lisa@demo.com'
    },
    client: {
      name: 'Daniel Brown',
      email: 'daniel@demo.com'
    },
    location: {
      name: 'North Point Fitness'
    },
    package: {
      name: '10 Session Package'
    },
    sessionValue: 80,
    validated: true,
    validatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  }
]

export const fakeCommissionData = [
  {
    trainer: {
      name: 'Sarah Chen',
      email: 'sarah@demo.com'
    },
    sessionsCount: 28,
    currentTier: 'Tier 3',
    rate: 60,
    sessionValue: 2100,
    commission: 1260
  },
  {
    trainer: {
      name: 'Alex Rivera', 
      email: 'alex@demo.com'
    },
    sessionsCount: 15,
    currentTier: 'Tier 2',
    rate: 50,
    sessionValue: 900,
    commission: 450
  },
  {
    trainer: {
      name: 'James Park',
      email: 'james@demo.com'
    },
    sessionsCount: 8,
    currentTier: 'Tier 1',
    rate: 40,
    sessionValue: 440,
    commission: 176
  },
  {
    trainer: {
      name: 'Lisa Thompson',
      email: 'lisa@demo.com'
    },
    sessionsCount: 22,
    currentTier: 'Tier 3',
    rate: 60,
    sessionValue: 1760,
    commission: 1056
  }
]