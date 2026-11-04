'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChangeEvent } from 'react';
import { useSupabase } from '@/lib/supabase/context';
import { LoginForm } from '@/components/login/LoginForm';
import { SignupForm } from '@/components/login/SignupForm';
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

export default function LoginPage() {
  const router = useRouter();
  const { supabase } = useSupabase();

  const [isLogin, setIsLogin] = useState(true);

  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loginErrors, setLoginErrors] = useState<Record<string, string | undefined>>({});

  // Signup form state
  const [signupFormData, setSignupFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signupErrors, setSignupErrors] = useState<Record<string, string | undefined>>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Initialize login form state
  useEffect(() => {
    if (isLogin) {
      setLoginFormData({ username: '', email: '', password: '' });
    }
  }, [isLogin]);

  // Clear login errors on input
  const clearLoginError = (field: keyof typeof loginErrors) => {
    setLoginErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Clear signup errors on input
  const clearSignupError = (field: keyof typeof signupErrors) => {
    setSignupErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleLoginChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginFormData((prev) => ({ ...prev, [name]: value }));

    if (loginErrors[name]) {
      setLoginErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    setLoginErrors({});
    setSignupErrors({});
    setLoginFormData({
      username: '',
      email: '',
      password: '',
    });
    setSignupFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // If already authenticated, redirect to home
  useEffect(() => {
    if (isLogin && supabase?.auth?.getSession) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && isLogin) {
          router.push('/');
        }
      });
    }
    if (!isLogin) {
      setIsLogin(true);
    }
  }, [isLogin, router]);

  return (
    <div className="relative min-h-screen bg-bg-main flex">
      {/* Left visual area (hidden on mobile, visible on lg screens) */}
      <div className="hidden lg:flex lg:w-1/2 bg-bg-secondary flex-col items-center justify-center p-12 select-none border-r border-border-custom/40">
        <MessageCircle size={80} className="text-primary opacity-80" />
        <h1 className="text-4xl font-bold text-text-primary mt-6 tracking-tight">
          Peerly
        </h1>
        <p className="text-lg text-text-secondary mt-2 text-center">
          Conversations Without Boundaries.
        </p>

        <div className="mt-12 space-y-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">End-to-end encrypted messaging</span>
          </div>
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">Peer-to-peer architecture</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">No data collection</span>
          </div>
        </div>
      </div>

      {/* Right side form container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 pb-20">
        <div
          className={`w-full max-w-md transition-opacity duration-300 ${isLogin ? 'opacity-100 animate-fade-in' : 'opacity-0'}`}
        >
          {/* Header section */}
          <div className="flex items-center gap-2 mb-8">
            <MessageCircle size={28} className="text-primary" />
            <span className="text-2xl font-bold text-text-primary tracking-tight">
              Peerly
            </span>
          </div>
          <h2 className="text-xl font-semibold text-text-primary">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-text-secondary mt-1 mb-6">
            {isLogin ? 'Sign in to continue' : 'Join Peerly today'}
          </p>

          {/* Form */}
          {isLogin ? (<LoginForm
              isLogin={isLogin}
              setIsLogin={setIsLogin}
              formData={loginFormData}
              setFormData={setLoginFormData}
              errors={loginErrors}
              setErrors={setLoginErrors}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              rememberMe={rememberMe}
              setRememberMe={setRememberMe}
              signIn={async (email: string, password: string) => {
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                return { error };
              }}
              router={router} />
          ) : (

            <SignupForm
              isLogin={isLogin}
              setIsLogin={setIsLogin}
              formData={signupFormData}
              setFormData={setSignupFormData}
              errors={signupErrors}
              setErrors={setSignupErrors}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              signUp={async (email: string, password: string, name: string, username: string) => {
                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                    data: {
                      name,
                      username,
                    },
                  },
                });
                return { error };
              }}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full text-center py-4 pointer-events-none">
        <p className="text-text-secondary/40 text-xs">
          © 2026 Peerly. Conversations Without Boundaries.
        </p>
      </footer>
    </div>
  );
}