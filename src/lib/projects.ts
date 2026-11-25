// Projects shown in the Portfolio panel, grouped into Web and Design.
// Titles, kinds and summaries follow jeffreyko.com so the two sites agree;
// each "Case study" link opens that project's page there.

export type ProjectCategory = 'web' | 'design';

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  title: string;
  category: ProjectCategory;
  kind: string; // what it is, and whether it shipped or is a concept
  summary: string; // the problem it solves, in one line
  image: string;
  links: ProjectLink[];
}

export const PROJECT_CATEGORIES: { id: ProjectCategory; label: string }[] = [
  { id: 'web', label: 'Web' },
  { id: 'design', label: 'Design' },
];

const caseStudy = (slug: string): ProjectLink => ({
  label: 'Case study',
  href: `https://www.jeffreyko.com/pj/${slug}`,
});

const IMG = '/assets/images/projects';

export const projects: Project[] = [
  // Web: designed and built
  {
    title: 'Katsu Seiba',
    category: 'web',
    kind: 'Restaurant website · Concept',
    summary:
      'Menu, locations and a validated table-booking flow, with booking one tap away from every section.',
    image: `${IMG}/katsu-seiba.jpg`,
    links: [
      { label: 'Live site', href: 'https://katsuseiba.vercel.app' },
      caseStudy('katsu-seiba'),
    ],
  },
  {
    title: 'Muscle Memory',
    category: 'web',
    kind: 'Workout web app · Personal',
    summary:
      '42 exercises by muscle group, with search, equipment filters and a daily progress tracker.',
    image: `${IMG}/muscle-memory.jpg`,
    links: [
      { label: 'Live site', href: 'https://musclememo.vercel.app' },
      caseStudy('muscle-memory'),
    ],
  },
  {
    title: 'Port Jeffrey',
    category: 'web',
    kind: '3D portfolio · This site',
    summary:
      'An island you can explore, with every landmark labelled so the work is never hidden.',
    image: `${IMG}/port-jeffrey-island.jpg`,
    links: [caseStudy('port-jeffrey')],
  },
  {
    title: 'Fruitea',
    category: 'web',
    kind: 'Fruit and veg info site',
    summary:
      'A produce reference that answers what something does to you and what to make with it, in one read.',
    image: `${IMG}/fruitea.jpg`,
    links: [
      { label: 'Live site', href: 'https://fruitea.vercel.app' },
      caseStudy('fruitea'),
    ],
  },

  // Design: app UX/UI in Figma
  {
    title: 'iDriver',
    category: 'design',
    kind: 'Delivery app · Redesign',
    summary:
      'Newspaper delivery, redesigned so drivers start a run in two steps, with proof of delivery tied to the right stop.',
    image: `${IMG}/idriver.jpg`,
    links: [caseStudy('idriver')],
  },
  {
    title: 'Revo Fitness',
    category: 'design',
    kind: 'Gym app · Redesign',
    summary:
      'The member app rebuilt around every visit: scan in, train, and use your perks.',
    image: `${IMG}/revo-fitness.jpg`,
    links: [caseStudy('revo-fitness')],
  },
  {
    title: 'Peter Parking',
    category: 'design',
    kind: 'Parking app · Concept',
    summary:
      'One app that pays every street-parking operator, so drivers stop installing a new app for every street.',
    image: `${IMG}/peter-parking.jpg`,
    links: [caseStudy('peter-parking')],
  },
  {
    title: 'Sigma',
    category: 'design',
    kind: 'Finance app · Concept',
    summary:
      'Most finance apps tell you what you spent. Sigma tells you what you can spend, before you spend it.',
    image: `${IMG}/sigma.jpg`,
    links: [caseStudy('sigma')],
  },
  {
    title: 'Rooted',
    category: 'design',
    kind: 'Habit app · Concept',
    summary:
      'A habit app that splits what you grow from what you uproot, with a plant metaphor instead of a streak counter.',
    image: `${IMG}/rooted.jpg`,
    links: [caseStudy('rooted')],
  },
];
