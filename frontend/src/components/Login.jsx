import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, Eye, EyeOff, Scale, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BASE_URL } from '../lib/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_login_id') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem('remembered_login_id'));
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If remembered ID exists, autofocus password field
    if (localStorage.getItem('remembered_login_id')) {
      const passInput = document.getElementById('loginPassword');
      if (passInput) passInput.focus();
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (rememberMe) {
          localStorage.setItem('remembered_login_id', email.trim());
        } else {
          localStorage.removeItem('remembered_login_id');
        }

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
        throw new Error(data.error || 'Invalid credentials. Please verify your Email/Login ID and password.');
      }
    } catch (err) {
      setError(err.message || 'Incorrect Email ID or password.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#020721] via-[#000E89] to-[#01061C]">
      {/* Dynamic Glowing Ambient Dark Blue Lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top Royal Blue Aura */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-[#001DB5]/35 rounded-full blur-[130px]" />
        {/* Deep Sapphire Dark Blue Glow Left */}
        <div className="absolute top-1/3 -left-28 w-[500px] h-[500px] bg-[#00126E]/50 rounded-full blur-[150px]" />
        {/* Navy Midnight Blue Glow Right */}
        <div className="absolute bottom-5 -right-28 w-[550px] h-[550px] bg-[#000B4D]/60 rounded-full blur-[150px]" />
        {/* Warm Golden Accent Orb in Center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#C9A15E]/10 rounded-full blur-[120px]" />
        
        {/* Fine geometric security grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #7AA7FF 1px, transparent 0)`,
            backgroundSize: '30px 30px'
          }}
        />
      </div>

      {/* Main Majestic Dark Blue Glassmorphic Login Card */}
      <div 
        className={`relative w-full max-w-[460px] rounded-3xl backdrop-blur-2xl bg-gradient-to-b from-[#03114F]/92 via-[#010B3B]/95 to-[#000624]/98 border border-[#2B4DAE]/60 px-7 sm:px-10 pt-9 pb-8 text-center transition-all duration-300 shadow-[0_25px_80px_rgba(0,4,30,0.85),0_0_50px_rgba(0,14,137,0.35),inset_0_1px_1.5px_rgba(122,167,255,0.25)] animate-cover-in ${shake ? 'animate-shake' : ''}`}
      >
        {/* Top Grand Seal / Emblem */}
        <div className="relative mx-auto mb-5 w-24 h-24 flex items-center justify-center">
          {/* Outer glowing animated pulse ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#0022D6]/40 via-[#C9A15E]/30 to-[#00126E]/50 animate-pulse blur-sm" />
          
          {/* Double Gold & Royal Dark Blue Ring Seal */}
          <div className="relative w-20 h-20 rounded-full p-[2px] bg-gradient-to-b from-[#FFF2D6] via-[#C9A15E] to-[#0015A8] shadow-[0_8px_25px_rgba(0,0,0,0.6),0_0_22px_rgba(0,25,180,0.5)]">
            <div className="w-full h-full rounded-full flex flex-col items-center justify-center bg-gradient-to-b from-[#001F99] via-[#000E89] to-[#00052E] border border-[#C9A15E]/60 text-center">
              <div className="flex items-center gap-1 text-[#EBD5A5]">
                <Scale className="w-4 h-4 text-[#FDE047]" />
                <Shield className="w-6 h-6 text-[#C9A15E]" />
              </div>
              <span className="text-[7.5px] font-bold text-[#EBD5A5] uppercase tracking-wider mt-0.5 font-mono">
                LOKAYUKTA
              </span>
            </div>
          </div>
        </div>

        {/* Bilingual Titles & Authority Subtitles */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#001DB5]/30 border border-[#3B66DE]/50 text-[#C9E0FF] text-[11px] font-semibold tracking-wider uppercase mb-2 shadow-inner">
            <Sparkles className="w-3 h-3 text-[#FDE047]" />
            <span>ಕರ್ನಾಟಕ ಸರ್ಕಾರ · Govt. of Karnataka</span>
          </div>

          <h2 className="text-[17px] font-serif font-bold text-[#F5EFE1] tracking-wide leading-tight text-center">
            ಕರ್ನಾಟಕ ಲೋಕಾಯುಕ್ತ
          </h2>
          <h1 className="text-[21px] font-serif font-bold tracking-tight mt-1 bg-gradient-to-r from-[#FFFFFF] via-[#D8E6FF] to-[#99BFFF] bg-clip-text text-transparent">
            17-A Proposals & Status Register
          </h1>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="text-left flex flex-col gap-4">
          {/* Email / Username Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label 
                htmlFor="loginEmail" 
                className="text-[11.5px] font-medium uppercase tracking-wider text-[#A6C2F7] flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-[#FDE047]" />
                Login ID / ಇಮೇಲ್
              </label>
            </div>
            
            <div className="relative rounded-xl bg-[#000936]/90 border border-[#1A337A] focus-within:border-[#FDE047] focus-within:ring-2 focus-within:ring-[#0022D6]/40 transition-all duration-200 shadow-inner">
              <input 
                type="text" 
                id="loginEmail" 
                autoComplete="username" 
                placeholder="Enter Email or Login ID (e.g. admin)" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent px-3.5 py-3 text-[#F5EFE1] text-[14px] placeholder-[#5C78B0] outline-none font-sans"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label 
                htmlFor="loginPassword" 
                className="text-[11.5px] font-medium uppercase tracking-wider text-[#A6C2F7] flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-[#FDE047]" />
                Password / ಪಾಸ್‌ವರ್ಡ್
              </label>
            </div>
            
            <div className="relative rounded-xl bg-[#000936]/90 border border-[#1A337A] focus-within:border-[#FDE047] focus-within:ring-2 focus-within:ring-[#0022D6]/40 transition-all duration-200 shadow-inner flex items-center">
              <input 
                type={showPassword ? 'text' : 'password'} 
                id="loginPassword" 
                autoComplete="current-password" 
                placeholder="Enter your security password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent pl-3.5 pr-10 py-3 text-[#F5EFE1] text-[14px] placeholder-[#5C78B0] outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 text-[#7999D4] hover:text-[#FFF] transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center text-[12px] pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#97B4E8] hover:text-[#FFFFFF] transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#1A337A] bg-[#000936] text-[#0022D6] accent-[#0022D6] focus:ring-0 cursor-pointer"
              />
              <span>Remember ID on this device</span>
            </label>
          </div>
          
          {/* Error Message Alert */}
          {error && (
            <div 
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-[#5E1F27]/70 border border-[#E08585]/50 text-[#FFD6D6] text-[12.5px] leading-snug animate-pop-in shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
            >
              <AlertCircle className="w-4 h-4 text-[#FF7A7A] flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          {/* Grand Dark Blue Sign In Button */}
          <button
            disabled={loading}
            type="submit"
            className="w-full relative group overflow-hidden mt-2 py-3.5 px-6 rounded-xl font-sans font-bold text-[14px] tracking-wider uppercase cursor-pointer text-[#FFFFFF] transition-all duration-200 border border-[#5282FF]/60 shadow-[0_6px_25px_rgba(0,14,137,0.7),0_0_20px_rgba(0,34,214,0.4)] hover:shadow-[0_8px_32px_rgba(0,25,180,0.9),0_0_25px_rgba(82,130,255,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            style={{ 
              background: 'linear-gradient(135deg, #0022D6 0%, #000E89 50%, #000536 100%)' 
            }}
          >
            {/* Subtle button sheen line on hover */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
            
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#FFF] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Portal · ಪ್ರವೇಶಿಸಿ</span>
                  <ArrowRight className="w-4 h-4 text-[#FDE047] transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
