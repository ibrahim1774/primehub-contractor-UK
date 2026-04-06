import React, { useState } from 'react';
import { Globe, Search, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { SiteInstance } from '../types.js';

interface DomainManagerProps {
  site: SiteInstance;
}

const TLDS = ['.com', '.co.uk', '.net', '.org'];

const DomainManager: React.FC<DomainManagerProps> = ({ site }) => {
  const [domainInput, setDomainInput] = useState('');
  const [selectedTld, setSelectedTld] = useState('.com');
  const [checking, setChecking] = useState(false);
  const [buying, setBuying] = useState(false);
  const [result, setResult] = useState<{
    available: boolean;
    domain: string;
    price?: number;
    renewalPrice?: number;
    priceGbp?: number;
  } | null>(null);
  const [error, setError] = useState('');

  // If site already has a custom domain, show connected state
  if (site.customDomain) {
    return (
      <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-6 mb-6">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Custom Domain</p>
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-green-400" />
          <a
            href={`https://${site.customDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white font-bold text-lg hover:text-blue-400 transition-colors flex items-center gap-2"
          >
            {site.customDomain} <ExternalLink size={14} />
          </a>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Connected
          </span>
        </div>
      </div>
    );
  }

  const usdToGbp = 0.80;
  const markupGbp = 5;

  const convertToGbp = (usdPrice: number): number => {
    return Math.round((usdPrice * usdToGbp + markupGbp) * 100) / 100;
  };

  const handleSearch = async () => {
    const name = domainInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!name) {
      setError('Please enter a domain name');
      return;
    }

    const fullDomain = name + selectedTld;
    setChecking(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('api/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: fullDomain }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to check domain');
      }

      const data = await response.json();
      setResult({
        available: data.available,
        domain: fullDomain,
        price: data.price,
        renewalPrice: data.renewalPrice,
        priceGbp: data.price ? convertToGbp(data.price) : undefined,
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setChecking(false);
    }
  };

  const handleBuy = async () => {
    if (!result?.available || !result.price) return;

    // Derive project name from deployed URL
    const projectName = site.deployedUrl
      ? new URL(site.deployedUrl).hostname.replace('.vercel.app', '')
      : '';

    if (!projectName) {
      setError('Your site must be published before purchasing a domain.');
      return;
    }

    setBuying(true);
    setError('');

    try {
      const response = await fetch('api/create-domain-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: result.domain,
          vercelPrice: result.price,
          siteId: site.id,
          projectName,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create checkout');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start purchase');
      setBuying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !checking) {
      handleSearch();
    }
  };

  return (
    <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-6 mb-6">
      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-4">Custom Domain</p>

      {/* Search Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={domainInput}
          onChange={(e) => setDomainInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="yourbusiness"
          className="flex-1 min-w-0 bg-[#05070A] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
        />
        <select
          value={selectedTld}
          onChange={(e) => setSelectedTld(e.target.value)}
          className="bg-[#05070A] border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none cursor-pointer"
        >
          {TLDS.map((tld) => (
            <option key={tld} value={tld}>{tld}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          disabled={checking || !domainInput.trim()}
          className="w-full md:w-auto bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div className={`border rounded-xl p-4 ${
          result.available
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-red-500/20 bg-red-500/5'
        }`}>
          {result.available ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-green-400 font-bold text-sm">{result.domain} is available!</span>
              </div>
              {result.priceGbp && (
                <>
                  <p className="text-gray-400 text-sm mb-3">
                    Price: <span className="text-white font-bold">£{result.priceGbp.toFixed(2)}/year</span>
                    {result.renewalPrice && (
                      <span className="text-gray-500"> (renews at £{convertToGbp(result.renewalPrice).toFixed(2)}/year)</span>
                    )}
                  </p>
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {buying ? (
                      <><Loader2 size={14} className="animate-spin" /> Processing...</>
                    ) : (
                      <>Buy Domain — £{result.priceGbp.toFixed(2)}</>
                    )}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-400" />
              <span className="text-red-400 font-bold text-sm">{result.domain} is not available</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DomainManager;
