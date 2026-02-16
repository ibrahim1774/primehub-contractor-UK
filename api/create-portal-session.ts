import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId } = req.body || {};

  if (!customerId) {
    return res.status(400).json({ error: 'Missing customerId' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: (req.headers.origin as string) || (req.headers.referer as string) || 'https://primehub.ai',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('[Stripe Portal] Error:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to create billing portal session' });
  }
}
