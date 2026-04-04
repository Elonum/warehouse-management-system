import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw, FlipHorizontal, Undo2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const PREVIEW_SIZE = 340;
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

function panBounds(boxW, boxH) {
  const maxX = Math.max(0, (PREVIEW_SIZE - boxW) / 2);
  const maxY = Math.max(0, (PREVIEW_SIZE - boxH) / 2);
  return { minX: -maxX, maxX, minY: -maxY, maxY };
}

function normalizedRotation(deg) {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

function renderTransformedSource(source, iw, ih, rotationDeg, flipH) {
  const rot = normalizedRotation(rotationDeg);
  const cw = rot === 90 || rot === 270 ? ih : iw;
  const ch = rot === 90 || rot === 270 ? iw : ih;
  const tc = document.createElement('canvas');
  tc.width = cw;
  tc.height = ch;
  const tctx = tc.getContext('2d', { alpha: false });
  if (!tctx) return null;
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';
  tctx.translate(cw / 2, ch / 2);
  tctx.rotate((rot * Math.PI) / 180);
  if (flipH) tctx.scale(-1, 1);
  tctx.drawImage(source, -iw / 2, -ih / 2);
  return { canvas: tc, cw, ch };
}

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
  const [rotationDeg, setRotationDeg] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const previewRef = useRef(null);
  const canvasRef = useRef(null);
  const layoutRef = useRef({ boxW: 0, boxH: 0 });

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

  const resetAdjustments = useCallback(() => {
    setFillRatio(1);
    setPanX(0);
    setPanY(0);
    setRotationDeg(0);
    setFlipH(false);
  }, []);

  useEffect(() => {
    setError('');
    setBusy(false);
    setGrabbing(false);
    setImgDims(null);
    resetAdjustments();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit `t` so locale change does not reload blob
  }, [file, open, resetAdjustments]);

  const iw = imgDims?.width ?? 0;
  const ih = imgDims?.height ?? 0;
  const swapAxes = normalizedRotation(rotationDeg) % 180 === 90;
  const ax = swapAxes ? ih : iw;
  const ay = swapAxes ? iw : ih;

  const baseFit = imgDims ? Math.min(PREVIEW_SIZE / iw, PREVIEW_SIZE / ih) : 0;
  const rawW = imgDims ? iw * baseFit * fillRatio : 0;
  const rawH = imgDims ? ih * baseFit * fillRatio : 0;
  const boxW = swapAxes ? rawH : rawW;
  const boxH = swapAxes ? rawW : rawH;
  const offX = imgDims ? (PREVIEW_SIZE - boxW) / 2 : 0;
  const offY = imgDims ? (PREVIEW_SIZE - boxH) / 2 : 0;

  layoutRef.current = { boxW, boxH };

  useEffect(() => {
    if (!imgDims || boxW <= 0 || boxH <= 0) return;
    const { minX, maxX, minY, maxY } = panBounds(boxW, boxH);
    setPanX((x) => clamp(x, minX, maxX));
    setPanY((y) => clamp(y, minY, maxY));
  }, [imgDims, boxW, boxH]);

  const endInteraction = useCallback(() => {
    const s = interactionRef.current;
    s.kind = null;
    s.pointerId = null;
    setGrabbing(false);
  }, []);

  const computeFillFromPointer = useCallback(
    (clientX, clientY, corner) => {
      if (!imgDims || !previewRef.current || !baseFit) return 1;
      const { x: px, y: py } = clientToPreview(clientX, clientY, previewRef.current);
      const cx = PREVIEW_SIZE / 2;
      const cy = PREVIEW_SIZE / 2;
      const denomX = baseFit * ax;
      const denomY = baseFit * ay;
      if (!denomX || !denomY) return 1;

      let fillW;
      let fillH;
      if (corner === 'br') {
        fillW = (2 * Math.max(0, px - cx)) / denomX;
        fillH = (2 * Math.max(0, py - cy)) / denomY;
      } else {
        fillW = (2 * Math.max(0, cx - px)) / denomX;
        fillH = (2 * Math.max(0, cy - py)) / denomY;
      }
      return clamp(Math.min(fillW, fillH), MIN_FILL, 1);
    },
    [imgDims, baseFit, ax, ay],
  );

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
        const { boxW: bw, boxH: bh } = layoutRef.current;
        const { minX, maxX, minY, maxY } = panBounds(bw, bh);
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

  const handleRotate90 = useCallback(() => {
    setRotationDeg((d) => (d + 90) % 360);
    setPanX(0);
    setPanY(0);
  }, []);

  const handleFlipH = useCallback(() => {
    setFlipH((f) => !f);
  }, []);

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

      const fr = clamp(fillRatio, MIN_FILL, 1);
      const px = panX;
      const py = panY;
      const rot = normalizedRotation(rotationDeg);
      const fh = flipH;

      const transformed = renderTransformedSource(img, iw, ih, rot, fh);
      if (!transformed) throw new Error('Transform failed');

      const { canvas: srcCanvas, cw, ch } = transformed;

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
        const fit = Math.min(side / cw, side / ch) * fr;
        const dw = cw * fit;
        const dh = ch * fit;
        const k = side / PREVIEW_SIZE;
        const dx = (side - dw) / 2 + px * k;
        const dy = (side - dh) / 2 + py * k;
        ctx.drawImage(srcCanvas, dx, dy, dw, dh);
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
  const controlsDisabled = !imgDims || busy || !!error;

  const handleClass =
    'absolute z-10 w-4 h-4 rounded-sm bg-white border-2 border-indigo-600 shadow-sm touch-none ' +
    'hover:border-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';

  const ready = imgDims && boxW > 0 && boxH > 0;
  const frameLeft = offX + panX;
  const frameTop = offY + panY;
  const imgShiftLeft = (boxW - rawW) / 2;
  const imgShiftTop = (boxH - rawH) / 2;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError('');
      }}
      className="max-w-[980px]"
    >
      <DialogContent className="w-full p-0 overflow-hidden">
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
                    <div
                      className="absolute pointer-events-none select-none"
                      style={{
                        left: frameLeft,
                        top: frameTop,
                        width: boxW,
                        height: boxH,
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt=""
                        draggable={false}
                        className="absolute select-none max-w-none max-h-none"
                        style={{
                          left: imgShiftLeft,
                          top: imgShiftTop,
                          width: rawW,
                          height: rawH,
                          transform: `rotate(${normalizedRotation(rotationDeg)}deg)${flipH ? ' scaleX(-1)' : ''}`,
                          transformOrigin: 'center center',
                        }}
                      />
                    </div>

                    <div
                      className={cn(
                        'absolute z-[1] border-2 border-indigo-500 rounded-sm touch-none shadow-[0_0_0_1px_rgba(255,255,255,0.35)_inset] pointer-events-auto',
                        grabbing ? 'cursor-grabbing' : 'cursor-grab',
                      )}
                      style={{
                        left: frameLeft,
                        top: frameTop,
                        width: boxW,
                        height: boxH,
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

            <aside className="space-y-5 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  {t('products.images.crop.panelSectionTools')}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={controlsDisabled}
                    onClick={handleRotate90}
                    title={t('products.images.crop.rotate90Title')}
                  >
                    <RotateCw className="h-4 w-4 shrink-0" aria-hidden />
                    {t('products.images.crop.rotate90')}
                  </Button>
                  <Button
                    type="button"
                    variant={flipH ? 'secondary' : 'outline'}
                    size="sm"
                    className="gap-1.5"
                    disabled={controlsDisabled}
                    onClick={handleFlipH}
                    title={t('products.images.crop.flipHTitle')}
                  >
                    <FlipHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                    {t('products.images.crop.flipH')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={controlsDisabled}
                    onClick={resetAdjustments}
                    title={t('products.images.crop.resetTitle')}
                  >
                    <Undo2 className="h-4 w-4 shrink-0" aria-hidden />
                    {t('products.images.crop.reset')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="image-editor-scale" className="text-slate-700 dark:text-slate-200">
                    {t('products.images.crop.scaleLabel')}
                  </Label>
                  <span className="tabular-nums text-slate-500 dark:text-slate-400 text-xs">
                    {Math.round(fillRatio * 100)}%
                  </span>
                </div>
                <input
                  id="image-editor-scale"
                  type="range"
                  min={MIN_FILL}
                  max={1}
                  step={0.01}
                  value={fillRatio}
                  onChange={(e) => setFillRatio(Number(e.target.value))}
                  disabled={controlsDisabled}
                  className="w-full h-2 accent-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <p className="border-t border-slate-200 dark:border-slate-700 pt-4 text-xs text-slate-500 dark:text-slate-400">
                {t('products.images.crop.exportShort', { size: String(outputSize) })}
              </p>
            </aside>
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
