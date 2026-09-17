import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://lokayukta.duckdns.org/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('email', data.email);
        localStorage.setItem('role', data.role || 'user');
        if (data.fullName) localStorage.setItem('fullName', data.fullName);
        if (data.userId) localStorage.setItem('userId', data.userId);
        if (data.districtId) localStorage.setItem('districtId', data.districtId);
        if (data.districtName) localStorage.setItem('districtName', data.districtName);
        localStorage.setItem('isHeadOffice', data.isHeadOffice ? '1' : '0');
        onLogin();
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Incorrect Email ID or password.');
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-screen-bg login-grid-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className={`relative w-full max-w-[392px] bg-ink-2 border border-[rgba(201,161,94,0.25)] rounded-l px-[38px] pt-[44px] pb-[34px] shadow-deep text-center animate-cover-in ${shake ? 'animate-shake' : ''}`}>
        
        <div className="seal">
          <Shield className="w-[34px] h-[34px] text-ink" />
        </div>
        
        <h1 className="text-[21px] text-[#F5EFE1] tracking-[0.005em] mb-1.5 leading-snug font-serif font-semibold">
          17-A Proposals & Status Register
        </h1>
        <p className="text-[13px] text-[#9AA5BC] mb-[30px]">
          Sign in to manage petitions and officer records.
        </p>

        <form onSubmit={handleSubmit} className="text-left flex flex-col gap-[18px]">
          <div className="field-underline">
            <label htmlFor="loginEmail">Email ID (Login ID)</label>
            <input 
              type="text" 
              id="loginEmail" 
              autoComplete="username" 
              placeholder="e.g. user@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field-underline">
            <label htmlFor="loginPassword">Password</label>
            <input 
              type="password" 
              id="loginPassword" 
              autoComplete="current-password" 
              placeholder="Enter password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <p
            role="alert"
            aria-hidden={!error}
            className={`min-h-[14px] text-[12.5px] text-[#E08585] text-left transition-opacity duration-200 ${error ? 'opacity-100' : 'opacity-0'}`}
          >
            {error || ' '}
          </p>
          
          <button
            disabled={loading}
            type="submit"
            className="w-full text-[#FBF6EA] border border-brass py-[13px] px-5 rounded-s font-sans font-semibold text-[13px] tracking-[0.06em] uppercase cursor-pointer transition-all duration-150 shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:-translate-y-[1.5px] hover:shadow-[0_10px_24px_rgba(126,42,52,0.4)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ background: 'linear-gradient(180deg, var(--maroon) 0%, var(--maroon-dark) 100%)' }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
