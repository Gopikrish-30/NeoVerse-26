import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getNavigatorApp } from '@/lib/navigator-app';

interface TelegramStatus {
  enabled: boolean;
  running: boolean;
  paired: boolean;
  botUsername?: string;
  pairedUsername?: string;
  pairedAt?: string;
}

interface PairingData {
  pin: string;
  qrCodeDataUrl: string;
  botLink: string;
}

export function TelegramSettingsPanel() {
  const { t } = useTranslation('settings');
  const navigatorApp = getNavigatorApp();

  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pairingData, setPairingData] = useState<PairingData | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const [statusData, tokenExists] = await Promise.all([
        navigatorApp.telegramGetStatus(),
        navigatorApp.telegramHasToken(),
      ]);
      setStatus(statusData);
      setHasToken(tokenExists);
    } catch (err) {
      console.warn('Failed to get Telegram status:', err);
    }
  }, [navigatorApp]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleSaveToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setError(t('telegram.errors.tokenRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const info = await navigatorApp.telegramSetToken(trimmed);
      setSuccess(t('telegram.tokenSaved', { username: info.username }));
      setTokenInput('');