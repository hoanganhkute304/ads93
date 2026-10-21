import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Link2, 
  Image as ImageIcon, 
  BarChart3, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  QrCode, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  RotateCw, 
  X,
  Edit2,
  Palette,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Sliders,
  Save,
  ZoomIn,
  MoveVertical,
  MoveHorizontal,
  SunMedium,
  Undo2,
  Grid
} from 'lucide-react';
import { api } from './services/api';
import { LinkItem, ImageBannerItem, AnalyticsData, ClickLog, SourceStat, HourlyStat, BannerFitMode } from './types';
import { QRCodeModal } from './components/QRCodeModal';
import { exportToExcel, exportToPdf } from './utils/exportReport';
import { 
  subscribeLinks, 
  subscribeBanners, 
  subscribeClickLogs, 
  addLinkToFirestore, 
  updateLinkInFirestore, 
  deleteLinkFromFirestore, 
  addBannerToFirestore, 
  updateBannerInFirestore,
  deleteBannerFromFirestore, 
  testConnection 
} from './firebase';

export interface AspectRatioOption {
  id: string;
  label: string;
  ratio: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '16:9', label: '16:9 (Ngang)', ratio: '16 / 9' },
  { id: '1:1', label: '1:1 (Vuông)', ratio: '1 / 1' },
  { id: '9:16', label: '9:16 (Dọc)', ratio: '9 / 16' },
  { id: '4:3', label: '4:3', ratio: '4 / 3' },
  { id: '4:5', label: '4:5', ratio: '4 / 5' },
  { id: '21:9', label: '21:9 (Ultrawide)', ratio: '21 / 9' },
  { id: '2.4:1', label: '2.4:1 (Cinema)', ratio: '2.4 / 1' },
  { id: '2.35:1', label: '2.35:1', ratio: '2.35 / 1' },
  { id: '2:1', label: '2:1', ratio: '2 / 1' },
  { id: '1.91:1', label: '1.91:1 (FB Ads)', ratio: '1.91 / 1' },
  { id: '3:1', label: '3:1 (Header)', ratio: '3 / 1' },
  { id: '4:1', label: '4:1 (Banner)', ratio: '4 / 1' },
  { id: '3:2', label: '3:2', ratio: '3 / 2' },
  { id: '1:2', label: '1:2', ratio: '1 / 2' },
  { id: 'auto', label: 'Gốc (Auto)', ratio: 'auto' },
];

const QUICK_RATIOS = ['16:9', '1:1', '9:16', '4:3', '21:9', '3:1'];

const PRESET_COLORS = [
  '#ffffff', '#f8fafc', '#e2e8f0', '#000000', '#0f172a',
  '#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3', '#ede9fe',
];

const FIT_MODES: { id: BannerFitMode; label: string }[] = [
  { id: 'fit', label: 'Fit' },
  { id: 'fill', label: 'Fill' },
  { id: 'stretch', label: 'Stretch' },
];

/**
 * Hàm đọc JSON an toàn, không bao giờ gây lỗi "Unexpected end of JSON input"
 */
async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!text || !text.trim()) {
    throw new Error(`Máy chủ trả về phản hồi rỗng (HTTP ${res.status}). Hãy khởi động lại lệnh npm run dev.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Phản hồi không đúng định dạng JSON (HTTP ${res.status}).`);
  }
}

/**
 * Bộ nén GIF89a trực tiếp trên trình duyệt (Hỗ trợ Có nền & Không nền cho ảnh động GIF)
 */
function encodeAnimatedGif(
  frames: { data: Uint8ClampedArray; delayMs: number }[],
  width: number,
  height: number
): string {
  const bytes: number[] = [];
  const writeByte = (b: number) => bytes.push(b & 0xff);
  const writeShort = (s: number) => {
    bytes.push(s & 0xff, (s >> 8) & 0xff);
  };
  const writeAscii = (str: string) => {
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i));
  };

  writeAscii('GIF89a');
  writeShort(width);
  writeShort(height);
  writeByte(0xf7);
  writeByte(255);
  writeByte(0);

  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        writeByte(Math.round((r * 255) / 5));
        writeByte(Math.round((g * 255) / 5));
        writeByte(Math.round((b * 255) / 5));
      }
    }
  }
  for (let i = 216; i < 256; i++) {
    const v = Math.round(((i - 216) * 255) / 39);
    writeByte(v);
    writeByte(v);
    writeByte(v);
  }

  writeByte(0x21);
  writeByte(0xff);
  writeByte(0x0b);
  writeAscii('NETSCAPE2.0');
  writeByte(0x03);
  writeByte(0x01);
  writeShort(0);
  writeByte(0x00);

  const totalPixels = width * height;
  const indexedPixels = new Uint8Array(totalPixels);
  const lzwTable = new Int32Array(4096 * 256);

  for (const frame of frames) {
    const rgba = frame.data;
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const a = rgba[idx + 3];
      if (a < 128) {
        indexedPixels[i] = 255;
      } else {
        const r = Math.round((rgba[idx] * 5) / 255);
        const g = Math.round((rgba[idx + 1] * 5) / 255);
        const b = Math.round((rgba[idx + 2] * 5) / 255);
        indexedPixels[i] = r * 36 + g * 6 + b;
      }
    }

    const delayCs = Math.max(2, Math.round((frame.delayMs || 80) / 10));
    writeByte(0x21);
    writeByte(0xf9);
    writeByte(0x04);
    writeByte(0x09);
    writeShort(delayCs);
    writeByte(255);
    writeByte(0x00);

    writeByte(0x2c);
    writeShort(0);
    writeShort(0);
    writeShort(width);
    writeShort(height);
    writeByte(0x00);

    const minCodeSize = 8;
    writeByte(minCodeSize);

    const clearCode = 256;
    const eoiCode = 257;
    let nextCode = 258;
    let codeSize = 9;

    lzwTable.fill(-1);

    let bitBuf = 0;
    let bitCount = 0;
    const subBlock: number[] = [];

    const flushSubBlock = () => {
      if (subBlock.length > 0) {
        writeByte(subBlock.length);
        for (let i = 0; i < subBlock.length; i++) writeByte(subBlock[i]);
        subBlock.length = 0;
      }
    };

    const writeCode = (code: number) => {
      bitBuf |= code << bitCount;
      bitCount += codeSize;
      while (bitCount >= 8) {
        subBlock.push(bitBuf & 0xff);
        if (subBlock.length === 255) flushSubBlock();
        bitBuf >>= 8;
        bitCount -= 8;
      }
    };

    writeCode(clearCode);

    let prefix = indexedPixels[0];
    for (let i = 1; i < totalPixels; i++) {
      const k = indexedPixels[i];
      const tableIdx = (prefix << 8) | k;
      const found = lzwTable[tableIdx];
      if (found !== -1) {
        prefix = found;
      } else {
        writeCode(prefix);
        if (nextCode < 4096) {
          lzwTable[tableIdx] = nextCode;
          if (nextCode === 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
          nextCode++;
        } else {
          writeCode(clearCode);
          lzwTable.fill(-1);
          codeSize = 9;
          nextCode = 258;
        }
        prefix = k;
      }
    }

    writeCode(prefix);
    writeCode(eoiCode);
    if (bitCount > 0) {
      subBlock.push(bitBuf & 0xff);
    }
    flushSubBlock();
    writeByte(0x00);
  }

  writeByte(0x3b);

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunkSize));
  }
  return 'data:image/gif;base64,' + btoa(binary);
}

/**
 * Giải mã các khung hình của ảnh động GIF
 */
async function decodeGifFrames(url: string): Promise<{ canvas: HTMLCanvasElement; delayMs: number }[] | null> {
  if (typeof (window as any).ImageDecoder === 'undefined') return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    const isGifHeader = u8.length > 6 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46;
    if (!isGifHeader && !contentType.includes('gif')) return null;

    const decoder = new (window as any).ImageDecoder({ data: buf, type: 'image/gif' });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const frameCount = track?.frameCount || 0;
    if (frameCount <= 1) {
      decoder.close();
      return null;
    }

    const maxFrames = 32;
    const step = frameCount > maxFrames ? frameCount / maxFrames : 1;
    const decodedFrames: { canvas: HTMLCanvasElement; delayMs: number }[] = [];

    for (let i = 0; i < frameCount; i = Math.round(i + step)) {
      if (i >= frameCount) break;
      const result = await decoder.decode({ frameIndex: i });
      const vf = result.image;
      const w = vf.displayWidth || vf.codedWidth || 500;
      const h = vf.displayHeight || vf.codedHeight || 500;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (ctx) ctx.drawImage(vf, 0, 0, w, h);
      const delayMs = Math.max(30, Math.round(((vf.duration || 80000) / 1000) * step));
      vf.close();
      decodedFrames.push({ canvas: c, delayMs });
    }

    decoder.close();
    return decodedFrames.length > 0 ? decodedFrames : null;
  } catch {
    return null;
  }
}

function computeTargetDimensions(srcW: number, srcH: number, ratioId: string, baseSize = 1200): { width: number; height: number } {
  const ratioObj = ASPECT_RATIOS.find(r => r.id === ratioId);
  if (!ratioObj || ratioObj.ratio === 'auto') {
    const maxDim = Math.max(srcW || 1200, srcH || 630);
    const scale = maxDim > baseSize ? baseSize / maxDim : 1;
    return {
      width: Math.max(1, Math.round((srcW || 1200) * scale)),
      height: Math.max(1, Math.round((srcH || 630) * scale))
    };
  }
  const parts = ratioObj.ratio.split('/').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    const targetRatio = parts[0] / parts[1];
    if (targetRatio >= 1) {
      return {
        width: baseSize,
        height: Math.max(1, Math.round(baseSize / targetRatio))
      };
    } else {
      return {
        width: Math.max(1, Math.round(baseSize * targetRatio)),
        height: baseSize
      };
    }
  }
  return { width: 1200, height: 675 };
}

function drawBannerToCanvas(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement | HTMLCanvasElement,
  params: {
    ratioId: string;
    fitMode: BannerFitMode;
    bgColor: string;
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    offsetX: number;
    offsetY: number;
    scale: number;
    opacity: number;
  },
  baseResolution = 1200
): { width: number; height: number } {
  const srcW = (source as HTMLImageElement).naturalWidth || source.width || 1200;
  const srcH = (source as HTMLImageElement).naturalHeight || source.height || 630;

  const isRotated90 = Math.abs(params.rotation % 180) === 90;
  const effSrcW = isRotated90 ? srcH : srcW;
  const effSrcH = isRotated90 ? srcW : srcH;

  const { width: targetW, height: targetH } = computeTargetDimensions(effSrcW, effSrcH, params.ratioId, baseResolution);

  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { width: targetW, height: targetH };

  ctx.clearRect(0, 0, targetW, targetH);

  // Đổ màu nền nếu chọn "Có nền" (Nếu chọn "transparent" / Không nền thì giữ nguyên trong suốt)
  if (params.bgColor && params.bgColor !== 'transparent') {
    ctx.fillStyle = params.bgColor;
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.save();

  const alpha = params.opacity !== undefined ? Math.max(0.05, Math.min(1, params.opacity)) : 1.0;
  ctx.globalAlpha = alpha;

  const shiftX = ((params.offsetX || 0) / 100) * targetW;
  const shiftY = ((params.offsetY || 0) / 100) * targetH;
  ctx.translate(targetW / 2 + shiftX, targetH / 2 + shiftY);

  if (params.rotation) {
    ctx.rotate((params.rotation * Math.PI) / 180);
  }
  const zoom = params.scale !== undefined ? params.scale : 1.0;
  ctx.scale((params.flipH ? -1 : 1) * zoom, (params.flipV ? -1 : 1) * zoom);

  let drawW = srcW;
  let drawH = srcH;

  if (params.fitMode === 'stretch') {
    drawW = isRotated90 ? targetH : targetW;
    drawH = isRotated90 ? targetW : targetH;
  } else if (params.fitMode === 'fill') {
    const scaleFactor = Math.max(targetW / effSrcW, targetH / effSrcH);
    drawW = srcW * scaleFactor;
    drawH = srcH * scaleFactor;
  } else {
    const scaleFactor = Math.min(targetW / effSrcW, targetH / effSrcH);
    drawW = srcW * scaleFactor;
    drawH = srcH * scaleFactor;
  }

  ctx.drawImage(source, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  return { width: targetW, height: targetH };
}

interface SquareStagePreviewProps {
  srcUrl: string;
  ratioId: string;
  fitMode: BannerFitMode;
  bgColor: string;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
  isProcessing?: boolean;
  onClick?: () => void;
}

const SquareStagePreview: React.FC<SquareStagePreviewProps> = ({
  srcUrl,
  ratioId,
  fitMode,
  bgColor,
  rotation,
  flipH,
  flipV,
  offsetX,
  offsetY,
  scale,
  opacity,
  isProcessing,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);
  const gifFramesRef = useRef<{ canvas: HTMLCanvasElement; delayMs: number }[] | null>(null);
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [canvasDims, setCanvasDims] = useState<{ width: number; height: number }>({ width: 1600, height: 900 });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!srcUrl) {
      setImgStatus('error');
      return;
    }
    let isMounted = true;
    setImgStatus('loading');
    gifFramesRef.current = null;

    const loadUrl =
      (srcUrl.startsWith('http://') || srcUrl.startsWith('https://')) && !srcUrl.startsWith(origin)
        ? `/api/proxy-image?url=${encodeURIComponent(srcUrl)}`
        : srcUrl;

    const isLikelyGif = srcUrl.toLowerCase().includes('.gif') || srcUrl.startsWith('data:image/gif');
    if (isLikelyGif) {
      decodeGifFrames(loadUrl).then(frames => {
        if (!isMounted) return;
        if (frames && frames.length > 1) {
          gifFramesRef.current = frames;
          setImgStatus('loaded');
        }
      });
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (!isMounted) return;
      loadedImgRef.current = img;
      setImgStatus('loaded');
    };

    img.onerror = () => {
      if (loadUrl !== srcUrl) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          if (!isMounted) return;
          loadedImgRef.current = fallbackImg;
          setImgStatus('loaded');
        };
        fallbackImg.onerror = () => {
          if (!isMounted) return;
          setImgStatus('error');
        };
        fallbackImg.src = srcUrl;
      } else {
        if (!isMounted) return;
        setImgStatus('error');
      }
    };

    img.src = loadUrl;
    return () => {
      isMounted = false;
    };
  }, [srcUrl, origin]);

  useEffect(() => {
    if (imgStatus !== 'loaded' || !canvasRef.current) return;

    const params = {
      ratioId,
      fitMode,
      bgColor,
      rotation,
      flipH,
      flipV,
      offsetX,
      offsetY,
      scale,
      opacity
    };

    const frames = gifFramesRef.current;
    if (frames && frames.length > 1) {
      let frameIdx = 0;
      let timerId: any = null;
      let active = true;

      const renderNextFrame = () => {
        if (!active || !canvasRef.current) return;
        const current = frames[frameIdx];
        const dims = drawBannerToCanvas(canvasRef.current, current.canvas, params, 650);
        if (frameIdx === 0) setCanvasDims(dims);
        frameIdx = (frameIdx + 1) % frames.length;
        timerId = setTimeout(renderNextFrame, current.delayMs || 80);
      };

      renderNextFrame();
      return () => {
        active = false;
        if (timerId) clearTimeout(timerId);
      };
    } else if (loadedImgRef.current) {
      const dims = drawBannerToCanvas(canvasRef.current, loadedImgRef.current, params, 850);
      setCanvasDims(dims);
    }
  }, [imgStatus, ratioId, fitMode, bgColor, rotation, flipH, flipV, offsetX, offsetY, scale, opacity]);

  const innerBoxStyle = useMemo((): React.CSSProperties => {
    const w = canvasDims.width || 16;
    const h = canvasDims.height || 9;
    if (w >= h) {
      return {
        width: '100%',
        height: 'auto',
        aspectRatio: `${w} / ${h}`,
        maxHeight: '100%'
      };
    } else {
      return {
        height: '100%',
        width: 'auto',
        aspectRatio: `${w} / ${h}`,
        maxWidth: '100%'
      };
    }
  }, [canvasDims]);

  return (
    <div
      onClick={onClick}
      className="w-full aspect-square relative overflow-hidden flex items-center justify-center p-4 select-none cursor-pointer border-b border-slate-100"
      style={{
        backgroundColor: '#e2e8f0',
        backgroundImage:
          'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
        backgroundSize: '16px 16px',
        backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0'
      }}
      title="Khung Preview 1:1 — Bên trong hiển thị chuẩn tỉ lệ & nền thực tế khi lên web"
    >
      {(imgStatus === 'loading' || isProcessing) && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs z-20 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-700">
          <RotateCw className="w-5 h-5 text-slate-900 animate-spin" />
          <span>{isProcessing ? 'Đang xuất ảnh lên web...' : 'Đang tải ảnh...'}</span>
        </div>
      )}

      {imgStatus === 'error' ? (
        <div className="text-center p-4 bg-white/95 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <ImageIcon className="w-6 h-6 text-rose-400 mx-auto" />
          <div className="text-xs font-semibold text-slate-700">Không tải được ảnh</div>
          <div className="text-[10px] text-slate-400">Hãy bấm "Đổi file" để tải ảnh từ máy lên</div>
        </div>
      ) : (
        <div
          style={innerBoxStyle}
          className="relative flex items-center justify-center shadow-md ring-1 ring-slate-400/60 transition-all duration-150"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>
      )}

      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white font-mono text-[10px] font-semibold pointer-events-none flex items-center gap-1">
        <span>{ratioId}</span>
        <span>•</span>
        <span>{fitMode.toUpperCase()}</span>
        <span>•</span>
        <span>{bgColor === 'transparent' ? 'KHÔNG NỀN' : 'CÓ NỀN'}</span>
      </div>
    </div>
  );
};

interface ModernSliderProps {
  icon: React.ReactNode;
  label: string;
  valueDisplay: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (val: number) => void;
}

const ModernSlider: React.FC<ModernSliderProps> = ({
  icon,
  label,
  valueDisplay,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange
}) => {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 space-y-2 shadow-2xs">
      <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
            {valueDisplay}
          </span>
          {value !== defaultValue && (
            <button
              type="button"
              onClick={() => onChange(defaultValue)}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              title="Đặt lại mặc định"
            >
              <Undo2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Number(Math.max(min, value - step).toFixed(2)))}
          className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 transition"
        >
          -
        </button>

        <div className="relative flex-1 h-4 flex items-center">
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-white shadow-sm pointer-events-none absolute -translate-x-1/2"
            style={{ left: `${percentage}%` }}
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(Number(Math.min(max, value + step).toFixed(2)))}
          className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 transition"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'links' | 'banners' | 'analytics'>('links');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [banners, setBanners] = useState<ImageBannerItem[]>([]);
  const [logs, setLogs] = useState<ClickLog[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // State sửa trực tiếp Tên, Slug (/link/123 -> /link/12345) và Link đích cho từng thẻ Link
  const [editingLinkTitle, setEditingLinkTitle] = useState<Record<string, string>>({});
  const [editingLinkSlug, setEditingLinkSlug] = useState<Record<string, string>>({});
  const [editingDest, setEditingDest] = useState<Record<string, string>>({});
  const [savingDestId, setSavingDestId] = useState<string | null>(null);

  // State tinh chỉnh cục bộ trên từng thẻ Banner
  const [cardRatios, setCardRatios] = useState<Record<string, string>>({});
  const [cardFitModes, setCardFitModes] = useState<Record<string, BannerFitMode>>({});
  const [cardBgColors, setCardBgColors] = useState<Record<string, string>>({});
  const [cardRotations, setCardRotations] = useState<Record<string, number>>({});
  const [cardFlipH, setCardFlipH] = useState<Record<string, boolean>>({});
  const [cardFlipV, setCardFlipV] = useState<Record<string, boolean>>({});
  const [cardOffsetX, setCardOffsetX] = useState<Record<string, number>>({});
  const [cardOffsetY, setCardOffsetY] = useState<Record<string, number>>({});
  const [cardScale, setCardScale] = useState<Record<string, number>>({});
  const [cardOpacity, setCardOpacity] = useState<Record<string, number>>({});

  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null);
  const [openToolsId, setOpenToolsId] = useState<string | null>(null);
  const [processingBannerId, setProcessingBannerId] = useState<string | null>(null);

  const [editingBannerImgId, setEditingBannerImgId] = useState<string | null>(null);
  const [tempBannerImgUrl, setTempBannerImgUrl] = useState<string>('');
  const [tempBannerSlugInline, setTempBannerSlugInline] = useState<string>('');

  const [editingBannerMeta, setEditingBannerMeta] = useState<ImageBannerItem | null>(null);
  const [tempBannerTitle, setTempBannerTitle] = useState('');
  const [tempBannerSlug, setTempBannerSlug] = useState('');

  const [cinemaReviewBanner, setCinemaReviewBanner] = useState<ImageBannerItem | null>(null);

  // Form tạo Link mới
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkSlug, setNewLinkSlug] = useState('');
  const [newLinkDest, setNewLinkDest] = useState('');

  // Form tạo Banner mới
  const [showCreateBanner, setShowCreateBanner] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSlug, setNewBannerSlug] = useState('');
  const [newBannerRawUrl, setNewBannerRawUrl] = useState('');
  const [newBannerRatio, setNewBannerRatio] = useState('16:9');
  const [newBannerFitMode, setNewBannerFitMode] = useState<BannerFitMode>('fit');
  const [newBannerBgColor, setNewBannerBgColor] = useState('#ffffff');
  const [newBannerRotation, setNewBannerRotation] = useState(0);
  const [newBannerFlipH, setNewBannerFlipH] = useState(false);
  const [newBannerFlipV, setNewBannerFlipV] = useState(false);
  const [newBannerOffsetX, setNewBannerOffsetX] = useState(0);
  const [newBannerOffsetY, setNewBannerOffsetY] = useState(0);
  const [newBannerScale, setNewBannerScale] = useState(1.0);
  const [newBannerOpacity, setNewBannerOpacity] = useState(1.0);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);

  const [qrData, setQrData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'link' | 'banner';
    id: string;
    slug: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    const unsubLinks = subscribeLinks(data => {
      setLinks(data);
      const titleMap: Record<string, string> = {};
      const slugMap: Record<string, string> = {};
      const destMap: Record<string, string> = {};
      data.forEach(l => {
        titleMap[l.id] = l.title;
        slugMap[l.id] = l.slug;
        destMap[l.id] = l.destinationUrl;
      });
      setEditingLinkTitle(prev => ({ ...titleMap, ...prev }));
      setEditingLinkSlug(prev => ({ ...slugMap, ...prev }));
      setEditingDest(prev => ({ ...destMap, ...prev }));
    });

    const unsubBanners = subscribeBanners(data => {
      setBanners(data);
      const rMap: Record<string, string> = {};
      const fMap: Record<string, BannerFitMode> = {};
      const cMap: Record<string, string> = {};
      const rotMap: Record<string, number> = {};
      const fhMap: Record<string, boolean> = {};
      const fvMap: Record<string, boolean> = {};
      const oxMap: Record<string, number> = {};
      const oyMap: Record<string, number> = {};
      const scMap: Record<string, number> = {};
      const opMap: Record<string, number> = {};

      data.forEach(b => {
        rMap[b.id] = b.aspectRatio || '16:9';
        fMap[b.id] = b.fitMode || 'fit';
        cMap[b.id] = b.bgColor || '#ffffff';
        rotMap[b.id] = b.rotation || 0;
        fhMap[b.id] = !!b.flipH;
        fvMap[b.id] = !!b.flipV;
        oxMap[b.id] = (b as any).offsetX || 0;
        oyMap[b.id] = b.offsetY || 0;
        scMap[b.id] = b.scale !== undefined ? b.scale : 1.0;
        opMap[b.id] = b.opacity !== undefined ? b.opacity : 1.0;
      });

      setCardRatios(prev => ({ ...rMap, ...prev }));
      setCardFitModes(prev => ({ ...fMap, ...prev }));
      setCardBgColors(prev => ({ ...cMap, ...prev }));
      setCardRotations(prev => ({ ...rotMap, ...prev }));
      setCardFlipH(prev => ({ ...fhMap, ...prev }));
      setCardFlipV(prev => ({ ...fvMap, ...prev }));
      setCardOffsetX(prev => ({ ...oxMap, ...prev }));
      setCardOffsetY(prev => ({ ...oyMap, ...prev }));
      setCardScale(prev => ({ ...scMap, ...prev }));
      setCardOpacity(prev => ({ ...opMap, ...prev }));
    });

    const unsubLogs = subscribeClickLogs(data => {
      setLogs(data);
    });

    return () => {
      unsubLinks();
      unsubBanners();
      unsubLogs();
    };
  }, []);

  const notify = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    notify('Đã sao chép');
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatDestinationUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  const extractCleanSlug = (rawInput: string): string => {
    return rawInput
      .trim()
      .replace(/^https?:\/\/[^/]+\/(link|image|uploads)\//i, '')
      .replace(/^\/?(link|image|uploads)\//i, '')
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
  };

  const uploadRawFileToServer = async (file: File): Promise<string> => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = ev => resolve(ev.target?.result as string);
      reader.onerror = reject;
    });
    reader.readAsDataURL(file);
    const base64Data = await base64Promise;

    const json = await safeFetchJson('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: `raw_${file.name}`, data: base64Data })
    });
    if (!json.success) throw new Error(json.error || 'Lỗi tải ảnh');
    return json.url;
  };

  const renderTransformedBannerToServer = async (
    sourceUrl: string,
    ratioId: string,
    fitMode: BannerFitMode,
    bgColor: string,
    rotation: number,
    flipH: boolean,
    flipV: boolean,
    offsetX: number,
    offsetY: number,
    scale: number,
    opacity: number,
    slugName: string
  ): Promise<{ url: string; dimensions: string }> => {
    const loadUrl =
      (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) && !sourceUrl.startsWith(origin)
        ? `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`
        : sourceUrl;

    const params = {
      ratioId,
      fitMode,
      bgColor,
      rotation,
      flipH,
      flipV,
      offsetX,
      offsetY,
      scale,
      opacity
    };

    const isLikelyGif = sourceUrl.toLowerCase().includes('.gif') || sourceUrl.startsWith('data:image/gif');
    if (isLikelyGif) {
      const gifFrames = await decodeGifFrames(loadUrl);
      if (gifFrames && gifFrames.length > 1) {
        try {
          const workCanvas = document.createElement('canvas');
          const encodedFrames: { data: Uint8ClampedArray; delayMs: number }[] = [];
          let outW = 550;
          let outH = 550;

          for (const gf of gifFrames) {
            const dims = drawBannerToCanvas(workCanvas, gf.canvas, params, 550);
            outW = dims.width;
            outH = dims.height;
            const ctx = workCanvas.getContext('2d');
            if (ctx) {
              const imgData = ctx.getImageData(0, 0, outW, outH);
              encodedFrames.push({ data: imgData.data, delayMs: gf.delayMs });
            }
          }

          if (encodedFrames.length > 0) {
            const gifBase64 = encodeAnimatedGif(encodedFrames, outW, outH);
            const json = await safeFetchJson('/api/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename: `${slugName || 'banner'}.gif`,
                data: gifBase64
              })
            });
            if (json.success && json.url) {
              return { url: json.url, dimensions: `${outW}x${outH}` };
            }
          }
        } catch (err) {
          console.error('Animated GIF encode fallback:', err);
        }
      }
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const { width, height } = drawBannerToCanvas(canvas, img, params, 1200);

          const base64Data = canvas.toDataURL('image/png');
          const json = await safeFetchJson('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `${slugName || 'banner'}_${ratioId.replace(':', 'x')}_${fitMode}.png`,
              data: base64Data
            })
          });
          if (!json.success || !json.url) throw new Error(json.error || 'Upload error');

          resolve({
            url: json.url,
            dimensions: `${width}x${height}`
          });
        } catch {
          resolve({ url: sourceUrl, dimensions: '1200x630' });
        }
      };

      img.onerror = () => {
        resolve({ url: sourceUrl, dimensions: '1200x630' });
      };

      img.src = loadUrl;
    });
  };

  const hasUnsavedChanges = (b: ImageBannerItem): boolean => {
    const r = cardRatios[b.id] ?? (b.aspectRatio || '16:9');
    const f = cardFitModes[b.id] ?? (b.fitMode || 'fit');
    const c = cardBgColors[b.id] ?? (b.bgColor || '#ffffff');
    const rot = cardRotations[b.id] ?? (b.rotation || 0);
    const fh = cardFlipH[b.id] ?? !!b.flipH;
    const fv = cardFlipV[b.id] ?? !!b.flipV;
    const ox = cardOffsetX[b.id] ?? ((b as any).offsetX || 0);
    const oy = cardOffsetY[b.id] ?? (b.offsetY || 0);
    const sc = cardScale[b.id] ?? (b.scale ?? 1.0);
    const op = cardOpacity[b.id] ?? (b.opacity ?? 1.0);

    return (
      r !== (b.aspectRatio || '16:9') ||
      f !== (b.fitMode || 'fit') ||
      c.toLowerCase() !== (b.bgColor || '#ffffff').toLowerCase() ||
      rot !== (b.rotation || 0) ||
      fh !== !!b.flipH ||
      fv !== !!b.flipV ||
      ox !== ((b as any).offsetX || 0) ||
      oy !== (b.offsetY || 0) ||
      sc !== (b.scale ?? 1.0) ||
      op !== (b.opacity ?? 1.0)
    );
  };

  const resetCardChanges = (b: ImageBannerItem) => {
    setCardRatios(prev => ({ ...prev, [b.id]: b.aspectRatio || '16:9' }));
    setCardFitModes(prev => ({ ...prev, [b.id]: b.fitMode || 'fit' }));
    setCardBgColors(prev => ({ ...prev, [b.id]: b.bgColor || '#ffffff' }));
    setCardRotations(prev => ({ ...prev, [b.id]: b.rotation || 0 }));
    setCardFlipH(prev => ({ ...prev, [b.id]: !!b.flipH }));
    setCardFlipV(prev => ({ ...prev, [b.id]: !!b.flipV }));
    setCardOffsetX(prev => ({ ...prev, [b.id]: (b as any).offsetX || 0 }));
    setCardOffsetY(prev => ({ ...prev, [b.id]: b.offsetY || 0 }));
    setCardScale(prev => ({ ...prev, [b.id]: b.scale ?? 1.0 }));
    setCardOpacity(prev => ({ ...prev, [b.id]: b.opacity ?? 1.0 }));
  };

  /**
   * Lưu thay đổi của Link (Cho phép đổi cả Tên, đường dẫn /link/123 -> /link/12345 và Link đích)
   */
  const handleSaveLinkChanges = async (link: LinkItem) => {
    const rawTitle = (editingLinkTitle[link.id] !== undefined ? editingLinkTitle[link.id] : link.title).trim();
    const rawSlug = editingLinkSlug[link.id] !== undefined ? editingLinkSlug[link.id] : link.slug;
    const cleanSlug = extractCleanSlug(rawSlug);
    const rawTarget = (editingDest[link.id] !== undefined ? editingDest[link.id] : link.destinationUrl).trim();

    if (!cleanSlug || !rawTarget) {
      notify('Vui lòng nhập đủ mã rút gọn (slug) và link đích');
      return;
    }

    const conflict = links.find(l => l.id !== link.id && l.slug.toLowerCase() === cleanSlug);
    if (conflict) {
      notify(`Đường dẫn /link/${cleanSlug} đã tồn tại!`);
      return;
    }

    const newTarget = formatDestinationUrl(rawTarget);
    const newTitle = rawTitle || cleanSlug;

    try {
      setSavingDestId(link.id);
      const fullLinkPayload: Partial<LinkItem> = {
        title: newTitle,
        slug: cleanSlug,
        destinationUrl: newTarget,
        isActive: link.isActive !== false
      };

      await updateLinkInFirestore(link.id, fullLinkPayload);
      await api.updateLink(link.id, { id: link.id, ...fullLinkPayload }).catch(() => {});

      // Nếu người dùng đổi từ /link/123 sang /link/12345, đăng ký luôn vào backend db
      if (cleanSlug !== link.slug) {
        await api.createLink({
          title: newTitle,
          slug: cleanSlug,
          destinationUrl: newTarget
        }).catch(() => {});
      }

      setEditingLinkTitle(prev => ({ ...prev, [link.id]: newTitle }));
      setEditingLinkSlug(prev => ({ ...prev, [link.id]: cleanSlug }));
      setEditingDest(prev => ({ ...prev, [link.id]: newTarget }));
      notify(`Đã lưu /link/${cleanSlug}`);
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể lưu link'));
    } finally {
      setSavingDestId(null);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = extractCleanSlug(newLinkSlug);
    if (!cleanSlug || !newLinkDest.trim()) return;
    const cleanDest = formatDestinationUrl(newLinkDest);

    try {
      await addLinkToFirestore({
        title: newLinkTitle.trim() || cleanSlug,
        slug: cleanSlug,
        destinationUrl: cleanDest,
        tags: []
      });
      await api.createLink({
        title: newLinkTitle.trim() || cleanSlug,
        slug: cleanSlug,
        destinationUrl: cleanDest
      }).catch(() => {});

      notify(`Đã tạo /link/${cleanSlug}`);
      setShowCreateLink(false);
      setNewLinkTitle('');
      setNewLinkSlug('');
      setNewLinkDest('');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể tạo link'));
    }
  };

  const handleUploadNewBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const uploadedRawUrl = await uploadRawFileToServer(file);
      setNewBannerRawUrl(uploadedRawUrl);
      if (!newBannerTitle) setNewBannerTitle(file.name.replace(/\.[^/.]+$/, ''));
      if (!newBannerSlug) setNewBannerSlug(file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
      notify('Đã tải ảnh lên');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể tải ảnh'));
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = extractCleanSlug(newBannerSlug);
    if (!cleanSlug || !newBannerRawUrl.trim()) return;

    try {
      setIsCreatingBanner(true);
      const rawUrl = newBannerRawUrl.trim();

      const rendered = await renderTransformedBannerToServer(
        rawUrl,
        newBannerRatio,
        newBannerFitMode,
        newBannerBgColor,
        newBannerRotation,
        newBannerFlipH,
        newBannerFlipV,
        newBannerOffsetX,
        newBannerOffsetY,
        newBannerScale,
        newBannerOpacity,
        cleanSlug
      );

      await addBannerToFirestore({
        title: newBannerTitle.trim() || cleanSlug,
        slug: cleanSlug,
        imageUrl: rendered.url,
        originalImageUrl: rawUrl,
        aspectRatio: newBannerRatio,
        fitMode: newBannerFitMode,
        bgColor: newBannerBgColor,
        rotation: newBannerRotation,
        flipH: newBannerFlipH,
        flipV: newBannerFlipV,
        offsetY: newBannerOffsetY,
        scale: newBannerScale,
        opacity: newBannerOpacity,
        dimensions: rendered.dimensions
      });

      await api.createImage({
        title: newBannerTitle.trim() || cleanSlug,
        slug: cleanSlug,
        imageUrl: rendered.url,
        dimensions: rendered.dimensions
      }).catch(() => {});

      notify(`Đã lưu /image/${cleanSlug}`);
      setShowCreateBanner(false);
      setNewBannerTitle('');
      setNewBannerSlug('');
      setNewBannerRawUrl('');
      setNewBannerRatio('16:9');
      setNewBannerFitMode('fit');
      setNewBannerBgColor('#ffffff');
      setNewBannerRotation(0);
      setNewBannerFlipH(false);
      setNewBannerFlipV(false);
      setNewBannerOffsetX(0);
      setNewBannerOffsetY(0);
      setNewBannerScale(1.0);
      setNewBannerOpacity(1.0);
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể lưu banner'));
    } finally {
      setIsCreatingBanner(false);
    }
  };

  const handleSaveBannerTransform = async (banner: ImageBannerItem, overrideRawUrl?: string, overrideSlug?: string) => {
    const sourceRawUrl = (overrideRawUrl || banner.originalImageUrl || banner.imageUrl || '').trim();
    if (!sourceRawUrl) return;

    const finalSlug = overrideSlug ? extractCleanSlug(overrideSlug) : banner.slug;
    const nextRatio = cardRatios[banner.id] ?? (banner.aspectRatio || '16:9');
    const nextFitMode = cardFitModes[banner.id] ?? (banner.fitMode || 'fit');
    const nextBgColor = cardBgColors[banner.id] ?? (banner.bgColor || '#ffffff');
    const nextRotation = cardRotations[banner.id] ?? (banner.rotation || 0);
    const nextFlipH = cardFlipH[banner.id] ?? !!banner.flipH;
    const nextFlipV = cardFlipV[banner.id] ?? !!banner.flipV;
    const nextOffsetX = cardOffsetX[banner.id] ?? ((banner as any).offsetX || 0);
    const nextOffsetY = cardOffsetY[banner.id] ?? (banner.offsetY || 0);
    const nextScale = cardScale[banner.id] ?? (banner.scale ?? 1.0);
    const nextOpacity = cardOpacity[banner.id] ?? (banner.opacity ?? 1.0);

    try {
      setProcessingBannerId(banner.id);
      const rendered = await renderTransformedBannerToServer(
        sourceRawUrl,
        nextRatio,
        nextFitMode,
        nextBgColor,
        nextRotation,
        nextFlipH,
        nextFlipV,
        nextOffsetX,
        nextOffsetY,
        nextScale,
        nextOpacity,
        finalSlug
      );

      const fullUpdates: Partial<ImageBannerItem> = {
        title: banner.title,
        slug: finalSlug,
        imageUrl: rendered.url,
        originalImageUrl: sourceRawUrl,
        aspectRatio: nextRatio,
        fitMode: nextFitMode,
        bgColor: nextBgColor,
        rotation: nextRotation,
        flipH: nextFlipH,
        flipV: nextFlipV,
        offsetY: nextOffsetY,
        scale: nextScale,
        opacity: nextOpacity,
        dimensions: rendered.dimensions
      };

      await updateBannerInFirestore(banner.id, fullUpdates);
      await api.updateImage(banner.id, fullUpdates).catch(() => {});
      if (finalSlug !== banner.slug) {
        await api.createImage({
          title: banner.title,
          slug: finalSlug,
          imageUrl: rendered.url,
          dimensions: rendered.dimensions
        }).catch(() => {});
      }

      notify(`Đã lưu & cập nhật /image/${finalSlug}`);
    } catch (err: any) {
      notify('Lỗi xử lý ảnh: ' + (err.message || 'Không thể cập nhật'));
    } finally {
      setProcessingBannerId(null);
    }
  };

  /**
   * Đổi tên & Đường dẫn ảnh (/image/123 -> /image/12345) bằng Firestore + API chuẩn (Không cần route phụ, không mất ảnh)
   */
  const handleSaveBannerMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBannerMeta) return;
    const cleanSlug = extractCleanSlug(tempBannerSlug);
    if (!cleanSlug) return;

    const conflict = banners.find(b => b.id !== editingBannerMeta.id && b.slug.toLowerCase() === cleanSlug);
    if (conflict) {
      notify(`Đường dẫn /image/${cleanSlug} đã tồn tại!`);
      return;
    }

    try {
      const fullPayload: Partial<ImageBannerItem> = {
        title: tempBannerTitle.trim() || cleanSlug,
        slug: cleanSlug,
        imageUrl: editingBannerMeta.imageUrl,
        originalImageUrl: editingBannerMeta.originalImageUrl || editingBannerMeta.imageUrl,
        aspectRatio: editingBannerMeta.aspectRatio || '16:9',
        fitMode: editingBannerMeta.fitMode || 'fit',
        bgColor: editingBannerMeta.bgColor || '#ffffff',
        rotation: editingBannerMeta.rotation || 0,
        flipH: !!editingBannerMeta.flipH,
        flipV: !!editingBannerMeta.flipV,
        offsetY: editingBannerMeta.offsetY || 0,
        scale: editingBannerMeta.scale ?? 1.0,
        opacity: editingBannerMeta.opacity ?? 1.0,
        dimensions: editingBannerMeta.dimensions || '1200x675'
      };

      await updateBannerInFirestore(editingBannerMeta.id, fullPayload);
      await api.updateImage(editingBannerMeta.id, fullPayload).catch(() => {});
      if (cleanSlug !== editingBannerMeta.slug) {
        await api.createImage({
          title: fullPayload.title!,
          slug: cleanSlug,
          imageUrl: fullPayload.imageUrl!,
          dimensions: fullPayload.dimensions
        }).catch(() => {});
      }

      notify(`Đã đổi đường dẫn thành /image/${cleanSlug}`);
      setEditingBannerMeta(null);
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể cập nhật'));
    }
  };

  const handleReplaceBannerFile = async (banner: ImageBannerItem, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setProcessingBannerId(banner.id);
      const uploadedRawUrl = await uploadRawFileToServer(file);
      await handleSaveBannerTransform(banner, uploadedRawUrl);
      setEditingBannerImgId(null);
    } catch (err: any) {
      notify('Lỗi tải ảnh: ' + (err.message || 'Không thể cập nhật'));
      setProcessingBannerId(null);
    } finally {
      e.target.value = '';
    }
  };

  /**
   * Lưu hộp thoại "Đổi link" bên dưới thẻ Banner:
   * - Cho phép đổi mã đường dẫn `/image/123` -> `/image/12345` (hoặc gõ `http://localhost:3000/uploads/12345`) mà không mất ảnh!
   * - Hoặc dán link ảnh từ trang web ngoài nếu muốn thay ảnh mới.
   */
  const handleSaveBannerInlineLink = async (banner: ImageBannerItem) => {
    const cleanSlug = extractCleanSlug(tempBannerSlugInline || banner.slug);
    if (!cleanSlug) {
      notify('Mã đường dẫn (slug) không hợp lệ');
      return;
    }

    const conflict = banners.find(b => b.id !== banner.id && b.slug.toLowerCase() === cleanSlug);
    if (conflict) {
      notify(`Đường dẫn /image/${cleanSlug} đã được dùng cho banner khác!`);
      return;
    }

    const rawImgInput = tempBannerImgUrl.trim();
    const isExternalNewImage =
      rawImgInput &&
      /^https?:\/\//i.test(rawImgInput) &&
      !rawImgInput.startsWith(origin) &&
      !rawImgInput.includes('localhost:') &&
      rawImgInput !== banner.imageUrl &&
      rawImgInput !== banner.originalImageUrl;

    if (isExternalNewImage) {
      await handleSaveBannerTransform(banner, rawImgInput, cleanSlug);
      setEditingBannerImgId(null);
      return;
    }

    // Nếu người dùng đổi tên đường dẫn nội bộ (VD: /uploads/123 -> /uploads/12345 hoặc /image/123 -> /image/12345)
    try {
      setProcessingBannerId(banner.id);
      const fullPayload: Partial<ImageBannerItem> = {
        title: banner.title,
        slug: cleanSlug,
        imageUrl: banner.imageUrl,
        originalImageUrl: banner.originalImageUrl || banner.imageUrl,
        aspectRatio: cardRatios[banner.id] ?? (banner.aspectRatio || '16:9'),
        fitMode: cardFitModes[banner.id] ?? (banner.fitMode || 'fit'),
        bgColor: cardBgColors[banner.id] ?? (banner.bgColor || '#ffffff'),
        rotation: cardRotations[banner.id] ?? (banner.rotation || 0),
        flipH: cardFlipH[banner.id] ?? !!banner.flipH,
        flipV: cardFlipV[banner.id] ?? !!banner.flipV,
        offsetY: cardOffsetY[banner.id] ?? (banner.offsetY || 0),
        scale: cardScale[banner.id] ?? (banner.scale ?? 1.0),
        opacity: cardOpacity[banner.id] ?? (banner.opacity ?? 1.0),
        dimensions: banner.dimensions || '1200x675'
      };

      await updateBannerInFirestore(banner.id, fullPayload);
      await api.updateImage(banner.id, fullPayload).catch(() => {});
      if (cleanSlug !== banner.slug) {
        await api.createImage({
          title: banner.title,
          slug: cleanSlug,
          imageUrl: banner.imageUrl,
          dimensions: banner.dimensions
        }).catch(() => {});
      }

      setEditingBannerImgId(null);
      notify(`Đã đổi đường dẫn thành /image/${cleanSlug}`);
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể đổi đường dẫn'));
    } finally {
      setProcessingBannerId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id, slug } = deleteModal;
    setIsDeleting(true);
    try {
      if (type === 'link') {
        setLinks(prev => prev.filter(l => l.id !== id && l.slug !== slug));
        await deleteLinkFromFirestore(id, slug);
        await api.deleteLink(id).catch(() => {});
        notify(`Đã xóa /link/${slug}`);
      } else {
        setBanners(prev => prev.filter(b => b.id !== id && b.slug !== slug));
        if (cinemaReviewBanner && (cinemaReviewBanner.id === id || cinemaReviewBanner.slug === slug)) {
          setCinemaReviewBanner(null);
        }
        await deleteBannerFromFirestore(id, slug);
        await api.deleteImage(id).catch(() => {});
        notify(`Đã xóa /image/${slug}`);
      }
      setDeleteModal(null);
    } catch (err: any) {
      notify(`Lỗi: ${err.message || 'Không thể xóa'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const analyticsData: AnalyticsData = useMemo(() => {
    const totalClicks = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    const uniqueClicks = links.reduce((sum, l) => sum + (l.uniqueClicks || 0), 0);
    const totalBannerViews = banners.reduce((sum, b) => sum + (b.viewsCount || 0), 0);
    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

    const clicks24h = logs.filter(l => new Date(l.timestamp).getTime() >= oneDayAgo).length;
    const clicks7d = logs.filter(l => new Date(l.timestamp).getTime() >= sevenDaysAgo).length;

    const sourceCount: Record<string, { count: number; unique: number }> = {};
    for (const log of logs) {
      const src = log.source || 'Direct';
      if (!sourceCount[src]) sourceCount[src] = { count: 0, unique: 0 };
      sourceCount[src].count += 1;
      if (log.isUnique) sourceCount[src].unique += 1;
    }

    const sources: SourceStat[] = Object.entries(sourceCount)
      .map(([name, d]) => ({
        name,
        count: d.count,
        unique: d.unique,
        percentage: logs.length > 0 ? Math.round((d.count / logs.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const devices: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0, Other: 0 };
    for (const log of logs) {
      const dev = log.device || 'Other';
      devices[dev] = (devices[dev] || 0) + 1;
    }

    const hourlyMap: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600 * 1000);
      hourlyMap[`${d.getHours().toString().padStart(2, '0')}:00`] = 0;
    }
    for (const log of logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime >= oneDayAgo) {
        const d = new Date(logTime);
        const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyMap[hourStr] !== undefined) hourlyMap[hourStr] += 1;
      }
    }
    const hourlyTrend: HourlyStat[] = Object.entries(hourlyMap).map(([hour, count]) => ({ hour, count }));

    return {
      totalClicks,
      uniqueClicks,
      totalBannerViews,
      clicks24h,
      clicks7d,
      activeLinksCount: links.filter(l => l.isActive).length,
      activeBannersCount: banners.filter(b => b.isActive).length,
      sources,
      devices,
      hourlyTrend
    };
  }, [links, banners, logs]);

  const filteredLinks = links.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBanners = banners.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white font-medium px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-white text-xs">
              93
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">ADS93</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'links'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link ({links.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('banners')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'banners'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Banner ({banners.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportToExcel(analyticsData, links, banners, logs)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition"
              title="Xuất Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => exportToPdf(analyticsData, links, banners, logs)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition"
              title="Xuất PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 space-y-5">
        {activeTab !== 'analytics' && (
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition"
              />
            </div>

            {activeTab === 'links' ? (
              <button
                onClick={() => setShowCreateLink(!showCreateLink)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Link</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCreateBanner(!showCreateBanner)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Banner</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 1: LINKS (Cho phép sửa trực tiếp Tên, /link/123 -> /link/12345 và Link đích) */}
        {activeTab === 'links' && (
          <div className="space-y-3">
            {showCreateLink && (
              <form onSubmit={handleCreateLink} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tên</label>
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={e => setNewLinkTitle(e.target.value)}
                      placeholder="VD: TikTok Bio"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Đường dẫn rút gọn (Slug) *</label>
                    <div className="flex items-center">
                      <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-2 text-slate-500 font-mono text-[11px]">
                        /link/
                      </span>
                      <input
                        type="text"
                        value={newLinkSlug}
                        onChange={e => setNewLinkSlug(e.target.value)}
                        placeholder="123"
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-2.5 py-2 text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Link đích *</label>
                    <input
                      type="text"
                      value={newLinkDest}
                      onChange={e => setNewLinkDest(e.target.value)}
                      placeholder="https://..."
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateLink(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            )}

            {filteredLinks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/80">
                Chưa có link nào.
              </div>
            ) : (
              filteredLinks.map(link => {
                const currentTitle = editingLinkTitle[link.id] !== undefined ? editingLinkTitle[link.id] : link.title;
                const currentSlug = editingLinkSlug[link.id] !== undefined ? editingLinkSlug[link.id] : link.slug;
                const currentDest = editingDest[link.id] !== undefined ? editingDest[link.id] : link.destinationUrl;

                const shortUrl = `${origin}/link/${link.slug}`;
                const hasChanged =
                  currentTitle.trim() !== link.title.trim() ||
                  extractCleanSlug(currentSlug) !== link.slug.trim() ||
                  currentDest.trim() !== link.destinationUrl.trim();

                return (
                  <div
                    key={link.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition shadow-2xs space-y-3"
                  >
                    {/* Dòng trên: Tên link + Thống kê click + Các nút thao tác */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <input
                          type="text"
                          value={currentTitle}
                          onChange={e => setEditingLinkTitle(prev => ({ ...prev, [link.id]: e.target.value }))}
                          placeholder="Tên gợi nhớ..."
                          className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:outline-none px-1 py-0.5 transition"
                          title="Bấm để sửa tên"
                        />
                        <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {link.totalClicks || 0} clicks
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {shortUrl}
                        </span>
                        <button
                          onClick={() => handleCopy(shortUrl)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Sao chép link rút gọn"
                        >
                          {copiedText === shortUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setQrData({ isOpen: true, url: shortUrl, title: link.title })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Mã QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Mở thử"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, type: 'link', id: link.id, slug: link.slug, title: link.title })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dòng dưới: Sửa trực tiếp đường dẫn /link/123 -> /link/12345 VÀ Link đích */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Ô sửa đường dẫn /link/slug */}
                      <div className="sm:col-span-4 flex items-center">
                        <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-1.5 text-slate-500 font-mono text-xs select-none">
                          /link/
                        </span>
                        <input
                          type="text"
                          value={currentSlug}
                          onChange={e => setEditingLinkSlug(prev => ({ ...prev, [link.id]: e.target.value }))}
                          placeholder="12345"
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-r-xl px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none transition"
                          title="Sửa mã đường dẫn (VD: đổi 123 thành 12345)"
                        />
                      </div>

                      {/* Ô sửa Link đích */}
                      <div className="sm:col-span-6 flex items-center">
                        <input
                          type="text"
                          value={currentDest}
                          onChange={e => setEditingDest(prev => ({ ...prev, [link.id]: e.target.value }))}
                          placeholder="https://..."
                          className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none transition"
                          title="Sửa trang đích chuyển hướng tới"
                        />
                      </div>

                      {/* Nút Lưu */}
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          onClick={() => handleSaveLinkChanges(link)}
                          disabled={savingDestId === link.id}
                          className={`w-full px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 ${
                            hasChanged
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingDestId === link.id ? '...' : hasChanged ? 'Lưu *' : 'Lưu'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: BANNERS */}
        {activeTab === 'banners' && (
          <div className="space-y-4">
            {showCreateBanner && (
              <form onSubmit={handleCreateBanner} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Thêm Banner Mới</span>
                  <button
                    type="button"
                    onClick={() => setShowCreateBanner(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Tên banner</label>
                        <input
                          type="text"
                          value={newBannerTitle}
                          onChange={e => setNewBannerTitle(e.target.value)}
                          placeholder="VD: Banner chính"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Slug *</label>
                        <div className="flex items-center">
                          <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-2 text-slate-500 font-mono text-[11px]">
                            /image/
                          </span>
                          <input
                            type="text"
                            value={newBannerSlug}
                            onChange={e => setNewBannerSlug(e.target.value)}
                            placeholder="banner1"
                            required
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-2.5 py-2 text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:border-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-slate-500 font-medium">Ảnh / Ảnh động GIF *</label>
                        <label className="cursor-pointer text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingImage ? 'Đang tải...' : 'Chọn từ máy'}</span>
                          <input
                            type="file"
                            accept="image/*,.gif"
                            disabled={isUploadingImage}
                            onChange={handleUploadNewBannerFile}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={newBannerRawUrl}
                        onChange={e => setNewBannerRawUrl(e.target.value)}
                        placeholder="https://... hoặc bấm Chọn từ máy"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Tỉ lệ ảnh</label>
                        <select
                          value={newBannerRatio}
                          onChange={e => setNewBannerRatio(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none"
                        >
                          {ASPECT_RATIOS.map(r => (
                            <option key={r.id} value={r.id}>{r.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Kiểu khung</label>
                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                          {FIT_MODES.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setNewBannerFitMode(m.id)}
                              className={`py-1 rounded-lg text-[11px] font-semibold transition ${
                                newBannerFitMode === m.id
                                  ? 'bg-white text-slate-900 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-900'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-500 font-medium mb-1">Xoay & Lật</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setNewBannerRotation((newBannerRotation + 90) % 360)}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono font-semibold"
                          >
                            <RotateCcw className="w-3.5 h-3.5 inline" /> {newBannerRotation}°
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewBannerFlipH(!newBannerFlipH)}
                            className={`p-1.5 rounded-lg ${newBannerFlipH ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                          >
                            <FlipHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewBannerFlipV(!newBannerFlipV)}
                            className={`p-1.5 rounded-lg ${newBannerFlipV ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                          >
                            <FlipVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Chọn Có nền hoặc Không nền (Trong suốt) */}
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-slate-600 font-semibold text-xs">Chế độ nền:</span>
                        <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setNewBannerBgColor('transparent')}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                              newBannerBgColor === 'transparent'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Grid className="w-3 h-3" />
                            <span>Không nền (Trong suốt)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (newBannerBgColor === 'transparent') setNewBannerBgColor('#ffffff');
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition ${
                              newBannerBgColor !== 'transparent'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Palette className="w-3 h-3" />
                            <span>Có nền</span>
                          </button>
                        </div>
                      </div>

                      {newBannerBgColor !== 'transparent' && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <input
                            type="color"
                            value={newBannerBgColor}
                            onChange={e => setNewBannerBgColor(e.target.value)}
                            className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                          />
                          <input
                            type="text"
                            value={newBannerBgColor}
                            onChange={e => setNewBannerBgColor(e.target.value)}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800"
                          />
                          <div className="flex items-center gap-1.5">
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setNewBannerBgColor(c)}
                                className={`w-4 h-4 rounded-full border transition ${
                                  newBannerBgColor.toLowerCase() === c ? 'border-slate-900 scale-110 ring-1 ring-slate-900' : 'border-slate-300'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <ModernSlider
                        icon={<ZoomIn className="w-3.5 h-3.5 text-slate-500" />}
                        label="Phóng to (Zoom)"
                        valueDisplay={`${Math.round(newBannerScale * 100)}%`}
                        value={newBannerScale}
                        min={0.2}
                        max={3.0}
                        step={0.05}
                        defaultValue={1.0}
                        onChange={setNewBannerScale}
                      />
                      <ModernSlider
                        icon={<SunMedium className="w-3.5 h-3.5 text-slate-500" />}
                        label="Độ rõ / Mờ"
                        valueDisplay={`${Math.round(newBannerOpacity * 100)}%`}
                        value={newBannerOpacity}
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        defaultValue={1.0}
                        onChange={setNewBannerOpacity}
                      />
                      <ModernSlider
                        icon={<MoveVertical className="w-3.5 h-3.5 text-slate-500" />}
                        label="Vị trí Lên / Xuống"
                        valueDisplay={`${newBannerOffsetY}%`}
                        value={newBannerOffsetY}
                        min={-100}
                        max={100}
                        step={2}
                        defaultValue={0}
                        onChange={setNewBannerOffsetY}
                      />
                      <ModernSlider
                        icon={<MoveHorizontal className="w-3.5 h-3.5 text-slate-500" />}
                        label="Vị trí Trái / Phải"
                        valueDisplay={`${newBannerOffsetX}%`}
                        value={newBannerOffsetX}
                        min={-100}
                        max={100}
                        step={2}
                        defaultValue={0}
                        onChange={setNewBannerOffsetX}
                      />
                    </div>
                  </div>

                  {/* Cột phải: Khung Preview 1:1 */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Khung Preview 1:1 (Chuẩn kết quả web)</span>
                        <span className="font-mono font-bold text-slate-800">{newBannerRatio}</span>
                      </div>
                      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xs">
                        {newBannerRawUrl ? (
                          <SquareStagePreview
                            srcUrl={newBannerRawUrl}
                            ratioId={newBannerRatio}
                            fitMode={newBannerFitMode}
                            bgColor={newBannerBgColor}
                            rotation={newBannerRotation}
                            flipH={newBannerFlipH}
                            flipV={newBannerFlipV}
                            offsetX={newBannerOffsetX}
                            offsetY={newBannerOffsetY}
                            scale={newBannerScale}
                            opacity={newBannerOpacity}
                            isProcessing={isCreatingBanner}
                          />
                        ) : (
                          <div className="w-full aspect-square bg-slate-50 flex flex-col items-center justify-center text-slate-400 space-y-1">
                            <ImageIcon className="w-7 h-7 opacity-40" />
                            <span className="text-xs">Chọn ảnh để xem trước</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateBanner(false)}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingBanner || isUploadingImage || !newBannerRawUrl}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                      >
                        {isCreatingBanner ? 'Đang xuất ảnh...' : 'Lưu & Đăng Banner'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Modal sửa Tên & Slug */}
            {editingBannerMeta && (
              <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                <form onSubmit={handleSaveBannerMeta} className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Đổi tên & Đường dẫn ảnh</h3>
                    <button type="button" onClick={() => setEditingBannerMeta(null)} className="text-slate-400 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Tên hiển thị</label>
                      <input
                        type="text"
                        value={tempBannerTitle}
                        onChange={e => setTempBannerTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Mã đường dẫn (VD: 12345)</label>
                      <div className="flex items-center">
                        <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-2 text-slate-500 font-mono text-[11px]">
                          /image/
                        </span>
                        <input
                          type="text"
                          value={tempBannerSlug}
                          onChange={e => setTempBannerSlug(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-3 py-2 text-slate-900 font-mono font-semibold"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setEditingBannerMeta(null)} className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium">Hủy</button>
                    <button type="submit" className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold">Lưu</button>
                  </div>
                </form>
              </div>
            )}

            {/* Danh sách Banner Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredBanners.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-400">
                  Chưa có banner nào.
                </div>
              ) : (
                filteredBanners.map(banner => {
                  const directImageUrl = `${origin}/image/${banner.slug}`;
                  const currentRatioId = cardRatios[banner.id] ?? (banner.aspectRatio || '16:9');
                  const fitMode: BannerFitMode = cardFitModes[banner.id] ?? (banner.fitMode || 'fit');
                  const bgColor = cardBgColors[banner.id] ?? (banner.bgColor || '#ffffff');
                  const rotation = cardRotations[banner.id] ?? (banner.rotation || 0);
                  const flipH = cardFlipH[banner.id] ?? !!banner.flipH;
                  const flipV = cardFlipV[banner.id] ?? !!banner.flipV;
                  const offsetX = cardOffsetX[banner.id] ?? ((banner as any).offsetX || 0);
                  const offsetY = cardOffsetY[banner.id] ?? (banner.offsetY || 0);
                  const scale = cardScale[banner.id] ?? (banner.scale ?? 1.0);
                  const opacity = cardOpacity[banner.id] ?? (banner.opacity ?? 1.0);

                  const isProcessingThis = processingBannerId === banner.id;
                  const isColorOpen = openColorPickerId === banner.id;
                  const isToolsOpen = openToolsId === banner.id;
                  const isEditingImgUrl = editingBannerImgId === banner.id;
                  const isDirty = hasUnsavedChanges(banner);

                  return (
                    <div
                      key={banner.id}
                      className="rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs overflow-hidden flex flex-col justify-between transition"
                    >
                      {/* Header của Card */}
                      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-1.5 truncate cursor-pointer group"
                          onClick={() => {
                            setEditingBannerMeta(banner);
                            setTempBannerTitle(banner.title);
                            setTempBannerSlug(banner.slug);
                          }}
                          title="Bấm để đổi tên hoặc đổi link /image/..."
                        >
                          <span className="font-bold text-slate-900 text-xs truncate group-hover:underline">{banner.title}</span>
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                            /image/{banner.slug}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {banner.viewsCount || 0} views
                        </span>
                      </div>

                      {/* Thanh chọn nhanh Tỉ lệ + Fit/Fill/Stretch + Có nền / Không nền */}
                      <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          {QUICK_RATIOS.slice(0, 3).map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setCardRatios(prev => ({ ...prev, [banner.id]: r }))}
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] transition ${
                                currentRatioId === r
                                  ? 'bg-slate-900 text-white font-semibold'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                          <select
                            value={currentRatioId}
                            onChange={e => setCardRatios(prev => ({ ...prev, [banner.id]: e.target.value }))}
                            className="bg-white border border-slate-200 rounded-md text-[10px] text-slate-700 px-1.5 py-0.5 font-mono focus:outline-none"
                          >
                            {ASPECT_RATIOS.map(item => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg">
                            {FIT_MODES.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setCardFitModes(prev => ({ ...prev, [banner.id]: m.id }))}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                                  fitMode === m.id
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenToolsId(isToolsOpen ? null : banner.id);
                              setOpenColorPickerId(null);
                            }}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold flex items-center gap-1 transition ${
                              isToolsOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Sliders className="w-3 h-3" />
                            <span>Chỉnh</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenColorPickerId(isColorOpen ? null : banner.id);
                              setOpenToolsId(null);
                            }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold transition ${
                              isColorOpen ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                            }`}
                            title="Chọn Có nền hoặc Không nền"
                          >
                            {bgColor === 'transparent' ? (
                              <>
                                <Grid className="w-3 h-3 text-slate-500" />
                                <span>Không nền</span>
                              </>
                            ) : (
                              <>
                                <span
                                  className="w-3 h-3 rounded-xs border border-slate-300 inline-block"
                                  style={{ backgroundColor: bgColor }}
                                />
                                <span>Nền</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Bảng Công cụ */}
                      {isToolsOpen && (
                        <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCardRotations(prev => ({ ...prev, [banner.id]: (rotation + 90) % 360 }))}
                                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Xoay ({rotation}°)
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardFlipH(prev => ({ ...prev, [banner.id]: !flipH }))}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 shadow-2xs ${
                                  flipH ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <FlipHorizontal className="w-3.5 h-3.5" /> Lật ngang
                              </button>
                              <button
                                type="button"
                                onClick={() => setCardFlipV(prev => ({ ...prev, [banner.id]: !flipV }))}
                                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 shadow-2xs ${
                                  flipV ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <FlipVertical className="w-3.5 h-3.5" /> Lật dọc
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setOpenToolsId(null)}
                              className="text-[11px] text-slate-400 hover:text-slate-700 font-medium"
                            >
                              Thu gọn
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <ModernSlider
                              icon={<ZoomIn className="w-3.5 h-3.5 text-slate-500" />}
                              label="Phóng to (Zoom)"
                              valueDisplay={`${Math.round(scale * 100)}%`}
                              value={scale}
                              min={0.2}
                              max={3.0}
                              step={0.05}
                              defaultValue={1.0}
                              onChange={val => setCardScale(prev => ({ ...prev, [banner.id]: val }))}
                            />
                            <ModernSlider
                              icon={<SunMedium className="w-3.5 h-3.5 text-slate-500" />}
                              label="Độ rõ / Mờ"
                              valueDisplay={`${Math.round(opacity * 100)}%`}
                              value={opacity}
                              min={0.1}
                              max={1.0}
                              step={0.05}
                              defaultValue={1.0}
                              onChange={val => setCardOpacity(prev => ({ ...prev, [banner.id]: val }))}
                            />
                            <ModernSlider
                              icon={<MoveVertical className="w-3.5 h-3.5 text-slate-500" />}
                              label="Lên / Xuống"
                              valueDisplay={`${offsetY}%`}
                              value={offsetY}
                              min={-100}
                              max={100}
                              step={2}
                              defaultValue={0}
                              onChange={val => setCardOffsetY(prev => ({ ...prev, [banner.id]: val }))}
                            />
                            <ModernSlider
                              icon={<MoveHorizontal className="w-3.5 h-3.5 text-slate-500" />}
                              label="Trái / Phải"
                              valueDisplay={`${offsetX}%`}
                              value={offsetX}
                              min={-100}
                              max={100}
                              step={2}
                              defaultValue={0}
                              onChange={val => setCardOffsetX(prev => ({ ...prev, [banner.id]: val }))}
                            />
                          </div>
                        </div>
                      )}

                      {/* Bảng chọn Có nền / Không nền */}
                      {isColorOpen && (
                        <div className="px-3.5 py-2.5 bg-white border-b border-slate-100 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                              <button
                                type="button"
                                onClick={() => setCardBgColors(prev => ({ ...prev, [banner.id]: 'transparent' }))}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                                  bgColor === 'transparent'
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <Grid className="w-3 h-3" />
                                <span>Không nền (Trong suốt)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (bgColor === 'transparent') {
                                    setCardBgColors(prev => ({ ...prev, [banner.id]: '#ffffff' }));
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                                  bgColor !== 'transparent'
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                <Palette className="w-3 h-3" />
                                <span>Có nền</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setOpenColorPickerId(null)}
                              className="text-[11px] text-slate-400 hover:text-slate-700"
                            >
                              Đóng
                            </button>
                          </div>

                          {bgColor !== 'transparent' && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              <input
                                type="color"
                                value={bgColor}
                                onChange={e => setCardBgColors(prev => ({ ...prev, [banner.id]: e.target.value }))}
                                className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0 bg-white"
                              />
                              <input
                                type="text"
                                value={bgColor}
                                onChange={e => setCardBgColors(prev => ({ ...prev, [banner.id]: e.target.value }))}
                                className="w-18 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[11px] text-slate-800"
                              />
                              {PRESET_COLORS.map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setCardBgColors(prev => ({ ...prev, [banner.id]: c }))}
                                  className={`w-4 h-4 rounded-full border transition ${
                                    bgColor.toLowerCase() === c ? 'border-slate-900 scale-110 ring-1 ring-slate-900' : 'border-slate-300'
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* KHUNG PREVIEW TỈ LỆ 1:1 */}
                      <SquareStagePreview
                        srcUrl={banner.originalImageUrl || banner.imageUrl}
                        ratioId={currentRatioId}
                        fitMode={fitMode}
                        bgColor={bgColor}
                        rotation={rotation}
                        flipH={flipH}
                        flipV={flipV}
                        offsetX={offsetX}
                        offsetY={offsetY}
                        scale={scale}
                        opacity={opacity}
                        isProcessing={isProcessingThis}
                        onClick={() => setCinemaReviewBanner(banner)}
                      />

                      {/* Hộp thoại Đổi Link (/image/123 -> /image/12345) và Nguồn ảnh */}
                      {isEditingImgUrl && (
                        <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2.5 text-xs">
                          <div>
                            <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                              1. Đổi đường dẫn truy cập ảnh (VD: đổi <code className="font-mono">{banner.slug}</code> thành <code className="font-mono">12345</code>):
                            </label>
                            <div className="flex items-center">
                              <span className="bg-slate-200/80 border border-r-0 border-slate-300 rounded-l-lg px-2.5 py-1.5 text-slate-600 font-mono text-[11px]">
                                {origin}/image/
                              </span>
                              <input
                                type="text"
                                value={tempBannerSlugInline}
                                onChange={e => setTempBannerSlugInline(e.target.value)}
                                placeholder="12345"
                                className="flex-1 bg-white border border-slate-300 rounded-r-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-500 font-medium mb-1">
                              2. Hoặc dán URL ảnh mới từ web ngoài (Để nguyên nếu chỉ muốn đổi đường dẫn trên):
                            </label>
                            <input
                              type="text"
                              value={tempBannerImgUrl}
                              onChange={e => setTempBannerImgUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingBannerImgId(null)}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs hover:bg-slate-100"
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveBannerInlineLink(banner)}
                              className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
                            >
                              Lưu Đường Dẫn
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer của Card */}
                      <div className="p-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleSaveBannerTransform(banner)}
                            disabled={isProcessingThis}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 shadow-2xs transition ${
                              isDirty
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-500/30'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{isProcessingThis ? 'Đang lưu...' : isDirty ? 'Lưu thay đổi *' : 'Lưu thay đổi'}</span>
                          </button>

                          {isDirty && (
                            <button
                              type="button"
                              onClick={() => resetCardChanges(banner)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                              title="Hoàn tác"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <label className="cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition">
                            <Upload className="w-3 h-3" />
                            <span>Đổi file</span>
                            <input
                              type="file"
                              accept="image/*,.gif"
                              disabled={isProcessingThis}
                              onChange={e => handleReplaceBannerFile(banner, e)}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingBannerImgId(isEditingImgUrl ? null : banner.id);
                              setTempBannerSlugInline(banner.slug);
                              setTempBannerImgUrl(banner.originalImageUrl || banner.imageUrl);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition"
                            title="Đổi đường dẫn /image/123 -> /image/12345 hoặc thay URL ảnh"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Đổi link</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleCopy(directImageUrl)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition"
                            title="Chép link /image/:slug"
                          >
                            {copiedText === directImageUrl ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Chép</span>
                          </button>
                          <a
                            href={`${directImageUrl}?t=${new Date(banner.updatedAt || Date.now()).getTime()}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
                            title="Mở ảnh thực tế trên web"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, type: 'banner', id: banner.id, slug: banner.slug, title: banner.title })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs text-slate-500 mb-1">Tổng Lượt Click</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {analyticsData.totalClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">+{analyticsData.clicks24h} trong 24h</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs text-slate-500 mb-1">Unique Clicks</div>
                <div className="text-2xl font-bold text-emerald-600 font-mono">
                  {analyticsData.uniqueClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Theo IP & Thiết bị</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs text-slate-500 mb-1">Lượt Xem Banner</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {analyticsData.totalBannerViews.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Truy cập /image/:slug</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="font-bold text-slate-900 text-xs">Nguồn Truy Cập</div>
                <div className="space-y-2">
                  {analyticsData.sources.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">Chưa có dữ liệu</div>
                  ) : (
                    analyticsData.sources.map(src => (
                      <div key={src.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{src.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{src.count} ({src.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full transition-all duration-500"
                            style={{ width: `${src.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="font-bold text-slate-900 text-xs">Thiết Bị</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mobile', 'Desktop', 'Tablet', 'Other'] as const).map(dev => (
                    <div key={dev} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[11px] text-slate-500">{dev}</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                        {analyticsData.devices[dev] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="font-bold text-slate-900 text-xs">Nhật Ký Click ({logs.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="py-2 px-2">Thời gian</th>
                      <th className="py-2 px-2">Link</th>
                      <th className="py-2 px-2">Nguồn</th>
                      <th className="py-2 px-2">Thiết bị</th>
                      <th className="py-2 px-2">Trình duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {logs.slice(0, 15).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2 px-2 text-slate-900 font-semibold">/link/{log.linkSlug}</td>
                        <td className="py-2 px-2 text-slate-700">{log.source}</td>
                        <td className="py-2 px-2 text-slate-600">{log.device}</td>
                        <td className="py-2 px-2 text-slate-500">{log.browser}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                          Chưa có lượt click nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal phóng to xem ảnh */}
      {cinemaReviewBanner && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setCinemaReviewBanner(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-4 shadow-xl space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{cinemaReviewBanner.title}</span>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  /image/{cinemaReviewBanner.slug}
                </span>
              </div>
              <button
                onClick={() => setCinemaReviewBanner(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200">
              <SquareStagePreview
                srcUrl={cinemaReviewBanner.originalImageUrl || cinemaReviewBanner.imageUrl}
                ratioId={cardRatios[cinemaReviewBanner.id] ?? (cinemaReviewBanner.aspectRatio || '16:9')}
                fitMode={cardFitModes[cinemaReviewBanner.id] ?? (cinemaReviewBanner.fitMode || 'fit')}
                bgColor={cardBgColors[cinemaReviewBanner.id] ?? (cinemaReviewBanner.bgColor || '#ffffff')}
                rotation={cardRotations[cinemaReviewBanner.id] ?? (cinemaReviewBanner.rotation || 0)}
                flipH={cardFlipH[cinemaReviewBanner.id] ?? !!cinemaReviewBanner.flipH}
                flipV={cardFlipV[cinemaReviewBanner.id] ?? !!cinemaReviewBanner.flipV}
                offsetX={cardOffsetX[cinemaReviewBanner.id] ?? ((cinemaReviewBanner as any).offsetX || 0)}
                offsetY={cardOffsetY[cinemaReviewBanner.id] ?? (cinemaReviewBanner.offsetY || 0)}
                scale={cardScale[cinemaReviewBanner.id] ?? (cinemaReviewBanner.scale ?? 1.0)}
                opacity={cardOpacity[cinemaReviewBanner.id] ?? (cinemaReviewBanner.opacity ?? 1.0)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => !isDeleting && setDeleteModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Xóa {deleteModal.type === 'link' ? `/link/${deleteModal.slug}` : `/image/${deleteModal.slug}`}?
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {qrData.isOpen && (
        <QRCodeModal
          isOpen={qrData.isOpen}
          onClose={() => setQrData({ isOpen: false, url: '', title: '' })}
          url={qrData.url}
          title={qrData.title}
        />
      )}
    </div>
  );
}