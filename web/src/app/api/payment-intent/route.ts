// POST /api/payment-intent - Create a Stripe PaymentIntent
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, menuSummary } = body;

    if (!amount || amount < 50) {
      return NextResponse.json(
        { error: '金額が正しくありません' },
        { status: 400 }
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'jpy',
      automatic_payment_methods: { enabled: true },
      description: `LUMINA HAIR STUDIO - ${menuSummary || '予約'}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('PaymentIntent creation error:', error);
    return NextResponse.json(
      { error: '決済の初期化に失敗しました' },
      { status: 500 }
    );
  }
}
