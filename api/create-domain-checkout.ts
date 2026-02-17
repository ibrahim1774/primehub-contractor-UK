import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { domain, vercelPrice, siteId, projectName } = req.body || {};

    if (!domain || !vercelPrice || !siteId || !projectName) {
        return res.status(400).json({ error: 'Missing required fields: domain, vercelPrice, siteId, projectName' });
    }

    const usdToGbp = 0.80;
    const markupGbp = 5;

    // Convert USD price to GBP and add markup
    const priceGbp = vercelPrice * usdToGbp + markupGbp;
    // Round to nearest penny
    const finalPricePence = Math.round(priceGbp * 100);

    console.log(`[Domain Checkout] ${domain} | Vercel: $${vercelPrice} | GBP: £${(finalPricePence / 100).toFixed(2)} (markup: £${markupGbp})`);

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: `Domain: ${domain}`,
                            description: `1 year domain registration for ${domain}`,
                        },
                        unit_amount: finalPricePence,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.origin}?domain_payment=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.origin}`,
            metadata: {
                type: 'domain_purchase',
                domain,
                vercelExpectedPrice: String(vercelPrice),
                siteId,
                projectName,
            },
        });

        console.log(`[Domain Checkout] Session created: ${session.id}`);
        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('[Domain Checkout] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
}
