import { useState } from 'react';
import { TextArea } from '../vendor/text-field';
import { parsePastedDetails, type PastedDetails } from './paste';
import { CreditCard, LockKey, MapPin, ShoppingCart, Truck } from '../vendor/icons';
import { Button } from '../vendor/action-button';
import { ConfirmationCard, type ConfirmationItem } from '../vendor/confirmation-card';
import { EmptyState } from '../vendor/empty-state';
import { FormCard, type FormField, type FormValues } from '../vendor/form-card';
import { Radio, RadioGroup } from '../vendor/choice-controls';
import { Panel, Shell, ShellHeader } from '../vendor/surface';
import { Segmented } from '../vendor/segmented-control';
import { Tab, TabList, TabPanel, Tabs } from '../vendor/tab-panels';
import type { CartData, PaymentChoice } from '../types';
import { callTool, cartFromResponse, errorMessage, responseText, succeeded } from './bridge';
import { Note, WithStoreLogo, money, useBusy } from './ui';

type NoteState = { tone: 'positive' | 'negative'; text: string } | null;
const PROVIDER_LABEL: Record<PaymentChoice, string> = { stripe: 'Card (Stripe)', paypal: 'PayPal', checkout: 'Pay on the store checkout' };

export function CartCard({ initial, initialTab = 'cart' }: { initial: CartData; initialTab?: string }) {
  const [cart, setCart] = useState(initial);
  const [tab, setTab] = useState(initialTab);
  const [note, setNote] = useState<NoteState>(null);
  const { busy, run } = useBusy();
  const retail = cart.kind === 'retail';
  const ids = { storeId: cart.storeId, cartId: cart.cartId };

  const refresh = async () => {
    const response = await callTool('viewCart', ids);
    const next = cartFromResponse(response);
    if (next) setCart(next);
  };

  /** Run a cart tool, refresh on success, and surface the source's message on failure. */
  const mutate = async (toolName: string, params: Record<string, unknown>, failure: string) => {
    setNote(null);
    try {
      const response = await callTool(toolName, { ...ids, ...params });
      if (!succeeded(response)) {
        // setShippingAddress answers an email conflict with its own card; nothing to refresh then.
        if (response?.content?.[0]?.resource) return false;
        setNote({ tone: 'negative', text: errorMessage(response, failure) });
        return false;
      }
      await refresh();
      return true;
    } catch (error) {
      setNote({ tone: 'negative', text: error instanceof Error ? error.message : failure });
      return false;
    }
  };

  const items: ConfirmationItem[] = cart.items.map((i) => ({ id: i.id, label: i.label, detail: i.detail, image: i.image, amount: i.amount, quantity: i.quantity, editable: true, removable: true }));
  const onItemsChange = (next: ConfirmationItem[]) => {
    const removed = items.find((i) => !next.some((n) => n.id === i.id));
    if (removed) return void run(() => mutate('removeCartItem', { lineItemId: removed.id }, 'Could not remove this item.'));
    const changed = next.find((n) => n.quantity !== items.find((i) => i.id === n.id)?.quantity);
    if (changed) void run(() => mutate('updateCartItem', { lineItemId: changed.id, quantity: changed.quantity }, 'Could not update the quantity.'));
  };

  const discover = () => callTool('discoverProducts', { storeIds: [cart.storeId] }).catch(() => {});
  const next = retail ? 'address' : 'fulfillment';

  const cartPanel = cart.items.length === 0 ? (
    <Shell><Panel><EmptyState icon={ShoppingCart} title="Your cart is empty" description={cart.storeName} action={{ label: 'Show products', onClick: discover }} /></Panel></Shell>
  ) : (
    <ConfirmationCard
      data={{ title: cart.storeName || 'Cart', subtitle: `${cart.items.reduce((n, i) => n + i.quantity, 0)} ${cart.items.reduce((n, i) => n + i.quantity, 0) === 1 ? 'item' : 'items'}`, items, fees: cart.fees }}
      currency={cart.currency}
      status="review"
      onItemsChange={busy ? undefined : onItemsChange}
      onConfirm={() => setTab(next)}
      confirmLabel="Continue"
      className="max-w-none"
    />
  );

  return (
    <WithStoreLogo logo={cart.logo}>
    <div className="flex flex-col">
      <Tabs value={tab} onValueChange={setTab} defaultValue="cart" variant="default">
        <TabList label="Checkout steps" className="border-b border-border px-1 pb-0">
          <Tab value="cart">Cart</Tab>
          {retail ? <Tab value="address">Address</Tab> : <Tab value="fulfillment">Fulfillment</Tab>}
          {retail ? <Tab value="shipping">Shipping</Tab> : <Tab value="details">Details</Tab>}
          <Tab value="payment">Payment</Tab>
        </TabList>
        <div>
          <TabPanel value="cart">{cartPanel}</TabPanel>
          {retail ? (
            <>
              <TabPanel value="address"><AddressForm cart={cart} onSave={async (v) => { const ok = await mutate('setShippingAddress', addressParams(v), 'Could not save the address.'); if (!ok) throw new Error('failed'); setTab('shipping'); }} /></TabPanel>
              <TabPanel value="shipping"><ShippingPicker cart={cart} busy={busy} onPick={(id) => run(async () => { if (await mutate('setShippingMethod', { shippingMethodId: id }, 'Could not set the shipping method.')) setTab('payment'); })} /></TabPanel>
            </>
          ) : (
            <>
              <TabPanel value="fulfillment"><Fulfillment cart={cart} busy={busy} onPick={(orderType) => run(() => mutate('setRestaurantFulfillment', { orderType }, 'Could not change the order type.'))} onNext={() => setTab('details')} /></TabPanel>
              <TabPanel value="details"><RestaurantDetails cart={cart} onSave={async (v) => { const ok = await mutate('setRestaurantFulfillment', restaurantParams(cart, v), 'Could not save the details.'); if (!ok) throw new Error('failed'); setTab('payment'); }} /></TabPanel>
            </>
          )}
          <TabPanel value="payment"><Payment cart={cart} busy={busy} run={run} onLockAction={setTab} setNote={setNote} /></TabPanel>
        </div>
      </Tabs>
      {note && <Note tone={note.tone}>{note.text}</Note>}
    </div>
    </WithStoreLogo>
  );
}

/* ---- Retail ---- */

/** A country picker when the cart's region lists its countries, else a two-letter code. */
const countryField = (name: string, countries: { code: string; name: string }[] | undefined, fallback: string): FormField =>
  countries && countries.length
    ? { name, label: 'Country', type: 'select', required: true, options: countries.map((c) => ({ value: c.code, label: c.name })) }
    : { name, label: 'Country code', type: 'text', required: true, placeholder: fallback };

const addressFields = (c: CartData): FormField[] => [
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'firstName', label: 'First name', type: 'text', required: true },
  { name: 'lastName', label: 'Last name', type: 'text', required: true },
  { name: 'address1', label: 'Address', type: 'text', required: true },
  { name: 'city', label: 'City', type: 'text', required: true },
  { name: 'province', label: 'State or province', type: 'text' },
  { name: 'postalCode', label: 'Postal code', type: 'text', required: true },
  countryField('countryCode', c.retail?.countries, c.countryCode),
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'company', label: 'Company (optional)', type: 'text' },
];

/**
 * The old checkout let shoppers paste everything at once. Pasted text is parsed here, in the card, and only
 * fills the fields below for the shopper to check; nothing is sent until they press Save.
 */
function PasteDetails({ onFill }: { onFill: (d: PastedDetails) => void }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const fill = () => {
    const d = parsePastedDetails(text);
    const n = Object.keys(d).filter((k) => k !== 'name').length;
    setNote(n ? '' : 'No address, email or phone found.');
    if (n) onFill(d);
  };
  return (
    <div className="flex flex-col gap-2 border-b border-border pb-4">
      <TextArea
        label="Paste your details (optional)"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Jane Doe\njane@email.com\n123 Main St\nNew York, NY 10001\n+1 555 123 4567'}
      />
      <div className="flex items-center justify-between gap-3">
        <span role="status" className="text-xs text-muted-foreground">{note}</span>
        <Button variant="secondary" disabled={!text.trim()} onClick={fill}>Fill in</Button>
      </div>
    </div>
  );
}

const pick = (d: PastedDetails, map: Record<string, keyof PastedDetails>) =>
  Object.fromEntries(Object.entries(map).map(([field, key]) => [field, d[key]]).filter(([, v]) => v));

const addressParams = (v: FormValues) => {
  const s = (k: string) => String(v[k] ?? '').trim();
  return { email: s('email'), firstName: s('firstName'), lastName: s('lastName'), address1: s('address1'), city: s('city'), postalCode: s('postalCode'), countryCode: s('countryCode').toLowerCase(), province: s('province'), company: s('company'), phone: s('phone') };
};

function AddressForm({ cart, onSave }: { cart: CartData; onSave: (v: FormValues) => Promise<void> }) {
  const known = cart.retail?.address ?? {};
  const [values, setValues] = useState<FormValues>(() => ({ countryCode: cart.countryCode, ...known }));
  return (
    <FormCard
      data={{ title: 'Shipping address', description: cart.storeName, fields: addressFields(cart) }}
      values={values}
      onValuesChange={setValues}
      lead={<PasteDetails onFill={(d) => setValues((v) => ({ ...v, ...pick(d, { email: 'email', firstName: 'firstName', lastName: 'lastName', address1: 'address1', city: 'city', province: 'province', postalCode: 'postalCode', countryCode: 'countryCode', phone: 'phone' }) }))} />}
      onSubmit={onSave}
      submitLabel={Object.keys(known).length ? 'Update address' : 'Save address'}
      validate={(v) => {
        const code = String(v.countryCode ?? '').toLowerCase();
        const list = cart.retail?.countries ?? [];
        if (list.length) return { countryCode: list.some((c) => c.code === code) ? undefined : `${cart.storeName} does not ship there. Choose a country from the list.` };
        return { countryCode: /^[a-z]{2}$/.test(code) ? undefined : 'Use a two-letter country code' };
      }}
      className="max-w-none"
    />
  );
}

function ShippingPicker({ cart, busy, onPick }: { cart: CartData; busy: boolean; onPick: (id: string) => void }) {
  const options = cart.retail?.shippingOptions ?? [];
  return (
    <Shell>
      <ShellHeader icon={Truck} title="Shipping method" subtitle={options.length ? 'Choose how it gets to you' : undefined} />
      <Panel>
        {options.length ? (
          <div className="p-4">
            <RadioGroup label="Shipping method" value={cart.retail?.selectedShippingId} onValueChange={(id) => !busy && onPick(id)}>
              {options.map((o) => <Radio key={o.id} value={o.id} label={o.name} description={o.price} disabled={busy} />)}
            </RadioGroup>
          </div>
        ) : (
          <EmptyState compact icon={MapPin} title="No shipping options yet" description="Add a shipping address first." />
        )}
      </Panel>
    </Shell>
  );
}

/* ---- Restaurant ---- */

function Fulfillment({ cart, busy, onPick, onNext }: { cart: CartData; busy: boolean; onPick: (t: 'pickup' | 'delivery') => void; onNext: () => void }) {
  const r = cart.restaurant!;
  return (
    <Shell>
      <ShellHeader icon={Truck} title="Pickup or delivery" subtitle={cart.storeName} />
      <Panel>
        <div className="flex flex-col gap-3 p-4">
          <Segmented size="md" label="Order type" value={r.orderType} onValueChange={(v) => !busy && onPick(v)} options={[{ value: 'pickup', label: 'Pickup' }, { value: 'delivery', label: r.deliveryEnabled ? `Delivery · ${money(r.deliveryFee, cart.currency)}` : 'Delivery', disabled: !r.deliveryEnabled }]} />
          {r.orderType === 'pickup' && r.pickupAddress && <p className="text-[0.8125rem] text-muted-foreground">Pickup location: {r.pickupAddress}{r.estimatedPickup ? ` · Ready in ${r.estimatedPickup}` : ''}</p>}
          {r.notes.map((n) => <Note key={n} tone="neutral">{n}</Note>)}
          <div className="flex justify-end"><Button variant="primary" onClick={onNext}>Continue</Button></div>
        </div>
      </Panel>
    </Shell>
  );
}

const restaurantFields = (delivery: boolean): FormField[] => [
  { name: 'customerName', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'customerPhone', label: 'Phone', type: 'text', required: true },
  ...(delivery ? [
    { name: 'deliveryAddress', label: 'Address', type: 'text', required: true } as FormField,
    { name: 'deliveryAddress2', label: 'Apartment, suite, etc. (optional)', type: 'text' } as FormField,
    { name: 'deliveryCity', label: 'City', type: 'text', required: true } as FormField,
    { name: 'deliveryState', label: 'State or province (optional)', type: 'text' } as FormField,
    { name: 'deliveryZip', label: 'Postal code', type: 'text', required: true } as FormField,
    { name: 'deliveryCountryCode', label: 'Country code', type: 'text', required: true } as FormField,
  ] : []),
];

const restaurantParams = (cart: CartData, v: FormValues) => {
  const s = (k: string) => String(v[k] ?? '').trim();
  const delivery = cart.restaurant!.orderType === 'delivery';
  return {
    orderType: cart.restaurant!.orderType, customerName: s('customerName'), email: s('email'), customerPhone: s('customerPhone'),
    ...(delivery ? { deliveryAddress: s('deliveryAddress'), deliveryAddress2: s('deliveryAddress2'), deliveryCity: s('deliveryCity'), deliveryState: s('deliveryState'), deliveryZip: s('deliveryZip'), deliveryCountryCode: s('deliveryCountryCode').toUpperCase() } : {}),
  };
};

function RestaurantDetails({ cart, onSave }: { cart: CartData; onSave: (v: FormValues) => Promise<void> }) {
  const r = cart.restaurant!;
  const delivery = r.orderType === 'delivery';
  const [values, setValues] = useState<FormValues>(() => ({ ...r.contact, ...r.delivery }));
  return (
    <FormCard
      key={r.orderType}
      data={{ title: delivery ? 'Delivery details' : 'Pickup details', description: cart.storeName, fields: restaurantFields(delivery) }}
      values={values}
      onValuesChange={setValues}
      lead={<PasteDetails onFill={(d) => setValues((v) => ({ ...v, ...pick(d, { customerName: 'name', email: 'email', customerPhone: 'phone', ...(delivery ? { deliveryAddress: 'address1', deliveryAddress2: 'address2', deliveryCity: 'city', deliveryState: 'province', deliveryZip: 'postalCode', deliveryCountryCode: 'countryCode' } : {}) }) }))} />}
      onSubmit={onSave}
      submitLabel="Save details"
      validate={(v) => (delivery ? { deliveryCountryCode: /^[A-Za-z]{2}$/.test(String(v.deliveryCountryCode ?? '')) ? undefined : 'Use a two-letter country code' } : {})}
      className="max-w-none"
    />
  );
}

/* ---- Payment ---- */

function Payment({ cart, busy, run, onLockAction, setNote }: { cart: CartData; busy: boolean; run: <T>(fn: () => Promise<T>) => Promise<T | undefined>; onLockAction: (tab: string) => void; setNote: (n: NoteState) => void }) {
  const [provider, setProvider] = useState<PaymentChoice | undefined>();
  const ids = { storeId: cart.storeId, cartId: cart.cartId };

  if (cart.issues.length) {
    return (
      <Shell>
        <ShellHeader icon={LockKey} title="Payment is locked" subtitle="Finish these steps first" />
        <Panel>
          <div className="flex flex-col gap-1 px-4 pt-3">{cart.issues.map((issue) => <Note key={issue} tone="negative">{issue}</Note>)}</div>
          <div className="flex justify-end p-4"><Button variant="primary" onClick={() => onLockAction(cart.lockTarget.tab)}>{cart.lockTarget.label}</Button></div>
        </Panel>
      </Shell>
    );
  }

  const pay = () => run(async () => {
    if (!provider) return;
    setNote(null);
    try {
      if (provider === 'checkout' && cart.kind === 'retail') {
        // Open the tab before the await so the browser does not block it, then point it at the link.
        const tab = window.open('', '_blank');
        const response = await callTool('getCheckoutLink', { ...ids, countryCode: cart.countryCode });
        const url = responseText(response);
        if (!url || !/^https?:\/\//.test(url)) {
          tab?.close();
          setNote({ tone: 'negative', text: errorMessage(response, 'Could not open the store checkout.') });
          return;
        }
        if (tab) { tab.opener = null; tab.location.href = url; } else window.open(url, '_blank', 'noopener,noreferrer');
      } else if (provider !== 'checkout') {
        const response = await callTool('initiatePaymentSession', { ...ids, paymentProvider: provider });
        // A shop refusal arrives without a result; show its reason instead of nothing.
        if (!response || !succeeded(response)) setNote({ tone: 'negative', text: errorMessage(response, 'Could not start the payment.') });
      }
    } catch (error) {
      setNote({ tone: 'negative', text: error instanceof Error ? error.message : 'Could not start the payment.' });
    }
  });

  const options = cart.providers;
  return (
    <Shell>
      <ShellHeader icon={CreditCard} title="Payment method" subtitle={`Total ${money(cart.total, cart.currency)}`} />
      <Panel>
        <div className="flex flex-col gap-4 p-4">
          <RadioGroup label="Payment method" value={provider} onValueChange={(v) => setProvider(v as PaymentChoice)}>
            {options.map((p) => <Radio key={p} value={p} label={p === 'checkout' && cart.restaurant ? cart.restaurant.checkoutLabel : PROVIDER_LABEL[p]} />)}
          </RadioGroup>
          <div className="flex justify-end">
            {provider === 'checkout' && cart.restaurant ? (
              <a href={cart.restaurant.checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md pointer-coarse:h-11 bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/85">Go to {cart.storeName}</a>
            ) : (
              <Button variant="primary" size="md" loading={busy} disabled={!provider} onClick={pay}>{provider === 'checkout' ? 'Go to checkout' : provider ? `Pay with ${provider === 'stripe' ? 'card' : 'PayPal'}` : 'Choose a method'}</Button>
            )}
          </div>
        </div>
      </Panel>
    </Shell>
  );
}
