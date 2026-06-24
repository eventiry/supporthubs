/** Effective kg distributed: fulfillment weight at redeem, else weight recorded at issue. */
export function effectiveDistributionWeightKg(
  redemptionWeightKg: number | null | undefined,
  voucherWeightKg: number | null | undefined
): number | null {
  if (redemptionWeightKg != null && redemptionWeightKg >= 0) {
    return redemptionWeightKg;
  }
  if (voucherWeightKg != null && voucherWeightKg >= 0) {
    return voucherWeightKg;
  }
  return null;
}

export function roundKg(total: number): number {
  return Math.round(total * 10) / 10;
}
