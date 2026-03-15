'use client';

import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/stores/useStore';

const EXCHANGES = [
  { name: 'Hyperliquid', color: '#3fb950', enabled: true },
  { name: 'Aster', color: '#a371f7', enabled: false },
  { name: 'dYdX', color: '#6966ff', enabled: false },
] as const;

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
    positionAnalysis,
    disconnect,
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

  const riskScore = positionAnalysis?.ruleEngine?.riskScore?.totalScore ?? null;

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
    <header className="flex items-center justify-between bg-[#161b22] border-b border-[#30363d] px-5 h-14 shrink-0">
      {/* Logo */}
      <div className="text-base font-bold text-[#58a6ff] select-none whitespace-nowrap">
        ⚡ PDEX Terminal
      </div>

      {/* Center: Exchange selector + Wallet input */}
      <div className="flex items-center gap-2">
        {/* Exchange Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-md cursor-pointer select-none"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ background: selectedExchange.color }}
            />
            <span className="text-[#c9d1d9] text-[13px] font-semibold">
              {selectedExchange.name}
            </span>
            <span className="text-[#484f58] text-[10px] ml-0.5">▾</span>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden z-50 min-w-[160px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              {EXCHANGES.map((ex) => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => handleExchangeSelect(ex)}
                  className={`flex items-center gap-2 w-full px-3.5 py-2.5 text-[13px] text-left transition-colors ${
                    ex.name === selectedExchange.name
                      ? 'bg-[#58a6ff15]'
                      : 'hover:bg-[#58a6ff22]'
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

        {/* Wallet Input / Connected Address */}
        {isConnected && walletAddress ? (
          <div className="flex items-center gap-2">
            <div className="bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded-md text-[13px] font-mono">
              {abbreviateAddress(walletAddress)}
            </div>
            <button
              type="button"
              onClick={handleDisconnect}
              className="bg-[#30363d] text-[#c9d1d9] border-none px-3 py-1.5 rounded-md cursor-pointer text-[13px] hover:bg-[#484f58] transition-colors"
            >
              해제
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="지갑 주소 입력 (0x...)"
                className={`bg-[#0d1117] border text-[#c9d1d9] px-3 py-1.5 rounded-md w-[340px] text-[13px] outline-none placeholder:text-[#484f58] transition-colors focus:border-[#58a6ff] ${
                  validationError ? 'border-[#f85149]' : 'border-[#30363d]'
                }`}
              />
              {validationError && (
                <div className="absolute top-full left-0 mt-1 text-[11px] text-[#f85149] whitespace-nowrap">
                  {validationError}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleConnect}
              className={`bg-[#238636] text-white border-none px-4 py-1.5 rounded-md text-[13px] transition-colors ${
                inputValue.trim()
                  ? 'cursor-pointer hover:bg-[#2ea043]'
                  : 'opacity-50 cursor-not-allowed'
              }`}
              disabled={!inputValue.trim()}
            >
              연결
            </button>
          </div>
        )}
      </div>

      {/* Right: Risk Score */}
      <div className="flex items-center gap-6 text-[13px]">
        <span>
          <span className="text-[#8b949e] mr-1">Risk</span>
          {riskScore !== null ? (
            <span
              className={`px-2 py-0.5 rounded text-[13px] font-semibold ${
                riskScore >= 7
                  ? 'bg-[#f8514922] text-[#f85149]'
                  : riskScore >= 4
                    ? 'bg-[#d2992222] text-[#d29922]'
                    : 'bg-[#3fb95022] text-[#3fb950]'
              }`}
            >
              {riskScore}/10
            </span>
          ) : (
            <span className="text-[#484f58]">--</span>
          )}
        </span>
      </div>
    </header>
  );
}
