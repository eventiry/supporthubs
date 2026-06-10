/** Age bands collected at voucher issue ("number of people by age group"). */
export const HOUSEHOLD_AGE_BANDS = [
  "0-17",
  "18-24",
  "25-44",
  "45-64",
  "65+",
] as const;

export type HouseholdAgeBand = (typeof HOUSEHOLD_AGE_BANDS)[number];

const CHILD_BAND: HouseholdAgeBand = "0-17";
const ADULT_BANDS: HouseholdAgeBand[] = ["18-24", "25-44", "45-64", "65+"];

export function parseHouseholdByAge(
  householdByAge: unknown
): Record<HouseholdAgeBand, number> {
  const result = emptyHouseholdByAge();
  if (householdByAge == null || typeof householdByAge !== "object") {
    return result;
  }
  const obj = householdByAge as Record<string, unknown>;
  for (const band of HOUSEHOLD_AGE_BANDS) {
    const n = obj[band];
    if (typeof n === "number" && n > 0) {
      result[band] = Math.min(99, Math.floor(n));
    }
  }
  return result;
}

export function emptyHouseholdByAge(): Record<HouseholdAgeBand, number> {
  return {
    "0-17": 0,
    "18-24": 0,
    "25-44": 0,
    "45-64": 0,
    "65+": 0,
  };
}

export function totalPeopleFromHousehold(householdByAge: unknown): number {
  const parsed = parseHouseholdByAge(householdByAge);
  return Object.values(parsed).reduce((sum, n) => sum + n, 0);
}

export function childrenFromHousehold(householdByAge: unknown): number {
  return parseHouseholdByAge(householdByAge)[CHILD_BAND];
}

export function adultsFromHousehold(householdByAge: unknown): number {
  const parsed = parseHouseholdByAge(householdByAge);
  return ADULT_BANDS.reduce((sum, band) => sum + parsed[band], 0);
}

export function mergeHouseholdCounts(
  target: Record<HouseholdAgeBand, number>,
  householdByAge: unknown
): void {
  const parsed = parseHouseholdByAge(householdByAge);
  for (const band of HOUSEHOLD_AGE_BANDS) {
    target[band] += parsed[band];
  }
}

export interface AggregatedPeopleServed {
  totalPeople: number;
  children: number;
  adults: number;
  byAgeBand: { band: HouseholdAgeBand; count: number }[];
  redemptions: number;
  redemptionsWithData: number;
  redemptionsWithoutData: number;
}

export function aggregatePeopleFromRedemptions(
  households: unknown[]
): AggregatedPeopleServed {
  const totals = emptyHouseholdByAge();
  let redemptionsWithData = 0;
  let redemptionsWithoutData = 0;

  for (const household of households) {
    const count = totalPeopleFromHousehold(household);
    if (count > 0) {
      redemptionsWithData += 1;
      mergeHouseholdCounts(totals, household);
    } else {
      redemptionsWithoutData += 1;
    }
  }

  const children = totals[CHILD_BAND];
  const adults = ADULT_BANDS.reduce((sum, band) => sum + totals[band], 0);

  return {
    totalPeople: children + adults,
    children,
    adults,
    byAgeBand: HOUSEHOLD_AGE_BANDS.map((band) => ({
      band,
      count: totals[band],
    })),
    redemptions: households.length,
    redemptionsWithData,
    redemptionsWithoutData,
  };
}
