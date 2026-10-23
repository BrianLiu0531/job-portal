export const CATEGORIES = [
  'Software Engineering',
  'Data & Analytics',
  'Design',
  'Product Management',
  'IT Support',
  'Marketing',
  'Sales',
  'Accounting & Finance',
  'Healthcare',
  'Hospitality',
  'Trades & Construction',
  'Education',
  'Administration',
  'Customer Service',
] as const;

/** Region codes → display names. AU uses states/territories, NZ uses regions. */
export const LOCATIONS = {
  AU: {
    NSW: 'New South Wales',
    VIC: 'Victoria',
    QLD: 'Queensland',
    WA: 'Western Australia',
    SA: 'South Australia',
    TAS: 'Tasmania',
    ACT: 'Australian Capital Territory',
    NT: 'Northern Territory',
  },
  NZ: {
    AKL: 'Auckland',
    WGN: 'Wellington',
    CAN: 'Canterbury',
    WKO: 'Waikato',
    BOP: 'Bay of Plenty',
    OTA: 'Otago',
    MWT: 'Manawatū-Whanganui',
    HKB: "Hawke's Bay",
    NSN: 'Nelson',
    NTL: 'Northland',
  },
} as const;

export const COUNTRIES = { AU: 'Australia', NZ: 'New Zealand' } as const;

export const WORK_TYPES = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  CONTRACT: 'Contract / temp',
  CASUAL: 'Casual / vacation',
} as const;

export const WORKPLACES = { ONSITE: 'On-site', HYBRID: 'Hybrid', REMOTE: 'Remote' } as const;

export const WORK_RIGHTS = {
  CITIZEN_PR: 'Citizen or permanent resident',
  WORKING_HOLIDAY: 'Working holiday visa',
  STUDENT: 'Student visa',
  TEMPORARY_VISA: 'Other temporary visa with work rights',
  REQUIRES_SPONSORSHIP: 'Requires visa sponsorship',
} as const;

export const APPLICATION_STATUSES = {
  APPLIED: 'Applied',
  REVIEWING: 'Under review',
  INTERVIEW: 'Interview',
  OFFERED: 'Offered',
  REJECTED: 'Unsuccessful',
  WITHDRAWN: 'Withdrawn',
} as const;
