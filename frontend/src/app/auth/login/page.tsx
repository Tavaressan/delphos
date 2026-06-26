'use client';

import React, { useState } from 'react';
import { useAuth } from '../../../providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('vitor.tavares');
  const [password, setPassword] = useState('secretpassword');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaToken, setMfaToken] = useState('483921');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleCaptchaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCaptchaInput(val);
    setCaptchaVerified(val.toUpperCase() === '7X3P');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaVerified) return;

    // Login using Auth provider
    login(username, 'ROLE_ADMIN');
    
    // Redirect to home page dashboard
    router.push('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 font-body p-4">
      <motion.div
        className="w-full max-w-md bg-white border border-slate-200 rounded shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        
        {/* Header */}
        <div className="bg-primary p-6 text-center text-white flex flex-col items-center gap-3">
          <motion.img
            src="/assets/images/LogoMarca_Alfabra.png"
            alt="Alfabra"
            className="h-14 object-contain brightness-0 invert"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          />
          <motion.span
            className="text-xs uppercase font-mono font-bold tracking-widest text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            Login Unificado
          </motion.span>
        </div>
        
        {/* Form Body */}
        <form onSubmit={handleLoginSubmit} className="p-8 flex flex-col gap-5 text-left">
          <div>
            <label className="label-alfabra">Usuário ou E-mail</label>
            <input 
              type="text" 
              className="input-alfabra" 
              placeholder="vitor.tavares@alfabra.com.br" 
              value={username}
              onChange={(e) => setUsername(e.target.value)} 
            />
          </div>

          <div>
            <label className="label-alfabra">Senha</label>
            <input 
              type="password" 
              className="input-alfabra" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <div className="flex items-center justify-between border-t border-b border-slate-100 py-3">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="mfa" 
                checked={mfaEnabled} 
                onChange={(e) => setMfaEnabled(e.target.checked)} 
                className="accent-primary h-4 w-4 rounded border-slate-200 focus:ring-primary cursor-pointer"
              />
              <label htmlFor="mfa" className="text-xs text-slate-600 font-semibold select-none cursor-pointer">
                Autenticação em dois fatores
              </label>
            </div>
          </div>

          <AnimatePresence>
            {mfaEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-slate-50 border border-slate-200 rounded overflow-hidden"
              >
                <label className="label-alfabra flex items-center justify-between">
                  <span>Código de verificação</span>
                  <span className="text-[9px] text-primary lowercase font-mono">app autenticador</span>
                </label>
                <input 
                  type="text" 
                  className="input-alfabra tracking-widest text-center text-lg font-mono font-bold" 
                  maxLength={6} 
                  placeholder="000 000" 
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CAPTCHA simulation */}
          <div className="border border-slate-200 rounded p-4 flex items-center justify-between bg-slate-50">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">CAPTCHA Requerido</span>
              <span className="text-[10px] text-slate-400 font-mono">Proteção contra bots</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="bg-slate-200 px-3 py-1.5 rounded font-mono font-bold tracking-widest text-slate-700 line-through select-none skew-x-12 skew-y-3">
                7X3P
              </div>
              <input 
                type="text" 
                className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-mono font-bold text-sm focus:outline-none focus:border-primary"
                value={captchaInput}
                onChange={handleCaptchaChange}
                placeholder="VAL"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={!captchaVerified}
            className={`btn-primary w-full py-2.5 rounded font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
              !captchaVerified 
                ? 'opacity-50 cursor-not-allowed bg-slate-300 border-slate-300 text-slate-500' 
                : 'bg-primary hover:bg-primary/95 text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Validar e Entrar</span>
          </button>
          
          {!captchaVerified && captchaInput.trim() !== '' && (
            <div className="flex items-center gap-1.5 justify-center text-danger text-xs font-semibold mt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Código CAPTCHA incorreto</span>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
