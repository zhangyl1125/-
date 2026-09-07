export interface DigitalPioneerTrack {
  value: string
  label: string
  labelZh: string
  shorthand: string
  description: string
  standards: readonly string[]
}

export const DIGITAL_PIONEER_TRACKS: readonly DigitalPioneerTrack[] = [
  {
    value: 'Customer Values',
    label: 'Customer Values',
    labelZh: '客户价值',
    shorthand: 'VALUE',
    description: 'Turn deep customer understanding into tangible, lasting value.',
    standards: [
      'Deliver end-to-end solutions that create tangible value for customers and users.',
      'Win customers and users with differentiated, market-leading products and services, establishing long-term win-win partnerships to co-grow capabilities and business.',
      'Listen actively, think from the customer perspective, and uncover hidden needs and pain points.',
      'Continuously enhance the customer experience and co-create value. Demonstrate service excellence, resolve issues beyond expectations, and transform challenges into opportunities.',
    ],
  },
  {
    value: 'Innovation Breakthrough',
    label: 'Innovation Breakthrough',
    labelZh: '创新破局',
    shorthand: 'SHIFT',
    description: 'Challenge the status quo, test boldly, and prove innovation through impact.',
    standards: [
      'Deliver a clear breakthrough and show the courage to think outside the box and take smart risks.',
      'Take a broader view of innovation and embed it across the entire value chain.',
      'Pioneer cutting-edge technologies and cross-disciplinary methods to explore better paths.',
      'Use rapid validation and continuous iteration to create sustainable business impact.',
    ],
  },
  {
    value: 'Collaboration to Win',
    label: 'Collaboration to Win',
    labelZh: '协作共赢',
    shorthand: 'UNITE',
    description: 'Break boundaries, share ownership, and turn collective effort into shared success.',
    standards: [
      'Live “Discuss – Decide – Do”: when encountering bottlenecks, swiftly align key stakeholders to drive high-quality, decisive actions.',
      'Proactively share information and resources across boundaries to eliminate silos, foster synergy, and achieve the best solution.',
      'Own shared goals and proactively support upstream and downstream work.',
      'Promote and appreciate joint success, enabling the team to win as one and building trust across functions.',
    ],
  },
] as const

export const DIGITAL_PIONEER_TIMELINE = [
  { phase: 'Nomination', detail: 'Manager nomination / self-nomination', period: 'Oct. 19–30' },
  { phase: 'Associate pre-voting', detail: 'Ten shortlisted nominees per category', period: 'Nov. 2–13' },
  { phase: 'Committee evaluation', detail: 'Five finalists per category', period: 'Nov. 16–30' },
  { phase: 'Award ceremony', detail: 'Winners announced at Townhall', period: 'December' },
] as const

export const DIGITAL_PIONEER_RUBRIC = [
  {
    key: 'behavior',
    name: 'Behavior Demonstration',
    nameZh: '行为示范',
    weight: 70,
    description: 'How clearly the nominee’s actions demonstrate the selected award criteria.',
    levels: [
      { range: '9–10', label: 'Benchmark', detail: 'Perfect alignment; breakthrough action beyond core duties that fills gaps or leads transformation.' },
      { range: '7–8', label: 'Strong', detail: 'Meets the fundamental requirements and performs strongly within the defined scope.' },
      { range: '5–6', label: 'Marginal', detail: 'Descriptions are vague, lack concrete action, or have weak relevance to the award purpose.' },
      { range: '≤ 4', label: 'Non-compliant', detail: 'Low relevance or only routine daily tasks are described.' },
    ],
  },
  {
    key: 'impact',
    name: 'Business Impact',
    nameZh: '业务影响',
    weight: 30,
    description: 'The scale, evidence, and durability of the outcome created.',
    levels: [
      { range: '9–10', label: 'Significant', detail: 'Quantifiable benefits such as cost reduction, revenue growth, efficiency gains, or resolution of chronic issues.' },
      { range: '7–8', label: 'Noticeable', detail: 'Objectives were achieved with visible positive impact on the team or customer.' },
      { range: '5–6', label: 'Marginal', detail: 'Outcomes have limited value or are difficult to verify.' },
      { range: '≤ 4', label: 'Limited', detail: 'No substantive outcome or insufficient evidence in the nomination materials.' },
    ],
  },
] as const

export const DIGITAL_PIONEER_RECOMMENDATIONS = [
  { value: 'Strongly Recommended', label: 'Strongly recommended', description: 'Highly exemplary and a definitive award-winner candidate.' },
  { value: 'Recommend', label: 'Recommend', description: 'Outstanding performance that fully meets the award criteria.' },
  { value: 'Pending', label: 'Pending', description: 'Decision deferred while comparing with other candidates.' },
  { value: 'Not Recommended', label: 'Not recommended', description: 'Does not meet the established standards.' },
] as const

export const DIGITAL_PIONEER_VOTING_RULES = {
  votesPerTrack: 4,
  minimumOutsideDepartment: 2,
  shortlistPerTrack: 10,
  finalistPerTrack: 5,
} as const

export function normalizeDigitalPioneerTrack(category: string, technologies: string[]): string {
  if (DIGITAL_PIONEER_TRACKS.some((track) => track.value === category)) return category

  const legacyTracks: Record<string, string> = {
    'AI & Intelligence': DIGITAL_PIONEER_TRACKS[1].value,
    'Digital Transformation': DIGITAL_PIONEER_TRACKS[0].value,
    'Green & Sustainability': DIGITAL_PIONEER_TRACKS[2].value,
  }
  if (legacyTracks[category]) return legacyTracks[category]

  const searchable = `${category} ${technologies.join(' ')}`.toLowerCase()
  if (/collaborat|team|shared|cross.?department|together|silo/.test(searchable)) {
    return DIGITAL_PIONEER_TRACKS[2].value
  }
  if (/customer|client|user|experience|service|process|value/.test(searchable)) {
    return DIGITAL_PIONEER_TRACKS[0].value
  }
  return DIGITAL_PIONEER_TRACKS[1].value
}
