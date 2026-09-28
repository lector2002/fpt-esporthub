/** Credits for a VND price at the first pack's rate, rounded up like the API's hold. */
export function creditsForVnd(amountVnd: number, pack: { amountVnd: number; credits: number }) {
  return Math.ceil(amountVnd / (pack.amountVnd / pack.credits));
}
