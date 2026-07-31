import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Eye, Lock, ArrowRight, AlertCircle, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { validateEmail } from '@/services/authService';

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      console.log('[LoginPage] Login submitted for email:', data.email);
      const user = await login({ email: data.email, password: data.password });
      console.log('[LoginPage] Login success. User object:', user);
      console.log('[LoginPage] user.id:', user.id);
      console.log('[LoginPage] user.role:', user.role);
      showToast('Welcome back to CivicEye AI!', 'success');

      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      const target = (from && from !== '/login' && from !== '/register')
        ? from
        : user.role === 'admin' ? '/admin' : '/dashboard';
      console.log('[LoginPage] Redirect target:', target);
      navigate(target);
    } catch (err: any) {
      console.error('[LoginPage] Login failed:', err?.message);
      showToast(err?.message ?? 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-300/20 dark:bg-emerald-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 w-full max-w-md relative"
      >
        <Link to="/" className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">CivicEye<span className="text-blue-600 dark:text-blue-400"> AI</span></span>
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In to Your Account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your email and password to continue</p>
        </div>

        {/* Government-style info banner */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 mb-5">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-400">Secure Government Portal — Authorized Personnel Only</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                {...register('email', {
                  required: 'Email address is required',
                  validate: (v) => validateEmail(v) || 'Please enter a valid email address',
                })}
                placeholder="you@example.com"
                className="input-field pl-10"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password', { required: 'Password is required' })}
                placeholder="••••••••"
                className="input-field pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password.message}</p>}
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" {...register('remember')} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">Forgot password?</Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
          Don't have an account? <Link to="/register" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Register here</Link>
        </p>
      </motion.div>
    </div>
  );
}
