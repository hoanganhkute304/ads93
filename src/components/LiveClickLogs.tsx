import React, { useState } from 'react';
import { 
  Radio, 
  Filter, 
  RotateCw, 
  Smartphone, 
  Monitor, 
  Tablet, 
  CheckCircle2, 
  Repeat,
  Search
} from 'lucide-react';
import { ClickLog } from '../types';

interface LiveClickLogsProps {
  logs: ClickLog[];
  onRefresh: () => void;
  activeSourceFilter?: string;
  onClearSourceFilter?: () => void;
}

export const LiveClickLogs: React.FC<LiveClickLogsProps> = ({
  logs,
  onRefresh,
  activeSourceFilter,
  onClearSourceFilter
}) => {
  const [slugFilter, setSlugFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');

  const filteredLogs = logs.filter(log => {
    if (activeSourceFilter && log.source.toLowerCase() !== activeSourceFilter.toLowerCase()) {
      return false;
    }
    if (slugFilter && !log.linkSlug.toLowerCase().includes(slugFilter.toLowerCase())) {
      return false;
    }
    if (deviceFilter !== 'ALL' && log.device !== deviceFilter) {
      return false;
    }
    return true;
  });

  const getSourceBadge = (source: string) => {
    const lower = source.toLowerCase();
    if (lower.includes('tiktok')) return 'bg-[#ff0050]/15 text-[#ff0050] border-[#ff0050]/30';
    if (lower.includes('facebook')) return 'bg-[#1877f2]/15 text-[#1877f2] border-[#1877f2]/30';
    if (lower.includes('zalo')) return 'bg-[#0068ff]/15 text-[#0068ff] border-[#0068ff]/30';
    if (lower.includes('google')) return 'bg-[#ea4335]/15 text-[#ea4335] border-[#ea4335]/30';
    if (lower.includes('instagram')) return 'bg-[#e1306c]/15 text-[#e1306c] border-[#e1306c]/30';
    if (lower.includes('youtube')) return 'bg-[#ff0000]/15 text-[#ff0000] border-[#ff0000]/30';
    if (lower.includes('direct')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  const getDeviceIcon = (device: string) => {
    if (device === 'Mobile') return <Smartphone className="w-3.5 h-3.5 text-emerald-400" />;
    if (device === 'Tablet') return <Tablet className="w-3.5 h-3.5 text-purple-400" />;
    return <Monitor className="w-3.5 h-3.5 text-sky-400" />;
  };

  return (
    <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/90 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Nhật Ký Click Thời Gian Thực (Live Click Stream)
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Theo dõi chi tiết từng lượt chuyển hướng, thiết bị, hệ điều hành và nguồn truy cập
          </p>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {activeSourceFilter && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs">
              <span>Nguồn: <strong>{activeSourceFilter}</strong></span>
              <button 
                onClick={onClearSourceFilter}
                className="hover:text-white font-bold ml-1"
                title="Bỏ lọc nguồn"
              >
                ✕
              </button>
            </div>
          )}

          {/* Filter by slug */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={slugFilter}
              onChange={e => setSlugFilter(e.target.value)}
              placeholder="Lọc slug..."
              className="w-28 sm:w-36 bg-neutral-950/80 border border-neutral-800 rounded-lg pl-7 pr-2 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60 transition"
            />
          </div>

          {/* Filter by device */}
          <select
            value={deviceFilter}
            onChange={e => setDeviceFilter(e.target.value)}
            className="bg-neutral-950/80 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none"
          >
            <option value="ALL">Mọi Thiết Bị</option>
            <option value="Mobile">Mobile</option>
            <option value="Desktop">Desktop</option>
            <option value="Tablet">Tablet</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            title="Làm mới ngay"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-neutral-950/95 backdrop-blur-sm z-10">
            <tr className="border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              <th className="py-2.5 px-4">Thời Gian</th>
              <th className="py-2.5 px-3">Link Rút Gọn</th>
              <th className="py-2.5 px-3">Nguồn (Source)</th>
              <th className="py-2.5 px-3">Thiết Bị & Trình Duyệt</th>
              <th className="py-2.5 px-3">Địa Chỉ IP (Masked)</th>
              <th className="py-2.5 px-4 text-center">Loại Click</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-mono">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 font-sans">
                  Chưa có nhật ký nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const badgeStyle = getSourceBadge(log.source);
                const d = new Date(log.timestamp);
                const timeFormatted = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
                const dateFormatted = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

                return (
                  <tr key={log.id} className="hover:bg-neutral-800/20 transition">
                    {/* Timestamp */}
                    <td className="py-2.5 px-4 text-neutral-400 whitespace-nowrap">
                      <span className="text-white font-semibold">{timeFormatted}</span>
                      <span className="text-[10px] text-neutral-500 ml-1.5">{dateFormatted}</span>
                    </td>

                    {/* Slug */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                        /link/{log.linkSlug}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                      <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${badgeStyle}`}>
                        {log.source}
                      </span>
                    </td>

                    {/* Device & Browser */}
                    <td className="py-2.5 px-3 font-sans text-neutral-300">
                      <div className="flex items-center gap-1.5">
                        {getDeviceIcon(log.device)}
                        <span>{log.device}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          • {log.browser} ({log.os})
                        </span>
                      </div>
                    </td>

                    {/* IP */}
                    <td className="py-2.5 px-3 text-neutral-400 text-[11px]">
                      {log.ip}
                    </td>

                    {/* Unique / Repeat */}
                    <td className="py-2.5 px-4 text-center font-sans">
                      {log.isUnique ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Unique
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                          <Repeat className="w-3 h-3" /> Lặp lại
                        </span>
                      )}
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
