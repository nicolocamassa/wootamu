'use client';
import { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

type Platform = 'ios' | 'android' | 'other';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

function isInStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in window.navigator && (window.navigator as any).standalone === true);
}

export default function RegisterSW() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem('pwa-dismissed')) return;
    setPlatform(detectPlatform());
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('pwa-dismissed', '1');
    setDismissed(true);
  };

  if (!platform || dismissed || platform === 'other') return null;

  const isIos = platform === 'ios';

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 16,
      right: 16,
      zIndex: 9999,
      background: '#0F0F14',
      border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: 18,
      padding: '14px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
      fontFamily: 'Inter, sans-serif',
      animation: 'pwa-slide-up 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
    }}>
      <style>{`
        @keyframes pwa-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icona */}
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: 'rgba(212,175,55,0.1)',
          border: '1px solid rgba(212,175,55,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isIos
            ? <Share size={18} color="#D4AF37" strokeWidth={1.8} />
            : <Download size={18} color="#D4AF37" strokeWidth={1.8} />
          }
        </div>

        {/* Testo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ededed' }}>
            Installa l'app
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
            {isIos
              ? <>Tocca <strong style={{ color: 'rgba(255,255,255,0.65)' }}>condividi</strong> → "Aggiungi alla schermata Home"</>
              : <>Tocca <strong style={{ color: 'rgba(255,255,255,0.65)' }}>⋮</strong> → "Installa app" o "Aggiungi alla schermata Home"</>
            }
          </p>
        </div>

        {/* Chiudi */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            width: 28, height: 28,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={13} color="rgba(255,255,255,0.4)" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}