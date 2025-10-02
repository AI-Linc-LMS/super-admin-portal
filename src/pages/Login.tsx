import React from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import { LoginCredentials } from '../types/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
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

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data as LoginCredentials);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      // Error handling is done in the store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card glassmorphism className="backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">AI</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">SuperAdmin Dashboard</h1>
            <p className="text-gray-600">{t('auth.signInToAccount')}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              label={t('auth.email')}
              type="email"
              placeholder={t('auth.email')}
              leftIcon={<Mail className="w-5 h-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label={t('auth.password')}
              type="password"
              placeholder={t('auth.password')}
              leftIcon={<Lock className="w-5 h-5" />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              leftIcon={<LogIn className="w-5 h-5" />}
            >
              {t('auth.signIn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Restricted access for SuperAdmin users only
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;