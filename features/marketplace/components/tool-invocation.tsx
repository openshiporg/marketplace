'use client';

import { useState, memo } from 'react';
import {
  ChevronDownIcon,
  Loader2,
  CheckCircle2,
  TerminalSquare,
  Code,
  ArrowRight,
  Circle,
} from 'lucide-react';
import { PaymentUI } from './payment/payment-ui';
import { getAllCarts } from '@/lib/cart-storage';
import { getSessionToken } from '@/lib/session-storage';
import { getMarketplaceConfig } from '@/lib/marketplace-storage';
import {
  applyCartLifecycleFromToolResult,
  getMcpToolResultData,
  serializeCartMutation,
} from '@/lib/cart-client-actions';

interface ToolInvocationProps {
  toolName: string;
  state: string;
  args: any;
  result: any;
  isLatestMessage: boolean;
  status: string;
}

export const ToolInvocation = memo(function ToolInvocation({
  toolName,
  state,
  args,
  result,
  isLatestMessage,
  status,
}: ToolInvocationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if this is payment data
  let paymentData = null;
  if (result && toolName === 'initiatePaymentSession') {
    try {
      const parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
      const textContent = parsedResult.content?.[0]?.text;
      if (textContent) {
        const parsed = JSON.parse(textContent);
        if (parsed.__clientAction?.type === 'renderPaymentUI') {
          paymentData = parsed;
        }
      }
    } catch (e) {
      // Not payment data, ignore
    }
  }

  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [completingOrder, setCompletingOrder] = useState(false);
  const [orderUrl, setOrderUrl] = useState<string | null>(null);

  const handlePaymentComplete = async (paymentSessionId: string, paypalOrderId?: string) => {
    setCompletingOrder(true);

    try {
      // Extract cartId and storeId from paymentData
      const cartId = paymentData?.cart?.id;
      const storeId = paymentData?.storeId;

      if (!cartId || !storeId) {
        console.error('[Payment] Missing cart or store ID');
        setCompletingOrder(false);
        return;
      }

      const completeResult = await serializeCartMutation(storeId, async () => {
        const cartIds = Object.fromEntries(
          Object.entries(getAllCarts()).map(([key, value]) => [key, value.cartId])
        );
        const token = getSessionToken(storeId);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-cart-ids': JSON.stringify(cartIds),
          'x-marketplace-config': JSON.stringify(getMarketplaceConfig()),
        };
        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch('/api/mcp-transport/http', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: `complete-cart-${Date.now()}`,
            method: 'tools/call',
            params: {
              name: 'completeCart',
              arguments: {
                storeId,
                cartId,
                paymentSessionId,
                ...(paypalOrderId && { paypalOrderId })
              },
            },
          }),
        });

        const result = await response.json();
        applyCartLifecycleFromToolResult(result);
        return result;
      });

      if (completeResult.result) {
        const orderData = getMcpToolResultData(completeResult);
        if (orderData) {
          if (typeof orderData.redirectUrl === 'string') {
            setOrderUrl(orderData.redirectUrl);
          }
          setPaymentCompleted(true);
        }
      }
    } catch (error) {
      console.error('[Payment] Error completing cart:', error);
    } finally {
      setCompletingOrder(false);
    }
  };

  const getStatusIcon = () => {
    if (state === 'call') {
      if (isLatestMessage && status !== 'ready') {
        return <Loader2 className="animate-spin h-3.5 w-3.5 text-primary/70" />;
      }
      return <Circle className="h-3.5 w-3.5 fill-muted-foreground/10 text-muted-foreground/70" />;
    }
    return <CheckCircle2 size={14} className="text-primary/90" />;
  };

  const formatContent = (content: any): string => {
    try {
      if (typeof content === 'string') {
        if (!content.trim().startsWith('{') && !content.trim().startsWith('[')) {
          return content;
        }
        try {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return content;
        }
      }
      return JSON.stringify(content, null, 2);
    } catch {
      return String(content);
    }
  };


  return (
    <div className="mb-2">
      <button
        type="button"
        className="group/row -mx-[3px] flex h-7 w-[calc(100%+6px)] min-w-0 items-center gap-2 rounded-control px-[3px] text-left transition-colors duration-100 hover:bg-hover-2"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="relative flex size-4 shrink-0 items-center justify-center text-ink-3">
          <TerminalSquare className="size-3.5 transition-opacity duration-100 group-hover/row:opacity-0" />
          <ChevronDownIcon
            className="absolute size-3 opacity-0 transition-[opacity,transform] duration-150 group-hover/row:opacity-100"
            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        </span>
        <span className="shrink-0 font-mono text-[11.5px] font-medium tracking-tight text-ink">{toolName}</span>
        {state === 'call' ? (
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-ink-3">
            {isLatestMessage && status !== 'ready' ? 'Running…' : 'Waiting'}
          </span>
        ) : (
          <span className="flex-1" />
        )}
        <span className="flex size-4 shrink-0 items-center justify-center text-ink-3">
          {getStatusIcon()}
        </span>
      </button>

      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: isExpanded ? '1fr' : '0fr',
          opacity: isExpanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="mb-1 ml-2 mt-0.5 space-y-2 border-l border-line py-1 pl-3.5">
            {!!args && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-3">
                  <Code className="size-3" />
                  <span>Arguments</span>
                </div>
                <pre className="overflow-x-auto rounded-control bg-inset p-2.5 font-mono text-[11px] text-ink-2 shadow-hairline">
                  {formatContent(args)}
                </pre>
              </div>
            )}
            {!!result && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-3">
                  <ArrowRight className="size-3" />
                  <span>Result</span>
                </div>
                <pre className="max-h-[300px] overflow-x-auto overflow-y-auto rounded-control bg-inset p-2.5 font-mono text-[11px] text-ink-2 shadow-hairline">
                  {formatContent(result)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {paymentData && !isExpanded && (
        <div className="mt-2">
          <PaymentUI
            paymentProvider={paymentData.paymentProvider}
            paymentSession={paymentData.paymentSession}
            cart={paymentData.cart}
            publishableKey={paymentData.publishableKey}
            storeId={paymentData.storeId}
            onPaymentComplete={handlePaymentComplete}
            paymentCompleted={paymentCompleted}
            completingOrder={completingOrder}
            orderUrl={orderUrl}
          />
        </div>
      )}
    </div>
  );
});
