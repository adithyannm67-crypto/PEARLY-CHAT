'use client';

import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldKey = name === 'identifier' ? 'username' : name;
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));

    if (errors[fieldKey] || errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        delete next[name];
        return next;
      });
    }
  };

  const switchMode = (mode: boolean) => {
    setIsLogin(mode);
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

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (isLogin) {
      if (!formData.username.trim()) {
        newErrors.username = 'Username or email is required';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (
        !newErrors.username &&
        (formData.username.trim() !== 'demo' || formData.password !== 'password123')
      ) {
        newErrors.password = 'Invalid credentials. Try demo / password123';
      }
    } else {
      if (!formData.name.trim()) {
        newErrors.name = 'Full name is required';
      }
      if (!formData.username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email';
      }
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    return newErrors;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    if (isLogin) {
      alert(`Welcome back, ${formData.username}!`);
      setTimeout(() => {
        router.push('/');
      }, 1200);
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setIsLogin(true);
        setFormData({
          name: '',
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
        setErrors({});
      }, 1200);
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
            <span className="text-sm text-text-secondary">
              End-to-end encrypted messaging
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              Peer-to-peer architecture
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary shrink-0" />
            <span className="text-sm text-text-secondary">
              No data collection
            </span>
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
          <form onSubmit={handleSubmit} noValidate>
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
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-error text-xs mt-1">
                      {errors.confirmPassword}
                    </p>
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
                  <span className="text-sm text-text-secondary">
                    Remember me
                  </span>
                </label>
                <span className="text-sm text-primary hover:underline cursor-pointer">
                  Forgot password?
                </span>
              </div>
            )}

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
                onClick={() => switchMode(!isLogin)}
                className="text-sm text-primary hover:underline font-medium cursor-pointer"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </div>
          </form>
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
