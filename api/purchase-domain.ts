import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
const VERCEL_API = 'https://api.vercel.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
        return res.status(500).json({ error: 'Server misconfiguration: missing VERCEL_TOKEN' });
    }

    const { sessionId } = req.body || {};
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing sessionId' });
    }

    const teamId = process.env.VERCEL_TEAM_ID;
    const teamParam = teamId ? `?teamId=${teamId}` : '';
    const isTestMode = (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_');

    try {
        // 1. Retrieve Stripe session and verify payment
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Payment not completed' });
        }

        const { domain, vercelExpectedPrice, projectName } = session.metadata || {};
        if (!domain || !projectName) {
            return res.status(400).json({ error: 'Invalid session metadata' });
        }

        console.log(`[Domain Purchase] Processing: ${domain} for project ${projectName} (test=${isTestMode})`);

        // 2. Test mode — return mock success
        if (isTestMode) {
            console.log(`[Domain Purchase] TEST MODE — skipping real Vercel purchase for ${domain}`);
            return res.status(200).json({
                success: true,
                domain,
                orderId: `test_order_${Date.now()}`,
                testMode: true,
            });
        }

        // 3. Re-check price from Vercel to get current expectedPrice
        const priceRes = await fetch(
            `${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(domain)}/price${teamParam}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );

        if (!priceRes.ok) {
            throw new Error('Failed to fetch current domain price from Vercel');
        }

        const priceData = await priceRes.json();
        const currentPrice = priceData.purchasePrice;

        // 4. Buy the domain via Vercel
        // TODO: Fill in your contact details below (hidden by WHOIS privacy)
        const contactInfo = {
            firstName: 'FILL_IN',
            lastName: 'FILL_IN',
            email: 'ibrahim3709@gmail.com',
            phone: '+44.FILL_IN',
            address1: 'FILL_IN',
            city: 'FILL_IN',
            state: 'FILL_IN',
            zip: 'FILL_IN',
            country: 'GB',
        };

        const buyRes = await fetch(
            `${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(domain)}/buy${teamParam}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    autoRenew: true,
                    years: 1,
                    expectedPrice: currentPrice,
                    contactInformation: contactInfo,
                }),
            }
        );

        if (!buyRes.ok) {
            const err = await buyRes.json().catch(() => ({}));
            console.error('[Domain Purchase] Vercel buy error:', err);
            throw new Error(err.error?.message || `Vercel domain purchase failed (${buyRes.status})`);
        }

        const buyData = await buyRes.json();
        console.log(`[Domain Purchase] Domain bought: ${domain}, orderId: ${buyData.orderId}`);

        // 5. Add domain to the Vercel project
        const addRes = await fetch(
            `${VERCEL_API}/v10/projects/${encodeURIComponent(projectName)}/domains${teamParam}`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${VERCEL_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: domain }),
            }
        );

        if (!addRes.ok) {
            const err = await addRes.json().catch(() => ({}));
            console.error('[Domain Purchase] Add to project error:', err);
            // Domain was bought but adding to project failed — log but don't fail
            console.warn(`[Domain Purchase] Domain ${domain} purchased but could not be added to project ${projectName}. Manual setup needed.`);
        } else {
            console.log(`[Domain Purchase] Domain ${domain} added to project ${projectName}`);
        }

        return res.status(200).json({
            success: true,
            domain,
            orderId: buyData.orderId,
            testMode: false,
        });
    } catch (error: any) {
        console.error('[Domain Purchase] Error:', error.message);
        return res.status(500).json({ error: error.message || 'Domain purchase failed' });
    }
}
