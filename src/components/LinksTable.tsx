import React, { useState } from 'react';
import { 
  Link2, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  QrCode, 
  Share2, 
  Play, 
  Pause, 
  Search,
  SlidersHorizontal,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { LinkItem } from '../types';

interface LinksTableProps {
  links: LinkItem[];
  onEditLink: (link: LinkItem) => void;
  onDeleteLink: (id: string) => void;
  onToggleActive: (link: LinkItem) => void;
  onShowQr: (url: string, title: string) => void;
  onShowUtm: (link: LinkItem) => void;
  onQuickUpdateDest: (id: string, newDest: string) => Promise<void>;
}

export const LinksTable: React.FC<LinksTableProps> = ({
  links,
  onEditLink,
  onDeleteLink,
  onToggleActive,
  onShowQr,
  onShowUtm,
  onQuickUpdateDest
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [tempDest, setTempDest] = useState('');
  const [isSavingDest, setIsSavingDest] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  const filteredLinks = links.filter(l => 
    l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.destinationUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopy = (slug: string, id: string) => {
    const fullUrl = `${origin}/link/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditDest = (link: LinkItem) => {
    setEditingDestId(link.id);
    setTempDest(link.destinationUrl);
  };

  const saveDest = async (id: string) => {
    if (!tempDest.trim()) return;
    setIsSavingDest(true);
    try {
      await onQuickUpdateDest(id, tempDest.trim());
      setEditingDestId(null);
    } catch (err) {
      alert('Không thể lưu đường dẫn mới');
    } finally {
      setIsSavingDest(false);
    }
  };

  return (
    <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/90 overflow-hidden shadow-sm">
      {/* Header toolbar */}
      <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Link2 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Quản Lý Đường Dẫn Rút Gọn (Short Links)
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Thay đổi trang đích quảng bá tức thì mà không cần đổi link chia sẻ
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm theo slug, tên, trang đích..."
            className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition"
          />
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950/40 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              <th className="py-3 px-4">Link Rút Gọn (Slug)</th>
              <th className="py-3 px-4">Trang Đích Thực Tế (Có thể đổi bất kỳ lúc nào)</th>
              <th className="py-3 px-3 text-center">Tổng Click</th>
              <th className="py-3 px-3 text-center">Unique</th>
              <th className="py-3 px-3 text-center">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400">
                  Không tìm thấy link nào phù hợp với tìm kiếm.
                </td>
              </tr>
            ) : (
              filteredLinks.map(link => {
                const shortUrl = `${origin}/link/${link.slug}`;
                const isEditingThisDest = editingDestId === link.id;

                return (
                  <tr 
                    key={link.id} 
                    className="hover:bg-neutral-800/20 transition group"
                  >
                    {/* Slug & Title */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <span>{link.title}</span>
                      </div>

                      {/* Short Link Badge */}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                          /link/{link.slug}
                        </span>
                        <button
                          onClick={() => handleCopy(link.slug, link.id)}
                          title="Sao chép link đầy đủ"
                          className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
                        >
                          {copiedId === link.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Tags */}
                      {link.tags && link.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {link.tags.map((tag, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="text-[10px] bg-neutral-800/80 text-neutral-400 px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Destination URL */}
                    <td className="py-3.5 px-4 align-top max-w-xs sm:max-w-md">
                      {isEditingThisDest ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={tempDest}
                            onChange={e => setTempDest(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-neutral-950 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => saveDest(link.id)}
                              disabled={isSavingDest}
                              className="px-2 py-0.5 bg-amber-500 text-neutral-950 font-bold rounded text-[10px] hover:bg-amber-400 transition"
                            >
                              Lưu Ngay
                            </button>
                            <button
                              onClick={() => setEditingDestId(null)}
                              className="px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded text-[10px] hover:bg-neutral-700 transition"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 group/dest">
                            <a
                              href={link.destinationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-neutral-300 hover:text-amber-400 break-all transition line-clamp-2"
                              title={link.destinationUrl}
                            >
                              {link.destinationUrl}
                            </a>
                            <button
                              onClick={() => startEditDest(link)}
                              title="Sửa nhanh trang đích"
                              className="opacity-0 group-hover/dest:opacity-100 p-1 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 rounded transition"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                          {link.lastClickedAt && (
                            <div className="text-[10px] text-neutral-500 mt-1">
                              Click gần nhất: {new Date(link.lastClickedAt).toLocaleTimeString('vi-VN')} {new Date(link.lastClickedAt).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Total clicks */}
                    <td className="py-3.5 px-3 align-top text-center">
                      <span className="font-mono font-bold text-white text-sm">
                        {link.totalClicks.toLocaleString()}
                      </span>
                    </td>

                    {/* Unique clicks */}
                    <td className="py-3.5 px-3 align-top text-center">
                      <span className="font-mono text-emerald-400 font-semibold text-xs">
                        {link.uniqueClicks.toLocaleString()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 align-top text-center">
                      <button
                        onClick={() => onToggleActive(link)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                          link.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        {link.isActive ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Đang chạy</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                            <span>Tạm dừng</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Test redirect */}
                        <a
                          href={`/link/${link.slug}?_preview=1`}
                          target="_blank"
                          rel="noreferrer"
                          title="Thử nghiệm chuyển hướng (Có preview)"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* UTM generator */}
                        <button
                          onClick={() => onShowUtm(link)}
                          title="Tạo link gắn mã UTM (TikTok Ads, FB Ads...)"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>

                        {/* QR Code */}
                        <button
                          onClick={() => onShowQr(shortUrl, link.title)}
                          title="Xem & Tải mã QR"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Link */}
                        <button
                          onClick={() => onEditLink(link)}
                          title="Chỉnh sửa thông tin"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteLink(link.id)}
                          title="Xóa link"
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
