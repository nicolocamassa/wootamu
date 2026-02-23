'use client';
import { useEffect, useState } from 'react';

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

    // Non mostrare se già installata come app
    if (isInStandaloneMode()) return;

    // Non mostrare se già dismissed in questa sessione
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
      bottom: 16,
      left: 16,
      right: 16,
      zIndex: 9999,
      background: '#0F0F14',
      border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.6)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#ededed' }}>
            Installa l'app 📲
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            {isIos
              ? <>Tocca <strong style={{ color: 'rgba(255,255,255,0.7)' }}>condividi</strong> (□↑) in basso, poi <strong style={{ color: 'rgba(255,255,255,0.7)' }}>"Aggiungi alla schermata Home"</strong></>
              : <>Tocca i <strong style={{ color: 'rgba(255,255,255,0.7)' }}>tre puntini</strong> (⋮) in alto, poi <strong style={{ color: 'rgba(255,255,255,0.7)' }}>"Installa app"</strong> o <strong style={{ color: 'rgba(255,255,255,0.7)' }}>"Aggiungi alla schermata Home"</strong></>
            }
          </p>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 18,
            cursor: 'pointer',
            padding: '0 0 0 8px',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}