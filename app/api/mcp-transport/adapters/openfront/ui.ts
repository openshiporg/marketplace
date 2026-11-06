/**
 * OpenFront Marketplace cards. The cards render in the browser with TuffUI (https://tuffui.com, MIT);
 * see mcp-ui/ in the repository root and THIRD_PARTY_NOTICES.md.
 */
import { cartCardHtml, conflictCardHtml, loginCardHtml, retailCartData } from '../../../../../mcp-ui/server/cards';
import { safeHttpUrl } from '@/lib/safe-content';

export function generateOpenFrontCartUI(params: { storeId: string; cartId: string; cart: any; storeInfo: any; shippingOptions: any[] }): Promise<string> {
  return cartCardHtml(retailCartData(params));
}

export function generateOpenFrontLoginUI(params: { storeId: string; email?: string; message?: string; cartId?: string; addressData?: any }): Promise<string> {
  const { storeId, email, message, cartId, addressData } = params;
  return loginCardHtml({ storeId, email: email || '', message: message || 'An account with this email already exists. Please login.', cartId, addressData });
}

export function generateOpenFrontEmailConflictUI(params: {
  storeId: string; email: string; cartId: string; firstName: string; lastName: string; address1: string; city: string;
  postalCode: string; countryCode: string; province: string; company: string; phone: string; storeName: string; checkoutUrl?: string;
}): Promise<string> {
  const { storeId, email, cartId, firstName, lastName, address1, city, postalCode, countryCode, province, company, phone, storeName } = params;
  return conflictCardHtml({
    storeId, cartId, email, storeName, checkoutUrl: safeHttpUrl(params.checkoutUrl),
    addressData: { firstName, lastName, address1, city, postalCode, countryCode, province, company, phone },
  });
}
