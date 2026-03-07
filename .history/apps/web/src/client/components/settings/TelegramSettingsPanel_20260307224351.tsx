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
  lastActiveAt?: string;
  pendingPairingRequest?: PendingPairingRequest;
}

interface PairingData {
  pin: string;
  qrCodeDataUrl: string;
  botLink: string;
}

interface PendingPairingRequest {
  id: string;
  chatId: number;
  userId: number;
  username?: string;
  firstName?: string;
  requestedAt: string;
  expiresAt: string;
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
  const [pendingRequest, setPendingRequest] = useState<PendingPairingRequest | null>(null);
  const [approvingPairing, setApprovingPairing] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const [statusData, tokenExists] = await Promise.all([
        navigatorApp.telegramGetStatus(),
        navigatorApp.telegramHasToken(),
      ]);
      setStatus(statusData);
      setHasToken(tokenExists);
      if (statusData.pendingPairingRequest) {
        setPendingRequest(statusData.pendingPairingRequest);
      }
    } catch (err) {
      console.warn('Failed to get Telegram status:', err);
    }
  }, [navigatorApp]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Listen for real-time pairing requests from main process
  useEffect(() => {
    const cleanup = navigatorApp.onTelegramPairingRequest?.((request) => {
      setPendingRequest(request);
    });
    return () => {
      cleanup?.();
    };
  }, [navigatorApp]);

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
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('telegram.errors.tokenInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveToken = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await navigatorApp.telegramRemoveToken();
      setSuccess(t('telegram.tokenRemoved'));
      setPairingData(null);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove token');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async () => {
    if (!status) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await navigatorApp.telegramSetEnabled(!status.enabled);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle bot');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePairing = async () => {
    setPairingLoading(true);
    setError(null);

    try {
      const data = await navigatorApp.telegramGeneratePairing();
      setPairingData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pairing');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleUnpair = async () => {
    setError(null);
    try {
      await navigatorApp.telegramUnpair();
      setPairingData(null);
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpair');
    }
  };

  const handleApprovePairing = async () => {
    if (!pendingRequest) {
      return;
    }
    setApprovingPairing(true);
    setError(null);
    try {
      await navigatorApp.telegramApprovePairing(pendingRequest.id);
      setPendingRequest(null);
      setPairingData(null);
      setSuccess(t('telegram.pairingApproved'));
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve pairing');
    } finally {
      setApprovingPairing(false);
    }
  };

  const handleDenyPairing = async () => {
    if (!pendingRequest) {
      return;
    }
    setApprovingPairing(true);
    setError(null);
    try {
      await navigatorApp.telegramDenyPairing(pendingRequest.id);
      setPendingRequest(null);
      setSuccess(t('telegram.pairingDenied'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny pairing');
    } finally {
      setApprovingPairing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-muted-foreground">{t('telegram.description')}</p>

      {/* Error / Success messages */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Bot Token Configuration */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium text-foreground">{t('telegram.botToken')}</h4>

        {hasToken ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {status?.botUsername ? (
                <span>
                  {t('telegram.connectedAs')} <strong>@{status.botUsername}</strong>
                </span>
              ) : (
                <span>{t('telegram.tokenConfigured')}</span>
              )}
            </div>
            <button
              onClick={handleRemoveToken}
              disabled={loading}
              className="rounded-md px-3 py-2 text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50 transition-colors"
            >
              {t('telegram.removeToken')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('telegram.botTokenHelp')}</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={t('telegram.tokenPlaceholder')}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveToken();
                  }
                }}
              />
              <button
                onClick={handleSaveToken}
                disabled={loading || !tokenInput.trim()}
                className="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? t('telegram.saving') : t('telegram.saveToken')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Enable/Disable Toggle */}
      {hasToken && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-foreground">{t('telegram.enableBot')}</h4>
              <p className="text-xs text-muted-foreground">{t('telegram.enableBotHelp')}</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                status?.enabled ? 'bg-primary' : 'bg-muted'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  status?.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Status indicator */}
          {status && (
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  status.running ? 'bg-green-500' : 'bg-muted-foreground'
                }`}
              />
              <span className="text-muted-foreground">
                {status.running ? t('telegram.statusRunning') : t('telegram.statusStopped')}
              </span>
            </div>
          )}
        </section>
      )}

      {/* Pairing Section */}
      {hasToken && status?.enabled && (
        <section className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">{t('telegram.pairing')}</h4>

          {status.paired ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      {t('telegram.paired')}
                    </p>
                    {status.pairedUsername && (
                      <p className="text-xs text-muted-foreground">
                        {t('telegram.pairedWith', { username: status.pairedUsername })}
                      </p>
                    )}
                    {status.pairedAt && (
                      <p className="text-xs text-muted-foreground">
                        {t('telegram.pairedSince', {
                          date: new Date(status.pairedAt).toLocaleDateString(),
                        })}
                      </p>
                    )}
                    {status.lastActiveAt && (
                      <p className="text-xs text-muted-foreground">
                        {t('telegram.lastActive', {
                          date: new Date(status.lastActiveAt).toLocaleString(),
                        })}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleUnpair}
                    className="rounded-md px-3 py-1.5 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    {t('telegram.unpair')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{t('telegram.pairingHelp')}</p>

              {pairingData ? (
                <div className="space-y-4">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-4">
                    <img
                      src={pairingData.qrCodeDataUrl}
                      alt="Telegram pairing QR code"
                      className="h-48 w-48"
                    />
                    <p className="text-xs text-gray-600">{t('telegram.scanQR')}</p>
                  </div>

                  {/* PIN display */}
                  <div className="text-center space-y-1">
                    <p className="text-xs text-muted-foreground">{t('telegram.orSendPin')}</p>
                    <code className="text-2xl font-mono font-bold tracking-widest text-foreground">
                      {pairingData.pin}
                    </code>
                  </div>

                  {/* Direct link */}
                  <div className="text-center">
                    <a
                      href={pairingData.botLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {t('telegram.openInTelegram')}
                    </a>
                  </div>

                  <button
                    onClick={handleGeneratePairing}
                    disabled={pairingLoading}
                    className="w-full rounded-md px-3 py-2 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-50 transition-colors"
                  >
                    {t('telegram.regeneratePin')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGeneratePairing}
                  disabled={pairingLoading}
                  className="rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {pairingLoading ? t('telegram.generating') : t('telegram.generatePin')}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* How it works */}
      <section className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
        <h4 className="text-sm font-medium text-foreground">{t('telegram.howItWorks')}</h4>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>{t('telegram.step1')}</li>
          <li>{t('telegram.step2')}</li>
          <li>{t('telegram.step3')}</li>
          <li>{t('telegram.step4')}</li>
          <li>{t('telegram.step5')}</li>
        </ol>
      </section>
    </div>
  );
}
