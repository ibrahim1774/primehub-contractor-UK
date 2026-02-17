import type { VercelRequest, VercelResponse } from '@vercel/node';

const VERCEL_API = 'https://api.vercel.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    if (!VERCEL_TOKEN) {
        console.error('[Domain Check] Missing VERCEL_TOKEN');
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const { domain } = req.body || {};
    if (!domain || typeof domain !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid domain' });
    }

    const cleanDomain = domain.trim().toLowerCase();
    const teamId = process.env.VERCEL_TEAM_ID;
    const teamParam = teamId ? `?teamId=${teamId}` : '';

    try {
        // 1. Check availability
        const availRes = await fetch(
            `${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(cleanDomain)}/availability${teamParam}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );

        if (!availRes.ok) {
            const err = await availRes.json().catch(() => ({}));
            console.error('[Domain Check] Availability error:', err);
            return res.status(availRes.status).json({ error: err.error?.message || 'Failed to check availability' });
        }

        const availData = await availRes.json();

        if (!availData.available) {
            return res.status(200).json({ available: false });
        }

        // 2. Get pricing
        const priceRes = await fetch(
            `${VERCEL_API}/v1/registrar/domains/${encodeURIComponent(cleanDomain)}/price${teamParam}`,
            { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
        );

        if (!priceRes.ok) {
            const err = await priceRes.json().catch(() => ({}));
            console.error('[Domain Check] Pricing error:', err);
            return res.status(200).json({ available: true, price: null, error: 'Could not fetch pricing' });
        }

        const priceData = await priceRes.json();

        return res.status(200).json({
            available: true,
            price: priceData.purchasePrice,
            renewalPrice: priceData.renewalPrice,
            years: priceData.years || 1,
            currency: 'USD',
        });
    } catch (error: any) {
        console.error('[Domain Check] Error:', error.message);
        return res.status(500).json({ error: 'Failed to check domain' });
    }
}
