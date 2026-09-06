'use client';

import { QRCodeSVG } from 'qrcode.react';

export interface AssetQrCodeProps {
  url: string;
  size?: number;
}

export function AssetQrCode({ url, size = 200 }: AssetQrCodeProps) {
  return (
    <div data-testid="asset-qr-code">
      <QRCodeSVG
        value={url}
        size={size}
        level="H"
        imageSettings={{
          src: '/aljar-logo.svg',
          height: size * 0.24,
          width: size * 0.24,
          excavate: true,
        }}
      />
      <p style={{ wordBreak: 'break-all', fontSize: '0.75rem', marginTop: '0.5rem' }}>{url}</p>
    </div>
  );
}
