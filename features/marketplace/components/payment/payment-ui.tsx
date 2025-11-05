"use client"

import { loadStripe } from "@stripe/stripe-js"
import { Elements, useStripe, useElements, CardElement } from "@stripe/react-stripe-js"
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { Button } from "@/components/ui/button"
import { RiLoader2Fill } from "@remixicon/react"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"

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
    shippingAddress?: {
      firstName?: string
      lastName?: string
    }
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
  paymentCompleted?: boolean
  completingOrder?: boolean
  orderUrl?: string | null
}

export function PaymentUI({
  paymentProvider,
  paymentSession,
  cart,
  publishableKey,
  storeId,
  onPaymentComplete,
  paymentCompleted,
  completingOrder,
  orderUrl
}: PaymentUIProps) {
  if (paymentProvider === 'stripe') {
    const stripePromise = loadStripe(publishableKey)

    return (
      <Elements stripe={stripePromise} options={{ clientSecret: paymentSession.data.clientSecret }}>
        <StripePaymentForm
          paymentSession={paymentSession}
          cart={cart}
          onPaymentComplete={onPaymentComplete}
          paymentCompleted={paymentCompleted}
          completingOrder={completingOrder}
          orderUrl={orderUrl}
        />
      </Elements>
    )
  }

  if (paymentProvider === 'paypal') {
    return (
      <PayPalScriptProvider
        options={{
          clientId: publishableKey,
          currency: cart?.region?.currency?.code?.toUpperCase() || 'USD',
          intent: "authorize",
          components: "buttons",
        }}
      >
        <PayPalPaymentForm
          paymentSession={paymentSession}
          cart={cart}
          onPaymentComplete={onPaymentComplete}
          paymentCompleted={paymentCompleted}
          completingOrder={completingOrder}
          orderUrl={orderUrl}
        />
      </PayPalScriptProvider>
    )
  }

  return null
}

interface PaymentFormProps {
  paymentSession: PaymentUIProps['paymentSession']
  cart: PaymentUIProps['cart']
  onPaymentComplete: PaymentUIProps['onPaymentComplete']
  paymentCompleted?: boolean
  completingOrder?: boolean
  orderUrl?: string | null
}

function StripePaymentForm({ paymentSession, cart, onPaymentComplete, paymentCompleted, completingOrder, orderUrl }: PaymentFormProps) {
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

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setSubmitting(false)
      setErrorMessage("Card element not found.")
      return
    }

    try {
      console.log('Confirming payment with Stripe...')

      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        paymentSession.data.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${cart.shippingAddress?.firstName || ''} ${cart.shippingAddress?.lastName || ''}`,
              email: cart.email || '',
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
        console.log('Payment confirmed, completing order...')
        await onPaymentComplete(paymentSession.id)
      } else {
        setErrorMessage("Payment was not successful. Please try again.")
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      setErrorMessage(error.message || "An error occurred during payment processing.")
    } finally {
      setSubmitting(false)
    }
  }

  // Show success state if payment is completed
  if (paymentCompleted && orderUrl) {
    return (
      <div className="space-y-4">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          size="lg"
          asChild
        >
          <a href={orderUrl} target="_blank" rel="noopener noreferrer">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Order Confirmation
          </a>
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          Your order has been placed successfully!
        </p>
      </div>
    )
  }

  // Show completing state
  if (completingOrder) {
    return (
      <div className="space-y-4">
        <Button
          className="w-full"
          size="lg"
          disabled
        >
          <RiLoader2Fill className="mr-2 h-4 w-4 animate-spin" />
          Completing Order...
        </Button>
      </div>
    )
  }

  // Show payment form
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
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
        disabled={!stripe || submitting}
        className="w-full"
        size="lg"
      >
        {submitting && <RiLoader2Fill className="mr-2 h-4 w-4 animate-spin" />}
        Pay ${(paymentSession.amount / 100).toFixed(2)}
      </Button>

      {errorMessage && (
        <div className="text-sm text-red-600 mt-2">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

function PayPalPaymentForm({ paymentSession, cart, onPaymentComplete, paymentCompleted, completingOrder, orderUrl }: PaymentFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [{ isPending }] = usePayPalScriptReducer()

  const handlePayment = async (_data: any, actions: any) => {
    setSubmitting(true)

    try {
      // Capture the PayPal order
      const order = await actions.order.capture()
      console.log('PayPal order captured:', order)

      // Complete the cart with the PayPal order ID
      await onPaymentComplete(paymentSession.id, order.id)
    } catch (error: any) {
      console.error('PayPal payment error:', error)
      setErrorMessage(error.message || "An error occurred during payment processing.")
      setSubmitting(false)
    }
  }

  // Show success state if payment is completed
  if (paymentCompleted && orderUrl) {
    return (
      <div className="space-y-4">
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700"
          size="lg"
          asChild
        >
          <a href={orderUrl} target="_blank" rel="noopener noreferrer">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Order Confirmation
          </a>
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          Your order has been placed successfully!
        </p>
      </div>
    )
  }

  // Show completing state
  if (completingOrder) {
    return (
      <div className="space-y-4">
        <Button
          className="w-full"
          size="lg"
          disabled
        >
          <RiLoader2Fill className="mr-2 h-4 w-4 animate-spin" />
          Completing Order...
        </Button>
      </div>
    )
  }

  if (isPending) {
    return <RiLoader2Fill className="animate-spin mx-auto" />
  }

  if (!paymentSession?.data?.orderId) {
    return <div className="text-sm text-red-600">PayPal order ID not found.</div>
  }

  return (
    <div className="space-y-4">
      <PayPalButtons
        style={{ layout: "vertical" }}
        createOrder={async () => paymentSession.data?.orderId as string}
        onApprove={handlePayment}
        disabled={submitting || isPending}
      />

      {errorMessage && (
        <div className="text-sm text-red-600 mt-2">
          {errorMessage}
        </div>
      )}
    </div>
  )
}
