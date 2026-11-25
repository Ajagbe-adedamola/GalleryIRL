export interface Neighbourhood {
  id: string;
  name: string;
  /** [lng, lat] */
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  blurb: string;
}

export const LAGOS_CENTER: [number, number] = [3.3792, 6.5244];

export const NEIGHBOURHOODS: Neighbourhood[] = [
  {
    id: "yaba",
    name: "Yaba",
    center: [3.3756, 6.5095],
    zoom: 14.6,
    pitch: 58,
    bearing: -28,
    blurb: "Tech, murals and young studios along Herbert Macaulay Way.",
  },
  {
    id: "surulere",
    name: "Surulere",
    center: [3.3489, 6.4969],
    zoom: 14.4,
    pitch: 56,
    bearing: -18,
    blurb: "Film, sound and independent fashion behind Bode Thomas.",
  },
  {
    id: "lagos-island",
    name: "Lagos Island",
    center: [3.3947, 6.455],
    zoom: 14.6,
    pitch: 60,
    bearing: -34,
    blurb: "Old Lagos: markets, archives and heritage architecture.",
  },
  {
    id: "victoria-island",
    name: "Victoria Island",
    center: [3.421, 6.4281],
    zoom: 14.4,
    pitch: 57,
    bearing: -24,
    blurb: "Galleries, listening rooms and waterfront studios.",
  },
  {
    id: "ikoyi",
    name: "Ikoyi",
    center: [3.4358, 6.4499],
    zoom: 14.5,
    pitch: 58,
    bearing: -16,
    blurb: "Project spaces tucked into quiet, tree-lined streets.",
  },
  {
    id: "lekki",
    name: "Lekki",
    center: [3.4739, 6.4417],
    zoom: 14.1,
    pitch: 55,
    bearing: -30,
    blurb: "Phase 1: concept stores, studios and new-wave galleries.",
  },
  {
    id: "ikeja",
    name: "Ikeja",
    center: [3.3421, 6.6018],
    zoom: 14.4,
    pitch: 56,
    bearing: -22,
    blurb: "Mainland creative hubs and music industry offices.",
  },
  {
    id: "maryland",
    name: "Maryland",
    center: [3.366, 6.573],
    zoom: 14.4,
    pitch: 55,
    bearing: -12,
    blurb: "Small studios and community spaces off Ikorodu Road.",
  },
  {
    id: "mushin",
    name: "Mushin",
    center: [3.3499, 6.5278],
    zoom: 14.6,
    pitch: 60,
    bearing: -40,
    blurb: "Street-level making: signs, murals and workshops.",
  },
  {
    id: "oshodi",
    name: "Oshodi",
    center: [3.338, 6.555],
    zoom: 14.3,
    pitch: 58,
    bearing: -26,
    blurb: "Transit crossroads with an underground music pulse.",
  },
];

export function findNeighbourhood(name: string): Neighbourhood | undefined {
  return NEIGHBOURHOODS.find((item) => item.name.toLowerCase() === name.toLowerCase());
}
