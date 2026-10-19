import React, { useState, useEffect } from 'react';
import { X, Link2, Sparkles } from 'lucide-react';
import { LinkItem } from '../types';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; slug: string; destinationUrl: string; tags: string[]; notes?: string }) => Promise<void>;
  editingLink?: LinkItem | null;
}

export const CreateLinkModal: React.FC<CreateLinkModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingLink
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [destinationUrl, setDestinationUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  useEffect(() => {
    if (editingLink) {
      setTitle(editingLink.title);
      setSlug(editingLink.slug);
      setDestinationUrl(editingLink.destinationUrl);
      setTagsInput(editingLink.tags?.join(', ') || '');
      setNotes(editingLink.notes || '');
    } else {
      setTitle('');
      setSlug('');
      setDestinationUrl('');
      setTagsInput('');
      setNotes('');
    }
    setError('');
  }, [editingLink, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!slug.trim()) {
      setError('Vui lòng nhập mã rút gọn (slug)');
      return;
    }
    if (!destinationUrl.trim()) {
      setError('Vui lòng nhập trang đích chuyển hướng');
      return;
    }

    try {
      setLoading(true);
      const tags = tagsInput
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      await onSubmit({
        title: title.trim() || `Link ${slug.trim()}`,
        slug: slug.trim().toLowerCase(),
        destinationUrl: destinationUrl.trim(),
        tags,
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu link');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (presetTitle: string, presetSlug: string, presetDest: string, presetTags: string) => {
    setTitle(presetTitle);
    setSlug(presetSlug);
    setDestinationUrl(presetDest);
    setTagsInput(presetTags);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {editingLink ? 'Chỉnh Sửa Đường Dẫn Rút Gọn' : 'Tạo Link Quảng Cáo Mới (ADS93)'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Presets */}
        {!editingLink && (
          <div className="mb-4 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
            <div className="text-[11px] font-semibold text-neutral-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Gợi ý nhanh (Ấn để điền mẫu):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('Kênh TikTok Neon 9393', 'link1', 'https://www.tiktok.com/@neon_9393', 'tiktok, kol')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 transition"
              >
                TikTok Neon 9393
              </button>
              <button
                type="button"
                onClick={() => applyPreset('Flash Sale Shopee', 'deal99', 'https://shopee.vn', 'shopee, sale')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 transition"
              >
                Shopee Sale
              </button>
              <button
                type="button"
                onClick={() => applyPreset('Zalo Tư Vấn VIP', 'zalo-vip', 'https://zalo.me', 'zalo, cskh')}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700/80 transition"
              >
                Zalo VIP
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Tiêu Đề Chiến Dịch / Mô Tả
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Kênh TikTok Neon 9393"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Mã Rút Gọn (Slug) <span className="text-amber-400">*</span>
            </label>
            <div className="flex items-center">
              <span className="bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl px-3 py-2 text-neutral-500 font-mono">
                {origin}/link/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                placeholder="link1"
                required
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-r-xl px-3 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500/60"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Chỉ dùng chữ cái thường, số và dấu gạch nối (VD: link1, tiktok, sale-tet)
            </p>
          </div>

          {/* Destination URL */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Trang Đích Thực Tế (Destination URL) <span className="text-amber-400">*</span>
            </label>
            <input
              type="url"
              value={destinationUrl}
              onChange={e => setDestinationUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@neon_9393"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Người dùng bấm vào /link/{slug || 'link1'} sẽ lập tức được chuyển hướng tới URL này
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Nhãn Phân Loại (Tags, cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="tiktok, fashion, livestream"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Ghi Chú Nội Bộ
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ghi chú về chiến dịch marketing..."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition shadow-md shadow-amber-500/20 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : (editingLink ? 'Cập Nhật Link' : 'Tạo Link Ngay')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
