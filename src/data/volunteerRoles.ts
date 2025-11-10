export type VolunteerRole = {
  id: string;
  name: string;
  description: string;
  slots?: string;
  isActive: boolean;
};

export const volunteerRoles: VolunteerRole[] = [
  {
    id: 'course-marshals',
    name: 'Course Marshals (5)',
    description: 'Cheer and guide runners at assigned corners so nobody takes a wrong turn.',
    slots: '5 spots',
    isActive: true,
  },
  {
    id: 'pacers-fast',
    name: 'Pacers – Fast',
    description: 'Lead the front group and keep the energy high from the first stride.',
    isActive: true,
  },
  {
    id: 'pacers-medium',
    name: 'Pacers – Medium',
    description: 'Support steady runners and help them hold a comfortable pace.',
    isActive: true,
  },
  {
    id: 'pacers-finish',
    name: 'Pacers – Finish Crew',
    description: 'Stay positive with runners who are focused on finishing strong.',
    isActive: true,
  },
  {
    id: 'finish-line-holders',
    name: 'Finish Line Holders (2)',
    description: 'Hold the banner, cheer loudly, and celebrate every finish.',
    slots: '2 spots',
    isActive: true,
  },
  {
    id: 'water-station-crew',
    name: 'Water Station Crew',
    description: 'Optional future role to set up cups and keep everyone hydrated.',
    isActive: false,
  },
  {
    id: 'setup-teardown',
    name: 'Setup & Teardown',
    description: 'Optional future role to help set up the start/finish and pack up gear.',
    isActive: false,
  },
];

export const activeVolunteerRoles = volunteerRoles.filter((role) => role.isActive);


