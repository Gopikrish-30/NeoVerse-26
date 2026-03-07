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
