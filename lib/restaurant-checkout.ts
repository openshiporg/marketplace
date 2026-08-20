export type RestaurantCheckoutIssue =
  | 'empty_cart'
  | 'missing_contact'
  | 'missing_delivery_address'
  | 'delivery_minimum';

export function getRestaurantCheckoutIssues(cart: any): RestaurantCheckoutIssue[] {
  const issues: RestaurantCheckoutIssue[] = [];
  const lineItems = Array.isArray(cart?.lineItems) ? cart.lineItems : [];
  if (lineItems.length === 0) issues.push('empty_cart');

  if (!cart?.customerName || !cart?.email || !cart?.customerPhone) {
    issues.push('missing_contact');
  }

  if (cart?.orderType === 'delivery') {
    if (!cart.deliveryAddress || !cart.deliveryCity || !cart.deliveryZip || !cart.deliveryCountryCode) {
      issues.push('missing_delivery_address');
    }
    if (cart.deliveryMinimumNotMet) issues.push('delivery_minimum');
  }

  return issues;
}

export function restaurantCheckoutIssueMessage(issue: RestaurantCheckoutIssue): string {
  switch (issue) {
    case 'empty_cart':
      return 'Cart is empty';
    case 'missing_contact':
      return 'Add customer name, email, and phone';
    case 'missing_delivery_address':
      return 'Add a complete delivery address';
    case 'delivery_minimum':
      return 'Delivery minimum has not been reached';
  }
}
