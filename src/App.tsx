import React, { useState, useEffect, useMemo } from 'react';
import { 
  Link2, 
  Image as ImageIcon, 
  BarChart3, 
  Plus, 
  Copy, 
  Check, 
  ExternalLink, 
  Trash2, 
  QrCode, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  Search, 
  CheckCircle2, 
  Sparkles, 
  Film, 
  RotateCw, 
  SlidersHorizontal,
  Maximize2,
  X,
  Edit2,
  Eye,
  CheckCheck
} from 'lucide-react';
import { api } from './services/api';
import { LinkItem, ImageBannerItem, AnalyticsData, ClickLog, SourceStat, HourlyStat } from './types';
import { QRCodeModal } from './components/QRCodeModal';
import { exportToExcel, exportToPdf } from './utils/exportReport';
import { 
  subscribeLinks, 
  subscribeBanners, 
  subscribeClickLogs, 
  addLinkToFirestore, 
  updateLinkInFirestore, 
  deleteLinkFromFirestore, 
  addBannerToFirestore, 
  updateBannerInFirestore,
  deleteBannerFromFirestore, 
  testConnection 
} from './firebase';

export interface AspectRatioOption {
  id: string;
  label: string;
  category: string;
  ratio: string;
  desc: string;
  badge: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  // --- NHÓM ĐIỆN ẢNH & SIÊU RỘNG ---
  { id: '2.4:1', label: '🎬 Điện ảnh 2.4:1', category: 'Điện ảnh', ratio: '2.4 / 1', desc: 'Chuẩn CinemaScope rạp chiếu phim (2.39:1 / 2.40:1)', badge: 'Cinema 2.4:1' },
  { id: '2.35:1', label: '🎬 Điện ảnh Cổ Điển 2.35:1', category: 'Điện ảnh', ratio: '2.35 / 1', desc: 'Chuẩn Anamorphic phim kinh điển', badge: 'Cinema 2.35:1' },
  { id: '2.76:1', label: '🎞️ Siêu Điện ảnh 2.76:1', category: 'Điện ảnh', ratio: '2.76 / 1', desc: 'Ultra-Panavision 70mm đại cảnh siêu rộng', badge: 'Ultra 2.76:1' },
  { id: '21:9', label: '🖥️ Màn Siêu Rộng 21:9', category: 'Điện ảnh', ratio: '21 / 9', desc: 'Màn hình Ultrawide gaming & rạp gia đình', badge: 'Ultrawide 21:9' },
  { id: '2:1', label: '📺 Univisium 2:1 (18:9)', category: 'Điện ảnh', ratio: '2 / 1', desc: 'Chuẩn phim Netflix Originals & series truyền hình', badge: 'Univisium 2:1' },

  // --- NHÓM MÀN RỘNG TIÊU CHUẨN & ADS ---
  { id: '16:9', label: '🖥️ Màn ảnh rộng 16:9', category: 'Tiêu chuẩn', ratio: '16 / 9', desc: 'Chuẩn YouTube, Full HD, TV, Laptop & Web Banner', badge: 'Widescreen 16:9' },
  { id: '1.91:1', label: '📢 Facebook Ads 1.91:1', category: 'Quảng cáo', ratio: '1.91 / 1', desc: 'Chuẩn quảng cáo liên kết Facebook & Google GDN', badge: 'Facebook 1.91:1' },
  { id: '3:1', label: '🏷️ Banner Header 3:1', category: 'Banner Web', ratio: '3 / 1', desc: 'Banner đầu trang website, cover Facebook fanpage', badge: 'Header 3:1' },
  { id: '4:1', label: '🏷️ Siêu Banner Ngang 4:1', category: 'Banner Web', ratio: '4 / 1', desc: 'Leaderboard dài ngang trên cùng website (1200x300)', badge: 'Leaderboard 4:1' },
  { id: '5:1', label: '🏷️ Dải Ruy Băng 5:1', category: 'Banner Web', ratio: '5 / 1', desc: 'Super Ribbon dải thông báo trên cùng hoặc chân trang', badge: 'Ribbon 5:1' },
  { id: '3:2', label: '📷 Máy ảnh DSLR 3:2', category: 'Tiêu chuẩn', ratio: '3 / 2', desc: 'Chuẩn nhiếp ảnh máy cơ & báo điện tử', badge: 'Photo 3:2' },
  { id: '4:3', label: '📰 Truyền thống 4:3', category: 'Tiêu chuẩn', ratio: '4 / 3', desc: 'Chuẩn TV xưa, màn hình iPad & GDN Box Banner', badge: 'Standard 4:3' },

  // --- NHÓM VUÔNG & MẠNG XÃ HỘI ---
  { id: '1:1', label: '🟦 Khổ Vuông 1:1', category: 'Mạng xã hội', ratio: '1 / 1', desc: 'Instagram Post, Shopee, Lazada, TikTok Shop Feed', badge: 'Square 1:1' },
  { id: '4:5', label: '📱 Chân dung Dọc 4:5', category: 'Mạng xã hội', ratio: '4 / 5', desc: 'Instagram Portrait Feed tối ưu chiếm trọn màn hình', badge: 'Portrait 4:5' },

  // --- NHÓM KHỔ DỌC TIKTOK / REELS / SHORTS ---
  { id: '9:16', label: '📱 Khổ Dọc Chuẩn 9:16', category: 'Khổ Dọc', ratio: '9 / 16', desc: 'TikTok Ads, FB/IG Reels, YouTube Shorts, Story', badge: 'TikTok 9:16' },
  { id: '9:21', label: '📱 Dọc Siêu Dài 9:21', category: 'Khổ Dọc', ratio: '9 / 21', desc: 'Màn hình điện thoại tràn viền dọc', badge: 'Mobile 9:21' },
  { id: '1:2', label: '🔲 Cột Dọc Skyscraper 1:2', category: 'Banner Dọc', ratio: '1 / 2', desc: 'Half-Page Ad (300x600) cạnh sườn website', badge: 'Skyscraper 1:2' },
  { id: '1:3', label: '🔲 Banner Tháp 1:3', category: 'Banner Dọc', ratio: '1 / 3', desc: 'Wide Skyscraper (160x600) thanh dọc trang', badge: 'Tower 1:3' },
  { id: 'auto', label: '🎛️ Tỉ lệ gốc (Auto)', category: 'Tự do', ratio: 'auto', desc: 'Hiển thị kích thước nguyên bản của tệp ảnh', badge: 'Auto' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'links' | 'banners' | 'analytics'>('links');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [banners, setBanners] = useState<ImageBannerItem[]>([]);
  const [logs, setLogs] = useState<ClickLog[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick edit state for destination URL
  const [editingDest, setEditingDest] = useState<Record<string, string>>({});
  const [savingDestId, setSavingDestId] = useState<string | null>(null);

  // Aspect ratio state for each banner card
  const [cardRatios, setCardRatios] = useState<Record<string, string>>({});
  // Object fit mode for banners: 'contain' vs 'cover'
  const [cardFitModes, setCardFitModes] = useState<Record<string, 'contain' | 'cover'>>({});

  // Image load error state to display friendly retry
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  // Image loaded state for smooth shimmer reveal
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Inline edit state for banner image URL
  const [editingBannerImgId, setEditingBannerImgId] = useState<string | null>(null);
  const [tempBannerImgUrl, setTempBannerImgUrl] = useState<string>('');
  const [isSavingBannerImg, setIsSavingBannerImg] = useState<boolean>(false);

  // Cinema Lightbox Modal for banner review
  const [cinemaReviewBanner, setCinemaReviewBanner] = useState<ImageBannerItem | null>(null);

  // New Link form state
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkSlug, setNewLinkSlug] = useState('');
  const [newLinkDest, setNewLinkDest] = useState('');

  // New Banner form state
  const [showCreateBanner, setShowCreateBanner] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSlug, setNewBannerSlug] = useState('');
  const [newBannerUrl, setNewBannerUrl] = useState('');
  const [newBannerRatio, setNewBannerRatio] = useState('2.4:1');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [bannerCategoryFilter, setBannerCategoryFilter] = useState<string>('Tất cả');

  // QR Modal
  const [qrData, setQrData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // In-app Delete Confirmation Modal (Bypasses sandboxed window.confirm)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'link' | 'banner';
    id: string;
    slug: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  // Test Firebase on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Real-time Firestore subscriptions
  useEffect(() => {
    const unsubLinks = subscribeLinks(data => {
      setLinks(data);
      const destMap: Record<string, string> = {};
      data.forEach(l => {
        destMap[l.id] = l.destinationUrl;
      });
      setEditingDest(prev => ({ ...destMap, ...prev }));
    });

    const unsubBanners = subscribeBanners(data => {
      setBanners(data);
      // Initialize card ratios from saved banner data or default 2.4:1
      const rMap: Record<string, string> = {};
      data.forEach(b => {
        rMap[b.id] = b.aspectRatio || '2.4:1';
      });
      setCardRatios(prev => ({ ...rMap, ...prev }));
    });

    const unsubLogs = subscribeClickLogs(data => {
      setLogs(data);
    });

    return () => {
      unsubLinks();
      unsubBanners();
      unsubLogs();
    };
  }, []);

  // Show Toast
  const notify = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    notify(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Ensure absolute protocol on any destination URL
  const formatDestinationUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  // Save Destination URL immediately
  const handleSaveDestination = async (link: LinkItem) => {
    const rawTarget = (editingDest[link.id] || '').trim();
    if (!rawTarget) {
      alert('Vui lòng nhập đường dẫn trang đích hợp lệ');
      return;
    }

    const newTarget = formatDestinationUrl(rawTarget);

    try {
      setSavingDestId(link.id);
      // 1. Update in Firestore
      await updateLinkInFirestore(link.id, { destinationUrl: newTarget });
      // 2. Update in server backend
      await api.updateLink(link.id, { destinationUrl: newTarget, slug: link.slug }).catch(() => {});
      
      setEditingDest(prev => ({ ...prev, [link.id]: newTarget }));
      notify(`Đã đổi trang đích /link/${link.slug} sang: ${newTarget}`);
    } catch (err: any) {
      notify('Lỗi cập nhật: ' + (err.message || 'Không thể lưu'));
    } finally {
      setSavingDestId(null);
    }
  };

  // Create new short link
  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = newLinkSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanSlug || !newLinkDest.trim()) {
      notify('Vui lòng nhập slug và link trang đích');
      return;
    }

    const cleanDest = formatDestinationUrl(newLinkDest);

    try {
      await addLinkToFirestore({
        title: newLinkTitle.trim() || `Link ${cleanSlug}`,
        slug: cleanSlug,
        destinationUrl: cleanDest,
        tags: []
      });
      await api.createLink({
        title: newLinkTitle.trim() || `Link ${cleanSlug}`,
        slug: cleanSlug,
        destinationUrl: cleanDest
      }).catch(() => {});

      notify(`Đã tạo link /link/${cleanSlug} thành công!`);
      setShowCreateLink(false);
      setNewLinkTitle('');
      setNewLinkSlug('');
      setNewLinkDest('');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể tạo link'));
    }
  };

  // Delete link - opens in-app confirmation modal
  const handleDeleteLink = (id: string, slug: string, title?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'link',
      id,
      slug,
      title: title || `/link/${slug}`
    });
  };

  // Upload image file
  const handleUploadBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: base64Data })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Lỗi lưu ảnh');

      setNewBannerUrl(json.url);
      if (!newBannerTitle) setNewBannerTitle(file.name.replace(/\.[^/.]+$/, ''));
      if (!newBannerSlug) setNewBannerSlug(file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
      notify('Tải ảnh lên máy chủ thành công!');
    } catch (err: any) {
      notify('Lỗi tải ảnh: ' + (err.message || 'Không thể tải'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Create new banner
  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = newBannerSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanSlug || !newBannerUrl.trim()) {
      notify('Vui lòng nhập mã ảnh slug và chọn ảnh');
      return;
    }

    try {
      await addBannerToFirestore({
        title: newBannerTitle.trim() || `Banner ${cleanSlug}`,
        slug: cleanSlug,
        imageUrl: newBannerUrl.trim(),
        aspectRatio: newBannerRatio,
        dimensions: '1200x630'
      });
      await api.createImage({
        title: newBannerTitle.trim() || `Banner ${cleanSlug}`,
        slug: cleanSlug,
        imageUrl: newBannerUrl.trim(),
        dimensions: '1200x630'
      }).catch(() => {});

      notify(`Đã tạo banner /image/${cleanSlug} với tỉ lệ ${newBannerRatio}!`);
      setShowCreateBanner(false);
      setNewBannerTitle('');
      setNewBannerSlug('');
      setNewBannerUrl('');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể lưu banner'));
    }
  };

  // Change banner aspect ratio on the fly with persistent Firestore update
  const handleUpdateBannerRatio = async (banner: ImageBannerItem, newRatio: string) => {
    setCardRatios(prev => ({ ...prev, [banner.id]: newRatio }));
    try {
      // 1. Update in Firestore
      await updateBannerInFirestore(banner.id, { aspectRatio: newRatio });
      // 2. Update on server backend
      await api.updateImage(banner.id, { aspectRatio: newRatio, slug: banner.slug }).catch(() => {});
      notify(`Đã chuyển banner sang tỉ lệ: ${newRatio}`);
    } catch (err: any) {
      console.error('Failed to update ratio in Firestore:', err);
    }
  };

  // Quick edit banner image URL directly
  const handleStartEditBannerImg = (banner: ImageBannerItem) => {
    setEditingBannerImgId(banner.id);
    setTempBannerImgUrl(banner.imageUrl);
  };

  const handleSaveBannerImgUrl = async (banner: ImageBannerItem) => {
    const cleanUrl = tempBannerImgUrl.trim();
    if (!cleanUrl) {
      notify('Vui lòng nhập đường dẫn ảnh hợp lệ');
      return;
    }

    try {
      setIsSavingBannerImg(true);
      await updateBannerInFirestore(banner.id, { imageUrl: cleanUrl });
      await api.updateImage(banner.id, { imageUrl: cleanUrl, slug: banner.slug }).catch(() => {});
      
      setFailedImages(prev => ({ ...prev, [banner.id]: false }));
      setLoadedImages(prev => ({ ...prev, [banner.id]: false }));
      setEditingBannerImgId(null);
      notify('Đã cập nhật ảnh banner mới!');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể cập nhật ảnh'));
    } finally {
      setIsSavingBannerImg(false);
    }
  };

  // Toggle object fit between contain and cover
  const toggleFitMode = (id: string) => {
    setCardFitModes(prev => ({
      ...prev,
      [id]: prev[id] === 'contain' ? 'cover' : 'contain'
    }));
  };

  // Delete banner - opens in-app confirmation modal
  const handleDeleteBanner = (id: string, slug: string, title?: string) => {
    setDeleteModal({
      isOpen: true,
      type: 'banner',
      id,
      slug,
      title: title || `/image/${slug}`
    });
  };

  // Perform confirmed deletion for either link or banner
  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id, slug } = deleteModal;
    setIsDeleting(true);

    try {
      if (type === 'link') {
        // Optimistic UI update
        setLinks(prev => prev.filter(l => l.id !== id && l.slug !== slug));
        await deleteLinkFromFirestore(id, slug);
        await api.deleteLink(id).catch(() => {});
        notify(`Đã xóa vĩnh viễn link /link/${slug}`);
      } else {
        // Optimistic UI update
        setBanners(prev => prev.filter(b => b.id !== id && b.slug !== slug));
        if (cinemaReviewBanner && (cinemaReviewBanner.id === id || cinemaReviewBanner.slug === slug)) {
          setCinemaReviewBanner(null);
        }
        await deleteBannerFromFirestore(id, slug);
        await api.deleteImage(id).catch(() => {});
        notify(`Đã xóa vĩnh viễn banner /image/${slug}`);
      }
      setDeleteModal(null);
    } catch (err: any) {
      notify(`Lỗi khi xóa: ${err.message || 'Không thể xóa'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute live analytics
  const analyticsData: AnalyticsData = useMemo(() => {
    const totalClicks = links.reduce((sum, l) => sum + (l.totalClicks || 0), 0);
    const uniqueClicks = links.reduce((sum, l) => sum + (l.uniqueClicks || 0), 0);
    const totalBannerViews = banners.reduce((sum, b) => sum + (b.viewsCount || 0), 0);

    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

    const clicks24h = logs.filter(l => new Date(l.timestamp).getTime() >= oneDayAgo).length;
    const clicks7d = logs.filter(l => new Date(l.timestamp).getTime() >= sevenDaysAgo).length;

    const sourceCount: Record<string, { count: number; unique: number }> = {};
    for (const log of logs) {
      const src = log.source || 'Direct';
      if (!sourceCount[src]) sourceCount[src] = { count: 0, unique: 0 };
      sourceCount[src].count += 1;
      if (log.isUnique) sourceCount[src].unique += 1;
    }

    const sources: SourceStat[] = Object.entries(sourceCount)
      .map(([name, d]) => ({
        name,
        count: d.count,
        unique: d.unique,
        percentage: logs.length > 0 ? Math.round((d.count / logs.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    const devices: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0, Other: 0 };
    for (const log of logs) {
      const dev = log.device || 'Other';
      devices[dev] = (devices[dev] || 0) + 1;
    }

    const hourlyMap: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600 * 1000);
      hourlyMap[`${d.getHours().toString().padStart(2, '0')}:00`] = 0;
    }
    for (const log of logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime >= oneDayAgo) {
        const d = new Date(logTime);
        const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyMap[hourStr] !== undefined) hourlyMap[hourStr] += 1;
      }
    }

    const hourlyTrend: HourlyStat[] = Object.entries(hourlyMap).map(([hour, count]) => ({ hour, count }));

    return {
      totalClicks,
      uniqueClicks,
      totalBannerViews,
      clicks24h,
      clicks7d,
      activeLinksCount: links.filter(l => l.isActive).length,
      activeBannersCount: banners.filter(b => b.isActive).length,
      sources,
      devices,
      hourlyTrend
    };
  }, [links, banners, logs]);

  const filteredLinks = links.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.destinationUrl.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBanners = banners.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-neutral-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs transition-all animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Simplified Modern Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-sm shadow-md shadow-amber-500/20">
              93
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">ADS93</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ⚡ Firestore Live
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Rút gọn link chuyển hướng siêu tốc & Ảnh banner đa tỉ lệ điện ảnh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToExcel(analyticsData, links, banners, logs)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition"
              title="Xuất file Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>
            <button
              onClick={() => exportToPdf(analyticsData, links, banners, logs)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition"
              title="Xuất file PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Xuất PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 space-y-6">
        {/* Simple 3-Tab Selector */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'links'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Link Rút Gọn ({links.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'banners'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Ảnh Banner ({banners.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'analytics'
                ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Thống Kê Lượt Click</span>
          </button>
        </div>

        {/* TAB 1: LINKS MANAGEMENT */}
        {activeTab === 'links' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/80">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm link theo slug, tên, đích..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <button
                onClick={() => setShowCreateLink(!showCreateLink)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Tạo Link Mới</span>
              </button>
            </div>

            {/* Create Link Drawer / Card */}
            {showCreateLink && (
              <form onSubmit={handleCreateLink} className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-3 text-xs">
                <div className="font-bold text-white flex items-center gap-2 text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Tạo Đường Dẫn Rút Gọn Mới</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Tên chiến dịch:</label>
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={e => setNewLinkTitle(e.target.value)}
                      placeholder="VD: Kênh YouTube Neon 9393"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Mã rút gọn (Slug): *</label>
                    <div className="flex items-center">
                      <span className="bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl px-2.5 py-2 text-neutral-500 font-mono text-[11px]">
                        /link/
                      </span>
                      <input
                        type="text"
                        value={newLinkSlug}
                        onChange={e => setNewLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="ytb"
                        required
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-r-xl px-2.5 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Trang đích thực tế: *</label>
                    <input
                      type="text"
                      value={newLinkDest}
                      onChange={e => setNewLinkDest(e.target.value)}
                      placeholder="https://youtube.com/@neon93"
                      required
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateLink(false)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
                  >
                    Lưu Link
                  </button>
                </div>
              </form>
            )}

            {/* Links List Cards */}
            <div className="space-y-3">
              {filteredLinks.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs bg-neutral-900/30 rounded-2xl border border-neutral-800/80">
                  Chưa có link nào. Hãy nhấn "+ Tạo Link Mới" ở trên!
                </div>
              ) : (
                filteredLinks.map(link => {
                  const shortUrl = `${origin}/link/${link.slug}`;
                  const currentDest = editingDest[link.id] !== undefined ? editingDest[link.id] : link.destinationUrl;
                  const hasChanged = currentDest.trim() !== link.destinationUrl.trim();

                  return (
                    <div
                      key={link.id}
                      className="p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition space-y-3"
                    >
                      {/* Top Bar of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/60 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{link.title}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            ({link.totalClicks || 0} clicks)
                          </span>
                        </div>

                        {/* Short link copy & direct jump bar */}
                        <div className="flex items-center gap-1.5 self-start sm:self-center">
                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {shortUrl}
                          </span>
                          <button
                            onClick={() => handleCopy(shortUrl)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition flex items-center gap-1 text-xs"
                            title="Sao chép link rút gọn"
                          >
                            {copiedText === shortUrl ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 text-[10px]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[10px]">Chép link</span>
                              </>
                            )}
                          </button>

                          {/* Direct redirect: Jumps instantly to destination without any intermediate page */}
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition flex items-center gap-1 text-[11px]"
                            title="Thử nhảy ngay sang trang đích"
                          >
                            <span>Thử link</span>
                            <ExternalLink className="w-3 h-3 stroke-[3]" />
                          </a>
                        </div>
                      </div>

                      {/* Instant Editable Destination URL */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-neutral-400 font-medium">Trang đích thực tế (Sửa link rồi bấm lưu để chuyển hướng ngay):</span>
                          {hasChanged && (
                            <span className="text-amber-400 font-semibold animate-pulse">
                              * Đã có thay đổi chưa lưu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={currentDest}
                            onChange={e => {
                              const val = e.target.value;
                              setEditingDest(prev => ({ ...prev, [link.id]: val }));
                            }}
                            placeholder="https://..."
                            className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono transition"
                          />
                          <button
                            onClick={() => handleSaveDestination(link)}
                            disabled={savingDestId === link.id}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                              hasChanged
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                            }`}
                          >
                            {savingDestId === link.id ? 'Đang lưu...' : (hasChanged ? 'Lưu Đích Mới' : 'Cập Nhật')}
                          </button>
                        </div>
                      </div>

                      {/* Bottom action row */}
                      <div className="flex items-center justify-between text-[11px] pt-1 text-neutral-400">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setQrData({ isOpen: true, url: shortUrl, title: link.title })}
                            className="flex items-center gap-1 hover:text-white"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Mã QR</span>
                          </button>
                          <a
                            href={link.destinationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-amber-400 flex items-center gap-1 font-mono line-clamp-1 max-w-[200px] sm:max-w-xs"
                          >
                            <span>Mở thẳng link đích</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <button
                          onClick={() => handleDeleteLink(link.id, link.slug, link.title)}
                          className="text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition"
                          title="Xóa link rút gọn này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa link</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BANNERS MANAGEMENT */}
        {activeTab === 'banners' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/50 p-3 rounded-2xl border border-neutral-800/80">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  <span>Quản lý Banner Ảnh & Xem Review Trực Quan</span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  Hỗ trợ 19+ tỉ lệ: Điện ảnh 2.4:1, 2.35:1, 21:9, 16:9, TikTok 9:16, Vuông 1:1, Header 3:1...
                </div>
              </div>
              <button
                onClick={() => setShowCreateBanner(!showCreateBanner)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition shadow-sm active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Thêm Ảnh Banner Mới</span>
              </button>
            </div>

            {/* Create Banner Form */}
            {showCreateBanner && (
              <form onSubmit={handleCreateBanner} className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/40 space-y-4 text-xs">
                <div className="font-bold text-white flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    <span>Thêm Ảnh Banner & Tùy Chọn Tỉ Lệ Khung Hình</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateBanner(false)}
                    className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-neutral-400 mb-1">Tên ảnh / mô tả:</label>
                    <input
                      type="text"
                      value={newBannerTitle}
                      onChange={e => setNewBannerTitle(e.target.value)}
                      placeholder="VD: Banner Điện Ảnh Siêu Phẩm"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Mã ảnh slug: *</label>
                    <div className="flex items-center">
                      <span className="bg-neutral-950 border border-r-0 border-neutral-800 rounded-l-xl px-2.5 py-2 text-neutral-500 font-mono text-[11px]">
                        /image/
                      </span>
                      <input
                        type="text"
                        value={newBannerSlug}
                        onChange={e => setNewBannerSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="banner1"
                        required
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-r-xl px-2.5 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-neutral-300 font-semibold flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-amber-400" />
                      <span>Chọn Tỉ Lệ Khung Hình:</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold text-[10px]">
                        {newBannerRatio}
                      </span>
                    </label>

                    {/* Filter categories */}
                    <div className="flex items-center gap-1">
                      {['Tất cả', 'Điện ảnh', 'Tiêu chuẩn', 'Khổ Dọc', 'Mạng xã hội'].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setBannerCategoryFilter(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] transition ${
                            bannerCategoryFilter === cat
                              ? 'bg-neutral-700 text-white font-bold'
                              : 'bg-neutral-950 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1">
                    {ASPECT_RATIOS
                      .filter(r => bannerCategoryFilter === 'Tất cả' || r.category === bannerCategoryFilter)
                      .map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setNewBannerRatio(item.id)}
                          className={`p-2 rounded-xl text-left border transition text-xs flex flex-col justify-between ${
                            newBannerRatio === item.id
                              ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <span className="truncate font-semibold">{item.label}</span>
                          <span className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{item.desc}</span>
                        </button>
                    ))}
                  </div>
                </div>

                {/* Image Upload / Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-neutral-400">Nguồn ảnh: *</label>
                    <label className={`cursor-pointer text-[11px] flex items-center gap-1 ${isUploadingImage ? 'text-amber-400 animate-pulse' : 'text-amber-400 hover:text-amber-300 font-semibold'}`}>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingImage ? 'Đang tải lên...' : 'Tải ảnh từ máy tính'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleUploadBannerFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={newBannerUrl}
                    onChange={e => setNewBannerUrl(e.target.value)}
                    placeholder="Dán link ảnh (VD: https://sephoang.onrender.com/uploads/banner.png)"
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />

                  {/* Quick sample chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-neutral-500">Mẫu sẵn:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerUrl('https://sephoang.onrender.com/uploads/banner.png');
                        if (!newBannerSlug) setNewBannerSlug('banner1');
                        if (!newBannerTitle) setNewBannerTitle('Banner Sephoang');
                      }}
                      className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-amber-400 font-mono transition"
                    >
                      Dùng mẫu sephoang.png
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600&auto=format&fit=crop');
                        setNewBannerRatio('2.4:1');
                        if (!newBannerSlug) setNewBannerSlug('cinema-film');
                        if (!newBannerTitle) setNewBannerTitle('Điện Ảnh 2.4:1');
                      }}
                      className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-mono transition"
                    >
                      Mẫu Điện Ảnh 2.4:1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBannerUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop');
                        setNewBannerRatio('16:9');
                        if (!newBannerSlug) setNewBannerSlug('widescreen-banner');
                        if (!newBannerTitle) setNewBannerTitle('Màn Rộng 16:9');
                      }}
                      className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 font-mono transition"
                    >
                      Mẫu 16:9
                    </button>
                  </div>
                </div>

                {/* LIVE PREVIEW BOX - ALWAYS VISIBLE */}
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Khung Ảnh Review Xem Trước (Tỉ lệ: <span className="text-amber-400 font-mono">{newBannerRatio}</span>)</span>
                    </div>
                    <span className="text-neutral-500">Chuẩn rạp & hiển thị thực tế</span>
                  </div>

                  <div 
                    className="w-full bg-[#050505] rounded-xl overflow-hidden flex items-center justify-center border border-neutral-800 relative transition-all"
                    style={{ 
                      aspectRatio: (ASPECT_RATIOS.find(r => r.id === newBannerRatio)?.ratio || '2.4 / 1') === 'auto' ? '16 / 9' : (ASPECT_RATIOS.find(r => r.id === newBannerRatio)?.ratio || '2.4 / 1'),
                      maxHeight: '280px' 
                    }}
                  >
                    {newBannerUrl ? (
                      <img 
                        src={newBannerUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover transition-opacity duration-300"
                        onError={e => {
                          (e.target as HTMLElement).style.opacity = '0.5';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-4 text-neutral-600 space-y-1">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span className="text-xs">Dán link ảnh hoặc chọn tệp để xem khung preview tỉ lệ {newBannerRatio}</span>
                      </div>
                    )}

                    {/* Cinema frame border watermark */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-amber-400 font-mono border border-neutral-800">
                      TỈ LỆ: {newBannerRatio}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateBanner(false)}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
                  >
                    Lưu Ảnh Banner
                  </button>
                </div>
              </form>
            )}

            {/* Banners Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBanners.length === 0 ? (
                <div className="col-span-full py-16 text-center border-2 border-dashed border-neutral-800 rounded-2xl p-6 space-y-2">
                  <ImageIcon className="w-8 h-8 text-neutral-600 mx-auto" />
                  <div className="text-sm font-bold text-white">Chưa có banner nào</div>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Bấm "+ Thêm Ảnh Banner Mới" để thêm banner và tận hưởng khả năng điều chỉnh tỉ lệ điện ảnh 2.4:1, 16:9, 1:1, 9:16...
                  </p>
                </div>
              ) : (
                filteredBanners.map(banner => {
                  const directImageUrl = `${origin}/image/${banner.slug}`;
                  const currentRatioId = cardRatios[banner.id] || banner.aspectRatio || '2.4:1';
                  const ratioObj = ASPECT_RATIOS.find(r => r.id === currentRatioId) || ASPECT_RATIOS[0];
                  const fitMode = cardFitModes[banner.id] || 'cover';
                  const isImageFailed = failedImages[banner.id];
                  const isLoaded = loadedImages[banner.id];
                  const isEditingThisImg = editingBannerImgId === banner.id;

                  // Render direct image source with fallback to server endpoint
                  const rawSrc = banner.imageUrl;

                  return (
                    <div
                      key={banner.id}
                      className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden flex flex-col justify-between group hover:border-neutral-700 transition"
                    >
                      {/* Top Header of Card */}
                      <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-white text-xs truncate">{banner.title}</span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            /image/{banner.slug}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                          {banner.viewsCount || 0} views
                        </span>
                      </div>

                      {/* Aspect Ratio Switcher Bar on Card */}
                      <div className="px-3 py-1.5 bg-neutral-950/70 border-b border-neutral-800/60 flex items-center justify-between text-[11px] gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none flex-1">
                          <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="text-neutral-400 mr-1 shrink-0 text-[10px]">Tỉ lệ:</span>
                          
                          {/* Quick popular chips */}
                          {['2.4:1', '16:9', '21:9', '1:1', '9:16', '3:1'].map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleUpdateBannerRatio(banner, r)}
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition shrink-0 ${
                                currentRatioId === r
                                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                              }`}
                            >
                              {r}
                            </button>
                          ))}

                          {/* Full dropdown of all 19+ aspect ratios */}
                          <select
                            value={currentRatioId}
                            onChange={e => handleUpdateBannerRatio(banner, e.target.value)}
                            className="bg-neutral-800 border border-neutral-700 rounded text-[10px] text-neutral-200 px-1 py-0.5 font-mono focus:outline-none shrink-0"
                            title="Chọn trong tất cả tỉ lệ"
                          >
                            <optgroup label="Tất cả tỉ lệ có sẵn:">
                              {ASPECT_RATIOS.map(item => (
                                <option key={item.id} value={item.id}>
                                  {item.label}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        {/* Mode toggles */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => toggleFitMode(banner.id)}
                            className="text-[10px] font-mono text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-neutral-800/80 transition"
                            title="Chuyển chế độ lấp đầy (cover) hoặc trọn vẹn (contain)"
                          >
                            {fitMode === 'cover' ? 'Lấp đầy [Cover]' : 'Trọn vẹn [Contain]'}
                          </button>
                        </div>
                      </div>

                      {/* Preview Image Box in Chosen Ratio */}
                      <div 
                        className="w-full bg-[#050505] overflow-hidden flex items-center justify-center relative p-1 border-b border-neutral-800 cursor-pointer"
                        style={{ 
                          aspectRatio: ratioObj.ratio === 'auto' ? undefined : ratioObj.ratio,
                          minHeight: '140px',
                          maxHeight: '340px'
                        }}
                        onClick={() => setCinemaReviewBanner(banner)}
                        title="Bấm để mở chế độ xem phim toàn cảnh (Cinema Review)"
                      >
                        {!isImageFailed ? (
                          <div className="w-full h-full relative flex items-center justify-center">
                            {/* Loading skeleton placeholder */}
                            {!isLoaded && (
                              <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
                                <Film className="w-6 h-6 text-neutral-700 animate-spin" />
                              </div>
                            )}

                            <img
                              src={rawSrc}
                              alt={banner.title}
                              onLoad={() => {
                                setLoadedImages(prev => ({ ...prev, [banner.id]: true }));
                                setFailedImages(prev => ({ ...prev, [banner.id]: false }));
                              }}
                              onError={() => {
                                // If direct image fails, try proxy endpoint /image/:slug
                                setFailedImages(prev => ({ ...prev, [banner.id]: true }));
                              }}
                              className={`w-full h-full rounded transition-all duration-300 ${
                                fitMode === 'cover' ? 'object-cover' : 'object-contain'
                              } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                            />

                            {/* Badge watermark */}
                            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur text-[10px] text-amber-400 font-mono border border-neutral-800 pointer-events-none">
                              {ratioObj.badge}
                            </div>
                          </div>
                        ) : (
                          // Fallback view with direct URL edit & retry
                          <div 
                            className="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-4 text-center bg-neutral-950 space-y-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <ImageIcon className="w-6 h-6 text-rose-400" />
                            <div className="text-[11px] text-neutral-300 font-medium">
                              Không thể tải ảnh từ liên kết:
                            </div>
                            <div className="font-mono text-[10px] text-amber-400 truncate max-w-[260px] bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                              {banner.imageUrl}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setFailedImages(prev => ({ ...prev, [banner.id]: false }));
                                  setLoadedImages(prev => ({ ...prev, [banner.id]: false }));
                                }}
                                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 flex items-center gap-1"
                              >
                                <RotateCw className="w-3 h-3" />
                                <span>Thử tải lại</span>
                              </button>
                              <button
                                onClick={() => handleStartEditBannerImg(banner)}
                                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-xs text-neutral-950 font-bold flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Đổi link ảnh</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Inline Image URL Editor if toggled */}
                      {isEditingThisImg && (
                        <div className="p-3 bg-neutral-950 border-b border-neutral-800 space-y-2">
                          <label className="text-[10px] text-neutral-400 font-semibold">Cập nhật link ảnh trực tiếp:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tempBannerImgUrl}
                              onChange={e => setTempBannerImgUrl(e.target.value)}
                              placeholder="https://..."
                              className="flex-1 bg-neutral-900 border border-amber-500/50 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
                            />
                            <button
                              onClick={() => handleSaveBannerImgUrl(banner)}
                              disabled={isSavingBannerImg}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400"
                            >
                              {isSavingBannerImg ? 'Lưu...' : 'Lưu'}
                            </button>
                            <button
                              onClick={() => setEditingBannerImgId(null)}
                              className="px-2 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs hover:bg-neutral-700"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="p-3 space-y-2">
                        {/* Copy URL */}
                        <div className="flex items-center justify-between text-xs bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                          <span className="font-mono text-neutral-300 text-[11px] truncate mr-2">
                            {directImageUrl}
                          </span>
                          <button
                            onClick={() => handleCopy(directImageUrl)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 shrink-0"
                            title="Sao chép link ảnh trực tiếp"
                          >
                            {copiedText === directImageUrl ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setCinemaReviewBanner(banner)}
                              className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Xem Review Rạp</span>
                            </button>

                            <button
                              onClick={() => handleStartEditBannerImg(banner)}
                              className="text-neutral-400 hover:text-white text-[11px] flex items-center gap-1"
                              title="Sửa link nguồn ảnh"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Sửa link</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <a
                              href={directImageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-400 hover:text-white flex items-center gap-1 text-[11px]"
                              title="Mở ảnh trên tab mới"
                            >
                              <span>Tab mới</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              onClick={() => handleDeleteBanner(banner.id, banner.slug, banner.title)}
                              className="text-neutral-500 hover:text-rose-400 text-[11px] flex items-center gap-1 transition"
                              title="Xóa banner này"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* 3 Simple KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 mb-1">Tổng Lượt Click</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {analyticsData.totalClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-amber-400 mt-1">+{analyticsData.clicks24h} trong 24 giờ qua</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 mb-1">Khách Độc Nhất (Unique)</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                  {analyticsData.uniqueClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">Đo lường theo thiết bị & địa chỉ IP</div>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
                <div className="text-xs text-neutral-400 mb-1">Lượt Xem Ảnh Banner</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  {analyticsData.totalBannerViews.toLocaleString()}
                </div>
                <div className="text-[11px] text-neutral-500 mt-1">Yêu cầu từ direct /image/:slug</div>
              </div>
            </div>

            {/* Traffic Sources & Devices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Traffic Sources */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Phân Bổ Theo Nguồn (Traffic Sources)</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Real-time</span>
                </div>
                <div className="space-y-2">
                  {analyticsData.sources.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-6 text-center">Chưa có dữ liệu nguồn click nào</div>
                  ) : (
                    analyticsData.sources.map(src => (
                      <div key={src.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-300 font-medium">{src.name}</span>
                          <span className="font-mono text-neutral-400 text-[11px]">{src.count} ({src.percentage}%)</span>
                        </div>
                        <div className="w-full bg-neutral-950 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${src.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Devices Breakdown */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="font-bold text-white text-xs flex items-center justify-between">
                  <span>Thiết Bị Người Dùng</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Tự động nhận diện</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[11px] text-neutral-400">Mobile</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{analyticsData.devices.Mobile || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[11px] text-neutral-400">Desktop</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{analyticsData.devices.Desktop || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[11px] text-neutral-400">Tablet</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{analyticsData.devices.Tablet || 0}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[11px] text-neutral-400">Khác</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{analyticsData.devices.Other || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Clicks Live Stream */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="font-bold text-white text-xs flex items-center justify-between">
                <span>Nhật Ký Lượt Click Gần Đây ({logs.length})</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Tự động đồng bộ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-500">
                      <th className="py-2 px-2">Thời Gian</th>
                      <th className="py-2 px-2">Link</th>
                      <th className="py-2 px-2">Nguồn</th>
                      <th className="py-2 px-2">Thiết Bị</th>
                      <th className="py-2 px-2">Trình Duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/40 font-mono">
                    {logs.slice(0, 10).map(log => (
                      <tr key={log.id} className="hover:bg-neutral-800/30">
                        <td className="py-2 px-2 text-neutral-400">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2 px-2 text-amber-400 font-bold">/link/{log.linkSlug}</td>
                        <td className="py-2 px-2 text-white">{log.source}</td>
                        <td className="py-2 px-2 text-neutral-300">{log.device}</td>
                        <td className="py-2 px-2 text-neutral-400">{log.browser}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-500">
                          Chưa có lượt click nào được ghi nhận. Thử bấm "Thử link" ở tab Link Rút Gọn!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CINEMA REVIEW MODAL (FULLSCREEN LIGHTBOX) */}
      {cinemaReviewBanner && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCinemaReviewBanner(null)}
        >
          {/* Top header bar */}
          <div 
            className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-neutral-800 mb-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold">{cinemaReviewBanner.title}</h3>
                <span className="font-mono text-xs text-amber-400">/image/{cinemaReviewBanner.slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-neutral-800 text-xs font-mono text-neutral-200 border border-neutral-700">
                Tỉ lệ: {cardRatios[cinemaReviewBanner.id] || cinemaReviewBanner.aspectRatio || '2.4:1'}
              </span>
              <a
                href={`${origin}/image/${cinemaReviewBanner.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1"
              >
                <span>Mở link ảnh</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => handleDeleteBanner(cinemaReviewBanner.id, cinemaReviewBanner.slug, cinemaReviewBanner.title)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-xs flex items-center gap-1 transition"
                title="Xóa banner này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa banner</span>
              </button>
              <button
                onClick={() => setCinemaReviewBanner(null)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cinematic Letterbox Container */}
          <div 
            className="w-full max-w-5xl bg-black rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center shadow-2xl relative"
            style={{ 
              aspectRatio: (ASPECT_RATIOS.find(r => r.id === (cardRatios[cinemaReviewBanner.id] || cinemaReviewBanner.aspectRatio || '2.4:1'))?.ratio || '2.4 / 1') === 'auto' ? undefined : (ASPECT_RATIOS.find(r => r.id === (cardRatios[cinemaReviewBanner.id] || cinemaReviewBanner.aspectRatio || '2.4:1'))?.ratio || '2.4 / 1'),
              maxHeight: '75vh' 
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={cinemaReviewBanner.imageUrl}
              alt={cinemaReviewBanner.title}
              className={`w-full h-full ${
                (cardFitModes[cinemaReviewBanner.id] || 'cover') === 'cover' ? 'object-cover' : 'object-contain'
              }`}
            />
            
            {/* Cinematic crop frame markings */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono text-amber-400 border border-neutral-700">
              CINEMA RATIO: {cardRatios[cinemaReviewBanner.id] || cinemaReviewBanner.aspectRatio || '2.4:1'}
            </div>
          </div>

          {/* Quick ratio switchers inside modal */}
          <div 
            className="w-full max-w-5xl flex items-center justify-center gap-1.5 pt-4 overflow-x-auto"
            onClick={e => e.stopPropagation()}
          >
            {['2.4:1', '2.35:1', '21:9', '16:9', '2:1', '1.91:1', '3:1', '1:1', '9:16', 'auto'].map(r => (
              <button
                key={r}
                onClick={() => handleUpdateBannerRatio(cinemaReviewBanner, r)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono transition ${
                  (cardRatios[cinemaReviewBanner.id] || cinemaReviewBanner.aspectRatio) === r
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL - NO BROWSER POPUPS */}
      {deleteModal && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => !isDeleting && setDeleteModal(null)}
        >
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-base font-bold text-white">
                  Xác nhận xóa {deleteModal.type === 'link' ? 'Link Rút Gọn' : 'Ảnh Banner'}?
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Bạn có chắc chắn muốn xóa vĩnh viễn{' '}
                  <span className="font-semibold text-rose-400 font-mono">
                    {deleteModal.type === 'link' ? `/link/${deleteModal.slug}` : `/image/${deleteModal.slug}`}
                  </span>
                  {deleteModal.title ? ` (${deleteModal.title})` : ''}? Dữ liệu sẽ được xóa hoàn toàn khỏi cơ sở dữ liệu Firestore.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-rose-950/50"
              >
                {isDeleting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Xóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrData.isOpen && (
        <QRCodeModal
          isOpen={qrData.isOpen}
          onClose={() => setQrData({ isOpen: false, url: '', title: '' })}
          url={qrData.url}
          title={qrData.title}
        />
      )}
    </div>
  );
}
