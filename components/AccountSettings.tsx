import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { UserProfile, SiteInstance, GeneratorInputs } from '../types.js';
import { supabase } from '../services/supabaseService.js';
import {
  ChevronLeft, Mail, User as UserIcon, Calendar, Key, CreditCard,
  Loader2, Trash2, AlertTriangle, Check, Palette,
} from 'lucide-react';

interface AccountSettingsProps {
  profile: UserProfile | null;
  user: User | null;
  activeSite: SiteInstance | null;
  formInputs: GeneratorInputs | null;
  onBack: () => void;
  onSignOut: () => void;
  onSiteSettingsUpdate: (inputs: GeneratorInputs) => void;
  onDeleteSite: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active: { label: 'Active', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  past_due: { label: 'Past Due', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  cancelled: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  none: { label: 'No active plan', color: 'text-gray-400', bg: 'bg-white/5', border: 'border-white/10' },
};

const AccountSettings: React.FC<AccountSettingsProps> = ({
  profile,
  user,
  activeSite,
  formInputs,
  onBack,
  onSignOut,
  onSiteSettingsUpdate,
  onDeleteSite,
}) => {
  // Site settings form state
  const [siteForm, setSiteForm] = useState<GeneratorInputs>({
    companyName: '',
    industry: '',
    location: '',
    phone: '',
    brandColor: '#2563eb',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Password reset
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Billing
  const [billingLoading, setBillingLoading] = useState(false);

  // Delete confirmations
  const [showDeleteSite, setShowDeleteSite] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Initialize form from props
  useEffect(() => {
    if (formInputs) {
      setSiteForm(formInputs);
    }
  }, [formInputs]);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      console.error('Password reset failed:', err);
      alert('Failed to send reset email. Please try again.');
    } finally {
      setResetSending(false);
    }
  };

  const handleManageBilling = async () => {
    if (!profile?.stripe_customer_id) return;
    setBillingLoading(true);
    try {
      const res = await fetch('api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: profile.stripe_customer_id }),
      });
      if (!res.ok) throw new Error('Failed to create billing session');
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Billing portal error:', err);
      alert('Could not open billing portal. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeSite || !user) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('sites')
        .update({
          company_name: siteForm.companyName,
          industry: siteForm.industry,
          service_area: siteForm.location,
          phone: siteForm.phone,
          brand_colour: siteForm.brandColor,
        })
        .eq('id', activeSite.id)
        .eq('user_id', user.id);

      if (error) throw error;
      onSiteSettingsUpdate(siteForm);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      console.error('Save settings failed:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!activeSite || !user) return;
    setDeleting(true);
    try {
      await supabase.from('assets').delete().eq('site_id', activeSite.id);
      await supabase.from('sites').delete().eq('id', activeSite.id).eq('user_id', user.id);
      onDeleteSite();
    } catch (err) {
      console.error('Delete site failed:', err);
      alert('Failed to delete website. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteSite(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await supabase.from('assets').delete().eq('user_id', user.id);
      await supabase.from('sites').delete().eq('user_id', user.id);
      await supabase.from('users_profile').delete().eq('id', user.id);
      onSignOut();
    } catch (err) {
      console.error('Delete account failed:', err);
      alert('Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteAccount(false);
    }
  };

  const sub = statusConfig[profile?.subscription_status || 'none'] || statusConfig.none;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="min-h-screen pb-12">
      {/* Top Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-white font-bold text-lg tracking-tight">Settings</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 pt-8 space-y-6">

        {/* ── ACCOUNT ── */}
        <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-5">Account</p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Email</p>
                <p className="text-white text-sm">{user?.email || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon size={16} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Name</p>
                <p className="text-white text-sm">{profile?.full_name || '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Member Since</p>
                <p className="text-white text-sm">{memberSince}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/5">
            <button
              onClick={handlePasswordReset}
              disabled={resetSending || resetSent}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              {resetSending ? (
                <><Loader2 size={14} className="animate-spin" /> Sending...</>
              ) : resetSent ? (
                <><Check size={14} className="text-green-400" /> Check your email</>
              ) : (
                <><Key size={14} /> Change Password</>
              )}
            </button>
          </div>
        </div>

        {/* ── BILLING ── */}
        <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-6">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-5">Billing</p>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Plan</p>
              <p className="text-white text-sm font-bold mt-1">PrimeHub AI — £10/month</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${sub.bg} ${sub.color} border ${sub.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sub.color.replace('text-', 'bg-')}`} />
                {sub.label}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-white/5 flex flex-wrap gap-3">
            <button
              onClick={handleManageBilling}
              disabled={billingLoading || !profile?.stripe_customer_id}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {billingLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Opening...</>
              ) : (
                <><CreditCard size={14} /> Manage Subscription</>
              )}
            </button>
          </div>
        </div>

        {/* ── SITE SETTINGS ── */}
        {activeSite && (
          <div className="bg-[#0D1117]/80 border border-white/10 rounded-2xl p-6">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-5">Site Settings</p>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Company Name</label>
                <input
                  type="text"
                  value={siteForm.companyName}
                  onChange={(e) => setSiteForm({ ...siteForm, companyName: e.target.value })}
                  className="w-full bg-transparent border-b border-white/10 px-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Industry</label>
                <input
                  type="text"
                  value={siteForm.industry}
                  onChange={(e) => setSiteForm({ ...siteForm, industry: e.target.value })}
                  className="w-full bg-transparent border-b border-white/10 px-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Service Area</label>
                <input
                  type="text"
                  value={siteForm.location}
                  onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                  className="w-full bg-transparent border-b border-white/10 px-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Phone Number</label>
                <input
                  type="text"
                  value={siteForm.phone}
                  onChange={(e) => setSiteForm({ ...siteForm, phone: e.target.value })}
                  className="w-full bg-transparent border-b border-white/10 px-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Brand Colour</label>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={siteForm.brandColor}
                    onChange={(e) => setSiteForm({ ...siteForm, brandColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                  />
                  <span className="text-white text-sm font-mono">{siteForm.brandColor}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-5 border-t border-white/5">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="flex items-center gap-2 bg-white text-black font-bold px-6 py-2.5 rounded-full text-xs uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50"
              >
                {savingSettings ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving...</>
                ) : settingsSaved ? (
                  <><Check size={14} /> Saved</>
                ) : (
                  'Save Changes'
                )}
              </button>
              <p className="text-gray-600 text-xs mt-3">Changes to these settings will be reflected next time you publish.</p>
            </div>
          </div>
        )}

        {/* ── DANGER ZONE ── */}
        <div className="bg-[#0D1117]/80 border border-red-500/20 rounded-2xl p-6">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] mb-5">Danger Zone</p>
          <div className="space-y-4">
            {activeSite && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-white text-sm font-bold">Delete Website</p>
                  <p className="text-gray-500 text-xs">Permanently delete your website and all assets. Your deployed URL will stop working.</p>
                </div>
                <button
                  onClick={() => setShowDeleteSite(true)}
                  className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-red-500/20 shrink-0"
                >
                  <Trash2 size={14} /> Delete Website
                </button>
              </div>
            )}
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${activeSite ? 'pt-4 border-t border-white/5' : ''}`}>
              <div>
                <p className="text-white text-sm font-bold">Delete Account</p>
                <p className="text-gray-500 text-xs">Permanently delete your account, website, and all data. This cannot be undone.</p>
              </div>
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors border border-red-500/20 shrink-0"
              >
                <Trash2 size={14} /> Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DELETE WEBSITE CONFIRMATION ── */}
      {showDeleteSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteSite(false)} />
          <div className="relative bg-[#0D1117] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Delete Website?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete your website and all uploaded assets. Your deployed URL will stop working. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteSite(false)}
                disabled={deleting}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSite}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE ACCOUNT CONFIRMATION ── */}
      {showDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteAccount(false)} />
          <div className="relative bg-[#0D1117] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Delete Account?</h3>
            <p className="text-gray-400 text-sm mb-6">
              This will permanently delete your account, website, and all data. If you have an active subscription, please cancel it first via Manage Subscription. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAccount(false)}
                disabled={deleting}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
