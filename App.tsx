
import React, { useState, useCallback, useRef } from 'react';
import GeneratorForm from './components/GeneratorForm.js';
import SiteRenderer from './components/SiteRenderer.js';
import LoadingIndicator from './components/LoadingIndicator.js';
import { generateSiteContent } from './services/geminiService.js';
import { saveSiteInstance, getAllSites } from './services/storageService.js';
import { deploySite } from './services/deploymentService.js';
import { GeneratorInputs, GeneratedSiteData, SiteInstance } from './types.js';
import { ChevronLeft, CloudCheck, Loader2, Rocket, ExternalLink } from 'lucide-react';

declare global {
  interface Window {
    aistudio: any;
    fbq: any;
  }
}

const BannerText: React.FC<{
  text: string;
}> = ({ text }) => {
  return (
    <div className="text-center flex-1 px-4 font-bold text-[15px] md:text-base tracking-tight leading-snug md:leading-tight py-1">
      {text}
    </div>
  );
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSite, setActiveSite] = useState<SiteInstance | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [deploymentUrl, setDeploymentUrl] = useState<string>('');
  const [deploymentMessage, setDeploymentMessage] = useState<string>('');
  const saveTimeoutRef = useRef<any>(null);

  // Handle Payment Success & Auto-Deploy
  React.useEffect(() => {
    const checkPaymentAndDeploy = async () => {
      if (window.location.search.includes('payment=success')) {
        // 1. Clear the URL param so it doesn't re-trigger on refresh
        window.history.replaceState({}, '', window.location.pathname);

        // Generate a unique event ID for deduplication between Pixel and CAPI
        const eventId = crypto.randomUUID();

        // Fire Facebook Pixel Purchase Event (client-side) with eventID for dedup
        if (window.fbq) {
          window.fbq('track', 'Purchase', {
            value: parseFloat(import.meta.env.VITE_PURCHASE_VALUE || '10.00'),
            currency: import.meta.env.VITE_PURCHASE_CURRENCY || 'GBP'
          }, { eventID: eventId });
        }

        // Fire server-side Facebook CAPI Purchase Event (fire and forget)
        fetch('api/fb-purchase-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: eventId,
            event_source_url: window.location.origin,
            user_agent: navigator.userAgent,
          }),
        }).catch(err => console.error('[FB CAPI] Client-side call failed:', err));

        setDeploymentStatus('deploying');
        setDeploymentMessage('Payment Verified! Starting automated deployment...');

        try {
          // 2. Load the latest site from storage
          const sites = await getAllSites();

          if (sites.length === 0) {
            throw new Error("No saved site found to deploy. Please regenerate.");
          }

          // Sort by lastSaved desc to get the one they just made
          const latestSite = sites.sort((a, b) => b.lastSaved - a.lastSaved)[0];
          setActiveSite(latestSite); // Show it on screen

          // 3. Deploy it
          const { generateSlug } = await import('./services/urlService.js');
          const projectName = generateSlug(latestSite.data.contact.companyName);

          setDeploymentMessage('Building and deploying your site to Vercel...');
          const result = await deploySite(latestSite.data, projectName);

          // 10-second countdown
          for (let i = 10; i > 0; i--) {
            setDeploymentMessage(`Deploying... ${i}s`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          setDeploymentStatus('success');

          // Use the deterministic URL
          const finalUrl = `https://${projectName}.vercel.app`;

          setDeploymentUrl(finalUrl);
          setDeploymentMessage('Success! Your site is live.');

          // Auto-open
          setTimeout(() => {
            window.open(finalUrl, '_blank');
          }, 1000);

        } catch (error: any) {
          console.error("Auto-deploy failed:", error);
          setDeploymentStatus('error');
          setDeploymentMessage(error.message || 'Deployment failed after payment.');
        }
      }
    };

    checkPaymentAndDeploy();
  }, []);

  const handleGenerate = async (newInputs: GeneratorInputs) => {
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }
    }

    setIsLoading(true);
    try {
      // Capture lead data instantly (Fire and forget, but with error handling)
      import('./services/leadService.js').then(({ captureLead }) => {
        captureLead(newInputs).catch(err => console.error("Lead capture failed:", err));
      }).catch(err => console.error("Lead service import failed:", err));

      const data = await generateSiteContent(newInputs);
      const instance: SiteInstance = {
        id: Math.random().toString(36).substring(7),
        data: data,
        lastSaved: Date.now()
      };
      setActiveSite(instance);
      await saveSiteInstance(instance);
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (error.message?.includes("Requested entity was not found") && window.aistudio) {
        alert("The selected model is not available with this API key. Please select a different key.");
        await window.aistudio.openSelectKey();
      } else {
        alert(`Generation Error: ${error.message || "Please check your API key and try again."}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateSiteData = useCallback(async (newData: GeneratedSiteData) => {
    if (!activeSite) return;

    setSaveStatus('saving');
    const updatedSite = { ...activeSite, data: newData, lastSaved: Date.now() };
    setActiveSite(updatedSite);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveSiteInstance(updatedSite);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (err) {
        console.error("Save failed:", err);
        setSaveStatus('idle');
      }
    }, 600);
  }, [activeSite]);

  const reset = useCallback(() => {
    if (confirm("Go back to generator? Your current site is saved locally.")) {
      setActiveSite(null);
    }
  }, []);

  const handleDeploy = async () => {
    if (!activeSite) return;

    // 1. Save locally one last time
    setSaveStatus('saving');
    await saveSiteInstance(activeSite);
    setSaveStatus('saved');

    // 2. Call dynamic checkout API
    setDeploymentStatus('deploying');
    setDeploymentMessage('Redirecting to secure payment...');

    try {
      // Use relative path to support subfolder hosting
      const response = await fetch('api/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: activeSite.data.contact.companyName,
          siteId: activeSite.id
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const { error } = await response.json();
          throw new Error(error || `Server returned ${response.status}`);
        } else {
          // If not JSON, it might be a Vercel 404 HTML page
          throw new Error(`API error (${response.status}): The endpoint could not be found. If you just pushed changes, please wait a minute for Vercel to finish building.`);
        }
      }

      const { url, error } = await response.json();

      if (error) throw new Error(error);
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setDeploymentStatus('error');
      setDeploymentMessage(err.message || 'Failed to start payment process.');
    }

  };

  return (
    <div className="min-h-screen bg-[#05070A] font-light" style={{ fontFamily: '"Avenir Light", Avenir, sans-serif' }}>
      {!activeSite && !isLoading && (
        <div className="pt-4 md:pt-6 pb-20 px-6">
          <GeneratorForm onSubmit={handleGenerate} isLoading={isLoading} />
        </div>
      )}

      {isLoading && <LoadingIndicator />}

      {activeSite && (
        <div className="flex flex-col min-h-screen">
          {/* Sticky Editor Instruction Banner - Red */}
          <div className="sticky top-0 z-[110] bg-red-600 text-white px-4 py-3 md:py-5 shadow-lg flex items-center justify-between min-h-[60px]">
            <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
              <button
                onClick={reset}
                className="p-1 hover:bg-white/10 rounded transition-colors shrink-0"
                title="Back to Generator"
              >
                <ChevronLeft size={20} />
              </button>
              <BannerText
                text="Tap text to edit or tap images to replace them, after done click deploy website below"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1.5 rounded-full border border-white/20 whitespace-nowrap">
                {saveStatus === 'saving' ? (
                  <span className="flex items-center gap-1 text-blue-100">
                    <Loader2 size={12} className="animate-spin" /> Saving
                  </span>
                ) : saveStatus === 'saved' ? (
                  <span className="flex items-center gap-1 text-green-300">
                    <CloudCheck size={14} /> Saved
                  </span>
                ) : (
                  <span className="opacity-80 uppercase">Editor</span>
                )}
              </div>
            </div>
          </div>

          <main className="bg-white pb-24">
            <SiteRenderer
              data={activeSite.data}
              isEditMode={true}
              onUpdate={updateSiteData}
            />
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 p-3 md:p-4 shadow-[0_-8px_20px_rgba(0,0,0,0.05)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-3">
              <div className="text-center md:text-left">
                <p className="text-gray-900 font-bold text-xs md:text-sm">
                  PAY ONLY £10/MONTH WEBSITE HOSTING TO HAVE YOUR CUSTOM SITE LIVE & ACTIVE
                </p>
              </div>
              <button
                onClick={handleDeploy}
                disabled={deploymentStatus === 'deploying'}
                className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-tighter disabled:opacity-50"
              >
                {deploymentStatus === 'deploying' ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
                Deploy Website
              </button>
            </div>
          </div>

          {/* Deployment Status Overlay */}
          {deploymentStatus !== 'idle' && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 text-center">
              <div className="bg-[#05070A] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl">
                {deploymentStatus === 'deploying' && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                      <Rocket className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Deploying Site</h3>
                      <p className="text-gray-400">{deploymentMessage}</p>
                    </div>
                  </div>
                )}

                {deploymentStatus === 'success' && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CloudCheck className="text-green-500" size={40} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Site is Live!</h3>
                      <p className="text-gray-400 mb-6">{deploymentMessage}</p>
                      <a
                        href={deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-colors"
                      >
                        View Live Site <ExternalLink size={18} />
                      </a>
                    </div>
                    <button
                      onClick={() => setDeploymentStatus('idle')}
                      className="text-gray-500 hover:text-white text-sm font-medium transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}

                {deploymentStatus === 'error' && (
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                      <span className="text-red-500 text-4xl font-bold">!</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Deployment Failed</h3>
                      <p className="text-red-400 mb-6">{deploymentMessage}</p>
                      <button
                        onClick={() => setDeploymentStatus('idle')}
                        className="bg-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors w-full"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
