
'use client';

import { User, UserRole } from './types';
import { MOCK_USERS } from './store';

class AuthService {
  private currentUser: User | null = null;
  private isAuthenticated: boolean = false;
  private mfaVerified: boolean = false;

  login(email: string): User | null {
    const user = MOCK_USERS.find(u => u.email === email);
    if (user) {
      this.currentUser = user;
      this.isAuthenticated = true;
      // In a real app, we'd issue a JWT here
      return user;
    }
    return null;
  }

  verifyMFA(code: string): boolean {
    if (code === '123456') { // Mock OTP
      this.mfaVerified = true;
      localStorage.setItem('auth_session', JSON.stringify({
        user: this.currentUser,
        timestamp: Date.now()
      }));
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.mfaVerified = false;
    localStorage.removeItem('auth_session');
  }

  getCurrentUser(): User | null {
    if (typeof window !== 'undefined' && !this.currentUser) {
      const session = localStorage.getItem('auth_session');
      if (session) {
        const parsed = JSON.parse(session);
        this.currentUser = parsed.user;
        this.isAuthenticated = true;
        this.mfaVerified = true;
      }
    }
    return this.currentUser;
  }

  hasRole(role: UserRole | UserRole[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  }
}

export const authService = new AuthService();
