import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AssetUploader } from './lib/storage.js';
import { HtmlRewriter } from './lib/rewriter.js';
import { VercelDeployer } from './lib/deployment.js';
import * as path from 'path';
import * as fs from 'fs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log(`[API] Deploy request received for project: ${req.body?.projectName}`);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Expecting: { projectName: string, files: { [path: string]: string | Buffer } }
    // files example: { "index.html": "<html>...</html>", "assets/img.png": "base64..." }
    const { projectName, files } = req.body;

    if (!projectName || !files) {
        return res.status(400).json({ error: 'Missing projectName or files payload' });
    }

    const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
    const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
    const GCS_CREDENTIALS = process.env.GCS_CREDENTIALS;

    if (!VERCEL_TOKEN || !GCS_BUCKET_NAME) {
        return res.status(500).json({ error: 'Server misconfiguration: Missing env vars' });
    }

    try {
        let credentials;
        if (GCS_CREDENTIALS) {
            try {
                credentials = JSON.parse(GCS_CREDENTIALS);
            } catch (e) {
                console.error('[API] Failed to parse GCS_CREDENTIALS JSON', e);
            }
        }

        console.log(`[API] Starting deployment for ${projectName}...`);

        // 1. Create a temporary directory for this build
        const tempDir = path.join('/tmp', projectName + '-' + Date.now());
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 2. Write files to the temp directory
        console.log(`[API] Writing ${Object.keys(files).length} files to ${tempDir}...`);
        for (const [filePath, content] of Object.entries(files)) {
            const fullPath = path.join(tempDir, filePath);
            const dirName = path.dirname(fullPath);

            if (!fs.existsSync(dirName)) {
                fs.mkdirSync(dirName, { recursive: true });
            }

            // Handle base64 images or text content
            if (typeof content === 'string' && content.startsWith('data:')) {
                // Simple base64 handling if passed as data URI
                const base64Data = content.split(',')[1];
                fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
            } else if (typeof content === 'string') {
                fs.writeFileSync(fullPath, content);
            } else {
                // Assume Buffer or other format
                fs.writeFileSync(fullPath, content as any);
            }
        }

        // 3. Run the pipeline on the temp directory
        // Upload Assets
        const uploader = new AssetUploader(GCS_BUCKET_NAME, credentials);
        const urlMap = await uploader.uploadDirectoryImages(tempDir, projectName);
        console.log(`[API] Uploaded ${urlMap.size} images.`);

        // Rewrite HTML
        const rewriter = new HtmlRewriter();
        await rewriter.rewriteHtmlFiles(tempDir, urlMap);

        // Deploy to Vercel
        const deployer = new VercelDeployer(VERCEL_TOKEN, VERCEL_TEAM_ID);
        const deploymentUrl = await deployer.deploy(tempDir, projectName);

        // Cleanup (Optional, Vercel cleans /tmp eventually)
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (e) { console.warn('Failed to cleanup temp dir', e); }

        return res.status(200).json({ success: true, url: deploymentUrl });
    } catch (error: any) {
        console.error('[API] CRITICAL Deployment Error:', error);
        return res.status(500).json({
            error: error.message || 'Publishing failed',
            details: error.toString(),
            stack: error.stack
        });
    }
}
