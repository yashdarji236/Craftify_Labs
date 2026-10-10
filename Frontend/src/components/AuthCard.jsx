import React, { useState } from 'react';
import InputField from './InputField';
import { useAuth } from '../context/AuthContext';
import { Loader2, Check } from 'lucide-react';

export default function AuthCard({ onToast }) {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      onToast('Please fill in all required fields.', 'error');
      return;
    }

    if (!isLoginMode) {
      if (!confirmPassword) {
        onToast('Please confirm your password.', 'error');
        return;
      }

      if (password !== confirmPassword) {
        onToast('Passwords do not match. Please verify.', 'error');
        return;
      }

      if (password.length < 6) {
        onToast('Password must be at least 6 characters long.', 'error');
        return;
      }

      if (!agreeTerms) {
        onToast('Please agree to the Terms & Privacy Policy.', 'error');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLoginMode) {
        const res = await login({ email: email.trim(), password });
        onToast(res.message || 'Welcome back to Craftify Labs!', 'success');
      } else {
        const res = await register({
          email: email.trim(),
          password,
          confirmPassword,
          agreeTerms,
        });
        onToast(res.message || 'Account created successfully!', 'success');
      }
    } catch (err) {
      onToast(err.message || 'Authentication failed. Please check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode((prev) => !prev);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="w-full h-full flex flex-col justify-center px-6 sm:px-10 md:px-12 lg:px-16 py-6 sm:py-8 my-auto z-10">

      {/* Form Section */}
      <div className="w-full max-w-md mx-auto my-auto">
        {/* Brand Logo Header */}
        <div className="flex items-center gap-3.5 mb-6 sm:mb-8">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden border border-white/15 shadow-[0_4px_20px_rgba(0,0,0,0.5)] bg-[#0e0e11] shrink-0 p-1 flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="Craftify Labs Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div className="flex items-center tracking-tight font-extrabold text-2xl text-zinc-100 font-sans">
            <span>Craftify</span>
            <span className="text-zinc-400 font-normal ml-1.5">Labs</span>
            <span className="w-2 h-2 rounded-full bg-zinc-300 ml-1.5 mt-2 inline-block shadow-[0_0_10px_rgba(255,255,255,0.7)]"></span>
          </div>
        </div>

        {/* Form Header */}
        <div className="mb-5 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">
            {isLoginMode ? 'Welcome back' : 'Sign up'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed font-normal">
            {isLoginMode
              ? 'Enter your credentials to access your Craftify Labs workspace.'
              : 'Create your Craftify Labs account and build next-generation experiences.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
          <InputField
            id="email"
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            iconType="email"
            autoComplete="email"
          />

          <InputField
            id="password"
            type="password"
            placeholder={isLoginMode ? 'Enter Password' : 'Create Password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            iconType="password"
            autoComplete={isLoginMode ? 'current-password' : 'new-password'}
          />

          {/* Confirm Password (only in Sign Up mode) */}
          {!isLoginMode && (
            <InputField
              id="confirmPassword"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              iconType="confirmPassword"
              autoComplete="new-password"
            />
          )}

          {/* Checkbox (Agree to terms / Remember me) */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div
                onClick={() => setAgreeTerms(!agreeTerms)}
                className={`w-4 h-4 rounded border transition-colors flex items-center justify-center ${agreeTerms
                  ? 'bg-zinc-200 border-zinc-200 text-black'
                  : 'border-zinc-600 bg-zinc-900/60 group-hover:border-zinc-400'
                  }`}
              >
                {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
              <span className="text-xs text-zinc-400 group-hover:text-zinc-300">
                {isLoginMode ? 'Remember this session' : 'I Agree To The Terms & Privacy Policy'}
              </span>
            </label>

            {isLoginMode && (
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  onToast('Password reset instructions sent to your email.', 'info');
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Forgot?
              </a>
            )}
          </div>

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 sm:mt-5 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-sm py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Footer Toggle Link */}
        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-xs text-zinc-400">
            {isLoginMode ? "Don't Have An Account? " : 'Already Have An Account? '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-zinc-200 hover:text-white font-semibold underline underline-offset-4 cursor-pointer transition-colors focus:outline-none ml-1"
            >
              {isLoginMode ? 'Sign up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
