import { readFile } from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import sharp from 'sharp';

const QR_SIZE_PX = 512;
// Logo width as a fraction of the QR code's width. High error correction
// ('H', ~30% recoverable) comfortably tolerates covering this much of the
// code, but going much larger risks the code failing to scan.
const LOGO_SCALE = 0.22;

let logoSvgPromise: Promise<Buffer> | null = null;

function loadLogoSvg(): Promise<Buffer> {
  if (!logoSvgPromise) {
    logoSvgPromise = readFile(path.join(process.cwd(), 'public', 'aljar-logo.svg'));
  }
  return logoSvgPromise;
}

/**
 * Renders `url` as a PNG QR code with the ALJAR logo centered on top.
 */
export async function generateQrCodePng(url: string): Promise<Buffer> {
  const [qrBuffer, logoSvg] = await Promise.all([
    QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'H',
      width: QR_SIZE_PX,
      margin: 2,
    }),
    loadLogoSvg(),
  ]);

  const logoWidth = Math.round(QR_SIZE_PX * LOGO_SCALE);
  const logoHeight = Math.round(logoWidth * (116 / 288)); // matches the logo SVG's aspect ratio

  const logoPng = await sharp(logoSvg).resize(logoWidth, logoHeight).png().toBuffer();

  return sharp(qrBuffer)
    .composite([{ input: logoPng, gravity: 'center' }])
    .png()
    .toBuffer();
}
