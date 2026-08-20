export function latestStepCalledTool(
  steps: Array<{ toolResults?: Array<{ toolName?: unknown }> }>,
  toolName: string
): boolean {
  const latestStep = steps.at(-1);
  return (latestStep?.toolResults || []).some(
    (toolResult) => toolResult?.toolName === toolName
  );
}

export function forcedFollowUpToolForSteps(
  steps: Array<{ toolResults?: Array<{ toolName?: unknown }> }>
): 'viewCart' | null {
  return latestStepCalledTool(steps, 'setShippingAddress') ||
    latestStepCalledTool(steps, 'setRestaurantFulfillment')
    ? 'viewCart'
    : null;
}
