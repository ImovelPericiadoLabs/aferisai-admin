/** 0 address · 1 signature · 2 test · 3 activate · 4 complete. */
export function webhookStep(state: {
  hasEndpoint: boolean;
  active: boolean;
  configured: boolean;
  testDelivered: boolean;
}): 0 | 1 | 2 | 3 | 4 {
  if (!state.hasEndpoint) return 0;
  if (state.active) return 4;
  if (state.testDelivered) return 3;
  return state.configured ? 2 : 1;
}
