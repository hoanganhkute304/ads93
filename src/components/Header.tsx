import React, { useState } from 'react';
import { 
  Zap, 
  Plus, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileText, 
  Sparkles, 
  RotateCcw,
  Check,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  onOpenCreateLink: () => void;
  onOpenCreateBanner: () => void;
  onOpenSimulator: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onResetSeed: () => void;
  isLiveUpdating: boolean;
  onToggleLive: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreateLink,
  onOpenCreateBanner,
  onOpenSimulator,
  onExportExcel,
  onExportPdf,
  onResetSeed,
  isLiveUpdating,
  onToggleLive
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (confirm('Khôi phục dữ liệu mẫu ban đầu (bao gồm link1 -> TikTok và banner1 -> Sephoang)?')) {
      setResetting(true);
      await onResetSeed();
      setResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 font-black tracking-tight text-lg">
              93
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
                  ADS93
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Ultra Fast
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Quản lý Link & Banner Quảng Cáo Tập Trung
              </p>
            </div>
          </div>

          {/* Real-time Status indicator */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>🔥 Firebase Firestore Thật</span>
            </span>
            <button
              onClick={onToggleLive}
              title="Nhấn để bật/tắt tự động đồng bộ thời gian thực"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isLiveUpdating
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLiveUpdating ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
              <span>{isLiveUpdating ? 'Đồng bộ trực tiếp' : 'Tạm dừng'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* Quick simulator */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 transition"
            title="Thử nghiệm click giả lập từ TikTok, Facebook, Zalo..."
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Mô phỏng</span> Click
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất Báo Cáo</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 mt-1.5 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportExcel();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-200 transition"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold">Xuất File Excel (.xlsx)</div>
                      <div className="text-[10px] text-neutral-400">Đầy đủ 5 sheet dữ liệu</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                      onExportPdf();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-200 transition"
                  >
                    <FileText className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-semibold">Xuất File PDF</div>
                      <div className="text-[10px] text-neutral-400">Báo cáo chiến dịch trực quan</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Reset seed */}
          <button
            onClick={handleReset}
            disabled={resetting}
            title="Khôi phục lại dữ liệu mẫu của hệ thống"
            className="p-1.5 text-xs rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
          </button>

          {/* Add Banner button */}
          <button
            onClick={onOpenCreateBanner}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-700 transition"
          >
            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
            <span>Thêm Banner</span>
          </button>

          {/* Add Link button */}
          <button
            onClick={onOpenCreateLink}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Link Mới</span>
          </button>
        </div>
      </div>
    </header>
  );
};
