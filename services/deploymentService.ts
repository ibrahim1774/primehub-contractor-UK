import { GeneratedSiteData } from '../types.js';
import { renderToStaticMarkup } from 'react-dom/server';
import SiteRenderer from '../components/SiteRenderer.js';
import React from 'react';

export const deploySite = async (data: GeneratedSiteData, projectName: string) => {
  try {
    // 1. Render the site to HTML string
    // We wrap it in a basic HTML shell since SiteRenderer might just be the body content
    const bodyHtml = renderToStaticMarkup(React.createElement(SiteRenderer, { data, isEditMode: false }));

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.hero.headline.line1} - ${data.contact.companyName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body {
        font-family: "Poppins", sans-serif;
        background-color: #05070A;
        color: white;
        margin: 0;
        font-weight: 300;
      }

      h1, h2, h3, h4, h5, h6, button, input, textarea, div, span, p, a {
        font-family: "Poppins", sans-serif !important;
      }

      .tracking-tighter {
        letter-spacing: -0.05em;
      }

      .selection\:bg-blue-100 *::selection {
        background-color: #dbeafe;
        color: #1e40af;
      }

      /* ContentEditable Clean Focus */
      [contenteditable="true"]:focus {
        outline: none;
      }

      /* Custom Scrollbar */
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #e2e8f0;
        border-radius: 10px;
        border: 2px solid white;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #cbd5e1;
      }

      @media (max-width: 640px) {
        body {
          font-size: 14px;
        }
      }
    </style>
</head>
<body>
    ${bodyHtml}
</body>
</html>`;

    // 2. Prepare files payload
    const files: Record<string, string> = {};

    // Helper to upload a single image and return its URL
    const uploadAsset = async (base64: string): Promise<string> => {
      const res = await fetch('/api/upload-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, projectName })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`[CLIENT] Upload failed (${res.status}):`, text);
        throw new Error(`Upload failed (${res.status}): ${text.substring(0, 100) || 'No response body'}`);
      }
      const result = await res.json();
      return result.url;
    };

    // Clone data to modify it for rendering (replace base64 with paths)
    const deployData = JSON.parse(JSON.stringify(data));

    // Sequential Upload of images to avoid payload limits
    if (deployData.hero?.heroImage?.startsWith('data:')) {
      deployData.hero.heroImage = await uploadAsset(deployData.hero.heroImage);
    }
    if (deployData.valueProposition?.image?.startsWith('data:')) {
      deployData.valueProposition.image = await uploadAsset(deployData.valueProposition.image);
    }

    if (deployData.whoWeHelp?.image?.startsWith('data:')) {
      deployData.whoWeHelp.image = await uploadAsset(deployData.whoWeHelp.image);
    }

    // Upload any gallery images that are still base64
    if (deployData.gallery?.slots) {
      for (let i = 0; i < deployData.gallery.slots.length; i++) {
        const slot = deployData.gallery.slots[i];
        if (slot.gcs_url?.startsWith('data:')) {
          deployData.gallery.slots[i].gcs_url = await uploadAsset(slot.gcs_url);
        }
      }
    }

    // 3. Render with paths (now URLs)
    const cleanBodyHtml = renderToStaticMarkup(React.createElement(SiteRenderer, { data: deployData, isEditMode: false }));
    files['index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.hero.headline.line1} - ${data.contact.companyName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      body {
        font-family: "Poppins", sans-serif;
        background-color: #05070A;
        color: white;
        margin: 0;
        font-weight: 300;
      }

      h1, h2, h3, h4, h5, h6, button, input, textarea, div, span, p, a {
        font-family: "Poppins", sans-serif !important;
      }

      .tracking-tighter {
        letter-spacing: -0.05em;
      }

      @media (max-width: 640px) {
        body {
          font-size: 14px;
        }
      }
    </style>


</head>
<body>
    ${cleanBodyHtml}
</body>
</html>`;

    // 4. Send final deployment request (now very small)
    const response = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        files
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Deployment failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Deploy Service Error:', error);
    throw error;
  }
};
