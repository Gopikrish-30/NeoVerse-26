# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

## Security Design

Navigator runs locally on your machine. Your files stay on your device, and you choose which folders it can access.

### API Keys
- API keys are encrypted using AES-256-GCM encryption
- Keys are stored locally and never transmitted to any third party
- Each provider key is encrypted separately

### Data Privacy
- No telemetry data is collected
- No data is sent to any external servers (except your chosen AI provider)
- All processing happens locally on your machine
