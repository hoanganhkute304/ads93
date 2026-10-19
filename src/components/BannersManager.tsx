import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Code, 
  QrCode, 
  Edit3, 
  Trash2, 
  Plus,
  Maximize2
} from 'lucide-react';
import { ImageBannerItem } from '../types';

interface BannersManagerProps {
  banners: ImageBannerItem[];
  onOpenCreateBanner: () => void;
  onEditBanner: (banner: ImageBannerItem) => void;
  onDeleteBanner: (id: string) => void;
  onToggleActive: (banner: ImageBannerItem) => void;
  onShowQr: (url: string, title: string) => void;
}

export const BannersManager: React.FC<BannersManagerProps> = ({
  banners,
  onOpenCreateBanner,
  onEditBanner,
  onDeleteBanner,
  onToggleActive,
  onShowQr
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'html' | 'md'>('url');
  const [previewImage, setPreviewImage] = useState<ImageBannerItem | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/90 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Quản Lý Banner Quảng Cáo (Direct Image Links)
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Đường dẫn trực tiếp dạng <code className="text-sky-400 font-mono">/image/:slug</code> chỉ chứa ảnh, tương thích nhúng vào mọi website và email
          </p>
        </div>

        <button
          onClick={onOpenCreateBanner}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-500 hover:bg-sky-400 text-neutral-950 transition shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Thêm Banner Mới</span>
        </button>
      </div>

      {/* Grid of Banners */}
      <div className="p-4 sm:p-5">
        {banners.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-neutral-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">Chưa Có Banner Nào Trong Cơ Sở Dữ Liệu</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
              Hệ thống đã kết nối Firebase thật và làm sạch toàn bộ ảnh mẫu. Bạn có thể thêm banner thực tế của mình ngay bây giờ.
            </p>
            <button
              onClick={onOpenCreateBanner}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 transition shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Thêm Banner Mới</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map(banner => {
              const directImageUrl = `${origin}/image/${banner.slug}`;
              const htmlEmbed = `<a href="${origin}/link/${banner.targetLinkSlug || 'link1'}"><img src="${directImageUrl}" alt="${banner.title}" /></a>`;
              const mdEmbed = `[![${banner.title}](${directImageUrl})](${origin}/link/${banner.targetLinkSlug || 'link1'})`;

              return (
                <div
                  key={banner.id}
                  className="rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 overflow-hidden flex flex-col justify-between transition-all group"
                >
                  {/* Image Preview Box */}
                  <div className="relative aspect-video w-full bg-neutral-900 overflow-hidden flex items-center justify-center border-b border-neutral-800/80">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    
                    {/* Floating badge for slug */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-neutral-900/90 text-sky-400 border border-neutral-700/80 backdrop-blur-sm">
                        /image/{banner.slug}
                      </span>
                    </div>

                    {/* View Count Badge */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-900/90 text-neutral-300 border border-neutral-700/80 backdrop-blur-sm">
                      <Eye className="w-3 h-3 text-sky-400" />
                      <span>{banner.viewsCount.toLocaleString()}</span>
                    </div>

                    {/* Quick Fullscreen preview trigger */}
                    <button
                      onClick={() => setPreviewImage(banner)}
                      className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 opacity-0 group-hover:opacity-100 transition"
                      title="Xem ảnh phóng to"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Banner details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-white text-xs line-clamp-1">
                          {banner.title}
                        </h4>
                        <button
                          onClick={() => onToggleActive(banner)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                            banner.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}
                        >
                          {banner.isActive ? 'Active' : 'Paused'}
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-neutral-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Kích thước:</span>
                          <span className="font-mono text-neutral-300">{banner.dimensions || '1200x630'}</span>
                        </div>
                        {banner.targetLinkSlug && (
                          <div className="flex justify-between">
                            <span>Link gán kèm:</span>
                            <span className="font-mono text-amber-400 font-semibold">/link/{banner.targetLinkSlug}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Copy and embed options */}
                    <div className="mt-3 pt-3 border-t border-neutral-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-400 font-medium">Link trực tiếp:</span>
                        <button
                          onClick={() => handleCopy(directImageUrl, `${banner.id}-url`)}
                          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-mono"
                        >
                          {copiedId === `${banner.id}-url` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Đã chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Chép URL ảnh</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Action buttons bar */}
                      <div className="flex items-center justify-between gap-1 pt-1">
                        <a
                          href={directImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-[11px] font-semibold transition"
                          title="Mở ảnh trực tiếp trong tab mới"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Mở xem ảnh</span>
                        </a>

                        <button
                          onClick={() => handleCopy(htmlEmbed, `${banner.id}-html`)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition"
                          title="Chép mã nhúng HTML <img>"
                        >
                          {copiedId === `${banner.id}-html` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Code className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => onShowQr(directImageUrl, banner.title)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition"
                          title="Mã QR của ảnh"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEditBanner(banner)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition"
                          title="Chỉnh sửa banner"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteBanner(banner.id)}
                          className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-800 transition"
                          title="Xóa banner"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-4 relative space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h4 className="font-bold text-white text-sm">{previewImage.title}</h4>
              <button 
                onClick={() => setPreviewImage(null)}
                className="text-neutral-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center bg-black/40 rounded-xl overflow-hidden p-2">
              <img 
                src={previewImage.imageUrl} 
                alt={previewImage.title} 
                className="max-h-[60vh] object-contain rounded"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
              <span>Đường dẫn: /image/{previewImage.slug}</span>
              <a 
                href={`/image/${previewImage.slug}`} 
                target="_blank" 
                rel="noreferrer" 
                className="text-sky-400 hover:underline flex items-center gap-1"
              >
                Mở link gốc <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
