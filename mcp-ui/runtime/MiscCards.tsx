import { useState } from 'react';
import { SignIn, WarningCircle, EnvelopeSimple } from '../vendor/icons';
import { EmptyState } from '../vendor/empty-state';
import { FormCard } from '../vendor/form-card';
import { RadioGroup, Radio } from '../vendor/choice-controls';
import { Button } from '../vendor/action-button';
import { TextField } from '../vendor/text-field';
import { Panel, Shell, ShellHeader } from '../vendor/surface';
import { ResultCarousel } from '../vendor/result-carousel';
import { Storefront, Package } from '../vendor/icons';
import type { CartData, ConflictData, EmptyData, ErrorData, LoginData, StoresData } from '../types';
import { callTool, errorMessage, cartFromResponse } from './bridge';
import { CartCard } from './CartCard';
import { Note } from './ui';

export function LoginCard({ data }: { data: LoginData }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <FormCard
        data={{
          title: 'Sign in', description: data.message,
          fields: [
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'password', label: 'Password', type: 'password', required: true },
          ],
        }}
        defaultValues={{ email: data.email }}
        submitLabel="Sign in"
        className="max-w-none"
        onSubmit={async (v) => {
          const params: Record<string, unknown> = { action: 'authenticateUser', email: String(v.email ?? ''), password: String(v.password ?? ''), storeId: data.storeId };
          if (data.cartId) params.cartId = data.cartId;
          if (data.addressData) params.addressData = data.addressData;
          const response = await callTool('authenticateUser', params);
          const text = response?.content?.[0]?.text;
          let ok = false;
          try { ok = JSON.parse(text)?.__clientAction?.type === 'saveSessionToken'; } catch { /* error text */ }
          if (!ok) throw new Error(errorMessage(response, 'Login failed. Check your credentials and try again.'));
          setDone(true);
        }}
      />
      {done && <Note tone="positive">Signed in.</Note>}
    </div>
  );
}

type Choice = 'signin' | 'different-email' | 'checkout-store';

export function ConflictCard({ data }: { data: ConflictData }) {
  const [choice, setChoice] = useState<Choice>();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const go = async () => {
    if (choice === 'signin') {
      void callTool('loginUser', { storeId: data.storeId, email: data.email, message: 'Sign in to continue with your order', cartId: data.cartId, addressData: data.addressData }).catch(() => {});
    } else if (choice === 'different-email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setStatus('Enter a valid email address.');
      setStatus('Updating this source cart…');
      try {
        await callTool('setShippingAddress', { storeId: data.storeId, cartId: data.cartId, email: email.trim(), ...data.addressData });
        setStatus('The source could not confirm the email change. Please try again or sign in.');
      } catch {
        setStatus('The source could not confirm the email change. Please try again or sign in.');
      }
    } else if (choice === 'checkout-store') {
      if (data.checkoutUrl) window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
      else setStatus('The source did not supply a valid checkout link.');
    }
  };
  return (
    <Shell className="max-w-md">
      <ShellHeader icon={EnvelopeSimple} title="Email already in use" subtitle={`${data.email} already has an account with ${data.storeName}.`} />
      <Panel>
        <div className="flex flex-col gap-4 p-4">
          <RadioGroup label="How to continue" value={choice} onValueChange={(v) => setChoice(v as Choice)}>
            <Radio value="signin" label="Sign in to that account" />
            <Radio value="different-email" label="Use a different email for this order" />
            <Radio value="checkout-store" label="Continue on the source checkout" />
          </RadioGroup>
          {choice === 'different-email' && <TextField label="New email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
          {status && <Note tone="neutral">{status}</Note>}
          <div className="flex justify-end"><Button variant="primary" size="md" disabled={!choice} onClick={go}>Continue</Button></div>
        </div>
      </Panel>
    </Shell>
  );
}

export function ErrorCard({ data }: { data: ErrorData }) {
  const [cart, setCart] = useState<CartData | undefined>();
  if (cart) return <CartCard initial={cart} initialTab={data.action?.tab} />;
  return (
    <Shell className="max-w-md">
      <Panel>
        <EmptyState tone="error" icon={WarningCircle} title={data.title} description={data.message} />
        {data.issues.length > 0 && <div className="flex flex-col gap-1 px-6 pb-5">{data.issues.map((i) => <Note key={i} tone="negative">{i}</Note>)}</div>}
        {data.action && (
          <div className="flex justify-end px-6 pb-5">
            <Button variant="primary" onClick={() => { const a = data.action!; void callTool('viewCart', { storeId: a.storeId, cartId: a.cartId }).then((r) => setCart(cartFromResponse(r))).catch(() => {}); }}>{data.action.label}</Button>
          </div>
        )}
      </Panel>
    </Shell>
  );
}

export { SignIn };

export function StoresCard({ data }: { data: StoresData }) {
  if (!data.stores.length) return <EmptyCard data={{ title: 'No stores connected', message: 'No marketplace stores are available right now.' }} />;
  const withImages = data.stores.every((s) => s.image);
  return (
    <ResultCarousel
      title="Stores"
      compact={!withImages}
      subtitle={`${data.stores.length} ${data.stores.length === 1 ? 'store' : 'stores'}`}
      data={data.stores.map((s) => ({
        id: s.storeId,
        title: s.name,
        image: s.image,
        meta: [
          s.platform === 'openfront-restaurant' ? 'Restaurant' : 'E-commerce',
          s.productCount ? `${s.productCount}${s.productCount >= 50 ? '+' : ''} ${s.platform === 'openfront-restaurant' ? 'items' : 'products'}` : s.address,
        ].filter(Boolean).join(' · '),
      }))}
    />
  );
}

export function EmptyCard({ data }: { data: EmptyData }) {
  const browse = data.title.toLowerCase().includes('store') ? undefined : { label: data.query ? 'Try another search' : 'Browse stores', onClick: () => { void callTool('getAvailableStores', {}).catch(() => {}); } };
  return (
    <Shell className="max-w-md">
      <Panel>
        <EmptyState
          icon={data.title.toLowerCase().includes('store') ? Storefront : Package}
          title={data.title}
          description={data.query ? `${data.message} (${data.query})` : data.message}
          action={browse}
        />
      </Panel>
    </Shell>
  );
}
