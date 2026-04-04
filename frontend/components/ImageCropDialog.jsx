import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PREVIEW_SIZE = 340;
/** Минимальная доля от «вписанного в превью» размера (рамка не схлопывается). */
const MIN_FILL = 0.08;

function clamp(n, min, max) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function safeBaseName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function clientToPreview(clientX, clientY, previewEl) {
  if (!previewEl) return { x: 0, y: 0 };
  const r = previewEl.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

function panBounds(dispW, dispH) {
  const maxX = Math.max(0, (PREVIEW_SIZE - dispW) / 2);
  const maxY = Math.max(0, (PREVIEW_SIZE - dispH) / 2);
  return { minX: -maxX, maxX, minY: -maxY, maxY };
}

/**
 * Рамка = граница изображения. Углы — масштаб (fillRatio), перетаскивание — смещение в превью.
 * Экспорт: полное изображение в квадрате (letterbox), тот же масштаб и пропорциональное смещение.
 */
export default function ImageCropDialog({
  t,
  open,
  onOpenChange,
  file,
  outputSize = 512,
  outputSizes = [512, 384, 256, 128],
  onApply,
}) {
  const [imgUrl, setImgUrl] = useState(null);
  const [imgDims, setImgDims] = useState(null);
  const [fillRatio, setFillRatio] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [grabbing, setGrabbing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const layoutRef = useRef({ dispW: 0, dispH: 0 });

  const interactionRef = useRef({
    kind: null,
    pointerId: null,
    startPanX: 0,
    startPanY: 0,
    startPtrX: 0,
    startPtrY: 0,
  });

  const safeOutputSizes = useMemo(() => {
    const arr = Array.isArray(outputSizes) && outputSizes.length > 0 ? outputSizes : [512, 384, 256, 128];
    const uniq = [...new Set(arr.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 64))];
    if (uniq.length === 0) return [512, 384, 256, 128];
    return uniq.sort((a, b) => b - a);
  }, [outputSizes]);

  useEffect(() => {
    setError('');
    setBusy(false);
    setImgDims(null);
    setFillRatio(1);
    setPanX(0);
    setPanY(0);
    setGrabbing(false);

    if (!file || !open) {
      setImgUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setImgUrl(url);

    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        setError(t('products.images.crop.errorDecode'));
        return;
      }
      setImgDims({ width, height });
    };
    img.onerror = () => {
      setError(t('products.images.crop.errorDecode'));
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, open, t]);

  const baseFit = imgDims ? Math.min(PREVIEW_SIZE / imgDims.width, PREVIEW_SIZE / imgDims.height) : 0;
  const dispW = imgDims ? imgDims.width * baseFit * fillRatio : 0;
  const dispH = imgDims ? imgDims.height * baseFit * fillRatio : 0;
  const offX = imgDims ? (PREVIEW_SIZE - dispW) / 2 : 0;
  const offY = imgDims ? (PREVIEW_SIZE - dispH) / 2 : 0;

  layoutRef.current = { dispW, dispH };

  useEffect(() => {
    if (!imgDims || dispW <= 0 || dispH <= 0) return;
    const { minX, maxX, minY, maxY } = panBounds(dispW, dispH);
    setPanX((x) => clamp(x, minX, maxX));
    setPanY((y) => clamp(y, minY, maxY));
  }, [imgDims, dispW, dispH]);

  const endInteraction = useCallback(() => {
    const s = interactionRef.current;
    s.kind = null;
    s.pointerId = null;
    setGrabbing(false);
  }, []);

  const computeFillFromPointer = useCallback((clientX, clientY, corner) => {
    if (!imgDims || !previewRef.current) return 1;
    const { x: px, y: py } = clientToPreview(clientX, clientY, previewRef.current);
    const cx = PREVIEW_SIZE / 2;
    const cy = PREVIEW_SIZE / 2;
    const { width: iw, height: ih } = imgDims;
    const denomW = iw * baseFit;
    const denomH = ih * baseFit;
    if (!denomW || !denomH) return 1;

    let fillW;
    let fillH;
    if (corner === 'br') {
      fillW = (2 * Math.max(0, px - cx)) / denomW;
      fillH = (2 * Math.max(0, py - cy)) / denomH;
    } else {
      fillW = (2 * Math.max(0, cx - px)) / denomW;
      fillH = (2 * Math.max(0, cy - py)) / denomH;
    }
    return clamp(Math.min(fillW, fillH), MIN_FILL, 1);
  }, [imgDims, baseFit]);

  const onFramePointerDown = useCallback(
    (e) => {
      if (!imgDims || busy || error || !previewRef.current) return;

      const handleEl = e.target.closest?.('[data-scale-handle]');
      const handle = handleEl?.getAttribute('data-scale-handle');

      e.preventDefault();
      e.stopPropagation();

      const ir = interactionRef.current;
      const p0 = clientToPreview(e.clientX, e.clientY, previewRef.current);

      if (handle === 'br' || handle === 'tl') {
        ir.pointerId = e.pointerId;
        ir.kind = handle === 'br' ? 'resize-br' : 'resize-tl';
        setFillRatio(computeFillFromPointer(e.clientX, e.clientY, handle));
      } else {
        ir.pointerId = e.pointerId;
        ir.kind = 'pan';
        ir.startPanX = panX;
        ir.startPanY = panY;
        ir.startPtrX = p0.x;
        ir.startPtrY = p0.y;
        setGrabbing(true);
      }

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [imgDims, busy, error, computeFillFromPointer, panX, panY],
  );

  const onFramePointerMove = useCallback(
    (e) => {
      const ir = interactionRef.current;
      if (!ir.kind || e.pointerId !== ir.pointerId || !previewRef.current) return;

      if (ir.kind === 'pan') {
        const p = clientToPreview(e.clientX, e.clientY, previewRef.current);
        const ddx = p.x - ir.startPtrX;
        const ddy = p.y - ir.startPtrY;
        const { dispW: dw, dispH: dh } = layoutRef.current;
        const { minX, maxX, minY, maxY } = panBounds(dw, dh);
        setPanX(clamp(ir.startPanX + ddx, minX, maxX));
        setPanY(clamp(ir.startPanY + ddy, minY, maxY));
        return;
      }

      if (ir.kind === 'resize-br' || ir.kind === 'resize-tl') {
        if (!imgDims) return;
        const corner = ir.kind === 'resize-br' ? 'br' : 'tl';
        setFillRatio(computeFillFromPointer(e.clientX, e.clientY, corner));
      }
    },
    [imgDims, computeFillFromPointer],
  );

  const onFramePointerUp = useCallback(
    (e) => {
      const ir = interactionRef.current;
      if (e.pointerId !== ir.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      endInteraction();
    },
    [endInteraction],
  );

  const handleApply = async () => {
    if (!imgUrl || !imgDims || !onApply) return;
    setBusy(true);
    setError('');

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
      });

      const iw = imgDims.width;
      const ih = imgDims.height;
      const fr = clamp(fillRatio, MIN_FILL, 1);
      const px = panX;
      const py = panY;

      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Canvas context unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const base = safeBaseName(file?.name || 'image');
      const MAX_BYTES = 9.5 * 1024 * 1024;
      const qualityCandidates = [0.92, 0.82, 0.72, 0.62, 0.52, 0.42, 0.32, 0.25, 0.18];

      const sideCandidates = [...safeOutputSizes]
        .filter((s) => Number.isFinite(s) && s >= 64)
        .sort((a, b) => b - a)
        .filter((s) => s <= outputSize);

      const orderedSides = sideCandidates.length > 0 ? sideCandidates : [outputSize];

      const encode = async (side, quality) => {
        canvas.width = side;
        canvas.height = side;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, side, side);
        const fit = Math.min(side / iw, side / ih) * fr;
        const dw = iw * fit;
        const dh = ih * fit;
        const k = side / PREVIEW_SIZE;
        const dx = (side - dw) / 2 + px * k;
        const dy = (side - dh) / 2 + py * k;
        ctx.drawImage(img, dx, dy, dw, dh);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to convert image'));
            },
            'image/jpeg',
            quality,
          );
        });
        return blob;
      };

      let finalBlob = null;
      let finalSide = orderedSides[0];

      // eslint-disable-next-line no-restricted-syntax
      for (const side of orderedSides) {
        // eslint-disable-next-line no-restricted-syntax
        for (const q of qualityCandidates) {
          // eslint-disable-next-line no-await-in-loop
          const candidate = await encode(side, q);
          if (candidate.size <= MAX_BYTES) {
            finalBlob = candidate;
            finalSide = side;
            break;
          }
        }
        if (finalBlob) break;
      }

      if (!finalBlob) {
        const smallestSide = orderedSides[orderedSides.length - 1] || outputSize;
        finalBlob = await encode(smallestSide, qualityCandidates[qualityCandidates.length - 1]);
        finalSide = smallestSide;
      }

      if (!finalBlob || finalBlob.size > 10 * 1024 * 1024) {
        setError(t('products.images.crop.errorProcess'));
        return;
      }

      const outName = `${base}-fit-${finalSide}.jpg`;
      onApply(new File([finalBlob], outName, { type: 'image/jpeg' }));
    } catch {
      setError(t('products.images.crop.errorProcess'));
    } finally {
      setBusy(false);
    }
  };

  const canApply = !!imgDims && !busy && !error;

  const handleClass =
    'absolute z-10 w-4 h-4 rounded-sm bg-white border-2 border-indigo-600 shadow-sm touch-none ' +
    'hover:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';

  const ready = imgDims && dispW > 0 && dispH > 0;
  const imgLeft = offX + panX;
  const imgTop = offY + panY;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError('');
      }}
    >
      <DialogContent className="mx-auto w-[92vw] max-w-[980px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5">
          <DialogTitle>{t('products.images.crop.title')}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 pt-3">
          {error && (
            <div className="mb-3 p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div
                className="w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                role="application"
                aria-label={t('products.images.crop.ariaCropper')}
              >
                {ready ? (
                  <div
                    ref={previewRef}
                    className="relative bg-slate-200/80 dark:bg-slate-900/40 rounded overflow-hidden"
                    style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                  >
                    <img
                      src={imgUrl}
                      alt=""
                      draggable={false}
                      className="absolute select-none pointer-events-none"
                      style={{
                        left: imgLeft,
                        top: imgTop,
                        width: dispW,
                        height: dispH,
                      }}
                    />

                    <div
                      className={cn(
                        'absolute z-[1] border-2 border-indigo-500 rounded-sm touch-none shadow-[0_0_0_1px_rgba(255,255,255,0.35)_inset] pointer-events-auto',
                        grabbing ? 'cursor-grabbing' : 'cursor-grab',
                      )}
                      style={{
                        left: imgLeft,
                        top: imgTop,
                        width: dispW,
                        height: dispH,
                      }}
                      onPointerDown={onFramePointerDown}
                      onPointerMove={onFramePointerMove}
                      onPointerUp={onFramePointerUp}
                      onPointerCancel={onFramePointerUp}
                    >
                      <button
                        type="button"
                        data-scale-handle="tl"
                        tabIndex={-1}
                        aria-label={t('products.images.crop.resizeHandle')}
                        className={`${handleClass} -translate-x-1/2 -translate-y-1/2 left-0 top-0 cursor-nwse-resize`}
                      />
                      <button
                        type="button"
                        data-scale-handle="br"
                        tabIndex={-1}
                        aria-label={t('products.images.crop.resizeHandle')}
                        className={`${handleClass} translate-x-1/2 translate-y-1/2 right-0 bottom-0 cursor-nwse-resize`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 dark:text-slate-300 py-16">
                    {t('products.images.crop.loading')}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>{t('products.images.crop.scaleFrameHint')}</p>
              <p>{t('products.images.crop.outputHintFit', { size: String(outputSize) })}</p>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <DialogFooter className="pt-5">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleApply} disabled={!canApply}>
              {busy ? t('products.images.crop.processing') : t('products.images.crop.apply')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
