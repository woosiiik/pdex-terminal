'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useStore } from '@/stores/useStore';

const EXCHANGES = [
  { name: 'Hyperliquid', color: '#3fb950', enabled: true },
  { name: 'Aster', color: '#a371f7', enabled: false },
  { name: 'dYdX', color: '#6966ff', enabled: false },
] as const;

const MODE_OPTIONS = [
  { value: 'discover' as const, label: '추천' },
  { value: 'position' as const, label: '포지션' },
  { value: 'order' as const, label: '오더' },
];

function isValidWalletAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

function abbreviateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function TopBar() {
  const {
    walletAddress,
    isConnected,
    setWalletAddress,
    setConnected,
    setError,
    error,
    disconnect,
    selectedMode,
    setSelectedMode,
  } = useStore();

  const [inputValue, setInputValue] = useState('');
  const [selectedExchange, setSelectedExchange] = useState(EXCHANGES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleConnect() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (!isValidWalletAddress(trimmed)) {
      setValidationError('유효하지 않은 지갑 주소입니다');
      return;
    }

    setValidationError(null);
    setError(null);
    setWalletAddress(trimmed);
    setConnected(true);
  }

  function handleDisconnect() {
    disconnect();
    setInputValue('');
    setValidationError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleConnect();
    }
  }

  function handleExchangeSelect(exchange: typeof EXCHANGES[number]) {
    if (!exchange.enabled) return;
    setSelectedExchange(exchange);
    setDropdownOpen(false);
  }

  return (
    <header className="flex items-center justify-between px-5 h-14 shrink-0 relative z-20" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2 select-none whitespace-nowrap">
        <Image src="/icon.svg" alt="Calico" width={28} height={28} className="rounded-md" />
        <span className="text-base font-bold text-white">Calico Terminal</span>
      </div>

      {/* Center: Exchange selector + Wallet address (연결된 상태에서만 표시) */}
      {isConnected && (
        <div className="flex items-center gap-3">
          {/* Exchange Selector */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-[20px] cursor-pointer select-none transition-colors"
              style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)' }}
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: selectedExchange.color }}
              />
              <span className="text-[13px] font-semibold" style={{ color: '#A78BFA' }}>
                {selectedExchange.name}
              </span>
              <span className="text-[10px] ml-0.5" style={{ color: '#A78BFA' }}>▾</span>
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50 min-w-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.5)]" style={{ background: 'rgba(15,12,30,0.9)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {EXCHANGES.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    onClick={() => handleExchangeSelect(ex)}
                    className={`flex items-center gap-2 w-full px-3.5 py-2.5 text-[13px] text-left transition-colors ${
                      ex.name === selectedExchange.name
                        ? 'bg-[#a78bfa15]'
                        : 'hover:bg-[#a78bfa11]'
                    } ${!ex.enabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    disabled={!ex.enabled}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ background: ex.color }}
                    />
                    <span className="text-[#c9d1d9]">{ex.name}</span>
                    {!ex.enabled && (
                      <span className="text-[10px] text-[#484f58] ml-auto">Soon</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connected Address + 해제 */}
          {walletAddress && (
            <div className="flex items-center gap-2">
              <div
                className="text-[13px] font-mono px-3 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
              >
                {abbreviateAddress(walletAddress)}
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-[13px] px-3 py-1 rounded-lg cursor-pointer transition-colors bg-transparent"
                style={{ border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                해제
              </button>
            </div>
          )}
        </div>
      )}

      {/* Right: Mode indicator (read-only, 연결된 상태에서만 표시) */}
      {isConnected && selectedMode && (
        <div className="flex items-center gap-5 text-[13px]">
          {MODE_OPTIONS.map((opt) => (
            <span
              key={opt.value}
              className="text-[13px]"
              style={{
                color: selectedMode === opt.value ? '#ffffff' : 'rgba(255,255,255,0.25)',
                fontWeight: selectedMode === opt.value ? 700 : 400,
              }}
            >
              {opt.label}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
