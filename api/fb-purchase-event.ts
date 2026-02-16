import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const PIXEL_ID = '1287427660086229';
const FB_API_VERSION = 'v21.0';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

    if (!FB_ACCESS_TOKEN) {
        console.error('[FB CAPI] Missing FB_ACCESS_TOKEN env var');
        return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const { event_id, event_source_url, user_agent } = req.body || {};

    if (!event_id) {
        return res.status(400).json({ error: 'Missing event_id' });
    }

    const client_ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || (req.headers['x-real-ip'] as string)
        || req.socket?.remoteAddress
        || '';

    const client_user_agent = user_agent || (req.headers['user-agent'] as string) || '';

    const event_time = Math.floor(Date.now() / 1000);

    const payload = {
        data: [
            {
                event_name: 'Purchase',
                event_time,
                event_id,
                action_source: 'website',
                event_source_url: event_source_url || '',
                user_data: {
                    client_ip_address: client_ip,
                    client_user_agent: client_user_agent,
                },
                custom_data: {
                    value: parseFloat(process.env.PURCHASE_VALUE || '10.00'),
                    currency: process.env.PURCHASE_CURRENCY || 'GBP',
                },
            },
        ],
    };

    console.log(`[FB CAPI] Sending Purchase event. event_id=${event_id}, ip=${client_ip}`);

    try {
        const response = await axios.post(
            `https://graph.facebook.com/${FB_API_VERSION}/${PIXEL_ID}/events`,
            payload,
            {
                params: { access_token: FB_ACCESS_TOKEN },
                headers: { 'Content-Type': 'application/json' },
            }
        );

        console.log(`[FB CAPI] Success:`, response.data);
        return res.status(200).json({ success: true, fb_response: response.data });
    } catch (error: any) {
        console.error('[FB CAPI] Error:', error.response?.data || error.message);
        return res.status(500).json({
            error: 'Failed to send event to Facebook',
            details: error.response?.data || error.message,
        });
    }
}
