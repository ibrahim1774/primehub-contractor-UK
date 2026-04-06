import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { companyName, siteId, plan = 'monthly' } = req.body || {};

    const isYearly = plan === 'yearly';
    const unitAmount = isYearly ? 7400 : 1500; // £74/yr or £15/mo
    const interval = isYearly ? 'year' : 'month';

    console.log(`[Stripe Checkout] Creating session for: ${companyName || 'Unknown'} (Site: ${siteId || 'N/A'}, Plan: ${plan})`);

    const safeCompanyName = (companyName && companyName.trim()) || "Your Business";

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Website Hosting: ${safeCompanyName}`,
                            description: `Professional hosting and maintenance for your custom generated website.`,
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: `${req.headers.origin}?payment=success&siteId=${siteId || 'unknown'}`,
            cancel_url: `${req.headers.origin}`,
            metadata: {
                companyName: safeCompanyName,
                siteId: siteId || 'unknown',
                plan: plan
            },
            subscription_data: {
                description: `Website Hosting for ${safeCompanyName}`,
                metadata: {
                    companyName: safeCompanyName,
                    siteId: siteId || 'unknown'
                }
            }
        });

        console.log(`[Stripe Checkout] Session created: ${session.id}`);
        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('[Stripe] Checkout Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }

}
