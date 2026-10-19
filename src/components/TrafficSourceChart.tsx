import React from 'react';
import { 
  Compass, 
  Smartphone, 
  Monitor, 
  Tablet, 
  ExternalLink,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { AnalyticsData, SourceStat } from '../types';

interface TrafficSourceChartProps {
  analytics: AnalyticsData | null;
  onFilterSource?: (sourceName: string) => void;
}

export const TrafficSourceChart: React.FC<TrafficSourceChartProps> = ({ 
  analytics,
  onFilterSource 
}) => {
  if (!analytics) return null;

  const sources = analytics.sources || [];
  const devices = analytics.devices || { Mobile: 0, Desktop: 0, Tablet: 0 };
  const totalDeviceClicks = Object.values(devices).reduce((a, b) => a + b, 0) || 1;

  const getSourceIconColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('tiktok')) return { bg: 'bg-[#ff0050]/15 text-[#ff0050] border-[#ff0050]/30', bar: 'bg-[#ff0050]' };
    if (lower.includes('facebook')) return { bg: 'bg-[#1877f2]/15 text-[#1877f2] border-[#1877f2]/30', bar: 'bg-[#1877f2]' };
    if (lower.includes('zalo')) return { bg: 'bg-[#0068ff]/15 text-[#0068ff] border-[#0068ff]/30', bar: 'bg-[#0068ff]' };
    if (lower.includes('google')) return { bg: 'bg-[#ea4335]/15 text-[#ea4335] border-[#ea4335]/30', bar: 'bg-[#ea4335]' };
    if (lower.includes('instagram')) return { bg: 'bg-[#e1306c]/15 text-[#e1306c] border-[#e1306c]/30', bar: 'bg-[#e1306c]' };
    if (lower.includes('youtube')) return { bg: 'bg-[#ff0000]/15 text-[#ff0000] border-[#ff0000]/30', bar: 'bg-[#ff0000]' };
    if (lower.includes('direct')) return { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', bar: 'bg-emerald-500' };
    return { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30', bar: 'bg-amber-500' };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Sources Breakdown (2 cols) */}
      <div className="lg:col-span-2 rounded-2xl bg-neutral-900/70 border border-neutral-800/90 p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Phân Tích Nguồn Lưu Lượng (Traffic Sources)
                </h3>
                <p className="text-[11px] text-neutral-400">
                  Đo lường chi tiết từng kênh để tối ưu hóa ngân sách và chiến dịch
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700">
              {sources.length} Kênh phát hiện
            </span>
          </div>

          {sources.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              Chưa có dữ liệu nguồn truy cập. Hãy thử click một link rút gọn!
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((item, idx) => {
                const colors = getSourceIconColor(item.name);
                return (
                  <div
                    key={idx}
                    onClick={() => onFilterSource?.(item.name)}
                    className="group cursor-pointer rounded-xl p-2.5 bg-neutral-950/40 border border-neutral-800/60 hover:border-neutral-700 hover:bg-neutral-800/30 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${colors.bg}`}>
                          {item.name}
                        </span>
                        <span className="text-neutral-400 text-[11px] hidden sm:inline">
                          {item.unique} Unique
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-white">{item.count} clicks</span>
                        <span className="text-[11px] text-amber-400 font-semibold w-9 text-right">
                          {item.percentage}%
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition" />
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
                        style={{ width: `${Math.max(item.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
          <span>💡 Mẹo: Nhấp vào nguồn để lọc nhanh nhật ký tương ứng</span>
          <span className="font-mono text-neutral-300">UTM Tracking: Bật</span>
        </div>
      </div>

      {/* Device & Browser Distribution (1 col) */}
      <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/90 p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Thiết Bị Người Dùng
              </h3>
              <p className="text-[11px] text-neutral-400">
                Tỷ lệ phân phối theo loại màn hình
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Mobile */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Điện Thoại (Mobile)</span>
                </div>
                <div className="font-mono font-bold text-white">
                  {devices.Mobile || 0}
                  <span className="text-[11px] text-neutral-400 font-normal ml-1.5">
                    ({Math.round(((devices.Mobile || 0) / totalDeviceClicks) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${((devices.Mobile || 0) / totalDeviceClicks) * 100}%` }}
                />
              </div>
            </div>

            {/* Desktop */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  <span>Máy Tính (Desktop)</span>
                </div>
                <div className="font-mono font-bold text-white">
                  {devices.Desktop || 0}
                  <span className="text-[11px] text-neutral-400 font-normal ml-1.5">
                    ({Math.round(((devices.Desktop || 0) / totalDeviceClicks) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 rounded-full transition-all duration-500"
                  style={{ width: `${((devices.Desktop || 0) / totalDeviceClicks) * 100}%` }}
                />
              </div>
            </div>

            {/* Tablet */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Tablet className="w-4 h-4 text-purple-400" />
                  <span>Máy Tính Bảng (Tablet)</span>
                </div>
                <div className="font-mono font-bold text-white">
                  {devices.Tablet || 0}
                  <span className="text-[11px] text-neutral-400 font-normal ml-1.5">
                    ({Math.round(((devices.Tablet || 0) / totalDeviceClicks) * 100)}%)
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full transition-all duration-500"
                  style={{ width: `${((devices.Tablet || 0) / totalDeviceClicks) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature box */}
        <div className="mt-4 p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-[11px] text-neutral-300">
          <div className="font-semibold text-amber-400 mb-0.5">Tối ưu hóa Bio & Social</div>
          <div>Mobile chiếm phần lớn lưu lượng TikTok & Facebook. Đảm bảo trang đích load mượt trên iOS/Android.</div>
        </div>
      </div>
    </div>
  );
};
