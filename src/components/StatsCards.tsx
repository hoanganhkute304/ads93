import React from 'react';
import { MousePointerClick, Users, Clock, Eye, Link as LinkIcon, TrendingUp } from 'lucide-react';
import { AnalyticsData } from '../types';

interface StatsCardsProps {
  analytics: AnalyticsData | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ analytics }) => {
  if (!analytics) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-900/60 border border-neutral-800" />
        ))}
      </div>
    );
  }

  const uniqueRatio = analytics.totalClicks > 0 
    ? Math.round((analytics.uniqueClicks / analytics.totalClicks) * 100) 
    : 0;

  const cards = [
    {
      title: 'Tổng Lượt Click',
      value: analytics.totalClicks.toLocaleString(),
      subtext: `+${analytics.clicks24h} click trong 24h qua`,
      icon: MousePointerClick,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
    {
      title: 'Click Duy Nhất (Unique)',
      value: analytics.uniqueClicks.toLocaleString(),
      subtext: `Chiếm ${uniqueRatio}% tổng lưu lượng`,
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      title: 'Lượt Xem Banner Ảnh',
      value: analytics.totalBannerViews.toLocaleString(),
      subtext: `${analytics.activeBannersCount} banner đang phân phối`,
      icon: Eye,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20'
    },
    {
      title: 'Link Đang Hoạt Động',
      value: analytics.activeLinksCount.toString(),
      subtext: `${analytics.clicks7d} click trong 7 ngày`,
      icon: LinkIcon,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="group relative overflow-hidden rounded-2xl bg-neutral-900/70 border border-neutral-800/90 p-4 transition-all hover:border-neutral-700 hover:bg-neutral-900/90 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-400">{card.title}</span>
              <div className={`p-2 rounded-xl ${card.bgColor} ${card.color} border ${card.borderColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white font-mono">
                {card.value}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
