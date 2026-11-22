"use client"

import { loadStripe } from "@stripe/stripe-js"
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js"
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { Button } from "@/components/ui/button"
import { RiLoader2Fill } from "@remixicon/react"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { LoadingState } from "@/components/beautiful-ui/loading-state"
import { ORDER_COMPLETION_FALLBACK } from "@/lib/mcp-customer-error"
import { retryPaidIntent, type CompletedOrder } from "@/lib/complete-paid-cart"

interface PaymentUIProps {
  paymentProvider: 'stripe' | 'paypal'
  paymentSession: {
    id: string
    data: {
      clientSecret?: string
      orderId?: string
    }
    amount: number
  }
  cart: {
    id: string
    total: number
    currencyCode?: string
    currency?: string
    shippingAddress?: {
      firstName?: string
      lastName?: string
      address1?: string
      city?: string
      province?: string
      postalCode?: string
      countryCode?: string
    }
    customerName?: string
    customerPhone?: string
    deliveryAddress?: string
    deliveryCity?: string
    deliveryState?: string
    deliveryZip?: string
    deliveryCountryCode?: string
    email?: string
    region?: {
      currency?: {
        code?: string
      }
    }
  }
  publishableKey: string
  storeId: string
  onPaymentComplete: (paymentSessionId: string, paypalOrderId?: string) => Promise<void>
  onBeforePay?: () => Promise<void>
  paymentCompleted?: boolean
  completingOrder?: boolean
  order?: CompletedOrder | null
}

export function PaymentUI({
  paymentProvider,
  paymentSession,
  cart,
  publishableKey,
  storeId,
  onPaymentComplete,
  onBeforePay,
  paymentCompleted,
  completingOrder,
  order
}: PaymentUIProps) {
  if (paymentProvider === 'stripe') {
    const stripePromise = loadStripe(publishableKey)

    return (
      <Elements stripe={stripePromise} options={{ clientSecret: paymentSession.data.clientSecret }}>
        <StripePaymentForm
          paymentSession={paymentSession}
          cart={cart}
          onPaymentComplete={onPaymentComplete}
          onBeforePay={onBeforePay}
          paymentCompleted={paymentCompleted}
          completingOrder={completingOrder}
          order={order}
        />
      </Elements>
    )
  }

  if (paymentProvider === 'paypal') {
    return (
      <PayPalScriptProvider
        options={{
          clientId: publishableKey,
          currency: (
            cart?.region?.currency?.code || cart?.currencyCode || cart?.currency || 'USD'
          ).toUpperCase(),
          intent: "capture",
          components: "buttons",
        }}
      >
        <PayPalPaymentForm
          paymentSession={paymentSession}
          cart={cart}
          onPaymentComplete={onPaymentComplete}
          onBeforePay={onBeforePay}
          paymentCompleted={paymentCompleted}
          completingOrder={completingOrder}
          order={order}
        />
      </PayPalScriptProvider>
    )
  }

  return null
}

/** What the shopper needs after paying: that it worked, which store has the order, and its number. */
function OrderPlaced({ order }: { order: CompletedOrder }) {
  return (
    <div className="space-y-3 rounded-card bg-surface p-4 shadow-card" role="status">
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink">Order placed{order.storeName ? ` with ${order.storeName}` : ""}</p>
          {order.orderNumber ? <p className="mt-0.5 text-[13px] text-ink-2">Order number <span className="font-mono text-ink">{order.orderNumber}</span></p> : null}
        </div>
      </div>
      <Button className="w-full" size="lg" variant="outline" asChild>
        <a href={order.url} target="_blank" rel="noopener noreferrer">View order</a>
      </Button>
    </div>
  )
}

interface PaymentFormProps {
  paymentSession: PaymentUIProps['paymentSession']
  cart: PaymentUIProps['cart']
  onPaymentComplete: PaymentUIProps['onPaymentComplete']
  onBeforePay?: PaymentUIProps['onBeforePay']
  paymentCompleted?: boolean
  completingOrder?: boolean
  order?: CompletedOrder | null
}

function StripePaymentForm({ paymentSession, cart, onPaymentComplete, onBeforePay, paymentCompleted, completingOrder, order }: PaymentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const stripe = useStripe()
  const elements = useElements()

  const handlePayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    if (!stripe || !elements || !paymentSession?.data?.clientSecret) {
      setSubmitting(false)
      setErrorMessage("Stripe not initialized or payment session not found.")
      return
    }

    try {
      // Payment may already have succeeded before an order-completion failure.
      if (await retryPaidIntent(
        () => stripe.retrievePaymentIntent(paymentSession.data.clientSecret!),
        () => onPaymentComplete(paymentSession.id),
      )) return
      await onBeforePay?.()
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) throw new Error("Card element not found.")

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentSession.data.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cart.customerName || `${cart.shippingAddress?.firstName || ''} ${cart.shippingAddress?.lastName || ''}`.trim(),
              email: cart.email || '',
              phone: cart.customerPhone || undefined,
              address: {
                line1: cart.deliveryAddress || cart.shippingAddress?.address1 || undefined,
                city: cart.deliveryCity || cart.shippingAddress?.city || undefined,
                state: cart.deliveryState || cart.shippingAddress?.province || undefined,
                postal_code: cart.deliveryZip || cart.shippingAddress?.postalCode || undefined,
                country: cart.deliveryCountryCode || cart.shippingAddress?.countryCode || undefined,
              },
            },
          },
        }
      )

      if (confirmError) {
        console.error('Stripe confirmation error:', confirmError)
        setErrorMessage(confirmError.message || "Payment confirmation failed.")
        return
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'requires_capture') {
        await onPaymentComplete(paymentSession.id)
      } else {
        setErrorMessage("Payment was not successful. Please try again.")
      }
    } catch (error: any) {
      setErrorMessage(error.message || ORDER_COMPLETION_FALLBACK)
    } finally {
      setSubmitting(false)
    }
  }

  // Show success state if payment is completed
  if (paymentCompleted && order) return <OrderPlaced order={order} />

  // Keep the form mounted during completion so an error does not reset it.
  // Show payment form
  return (
    <div className="space-y-3 rounded-card bg-surface p-4 shadow-card">
      <div className="rounded-control bg-field p-3 shadow-hairline">
        <CardElement
          options={{
            // The shipping address already carries the postal code; dropping the field keeps the row readable at phone width.
            hidePostalCode: Boolean(cart.deliveryZip || cart.shippingAddress?.postalCode),
            style: {
              base: {
                fontSize: '16px',
                color: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#ededed' : '#1f1f1f',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      <Button
        onClick={handlePayment}
        disabled={!stripe || submitting || completingOrder}
        className="w-full"
        size="lg"
      >
        {submitting && <RiLoader2Fill className="mr-2 h-4 w-4 animate-spin" />}
        Pay ${(paymentSession.amount / 100).toFixed(2)}
      </Button>

      {completingOrder && <LoadingState label="Completing order" variant="Orbit" />}
      {errorMessage && (
        <div role="alert" className="mt-2 rounded-control bg-red-tint p-2 text-[12px] text-red">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

function PayPalPaymentForm({ paymentSession, cart, onPaymentComplete, onBeforePay, paymentCompleted, completingOrder, order }: PaymentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // Once PayPal has captured, a retry only completes the order; it never captures again.
  const [capturedOrderId, setCapturedOrderId] = useState<string | null>(null)
  const [{ isPending }] = usePayPalScriptReducer()

  const complete = async (orderId: string) => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await onPaymentComplete(paymentSession.id, orderId)
    } catch (error: any) {
      setErrorMessage(error.message || ORDER_COMPLETION_FALLBACK)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async (_data: any, actions: any) => {
    setSubmitting(true)
    setErrorMessage(null)
    let order: any
    try {
      order = await actions.order.capture()
    } catch (error: any) {
      console.error('PayPal payment error:', error)
      setErrorMessage(error.message || "An error occurred during payment processing.")
      setSubmitting(false)
      return
    }
    setCapturedOrderId(order.id)
    await complete(order.id)
  }

  // Show success state if payment is completed
  if (paymentCompleted && order) return <OrderPlaced order={order} />

  // Show completing state
  if (completingOrder) {
    return (
      <div className="rounded-card bg-surface p-4 shadow-card">
        <LoadingState label="Completing order" variant="Orbit" />
      </div>
    )
  }

  if (isPending) {
    return <LoadingState label="Loading PayPal" variant="Dots" />
  }

  if (!paymentSession?.data?.orderId) {
    return <div className="rounded-control bg-red-tint p-2 text-[12px] text-red">PayPal order ID not found.</div>
  }

  if (capturedOrderId) {
    return (
      <div className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <Button onClick={() => complete(capturedOrderId)} disabled={submitting} className="w-full" size="lg">
          {submitting && <RiLoader2Fill className="mr-2 h-4 w-4 animate-spin" />}
          Finish order
        </Button>
        {errorMessage && (
          <div role="alert" className="mt-2 rounded-control bg-red-tint p-2 text-[12px] text-red">
            {errorMessage}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-card bg-surface p-4 shadow-card">
      <PayPalButtons
        style={{ layout: "vertical" }}
        createOrder={async () => {
          setErrorMessage(null)
          try {
            await onBeforePay?.()
          } catch (error: any) {
            setErrorMessage(error.message)
            throw error
          }
          return paymentSession.data?.orderId as string
        }}
        onApprove={handlePayment}
        disabled={submitting || isPending}
      />

      {errorMessage && (
        <div className="mt-2 rounded-control bg-red-tint p-2 text-[12px] text-red">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
