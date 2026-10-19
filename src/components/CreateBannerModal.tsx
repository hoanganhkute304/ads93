import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Upload, Sparkles } from 'lucide-react';
import { ImageBannerItem, LinkItem } from '../types';

interface CreateBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; slug: string; imageUrl: string; dimensions?: string; fileSize?: string; targetLinkSlug?: string; notes?: string }) => Promise<void>;
  editingBanner?: ImageBannerItem | null;
  availableLinks: LinkItem[];
}

export const CreateBannerModal: React.FC<CreateBannerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingBanner,
  availableLinks
}) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dimensions, setDimensions] = useState('1200x630');
  const [targetLinkSlug, setTargetLinkSlug] = useState('');
  const [notes, setNotes] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreviewError, setImagePreviewError] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  useEffect(() => {
    if (editingBanner) {
      setTitle(editingBanner.title);
      setSlug(editingBanner.slug);
      setImageUrl(editingBanner.imageUrl);
      setDimensions(editingBanner.dimensions || '1200x630');
      setFileSize(editingBanner.fileSize || '');
      setTargetLinkSlug(editingBanner.targetLinkSlug || '');
      setNotes(editingBanner.notes || '');
    } else {
      setTitle('');
      setSlug('');
      setImageUrl('');
      setDimensions('1200x630');
      setFileSize('');
      setTargetLinkSlug(availableLinks[0]?.slug || '');
      setNotes('');
    }
    setError('');
    setImagePreviewError(false);
  }, [editingBanner, isOpen, availableLinks]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp định dạng hình ảnh (.png, .jpg, .webp, .svg)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Kích thước ảnh tối đa 15MB');
      return;
    }

    try {
      setIsUploading(true);
      setError('');

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = event => resolve(event.target?.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Upload to server storage
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          data: base64Data
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Tải ảnh lên máy chủ thất bại');
      }

      // Set clean relative URL (e.g. /uploads/banner_123.jpg)
      setImageUrl(json.url);
      setFileSize(json.fileSize || `${Math.round(file.size / 1024)} KB`);

      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      if (!slug) {
        setSlug(file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || 'Không thể tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const applyPreset = () => {
    setTitle('Banner Sephoang Quảng Cáo');
    setSlug('banner1');
    setImageUrl('https://sephoang.onrender.com/uploads/banner.png');
    setDimensions('1200x630');
    setFileSize('240 KB');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!slug.trim()) {
      setError('Vui lòng nhập mã slug cho ảnh');
      return;
    }
    if (!imageUrl.trim()) {
      setError('Vui lòng nhập URL ảnh hoặc tải ảnh lên');
      return;
    }

    try {
      setLoading(true);

      let finalImageUrl = imageUrl.trim();

      // If user pasted a base64 data URI directly, convert to server upload to prevent Firestore size limit
      if (finalImageUrl.startsWith('data:image/')) {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: `${slug.trim()}.png`,
            data: finalImageUrl
          })
        });
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.url) {
          finalImageUrl = uploadJson.url;
        }
      }

      // Validate size constraint
      if (finalImageUrl.length > 5000) {
        throw new Error('Đường dẫn ảnh quá dài. Vui lòng sử dụng tính năng "Tải ảnh từ máy" để lưu trữ tối ưu.');
      }

      await onSubmit({
        title: title.trim() || `Banner ${slug.trim()}`,
        slug: slug.trim().toLowerCase(),
        imageUrl: finalImageUrl,
        dimensions: dimensions.trim() || '1200x630',
        fileSize: fileSize || 'Tự động',
        targetLinkSlug: targetLinkSlug || '',
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu banner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {editingBanner ? 'Chỉnh Sửa Banner Quảng Cáo' : 'Thêm Banner Quảng Cáo Mới (ADS93)'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Sephoang Sample */}
        {!editingBanner && (
          <div className="mb-4 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex items-center justify-between">
            <div className="text-[11px] text-neutral-300">
              <div className="font-semibold text-white">Ảnh mẫu Sephoang Banner</div>
              <div className="text-neutral-400">banner1 ➔ sephoang.onrender.com/uploads/banner.png</div>
            </div>
            <button
              type="button"
              onClick={applyPreset}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" /> Điền Mẫu
            </button>
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
              Tiêu Đề Banner
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Banner Sephoang Quảng Cáo"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500/60"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Mã Ảnh (Slug) <span className="text-sky-400">*</span>
            </label>
            <div className="flex items-center">
              <span className="bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl px-3 py-2 text-neutral-500 font-mono">
                {origin}/image/
              </span>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                placeholder="banner1"
                required
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-r-xl px-3 py-2 text-sky-400 font-mono font-bold focus:outline-none focus:border-sky-500/60"
              />
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Đường dẫn chỉ chứa ảnh trực tiếp tại <code className="text-sky-400">{origin}/image/{slug || 'banner1'}</code>
            </p>
          </div>

          {/* Image URL or File Upload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-300 font-semibold">
                Nguồn Ảnh (Image URL hoặc Tải lên) <span className="text-sky-400">*</span>
              </label>
              <label className={`cursor-pointer text-[11px] flex items-center gap-1 ${isUploading ? 'text-amber-400 animate-pulse pointer-events-none' : 'text-sky-400 hover:text-sky-300'}`}>
                <Upload className={`w-3 h-3 ${isUploading ? 'animate-spin' : ''}`} />
                <span>{isUploading ? 'Đang tải ảnh lên máy chủ...' : 'Tải ảnh từ máy'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  disabled={isUploading}
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>
            <input
              type="text"
              value={imageUrl}
              onChange={e => {
                setImageUrl(e.target.value);
                setImagePreviewError(false);
              }}
              placeholder="https://sephoang.onrender.com/uploads/banner.png"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-sky-500/60"
            />
          </div>

          {/* Live Preview */}
          {imageUrl && (
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <div className="text-[11px] text-neutral-400 mb-1.5 font-medium">Xem trước hiển thị:</div>
              <div className="aspect-video w-full bg-black/40 rounded-lg overflow-hidden flex items-center justify-center border border-neutral-800">
                {!imagePreviewError ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-40 object-contain"
                    onError={() => setImagePreviewError(true)}
                  />
                ) : (
                  <div className="text-amber-400 text-[11px] p-2 text-center">
                    ⚠️ Ảnh có thể cần bảo mật CORS hoặc là link ảnh cục bộ, server ADS93 vẫn hỗ trợ proxy trực tiếp!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dimensions & Target Link */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Kích Thước (Tùy chọn)
              </label>
              <input
                type="text"
                value={dimensions}
                onChange={e => setDimensions(e.target.value)}
                placeholder="1200x630"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500/60"
              />
            </div>
            <div>
              <label className="block text-neutral-300 font-semibold mb-1">
                Gán Link Chuyển Hướng
              </label>
              <select
                value={targetLinkSlug}
                onChange={e => setTargetLinkSlug(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500/60"
              >
                <option value="">Không gán link</option>
                {availableLinks.map(l => (
                  <option key={l.id} value={l.slug}>
                    /link/{l.slug} ({l.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-neutral-300 font-semibold mb-1">
              Ghi Chú
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="VD: Banner chính chiến dịch Sephoang"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500/60"
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
              className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold transition shadow-md shadow-sky-500/20 disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : (editingBanner ? 'Cập Nhật Banner' : 'Lưu Banner Ngay')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
