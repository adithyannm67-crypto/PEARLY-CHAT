'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LoginPage() {
  const router = useRouter();
  const { supabase, session, signIn, signUp, signOut } = useSupabase();

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear errors when user starts typing
  const clearError = (field: keyof typeof formData) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldKey = name === 'identifier' ? 'username' : name;
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));

    // Clear relevant errors on input
    if (errors[fieldKey] || errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        delete next[name];
        return next;
      });
    }
  };

  const switchMode = () => {
    setIsLogin((prev) => !prev);
    setErrors({});
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Login submission with Supabase
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { username, email } = formData;

    // Determine credentials: if username provided, we need to look up email
    let emailToUse = email;
    let loginError = '';

    if (!emailToUse && username) {
      // Try to resolve username to email via server endpoint (relative path)
      try {
        const resolveRes = await fetch('/api/auth/resolve-username', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username }),
        });

        if (resolveRes.ok) {
          const data = await resolveRes.json();
          emailToUse = data.email;
        } else {
          loginError = 'Invalid username or email';
        }
      } catch (err) {
        loginError = 'Network error. Please try again.';
      }
    }

    if (loginError) {
      setErrors({ login: loginError });
      setIsLoading(false);
      return;
    }

    // Perform Supabase sign in
    const { error } = await signIn(emailToUse!, formData.password);

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

    // Success - remember me handling and redirect
    if (rememberMe) {
      // The session is managed by Supabase, rememberMe can be used
      // to persist the session beyond the default duration
    }

    router.push('/');
  };

  // Signup submission with Supabase
  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { name, username, email, password, confirmPassword } = formData;

    // Validate password match
    if (password !== confirmPassword) {
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
          // This can happen if sign-up flow expects confirmation
          setErrors({ email: 'Email is already confirmed. Please try logging in.' });
          break;
        default:
          setErrors({ email: error.error || 'Signup failed' });
      }
      return;
    }

    // Signup successful - user may need to check email
    // Auto-login if autoLogin was enabled, otherwise show message
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

  // Handle input changes and clear errors
  const handleInputBlur = (e: ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    // Clear error on blur if user fixed it
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

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
          className={`w-full max-w-md transition-opacity duration-300 ${
            mounted ? 'opacity-100 animate-fade-in' : 'opacity-0'
          }`}
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
<<<<<<< HEAD
          {isLogin ? (
            <LoginForm
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
              router={router}
            />
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
=======
          <form onSubmit={isLogin ? handleLoginSubmit : handleSignupSubmit} noValidate>
            {isLogin ? (
              /* Login Fields */
              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type="text"
                      name="identifier"
                      placeholder="Username or email"
                      value={formData.username}
                      onChange={handleChange}
                      autoComplete="username"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                  </div>
                  {(errors.username || errors.identifier) && (
                    <p className="text-error text-xs mt-1">
                      {errors.username || errors.identifier}
                    </p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-10 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-error text-xs mt-1">{errors.password}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Registration Fields */
              <div className="space-y-4">
                <div>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full name"
                      value={formData.name}
                      onChange={handleChange}
                      autoComplete="name"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-error text-xs mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type="text"
                      name="username"
                      placeholder="Username"
                      value={formData.username}
                      onChange={handleChange}
                      autoComplete="username"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                  </div>
                  {errors.username && (
                    <p className="text-error text-xs mt-1">{errors.username}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={handleChange}
                      autoComplete="email"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-error text-xs mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-10 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-error text-xs mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                      size={18}
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className="w-full bg-surface border border-border-custom rounded-lg pl-10 pr-10 py-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={
                        showConfirmPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-error text-xs mt-1">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            )}

            {/* Below password field for login */}
            {isLogin && (
              <div className="flex items-center justify-between mt-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-primary rounded w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-text-secondary">Remember me</span>
                </label>
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
            )}
            {isLogin && errors.login && <p className="text-error text-sm mt-2 ">{errors.login}</p>}

            {/* Action button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign in' : 'Create account'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* Toggle login / register */}
            <div className="mt-6 text-center">
              <span className="text-sm text-text-secondary">
                {isLogin
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </span>
              <button
                type="button"
                onClick={switchMode}
                className="text-sm text-primary hover:underline font-medium cursor-pointer"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </div>
          </form>
>>>>>>> parent of e0e1dd2 (login signup refactored)
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
