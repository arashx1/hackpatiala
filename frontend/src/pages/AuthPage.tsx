import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  onSuccessRedirect?: () => void;
  onBackToHome?: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onSuccessRedirect,
  onBackToHome,
  initialMode = 'signin',
}) => {
  const { signIn, signUp, user, signOut } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const { error, user: newUser } = await signUp(
          email.trim(),
          password,
          fullName.trim()
        );
        if (error) {
          setErrorMsg(error);
        } else {
          setSuccessMsg('ðŸŽ‰ Welcome to FundBee! Your account is created.');
          if (onSuccessRedirect && newUser) {
            setTimeout(() => {
              onSuccessRedirect();
            }, 1200);
          }
        }
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error);
        } else {
          setSuccessMsg('âœ… Signed in successfully! Welcome back to FundBee.');
          if (onSuccessRedirect) {
            setTimeout(() => {
              onSuccessRedirect();
            }, 800);
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setSubmitting(false);
    }
  };


  // If already signed in, show welcome card
  if (user) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-6">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-emerald-500 text-white flex items-center justify-center mx-auto shadow-md shadow-emerald-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">You are Signed In!</h2>
            <p className="text-xs text-gray-500 mt-1">
              Logged in as <strong className="text-gray-800">{user.email}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-xs text-left space-y-2 border border-emerald-100">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>FundBee Account Active</span>
            </div>
            <p>
              Your simulated investment decisions, Financial Fitness score, and history are saved locally to this browser.

            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={onSuccessRedirect}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-md shadow-emerald-200"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => signOut()}
              className="w-full py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {onBackToHome && (
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 font-semibold mb-6 transition-colors cursor-pointer"
        >
          <span>â† Back to Home Page</span>
        </button>
      )}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left Feature Column */}
        <div className="md:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
            <span className="text-base">Ã°Å¸ÂÂ</span>
            <span>Welcome to FundBee</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
              Grow Your Wealth With Smart, Disciplined Habits.
            </h1>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Practice investing with real neural network signals, Socratic AI coaching, and zero real money at risk.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Zero Real Money Ever At Risk</h4>
                <p className="text-[11px] text-gray-500">
                  Simulate stock, ETF, and crypto moves before risking your hard-earned savings.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Track Financial Fitness</h4>
                <p className="text-[11px] text-gray-500">
                  Build patience and resilience as your personal investing score increases over time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-700 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Private Local Account</h4>
                <p className="text-[11px] text-gray-500">
                  Runs directly in your browser with zero external setup needed.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="md:col-span-7">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-lg shadow-gray-100/60 space-y-6">
            {/* Header / Mode Switcher */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {mode === 'signin' ? 'Sign in to FundBee' : 'Create your free account'}
                </h2>
                <p className="text-xs text-gray-400">
                  {mode === 'signin'
                    ? 'Enter your email & password to continue'
                    : 'Get started in under 30 seconds'}
                </p>
              </div>

              {/* Mode Toggle Pills */}
              <div className="flex items-center bg-gray-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-gray-900 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{errorMsg}</div>
              </div>
            )}

            {/* Success Banner */}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-emerald-800 text-xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-semibold">{successMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">
                    Full Name (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">
                    Password
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">
                    At least 6 characters
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-xs text-gray-800 outline-none transition-all placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-200 disabled:opacity-60 cursor-pointer mt-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to FundBee' : 'Create Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Action */}
            <div className="border-t border-gray-100 pt-4 text-center">
              <button
                type="button"
                onClick={async () => {
                  await signIn('investor@FundBee.demo', 'demo1234');
                  if (onSuccessRedirect) onSuccessRedirect();
                }}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline py-1.5 px-3 rounded-lg hover:bg-emerald-50 transition-colors"
              >
                âš¡ Instant Access: Explore as Demo Investor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;

