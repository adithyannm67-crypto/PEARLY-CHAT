import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock supabase client module
const mockAuth = {
  getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  signInWithPassword: vi.fn(() => Promise.resolve({ error: null, data: null })),
  signUp: vi.fn(() => Promise.resolve({ error: null, data: null })),
  signOut: vi.fn(() => Promise.resolve({ error: null })),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
  setSession: vi.fn(() => Promise.resolve({ error: null })),
  getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
};

const mockSupabase = {
  auth: mockAuth,
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
};

vi.mock('../src/lib/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('../src/context/AuthProvider', () => ({
  useSupabase: () => ({
    supabase: mockSupabase,
    user: null,
    session: null,
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import LoginPage from '../src/app/auth/login/page';
import SignupPage from '../src/app/auth/signup/page';
import ForgotPasswordPage from '../src/app/auth/forgot-password/page';

const originalFetch = global.fetch;

describe('Authentication - Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders login form', () => {
    render(React.createElement(LoginPage));
    expect(screen.getByPlaceholderText('Username or email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByText('Sign in')).toBeTruthy();
  });

  it('disables submit when fields are empty', () => {
    render(React.createElement(LoginPage));
    const submit = screen.getByRole('button', { name: /sign in/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls signin API with correct credentials', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { session: { access_token: 'at', refresh_token: 'rt' } },
      }),
    });
    mockAuth.setSession.mockResolvedValueOnce({ error: null });

    render(React.createElement(LoginPage));
    fireEvent.change(screen.getByPlaceholderText('Username or email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/auth/signin',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toMatchObject({ identifier: 'test@example.com', password: 'password123' });
  });

  it('shows error for invalid credentials', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid username or password' }),
    });

    render(React.createElement(LoginPage));
    fireEvent.change(screen.getByPlaceholderText('Username or email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid username or password')).toBeTruthy();
    });
  });
});

describe('Authentication - Signup Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders signup form', () => {
    render(React.createElement(SignupPage));
    expect(screen.getByPlaceholderText('Full name')).toBeTruthy();
    expect(screen.getByPlaceholderText('Username')).toBeTruthy();
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy();
    expect(screen.getByPlaceholderText('Password')).toBeTruthy();
    expect(screen.getByPlaceholderText('Confirm password')).toBeTruthy();
    expect(screen.getByText('Create account')).toBeTruthy();
  });

  it('validates password length', async () => {
    render(React.createElement(SignupPage));
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByText('Create account'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  it('validates password confirmation', async () => {
    render(React.createElement(SignupPage));
    fireEvent.change(screen.getByPlaceholderText('Full name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'different' } });
    fireEvent.click(screen.getByText('Create account'));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeTruthy();
    });
  });
});

describe('Authentication - Forgot Password Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form', () => {
    render(React.createElement(ForgotPasswordPage));
    expect(screen.getByPlaceholderText('Email address')).toBeTruthy();
    expect(screen.getByText('Send reset link')).toBeTruthy();
  });

  it('calls resetPasswordForEmail with email', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });

    render(React.createElement(ForgotPasswordPage));
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByText('Send reset link'));

    await waitFor(() => {
      expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object));
    });
  });
});
