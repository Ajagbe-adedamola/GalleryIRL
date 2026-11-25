export type TimeOfDayId = "morning" | "golden" | "dusk" | "night";

export interface TimeOfDayPreset {
  id: TimeOfDayId;
  label: string;
  short: string;
  accent: string;
  accentSoft: string;
  skyColor: string;
  horizonColor: string;
  fogColor: string;
  sunPosition: [number, number, number];
  rasterBrightnessMax: number;
  rasterSaturation: number;
  rasterContrast: number;
  buildingBase: string;
  buildingTop: string;
  roadColor: string;
  labelColor: string;
  glowOpacity: number;
  scrim: string;
  lightColor: string;
  lightIntensity: number;
}

export const TIME_OF_DAY_PRESETS: TimeOfDayPreset[] = [
  {
    id: "morning",
    label: "Morning",
    short: "AM",
    accent: "#9BD6E6",
    accentSoft: "rgba(155,214,230,0.16)",
    skyColor: "#9DB6C4",
    horizonColor: "#DCE4E7",
    fogColor: "#B9C7CE",
    sunPosition: [0.8, 80, 34],
    rasterBrightnessMax: 0.95,
    rasterSaturation: -0.1,
    rasterContrast: 0.04,
    buildingBase: "#5A6874",
    buildingTop: "#A5B5C1",
    roadColor: "#E8F0F4",
    labelColor: "#EAF3F6",
    glowOpacity: 0.15,
    scrim: "rgba(150,180,196,0.10)",
    lightColor: "#eaf3f8",
    lightIntensity: 0.35,
  },
  {
    id: "golden",
    label: "Golden hour",
    short: "PM",
    accent: "#F2B279",
    accentSoft: "rgba(242,178,121,0.16)",
    skyColor: "#DFA36B",
    horizonColor: "#F6D8A8",
    fogColor: "#D9AE86",
    sunPosition: [1.15, 55, 18],
    rasterBrightnessMax: 0.94,
    rasterSaturation: 0.08,
    rasterContrast: 0.02,
    buildingBase: "#6A5F55",
    buildingTop: "#BD9E80",
    roadColor: "#F6E7D6",
    labelColor: "#F7EADB",
    glowOpacity: 0.22,
    scrim: "rgba(255,166,88,0.10)",
    lightColor: "#ffd7a8",
    lightIntensity: 0.5,
  },
  {
    id: "dusk",
    label: "Dusk",
    short: "DUSK",
    accent: "#E88BA8",
    accentSoft: "rgba(232,139,168,0.16)",
    skyColor: "#4A2E4C",
    horizonColor: "#C86A63",
    fogColor: "#6C4757",
    sunPosition: [-1.2, 30, 12],
    rasterBrightnessMax: 0.72,
    rasterSaturation: -0.06,
    rasterContrast: 0.12,
    buildingBase: "#4A3F52",
    buildingTop: "#83677C",
    roadColor: "#F0C7C0",
    labelColor: "#F3D9DF",
    glowOpacity: 0.6,
    scrim: "rgba(90,50,100,0.16)",
    lightColor: "#ff9ec4",
    lightIntensity: 0.3,
  },
  {
    id: "night",
    label: "Night",
    short: "NIGHT",
    accent: "#6FE3D2",
    accentSoft: "rgba(111,227,210,0.16)",
    skyColor: "#050A12",
    horizonColor: "#0D1A26",
    fogColor: "#0A121B",
    sunPosition: [-1.4, 20, 8],
    rasterBrightnessMax: 0.52,
    rasterSaturation: -0.32,
    rasterContrast: 0.16,
    buildingBase: "#161F2A",
    buildingTop: "#33465B",
    roadColor: "#7FB4C4",
    labelColor: "#CFE7EE",
    glowOpacity: 0.95,
    scrim: "rgba(3,9,18,0.34)",
    lightColor: "#7fe4ff",
    lightIntensity: 0.18,
  },
];

export const TIME_OF_DAY_MAP: Record<TimeOfDayId, TimeOfDayPreset> = Object.fromEntries(
  TIME_OF_DAY_PRESETS.map((preset) => [preset.id, preset]),
) as Record<TimeOfDayId, TimeOfDayPreset>;

export function isTimeOfDayId(value: string): value is TimeOfDayId {
  return value in TIME_OF_DAY_MAP;
}

export function resolveTimeOfDay(value: string | null | undefined): TimeOfDayPreset {
  if (value && isTimeOfDayId(value)) return TIME_OF_DAY_MAP[value];
  return TIME_OF_DAY_MAP.dusk;
}
