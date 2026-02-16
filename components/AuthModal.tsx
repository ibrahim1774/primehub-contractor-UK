import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.js';
import { X, Mail, Lock, User, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'signin' }) => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode when defaultMode prop changes (e.g. opening in signup mode)
  React.useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setError('');
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error.message);
        } else {
          onClose();
        }
      } else {
        const result = await signUp(email, password, fullName);
        if (result.error) {
          setError(result.error.message);
        } else {
          onClose();
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#05070A] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold text-white mb-1 tracking-tight">
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          {mode === 'signin'
            ? 'Sign in to access your saved sites.'
            : 'Create an account to save and manage your sites.'}
        </p>

        {/* Tab Switcher */}
        <div className="flex mb-6 bg-white/5 rounded-full p-1">
          <button
            onClick={() => switchMode('signin')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-[0.2em] rounded-full transition-all ${
              mode === 'signin'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-[0.2em] rounded-full transition-all ${
              mode === 'signup'
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full bg-transparent border-b border-white/10 pl-6 pr-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-base"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent border-b border-white/10 pl-6 pr-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-base"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                minLength={6}
                className="w-full bg-transparent border-b border-white/10 pl-6 pr-0 py-2 focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-700 text-base"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white text-black font-bold py-3 rounded-full hover:bg-gray-100 transition-all uppercase tracking-widest text-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle Link */}
        <p className="text-center text-gray-500 text-sm mt-4">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-blue-500 hover:text-blue-400 font-bold transition-colors"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
