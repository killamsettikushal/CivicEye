import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Eye, Mail, ArrowRight, CheckCircle2, KeyRound, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { authService, validateEmail, validatePassword, PASSWORD_RULES } from '@/services/authService';
import { useToast } from '@/contexts/ToastContext';

type Phase = 'email' | 'verify' | 'reset' | 'done';

interface EmailForm { email: string }
interface VerifyForm { code: string }
interface ResetForm { password: string; confirmPassword: string }

export function ForgotPasswordPage() {
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const emailForm = useForm<EmailForm>();
  const verifyForm = useForm<VerifyForm>();
  const resetForm = useForm<ResetForm>();

  const onSendCode = async (data: EmailForm) => {
    setLoading(true);
    try {
      const code = await authService.sendResetCode(data.email);
      setEmail(data.email);
      setPhase('verify');
      showToast('Verification code sent to your email', 'success');
      // In dev mode, display the code for testing convenience
      if (import.meta.env.DEV && code) setDevCode(code);
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to send reset code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async (data: VerifyForm) => {
    setLoading(true);
    try {
      const valid = await authService.verifyResetCode(email, data.code);
      if (!valid) {
        showToast('Invalid or expired verification code', 'error');
        return;
      }
      setPhase('reset');
      showToast('Code verified. Set your new password.', 'success');
    } catch {
      showToast('Verification failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (data: ResetForm) => {
    if (data.password !== data.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(email, data.password);
      setPhase('done');
      showToast('Password reset successfully!', 'success');
    } catch (err: any) {
      showToast(err?.message ?? 'Failed to reset password', 'error');
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
        <Link to="/" className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">CivicEye<span className="text-blue-600 dark:text-blue-400"> AI</span></span>
        </Link>

        {/* Phase: Done */}
        {phase === 'done' && (
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </motion.div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Password Reset Complete</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Your password has been updated. You can now sign in with your new password.</p>
            <Link to="/login" className="btn-primary">Back to Login</Link>
          </div>
        )}

        {/* Phase: Email entry */}
        {phase === 'email' && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reset Your Password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your registered email and we'll send you a verification code</p>
            </div>
            <form onSubmit={emailForm.handleSubmit(onSendCode)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    {...emailForm.register('email', {
                      required: 'Email is required',
                      validate: (v) => validateEmail(v) || 'Please enter a valid email',
                    })}
                    placeholder="you@example.com"
                    className="input-field pl-10"
                  />
                </div>
                {emailForm.formState.errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{emailForm.formState.errors.email.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <>Send Verification Code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        )}

        {/* Phase: Verify code */}
        {phase === 'verify' && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Enter Verification Code</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">We've sent a 6-digit code to <strong className="text-slate-700 dark:text-slate-200">{email}</strong></p>
            </div>
            {devCode && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">Dev mode — your code is: <strong className="font-mono tracking-wider">{devCode}</strong></p>
              </div>
            )}
            <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Verification Code</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...verifyForm.register('code', { required: 'Code is required', minLength: { value: 6, message: 'Code must be 6 digits' } })}
                    placeholder="000000"
                    className="input-field pl-10 font-mono tracking-[0.5em] text-center text-lg"
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
                {verifyForm.formState.errors.code && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{verifyForm.formState.errors.code.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <>Verify Code <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
            <button onClick={() => setPhase('email')} className="btn-ghost w-full mt-3 text-sm">Back to email entry</button>
          </>
        )}

        {/* Phase: Reset password */}
        {phase === 'reset' && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set New Password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Choose a strong password for your account</p>
            </div>
            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...resetForm.register('password', {
                      required: 'Password is required',
                      validate: (v) => {
                        const err = validatePassword(v);
                        return err ?? true;
                      },
                    })}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                {resetForm.formState.errors.password && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{resetForm.formState.errors.password.message as string}</p>}
                <div className="mt-1.5 text-xs text-slate-400">Min {PASSWORD_RULES.minLength} chars with uppercase, lowercase, digit & special character</div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5 block">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...resetForm.register('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: (v) => v === resetForm.watch('password') || 'Passwords do not match',
                    })}
                    placeholder="••••••••"
                    className="input-field pl-10"
                  />
                </div>
                {resetForm.formState.errors.confirmPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{resetForm.formState.errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : <>Reset Password <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </>
        )}

        {phase !== 'done' && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-6">
            Remember your password? <Link to="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Sign in</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
