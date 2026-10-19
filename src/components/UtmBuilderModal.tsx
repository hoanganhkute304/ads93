import React, { useState } from 'react';
import { X, Share2, Copy, Check, Sparkles } from 'lucide-react';
import { LinkItem } from '../types';

interface UtmBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  link: LinkItem | null;
}

export const UtmBuilderModal: React.FC<UtmBuilderModalProps> = ({
  isOpen,
  onClose,
  link
}) => {
  const [source, setSource] = useState('tiktok');
  const [medium, setMedium] = useState('social_bio');
  const [campaign, setCampaign] = useState('mega_sale');
  const [content, setContent] = useState('video_banner1');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !link) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  // Build generated URL
  const queryParams = new URLSearchParams();
  if (source.trim()) queryParams.set('utm_source', source.trim());
  if (medium.trim()) queryParams.set('utm_medium', medium.trim());
  if (campaign.trim()) queryParams.set('utm_campaign', campaign.trim());
  if (content.trim()) queryParams.set('utm_content', content.trim());

  const fullTrackedUrl = `${origin}/link/${link.slug}?${queryParams.toString()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullTrackedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyPreset = (s: string, m: string, c: string) => {
    setSource(s);
    setMedium(m);
    setCampaign(c);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Trình Tạo Link Gắn Thẻ UTM Chiến Dịch
              </h3>
              <p className="text-[11px] text-neutral-400">
                Tự động nhận diện nguồn TikTok, Facebook, Zalo chuẩn xác
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

        {/* Quick channel templates */}
        <div className="mb-4 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="text-[11px] font-semibold text-neutral-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Kênh tiếp thị phổ biến:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => applyPreset('tiktok', 'bio', 'tiktok_neon93')}
              className="px-2.5 py-1 text-xs rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition"
            >
              🎵 TikTok Bio
            </button>
            <button
              onClick={() => applyPreset('tiktok', 'cpc', 'tiktok_ads_video')}
              className="px-2.5 py-1 text-xs rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition"
            >
              🚀 TikTok Ads
            </button>
            <button
              onClick={() => applyPreset('facebook', 'post', 'fb_fanpage')}
              className="px-2.5 py-1 text-xs rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition"
            >
              📘 Facebook Fanpage
            </button>
            <button
              onClick={() => applyPreset('zalo', 'broadcast', 'zalo_oa_vip')}
              className="px-2.5 py-1 text-xs rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 transition"
            >
              💬 Zalo Broadcast
            </button>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                utm_source (Nguồn)
              </label>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="tiktok, facebook, zalo"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                utm_medium (Kênh)
              </label>
              <input
                type="text"
                value={medium}
                onChange={e => setMedium(e.target.value)}
                placeholder="bio, cpc, banner"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                utm_campaign (Tên chiến dịch)
              </label>
              <input
                type="text"
                value={campaign}
                onChange={e => setCampaign(e.target.value)}
                placeholder="sale_tet, kol_neon"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                utm_content (Nội dung / Banner)
              </label>
              <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="banner1, video1"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Generated URL Result */}
          <div className="pt-2">
            <label className="block text-neutral-300 font-semibold mb-1">
              Link Theo Dõi Hoàn Chỉnh:
            </label>
            <div className="p-3 bg-neutral-950 border border-amber-500/40 rounded-xl font-mono text-[11px] text-amber-400 break-all select-all">
              {fullTrackedUrl}
            </div>
          </div>

          {/* Action */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              Đóng
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-neutral-950" />
                  <span>Đã Sao Chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao Chép Link Này</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
