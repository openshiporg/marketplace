export function getStorePlatformLabel(platform?: string): string {
  switch (platform) {
    case "openfront-restaurant":
      return "Openfront Restaurant";
    case "openfront":
      return "Openfront E-commerce";
    case "shopify":
      return "Shopify";
    case "bigcommerce":
      return "BigCommerce";
    case "woocommerce":
      return "WooCommerce";
    default:
      return "Commerce store";
  }
}
