import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { LoginCredentials } from '../types/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ROUTES } from '../utils/constants';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const { t } = useTranslation();

  const loginSchema = z.object({
    email: z.string().email(t('forms.invalidEmail')),
    password: z.string().min(6, t('forms.passwordTooShort')),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data as LoginCredentials);
      navigate(ROUTES.DASHBOARD);
    } catch {
      // store handles error display
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-0 px-4 py-12">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(45% 40% at 80% 20%, rgba(0,224,255,0.18) 0%, transparent 60%),' +
            'radial-gradient(45% 40% at 20% 80%, rgba(35,86,214,0.22) 0%, transparent 60%)',
        }}
      />
      <div aria-hidden className="grain" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div
          className="relative overflow-hidden rounded-2xl border border-themed-2
            surface-card p-8 shadow-glass"
        >
          {/* gradient top edge */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px
              bg-gradient-to-r from-transparent via-brand-cyan/60 to-transparent"
          />

          {/* Brand mark + kicker */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative mb-5 h-14 w-14">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-brand-grad
                  shadow-[0_18px_50px_-15px_rgba(0,224,255,0.55)]"
              />
              <div className="relative flex h-full w-full items-center justify-center">
                <span className="font-mono text-[18px] font-bold tracking-tight text-white">
                  AL
                </span>
              </div>
            </div>

            <span className="kicker mb-4">SuperAdmin · Restricted</span>

            <h1 className="serif-display text-[28px] leading-tight text-text">
              Welcome back to <span className="gradient-text">AI Linc</span>
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-text-dim">
              {t('auth.signInToAccount')}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder="you@ailinc.com"
              leftIcon={<Mail className="h-[18px] w-[18px]" />}
              error={errors.email?.message}
              autoComplete="email"
              {...register('email')}
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="h-[18px] w-[18px]" />}
              error={errors.password?.message}
              autoComplete="current-password"
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              size="lg"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-7 flex items-center justify-center gap-2 border-t border-themed pt-5">
            <ShieldCheck className="h-3.5 w-3.5 text-text-mute" />
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              Restricted to SuperAdmin accounts
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
