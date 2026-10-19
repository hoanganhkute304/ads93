import React from 'react';
import { Activity, Clock } from 'lucide-react';
import { HourlyStat } from '../types';

interface HourlyChartProps {
  hourlyTrend: HourlyStat[];
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ hourlyTrend }) => {
  if (!hourlyTrend || hourlyTrend.length === 0) return null;

  const maxVal = Math.max(...hourlyTrend.map(h => h.count), 5);

  return (
    <div className="rounded-2xl bg-neutral-900/70 border border-neutral-800/90 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Biểu Đồ Lượt Click Theo Giờ (24 Giờ Qua)
            </h3>
            <p className="text-[11px] text-neutral-400">
              Nhận diện khung giờ vàng có tỷ lệ click cao nhất trong ngày
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
          <Clock className="w-3.5 h-3.5 text-neutral-500" />
          <span>Realtime Stream</span>
        </div>
      </div>

      {/* Bar visualizer */}
      <div className="h-28 flex items-end gap-1 sm:gap-2 pt-4 px-1 border-b border-neutral-800">
        {hourlyTrend.map((item, idx) => {
          const heightPercent = Math.max(Math.round((item.count / maxVal) * 100), 6);
          const isPeak = item.count === maxVal && maxVal > 0;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              {/* Tooltip on hover */}
              <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none z-20 px-2 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-white whitespace-nowrap shadow-lg border border-neutral-700">
                {item.hour}: <strong>{item.count} click</strong>
              </div>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all duration-300 ${
                  isPeak 
                    ? 'bg-amber-400 shadow-md shadow-amber-500/30' 
                    : item.count > 0 
                      ? 'bg-neutral-600 group-hover:bg-amber-400/80' 
                      : 'bg-neutral-800/50'
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Hours ticks */}
      <div className="flex justify-between mt-2 text-[10px] font-mono text-neutral-500 px-1">
        <span>{hourlyTrend[0]?.hour || '00:00'}</span>
        <span className="hidden sm:inline">{hourlyTrend[Math.floor(hourlyTrend.length / 2)]?.hour}</span>
        <span>{hourlyTrend[hourlyTrend.length - 1]?.hour || '23:00'} (Hiện tại)</span>
      </div>
    </div>
  );
};
