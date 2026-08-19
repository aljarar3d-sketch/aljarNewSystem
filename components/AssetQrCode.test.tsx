// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssetQrCode } from './AssetQrCode';

describe('AssetQrCode', () => {
  it('renders an SVG QR code and the target URL', () => {
    const { container } = render(<AssetQrCode url="https://example.com/ar/abc123" />);

    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByText('https://example.com/ar/abc123')).toBeInTheDocument();
  });
});
