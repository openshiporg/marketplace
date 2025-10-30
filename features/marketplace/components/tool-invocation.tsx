'use client';

import { useState, memo } from 'react';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2,
  CheckCircle2,
  TerminalSquare,
  Code,
  ArrowRight,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UseChatHelpers } from '@ai-sdk/react';
import { PaymentUI } from './payment/payment-ui';

interface ToolInvocationProps {
  toolName: string;
  state: string;
  args: any;
  result: any;
  isLatestMessage: boolean;
  status: string;
  append?: UseChatHelpers['append'];
}

export const ToolInvocation = memo(function ToolInvocation({
  toolName,
  state,
  args,
  result,
  isLatestMessage,
  status,
  append,
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

  const handlePaymentComplete = async (paymentSessionId: string, paypalOrderId?: string) => {
    console.log('Payment completed:', { paymentSessionId, paypalOrderId });
    // Trigger a message to complete the cart
    if (append) {
      append({
        role: 'user',
        content: `Please complete my order with payment session ${paymentSessionId}${paypalOrderId ? ` and PayPal order ${paypalOrderId}` : ''}`,
      });
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

  const getStatusClass = () => {
    if (state === 'call') {
      if (isLatestMessage && status !== 'ready') {
        return 'text-primary';
      }
      return 'text-muted-foreground';
    }
    return 'text-primary';
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
    <div
      className={cn(
        'flex flex-col mb-2 rounded-md border border-border/50 overflow-hidden',
        'bg-gradient-to-b from-background to-muted/30 backdrop-blur-sm',
        'transition-all duration-200 hover:border-border/80 group'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors',
          'hover:bg-muted/20'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-center rounded-full w-5 h-5 bg-primary/5 text-primary">
          <TerminalSquare className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground flex-1">
          <span className="text-foreground font-semibold tracking-tight">{toolName}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
          <span className={cn('font-medium', getStatusClass())}>
            {state === 'call'
              ? isLatestMessage && status !== 'ready'
                ? 'Running'
                : 'Waiting'
              : 'Completed'}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
          {getStatusIcon()}
          <div className="bg-muted/30 rounded-full p-0.5 border border-border/30">
            {isExpanded ? (
              <ChevronUpIcon className="h-3 w-3 text-foreground/70" />
            ) : (
              <ChevronDownIcon className="h-3 w-3 text-foreground/70" />
            )}
          </div>
        </div>
      </div>

      {/* Render payment UI if this is a payment session */}
      {paymentData && !isExpanded && (
        <div className="px-3 pb-3 pt-2">
          <PaymentUI
            paymentProvider={paymentData.paymentProvider}
            paymentSession={paymentData.paymentSession}
            cart={paymentData.cart}
            publishableKey={paymentData.publishableKey}
            storeId={paymentData.storeId}
            onPaymentComplete={handlePaymentComplete}
          />
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2 px-3 pb-3">
          {!!args && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 pt-1.5">
                <Code className="h-3 w-3" />
                <span className="font-medium">Arguments</span>
              </div>
              <pre
                className={cn(
                  'text-xs font-mono p-2.5 rounded-md overflow-x-auto',
                  'border border-border/40 bg-muted/10'
                )}
              >
                {formatContent(args)}
              </pre>
            </div>
          )}

          {!!result && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <ArrowRight className="h-3 w-3" />
                <span className="font-medium">Result</span>
              </div>

              <pre
                className={cn(
                  'text-xs font-mono p-2.5 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto',
                  'border border-border/40 bg-muted/10'
                )}
              >
                {formatContent(result)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
