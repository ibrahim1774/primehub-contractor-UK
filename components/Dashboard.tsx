import React, { useState } from 'react';
import { SiteInstance, UserProfile } from '../types.js';
import { User } from '@supabase/supabase-js';
import {
  Zap, ChevronDown,
  ExternalLink, Globe, CircleDot, Clock
} from 'lucide-react';

interface DashboardProps {
  site: SiteInstance;
  profile: UserProfile | null;
  user: User | null;
  onEditSite: () => void;
  onSignOut: () => void;
  onCreateNew: () => void;
}

const timeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const Dashboard: React.FC<DashboardProps> = ({ site, profile, user, onEditSite, onSignOut, onCreateNew }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isLive = site.deploymentStatus === 'deployed';
  const companyName = site.data.contact.companyName;
  const userInitial = (profile?.full_name || (user?.user_metadata as any)?.full_name || profile?.email || 'U').charAt(0).toUpperCase();
  const userName = profile?.full_name || (user?.user_metadata as any)?.full_name || profile?.email || 'User';

  return (
    <div className="min-h-screen pb-12">
      {/* Top Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">PrimeHub AI</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 hover:bg-white/5 px-3 py-2 rounded-xl transition-colors"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {userInitial}
              </div>
              <span className="text-gray-300 text-sm hidden md:block">{userName}</span>
              <ChevronDown size={14} className="text-gray-500" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#0D1117] border border-white/10 rounded-xl shadow-2xl z-50 py-1 overflow-hidden">
                  <button
                    onClick={() => { setDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); onSignOut(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || (user?.user_metadata as any)?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-gray-500 mt-1">Manage your website and settings</p>
        </div>

        {/* Site Overview Card */}
        <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Preview */}
            <div className="w-full md:w-80 h-48 rounded-xl overflow-hidden bg-[#05070A] border border-white/5 shrink-0">
              {isLive && site.deployedUrl ? (
                <iframe
                  src={site.deployedUrl}
                  className="w-full h-full pointer-events-none"
                  title="Site preview"
                  loading="lazy"
                  sandbox=""
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Globe size={32} className="text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Not yet published</p>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-white">{companyName}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    isLive
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    {isLive ? 'Live' : 'Draft'}
                  </span>
                </div>

                {isLive && site.deployedUrl && (
                  <a
                    href={site.deployedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm transition-colors mb-3"
                  >
                    {site.deployedUrl} <ExternalLink size={12} />
                  </a>
                )}

                <p className="text-gray-500 text-sm flex items-center gap-1.5">
                  <Clock size={12} />
                  Last edited {timeAgo(site.lastSaved)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={onEditSite}
                  className="bg-white text-black font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all"
                >
                  Edit Website
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-5">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Site Status</p>
            <div className="flex items-center gap-2">
              <CircleDot size={16} className={isLive ? 'text-green-400' : 'text-yellow-400'} />
              <span className="text-white font-bold">{isLive ? 'Live' : 'Draft'}</span>
            </div>
          </div>
          <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-5">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Plan</p>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">
                {profile?.subscription_status === 'active' ? '£10/month Active' : 'No active plan'}
              </span>
            </div>
          </div>
          <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-5">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-2">Last Published</p>
            <span className="text-white font-bold">
              {isLive ? timeAgo(site.lastSaved) : 'Not yet published'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
