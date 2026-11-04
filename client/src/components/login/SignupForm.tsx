'use client';

import React from 'react';
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

export function SignupForm({
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
  signUp,
}: {
  isLogin: boolean;
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
  formData: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>>;
  errors: FormErrors;
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPassword: boolean;
  setShowConfirmPassword: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  signUp: (email: string, password: string, name: string, username: string) => Promise<{ error: any }>;
}) {
  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { name, username, email, password, confirmPassword } = formData;

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      setIsLoading(false);
      return;
    }

    // Perform Supabase sign up with user metadata
    const { error } = await signUp(email, password, name, username);

    setIsLoading(false);

    if (error) {
      // Handle specific error types
      switch (error.error) {
        case 'User already registered':
          setErrors({ email: 'An account with this email already exists' });
          break;
        case 'Password too short':
          setErrors({ password: 'Password must be at least 8 characters' });
          break;
        case 'Invalid email':
          setErrors({ email: 'Please enter a valid email address' });
          break;
        case 'Email already confirmed':
          setErrors({ email: 'Email is already confirmed. Please try logging in.' });
          break;
        default:
          setErrors({ email: error.error || 'Signup failed' });
      }
      return;
    }

    // Signup successful - show message
    setErrors({ success: 'Check your email to confirm your account. Then log in.' });

    // Switch back to login form after a delay
    setTimeout(() => {
      setIsLogin(true);
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
      setErrors({});
    }, 5000);
  };

  return null;
}