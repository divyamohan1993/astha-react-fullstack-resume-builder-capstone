import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';

interface SharePanelProps {
  shortCode: string;
  baseUrl?: string;
}

export default function SharePanel({
  shortCode,
  baseUrl = window.location.origin,
}: SharePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const fullUrl = `${baseUrl}/bridge/${shortCode}`;
  const embedCode = `<iframe src="${fullUrl}" width="400" height="600" title="Apply via Bridge" loading="lazy"></iframe>`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, fullUrl, { width: 200, margin: 2 }, (err) => {
      if (err) console.error('QR generation failed', err);
    });
  }, [fullUrl]);

  const copyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text in a temp input
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [fullUrl]);

  function downloadQr() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `bridge-${shortCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return (
    <div
      className="rounded-lg border border-green-300 bg-green-50 p-5 space-y-4"
      role="region"
      aria-label="Share criteria"
    >
      <h3 className="text-lg font-semibold text-green-800">Published</h3>

      {/* URL + Copy */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={fullUrl}
          aria-label="Criteria URL"
          className="flex-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm select-all focus:outline-2 focus:outline-blue-500"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={copyUrl}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 focus:outline-2 focus:outline-blue-500"
          aria-live="polite"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center gap-2">
        <canvas ref={canvasRef} aria-label={`QR code for ${fullUrl}`} />
        <button
          type="button"
          onClick={downloadQr}
          className="text-sm text-blue-600 underline hover:text-blue-800 focus:outline-2 focus:outline-blue-500"
        >
          Download QR as PNG
        </button>
      </div>

      {/* Embed Code */}
      <div>
        <label htmlFor="embed-code" className="block text-sm font-medium mb-1">
          Embed code
        </label>
        <textarea
          id="embed-code"
          readOnly
          rows={3}
          value={embedCode}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-xs font-mono focus:outline-2 focus:outline-blue-500"
        />
      </div>
    </div>
  );
}
