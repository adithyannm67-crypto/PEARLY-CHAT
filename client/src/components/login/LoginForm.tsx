'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent } from 'react';
import { useSupabase } from '@/lib/supabase/context';
import {
  MessageCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface FormErrors {
  [key: string]: string | undefined;
}

interface LoginFormFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export function LoginForm({
  isLogin,
  setIsLogin,
  formData,
  setFormData,
  errors,
  setErrors,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isLoading,
  setIsLoading,
  rememberMe,
  setRememberMe,
  signIn,
  router,
}: {
  isLogin: boolean;
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
  formData: LoginFormFormData;
  setFormData: React.Dispatch<React.SetStateAction<LoginFormFormData>>;
  errors: FormErrors;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  rememberMe: boolean;
  setRememberMe: React.Dispatch<React.SetStateAction<boolean>>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  router: ReturnType<typeof useRouter>;
}) {
  // Clear errors when user starts typing
  const clearError = (field: keyof FormErrors) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only update fields we care about for login
    if (name === 'username' || name === 'email' || name === 'password') {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear relevant errors on input
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { email, password } = formData;

    // Perform Supabase sign in
    const { error } = await signIn(email, password);

    setIsLoading(false);

    if (error) {
      // Handle specific error types
      switch (error.error) {
        case 'Invalid login credentials':
          setErrors({ login: 'Invalid email/username or password' });
          break;
        case 'Email not confirmed':
          setErrors({ login: 'Please confirm your email address before logging in' });
          break;
        default:
          setErrors({ login: error.error || 'Authentication failed' });
      }
      return;
    }

    // Success - redirect
    router.push('/');
  };

  return null;
}