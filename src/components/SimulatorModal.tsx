import React, { useState } from 'react';
import { X, Sparkles, ExternalLink, Zap, CheckCircle2 } from 'lucide-react';
import { LinkItem } from '../types';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkItem[];
  onSimulate: (slug: string, source: string, device: string) => Promise<any>;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  links,
  onSimulate
}) => {
  const [selectedSlug, setSelectedSlug] = useState(links[0]?.slug || 'link1');
  const [source, setSource] = useState('TikTok Ads');
  const [device, setDevice] = useState('Mobile');
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  if (!isOpen) return null;

  const sourcesList = [
    'TikTok',
    'TikTok Ads',
    'Facebook',
    'Facebook Ads',
    'Zalo',
    'Google Ads',
    'Instagram Bio',
    'Direct'
  ];

  const handleSimulate = async () => {
    try {
      setLoading(true);
      setResultMsg('');
      await onSimulate(selectedSlug, source, device);
      setResultMsg(`⚡ Đã ghi nhận thành công 1 click từ nguồn "${source}" (${device}) vào link "/link/${selectedSlug}"!`);
      setTimeout(() => setResultMsg(''), 4000);
    } catch (err: any) {
      alert('Lỗi: ' + (err.message || 'Không thể mô phỏng'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRealTest = () => {
    const origin = window.location.origin;
    const testUrl = `${origin}/link/${selectedSlug}?utm_source=${encodeURIComponent(source.toLowerCase())}&_preview=1`;
    window.open(testUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3.5 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Thử Nghiệm & Mô Phỏng Click (Realtime)
              </h3>
              <p className="text-[11px] text-neutral-400">
                Kiểm tra cơ chế phát hiện nguồn và nhảy số tức thì trên Dashboard
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {resultMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{resultMsg}</span>
          </div>
        )}

        <div className="space-y-4 text-xs">
          {/* Link Select */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Chọn Đường Dẫn Thử Nghiệm
            </label>
            <select
              value={selectedSlug}
              onChange={e => setSelectedSlug(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500/60"
            >
              {links.map(l => (
                <option key={l.id} value={l.slug}>
                  /link/{l.slug} ➔ {l.destinationUrl} ({l.title})
                </option>
              ))}
            </select>
          </div>

          {/* Source Select */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Nguồn Lưu Lượng (Traffic Source)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {sourcesList.map(src => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSource(src)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition ${
                    source === src
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 font-bold'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Device */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Loại Thiết Bị
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Mobile', 'Desktop', 'Tablet'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={`py-1.5 rounded-lg border text-xs font-medium transition ${
                    device === d
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-400 font-bold'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2 border-t border-neutral-800">
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{loading ? 'Đang gửi...' : `Bắn Click Thử Nghiệm Từ "${source}"`}</span>
            </button>

            <button
              onClick={handleOpenRealTest}
              className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Chuyển Hướng Trực Tiếp Sang Trang Đích</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
