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
  RotateCw, 
  Maximize2,
  X,
  Edit2,
  Palette
} from 'lucide-react';
import { api } from './services/api';
import { LinkItem, ImageBannerItem, AnalyticsData, ClickLog, SourceStat, HourlyStat, BannerFitMode } from './types';
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
  ratio: string;
}

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '16:9', label: '16:9', ratio: '16 / 9' },
  { id: '1:1', label: '1:1', ratio: '1 / 1' },
  { id: '9:16', label: '9:16', ratio: '9 / 16' },
  { id: '4:3', label: '4:3', ratio: '4 / 3' },
  { id: '4:5', label: '4:5', ratio: '4 / 5' },
  { id: '21:9', label: '21:9', ratio: '21 / 9' },
  { id: '2.4:1', label: '2.4:1', ratio: '2.4 / 1' },
  { id: '2.35:1', label: '2.35:1', ratio: '2.35 / 1' },
  { id: '2:1', label: '2:1', ratio: '2 / 1' },
  { id: '1.91:1', label: '1.91:1', ratio: '1.91 / 1' },
  { id: '3:1', label: '3:1', ratio: '3 / 1' },
  { id: '4:1', label: '4:1', ratio: '4 / 1' },
  { id: '3:2', label: '3:2', ratio: '3 / 2' },
  { id: '1:2', label: '1:2', ratio: '1 / 2' },
  { id: 'auto', label: 'Gốc (Auto)', ratio: 'auto' },
];

const QUICK_RATIOS = ['16:9', '1:1', '9:16', '4:3', '21:9', '3:1'];

const PRESET_COLORS = [
  '#ffffff',
  '#f8fafc',
  '#f1f5f9',
  '#000000',
  '#0f172a',
  '#fef3c7',
  '#dcfce7',
  '#dbeafe',
  '#fce7f3',
  '#ede9fe',
];

const FIT_MODES: { id: BannerFitMode; label: string }[] = [
  { id: 'fit', label: 'Fit' },
  { id: 'fill', label: 'Fill' },
  { id: 'stretch', label: 'Stretch' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'links' | 'banners' | 'analytics'>('links');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [banners, setBanners] = useState<ImageBannerItem[]>([]);
  const [logs, setLogs] = useState<ClickLog[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [editingDest, setEditingDest] = useState<Record<string, string>>({});
  const [savingDestId, setSavingDestId] = useState<string | null>(null);

  const [cardRatios, setCardRatios] = useState<Record<string, string>>({});
  const [cardFitModes, setCardFitModes] = useState<Record<string, BannerFitMode>>({});
  const [cardBgColors, setCardBgColors] = useState<Record<string, string>>({});
  const [openColorPickerId, setOpenColorPickerId] = useState<string | null>(null);

  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [processingBannerId, setProcessingBannerId] = useState<string | null>(null);

  const [editingBannerImgId, setEditingBannerImgId] = useState<string | null>(null);
  const [tempBannerImgUrl, setTempBannerImgUrl] = useState<string>('');
  const [isSavingBannerImg, setIsSavingBannerImg] = useState<boolean>(false);

  const [cinemaReviewBanner, setCinemaReviewBanner] = useState<ImageBannerItem | null>(null);

  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkSlug, setNewLinkSlug] = useState('');
  const [newLinkDest, setNewLinkDest] = useState('');

  const [showCreateBanner, setShowCreateBanner] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSlug, setNewBannerSlug] = useState('');
  const [newBannerRawUrl, setNewBannerRawUrl] = useState('');
  const [newBannerRatio, setNewBannerRatio] = useState('16:9');
  const [newBannerFitMode, setNewBannerFitMode] = useState<BannerFitMode>('fit');
  const [newBannerBgColor, setNewBannerBgColor] = useState('#ffffff');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCreatingBanner, setIsCreatingBanner] = useState(false);

  const [qrData, setQrData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const [searchQuery, setSearchQuery] = useState('');

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'link' | 'banner';
    id: string;
    slug: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ads93';

  useEffect(() => {
    testConnection();
  }, []);

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
      const rMap: Record<string, string> = {};
      const fMap: Record<string, BannerFitMode> = {};
      const cMap: Record<string, string> = {};
      data.forEach(b => {
        rMap[b.id] = b.aspectRatio || '16:9';
        fMap[b.id] = b.fitMode || 'fit';
        cMap[b.id] = b.bgColor || '#ffffff';
      });
      setCardRatios(prev => ({ ...rMap, ...prev }));
      setCardFitModes(prev => ({ ...fMap, ...prev }));
      setCardBgColors(prev => ({ ...cMap, ...prev }));
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

  const notify = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    notify('Đã sao chép');
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatDestinationUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return 'https://' + trimmed;
    }
    return trimmed;
  };

  const uploadRawFileToServer = async (file: File): Promise<string> => {
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
      body: JSON.stringify({ filename: `raw_${file.name}`, data: base64Data })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Lỗi tải ảnh');
    return json.url;
  };

  // Xử lý cắt/ghép ảnh thực tế bằng HTML5 Canvas và lưu thành file mới trên server
  const renderTransformedBannerToServer = async (
    sourceUrl: string,
    ratioId: string,
    fitMode: BannerFitMode,
    bgColor: string,
    slugName: string
  ): Promise<{ url: string; dimensions: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Nếu là ảnh từ tên miền ngoài, đi qua proxy để tránh lỗi CORS Canvas
      const loadUrl = (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) && !sourceUrl.startsWith(origin)
        ? `/api/proxy-image?url=${encodeURIComponent(sourceUrl)}`
        : sourceUrl;

      img.onload = async () => {
        try {
          const srcW = img.naturalWidth || 1200;
          const srcH = img.naturalHeight || 630;

          let targetW = srcW;
          let targetH = srcH;

          const ratioObj = ASPECT_RATIOS.find(r => r.id === ratioId);
          if (ratioObj && ratioObj.ratio !== 'auto') {
            const parts = ratioObj.ratio.split('/').map(s => parseFloat(s.trim()));
            if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
              const targetRatio = parts[0] / parts[1];
              const BASE_SIZE = 1600;
              if (targetRatio >= 1) {
                targetW = BASE_SIZE;
                targetH = Math.round(BASE_SIZE / targetRatio);
              } else {
                targetH = BASE_SIZE;
                targetW = Math.round(BASE_SIZE * targetRatio);
              }
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context error');

          // Đổ nền màu cho phần trống (dùng trong chế độ Fit)
          ctx.fillStyle = bgColor || '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);

          if (fitMode === 'stretch') {
            ctx.drawImage(img, 0, 0, targetW, targetH);
          } else if (fitMode === 'fill') {
            const scale = Math.max(targetW / srcW, targetH / srcH);
            const drawW = srcW * scale;
            const drawH = srcH * scale;
            const offsetX = (targetW - drawW) / 2;
            const offsetY = (targetH - drawH) / 2;
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          } else {
            const scale = Math.min(targetW / srcW, targetH / srcH);
            const drawW = srcW * scale;
            const drawH = srcH * scale;
            const offsetX = (targetW - drawW) / 2;
            const offsetY = (targetH - drawH) / 2;
            ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
          }

          const base64Data = canvas.toDataURL('image/png');
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: `${slugName || 'banner'}_${ratioId.replace(':', 'x')}_${fitMode}.png`,
              data: base64Data
            })
          });
          const json = await res.json();
          if (!json.success) throw new Error(json.error || 'Upload error');

          resolve({
            url: json.url,
            dimensions: `${targetW}x${targetH}`
          });
        } catch {
          resolve({ url: sourceUrl, dimensions: '1200x630' });
        }
      };

      img.onerror = () => {
        resolve({ url: sourceUrl, dimensions: '1200x630' });
      };

      img.src = loadUrl;
    });
  };

  const handleSaveDestination = async (link: LinkItem) => {
    const rawTarget = (editingDest[link.id] || '').trim();
    if (!rawTarget) return;
    const newTarget = formatDestinationUrl(rawTarget);

    try {
      setSavingDestId(link.id);
      await updateLinkInFirestore(link.id, { destinationUrl: newTarget });
      await api.updateLink(link.id, { destinationUrl: newTarget, slug: link.slug }).catch(() => {});
      setEditingDest(prev => ({ ...prev, [link.id]: newTarget }));
      notify('Đã cập nhật link đích');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể lưu'));
    } finally {
      setSavingDestId(null);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = newLinkSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanSlug || !newLinkDest.trim()) return;
    const cleanDest = formatDestinationUrl(newLinkDest);

    try {
      await addLinkToFirestore({
        title: newLinkTitle.trim() || cleanSlug,
        slug: cleanSlug,
        destinationUrl: cleanDest,
        tags: []
      });
      await api.createLink({
        title: newLinkTitle.trim() || cleanSlug,
        slug: cleanSlug,
        destinationUrl: cleanDest
      }).catch(() => {});

      notify(`Đã tạo /link/${cleanSlug}`);
      setShowCreateLink(false);
      setNewLinkTitle('');
      setNewLinkSlug('');
      setNewLinkDest('');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể tạo link'));
    }
  };

  const handleUploadNewBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingImage(true);
      const uploadedRawUrl = await uploadRawFileToServer(file);
      setNewBannerRawUrl(uploadedRawUrl);
      if (!newBannerTitle) setNewBannerTitle(file.name.replace(/\.[^/.]+$/, ''));
      if (!newBannerSlug) setNewBannerSlug(file.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-'));
      notify('Đã tải ảnh lên');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể tải ảnh'));
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = newBannerSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!cleanSlug || !newBannerRawUrl.trim()) return;

    try {
      setIsCreatingBanner(true);
      const rawUrl = newBannerRawUrl.trim();

      const rendered = await renderTransformedBannerToServer(
        rawUrl,
        newBannerRatio,
        newBannerFitMode,
        newBannerBgColor,
        cleanSlug
      );

      await addBannerToFirestore({
        title: newBannerTitle.trim() || cleanSlug,
        slug: cleanSlug,
        imageUrl: rendered.url,
        originalImageUrl: rawUrl,
        aspectRatio: newBannerRatio,
        fitMode: newBannerFitMode,
        bgColor: newBannerBgColor,
        dimensions: rendered.dimensions
      });

      await api.createImage({
        title: newBannerTitle.trim() || cleanSlug,
        slug: cleanSlug,
        imageUrl: rendered.url,
        dimensions: rendered.dimensions
      }).catch(() => {});

      notify(`Đã lưu /image/${cleanSlug}`);
      setShowCreateBanner(false);
      setNewBannerTitle('');
      setNewBannerSlug('');
      setNewBannerRawUrl('');
      setNewBannerRatio('16:9');
      setNewBannerFitMode('fit');
      setNewBannerBgColor('#ffffff');
    } catch (err: any) {
      notify('Lỗi: ' + (err.message || 'Không thể lưu banner'));
    } finally {
      setIsCreatingBanner(false);
    }
  };

  const applyAndBakeBannerTransform = async (
    banner: ImageBannerItem,
    nextRatio: string,
    nextFitMode: BannerFitMode,
    nextBgColor: string,
    overrideRawUrl?: string
  ) => {
    const sourceRawUrl = overrideRawUrl || banner.originalImageUrl || banner.imageUrl;
    try {
      setProcessingBannerId(banner.id);
      const rendered = await renderTransformedBannerToServer(
        sourceRawUrl,
        nextRatio,
        nextFitMode,
        nextBgColor,
        banner.slug
      );

      const updates: Partial<ImageBannerItem> = {
        imageUrl: rendered.url,
        originalImageUrl: sourceRawUrl,
        aspectRatio: nextRatio,
        fitMode: nextFitMode,
        bgColor: nextBgColor,
        dimensions: rendered.dimensions
      };

      await updateBannerInFirestore(banner.id, updates);
      await api.updateImage(banner.id, { ...updates, slug: banner.slug }).catch(() => {});

      setFailedImages(prev => ({ ...prev, [banner.id]: false }));
      notify(`Đã cập nhật /image/${banner.slug}`);
    } catch (err: any) {
      notify('Lỗi xử lý ảnh: ' + (err.message || 'Không thể cập nhật'));
    } finally {
      setProcessingBannerId(null);
    }
  };

  const handleReplaceBannerFile = async (banner: ImageBannerItem, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setProcessingBannerId(banner.id);
      const uploadedRawUrl = await uploadRawFileToServer(file);
      const currentRatio = cardRatios[banner.id] || banner.aspectRatio || '16:9';
      const currentFit = cardFitModes[banner.id] || banner.fitMode || 'fit';
      const currentBg = cardBgColors[banner.id] || banner.bgColor || '#ffffff';

      await applyAndBakeBannerTransform(banner, currentRatio, currentFit, currentBg, uploadedRawUrl);
      if (editingBannerImgId === banner.id) {
        setEditingBannerImgId(null);
      }
    } catch (err: any) {
      notify('Lỗi tải ảnh: ' + (err.message || 'Không thể cập nhật'));
      setProcessingBannerId(null);
    } finally {
      e.target.value = '';
    }
  };

  const handleUpdateBannerRatio = async (banner: ImageBannerItem, newRatio: string) => {
    setCardRatios(prev => ({ ...prev, [banner.id]: newRatio }));
    const currentFit = cardFitModes[banner.id] || banner.fitMode || 'fit';
    const currentBg = cardBgColors[banner.id] || banner.bgColor || '#ffffff';
    await applyAndBakeBannerTransform(banner, newRatio, currentFit, currentBg);
  };

  const handleUpdateFitMode = async (banner: ImageBannerItem, mode: BannerFitMode) => {
    setCardFitModes(prev => ({ ...prev, [banner.id]: mode }));
    const currentRatio = cardRatios[banner.id] || banner.aspectRatio || '16:9';
    const currentBg = cardBgColors[banner.id] || banner.bgColor || '#ffffff';
    await applyAndBakeBannerTransform(banner, currentRatio, mode, currentBg);
  };

  const handleUpdateBgColor = async (banner: ImageBannerItem, color: string) => {
    setCardBgColors(prev => ({ ...prev, [banner.id]: color }));
    const currentRatio = cardRatios[banner.id] || banner.aspectRatio || '16:9';
    const currentFit = cardFitModes[banner.id] || banner.fitMode || 'fit';
    await applyAndBakeBannerTransform(banner, currentRatio, currentFit, color);
  };

  const handleSaveBannerImgUrl = async (banner: ImageBannerItem) => {
    const cleanUrl = tempBannerImgUrl.trim();
    if (!cleanUrl) return;
    try {
      setIsSavingBannerImg(true);
      const currentRatio = cardRatios[banner.id] || banner.aspectRatio || '16:9';
      const currentFit = cardFitModes[banner.id] || banner.fitMode || 'fit';
      const currentBg = cardBgColors[banner.id] || banner.bgColor || '#ffffff';

      await applyAndBakeBannerTransform(banner, currentRatio, currentFit, currentBg, cleanUrl);
      setEditingBannerImgId(null);
    } finally {
      setIsSavingBannerImg(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const { type, id, slug } = deleteModal;
    setIsDeleting(true);
    try {
      if (type === 'link') {
        setLinks(prev => prev.filter(l => l.id !== id && l.slug !== slug));
        await deleteLinkFromFirestore(id, slug);
        await api.deleteLink(id).catch(() => {});
        notify(`Đã xóa /link/${slug}`);
      } else {
        setBanners(prev => prev.filter(b => b.id !== id && b.slug !== slug));
        if (cinemaReviewBanner && (cinemaReviewBanner.id === id || cinemaReviewBanner.slug === slug)) {
          setCinemaReviewBanner(null);
        }
        await deleteBannerFromFirestore(id, slug);
        await api.deleteImage(id).catch(() => {});
        notify(`Đã xóa /image/${slug}`);
      }
      setDeleteModal(null);
    } catch (err: any) {
      notify(`Lỗi: ${err.message || 'Không thể xóa'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getObjectFitClass = (mode: BannerFitMode) => {
    if (mode === 'fill') return 'object-cover';
    if (mode === 'stretch') return 'object-fill';
    return 'object-contain';
  };

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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white font-medium px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-white text-xs">
              93
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">ADS93</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('links')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'links'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Link ({links.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('banners')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'banners'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Banner ({banners.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Thống kê</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportToExcel(analyticsData, links, banners, logs)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition"
              title="Xuất Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => exportToPdf(analyticsData, links, banners, logs)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition"
              title="Xuất PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-8 py-6 flex-1 space-y-5">
        {activeTab !== 'analytics' && (
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition"
              />
            </div>

            {activeTab === 'links' ? (
              <button
                onClick={() => setShowCreateLink(!showCreateLink)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Link</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCreateBanner(!showCreateBanner)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Banner</span>
              </button>
            )}
          </div>
        )}

        {/* TAB 1: LINKS */}
        {activeTab === 'links' && (
          <div className="space-y-3">
            {showCreateLink && (
              <form onSubmit={handleCreateLink} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tên</label>
                    <input
                      type="text"
                      value={newLinkTitle}
                      onChange={e => setNewLinkTitle(e.target.value)}
                      placeholder="VD: TikTok Bio"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Slug *</label>
                    <div className="flex items-center">
                      <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-2 text-slate-500 font-mono text-[11px]">
                        /link/
                      </span>
                      <input
                        type="text"
                        value={newLinkSlug}
                        onChange={e => setNewLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="ytb"
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-2.5 py-2 text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Link đích *</label>
                    <input
                      type="text"
                      value={newLinkDest}
                      onChange={e => setNewLinkDest(e.target.value)}
                      placeholder="https://..."
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateLink(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                  >
                    Lưu
                  </button>
                </div>
              </form>
            )}

            {filteredLinks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200/80">
                Chưa có link nào.
              </div>
            ) : (
              filteredLinks.map(link => {
                const shortUrl = `${origin}/link/${link.slug}`;
                const currentDest = editingDest[link.id] !== undefined ? editingDest[link.id] : link.destinationUrl;
                const hasChanged = currentDest.trim() !== link.destinationUrl.trim();

                return (
                  <div
                    key={link.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition shadow-2xs space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{link.title}</span>
                        <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                          {link.totalClicks || 0} clicks
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          /link/{link.slug}
                        </span>
                        <button
                          onClick={() => handleCopy(shortUrl)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Sao chép link"
                        >
                          {copiedText === shortUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setQrData({ isOpen: true, url: shortUrl, title: link.title })}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Mã QR"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={shortUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Mở thử"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, type: 'link', id: link.id, slug: link.slug, title: link.title })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={currentDest}
                        onChange={e => setEditingDest(prev => ({ ...prev, [link.id]: e.target.value }))}
                        placeholder="https://..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none transition"
                      />
                      <button
                        onClick={() => handleSaveDestination(link)}
                        disabled={savingDestId === link.id}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                          hasChanged
                            ? 'bg-slate-900 hover:bg-slate-800 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                      >
                        {savingDestId === link.id ? '...' : 'Lưu'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: BANNERS */}
        {activeTab === 'banners' && (
          <div className="space-y-4">
            {showCreateBanner && (
              <form onSubmit={handleCreateBanner} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Thêm Banner</span>
                  <button
                    type="button"
                    onClick={() => setShowCreateBanner(false)}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tên banner</label>
                    <input
                      type="text"
                      value={newBannerTitle}
                      onChange={e => setNewBannerTitle(e.target.value)}
                      placeholder="VD: Banner chính"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Slug *</label>
                    <div className="flex items-center">
                      <span className="bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl px-2.5 py-2 text-slate-500 font-mono text-[11px]">
                        /image/
                      </span>
                      <input
                        type="text"
                        value={newBannerSlug}
                        onChange={e => setNewBannerSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="banner1"
                        required
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-r-xl px-2.5 py-2 text-slate-900 font-mono font-semibold focus:bg-white focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-500 font-medium">Ảnh *</label>
                    <label className="cursor-pointer text-xs font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingImage ? 'Đang tải...' : 'Chọn ảnh từ máy'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={handleUploadNewBannerFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={newBannerRawUrl}
                    onChange={e => setNewBannerRawUrl(e.target.value)}
                    placeholder="https://... hoặc chọn ảnh từ máy"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Tỉ lệ</label>
                    <select
                      value={newBannerRatio}
                      onChange={e => setNewBannerRatio(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none"
                    >
                      {ASPECT_RATIOS.map(r => (
                        <option key={r.id} value={r.id}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Kiểu khung</label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                      {FIT_MODES.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setNewBannerFitMode(m.id)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition ${
                            newBannerFitMode === m.id
                              ? 'bg-white text-slate-900 shadow-2xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Màu nền (Fit)</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={newBannerBgColor}
                        onChange={e => setNewBannerBgColor(e.target.value)}
                        className="w-9 h-8 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5 shrink-0"
                      />
                      <input
                        type="text"
                        value={newBannerBgColor}
                        onChange={e => setNewBannerBgColor(e.target.value)}
                        className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-mono text-xs text-slate-800"
                      />
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {PRESET_COLORS.slice(0, 5).map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewBannerBgColor(c)}
                            className={`w-5 h-5 rounded-full border ${
                              newBannerBgColor.toLowerCase() === c ? 'border-slate-900 scale-110' : 'border-slate-300'
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {newBannerRawUrl && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div
                      className="w-full rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 mx-auto transition-all"
                      style={{
                        aspectRatio: (ASPECT_RATIOS.find(r => r.id === newBannerRatio)?.ratio || '16 / 9') === 'auto'
                          ? '16 / 9'
                          : (ASPECT_RATIOS.find(r => r.id === newBannerRatio)?.ratio || '16 / 9'),
                        maxHeight: '260px',
                        backgroundColor: newBannerBgColor
                      }}
                    >
                      <img
                        src={newBannerRawUrl}
                        alt="Preview"
                        className={`w-full h-full ${getObjectFitClass(newBannerFitMode)}`}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreateBanner(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingBanner || isUploadingImage}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-50"
                  >
                    {isCreatingBanner ? 'Đang lưu...' : 'Lưu Banner'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBanners.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-400">
                  Chưa có banner nào.
                </div>
              ) : (
                filteredBanners.map(banner => {
                  const directImageUrl = `${origin}/image/${banner.slug}`;
                  const currentRatioId = cardRatios[banner.id] || banner.aspectRatio || '16:9';
                  const ratioObj = ASPECT_RATIOS.find(r => r.id === currentRatioId) || ASPECT_RATIOS[0];
                  const fitMode: BannerFitMode = cardFitModes[banner.id] || banner.fitMode || 'fit';
                  const bgColor = cardBgColors[banner.id] || banner.bgColor || '#ffffff';
                  const isImageFailed = failedImages[banner.id];
                  const isLoaded = loadedImages[banner.id];
                  const isEditingThisImg = editingBannerImgId === banner.id;
                  const isProcessingThis = processingBannerId === banner.id;
                  const isColorOpen = openColorPickerId === banner.id;

                  return (
                    <div
                      key={banner.id}
                      className="rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs overflow-hidden flex flex-col justify-between transition"
                    >
                      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-900 text-xs truncate">{banner.title}</span>
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                            /image/{banner.slug}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 shrink-0">
                          {isProcessingThis ? 'Đang lưu...' : `${banner.viewsCount || 0} views`}
                        </span>
                      </div>

                      <div className="px-3.5 py-2 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          {QUICK_RATIOS.slice(0, 4).map(r => (
                            <button
                              key={r}
                              type="button"
                              disabled={isProcessingThis}
                              onClick={() => handleUpdateBannerRatio(banner, r)}
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] transition ${
                                currentRatioId === r
                                  ? 'bg-slate-900 text-white font-semibold'
                                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                          <select
                            value={currentRatioId}
                            disabled={isProcessingThis}
                            onChange={e => handleUpdateBannerRatio(banner, e.target.value)}
                            className="bg-white border border-slate-200 rounded-md text-[10px] text-slate-700 px-1.5 py-0.5 font-mono focus:outline-none"
                          >
                            {ASPECT_RATIOS.map(item => (
                              <option key={item.id} value={item.id}>{item.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg">
                            {FIT_MODES.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                disabled={isProcessingThis}
                                onClick={() => handleUpdateFitMode(banner, m.id)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition ${
                                  fitMode === m.id
                                    ? 'bg-white text-slate-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => setOpenColorPickerId(isColorOpen ? null : banner.id)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white border border-slate-200 hover:border-slate-300 text-[10px] text-slate-700"
                            title="Màu nền"
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-xs border border-slate-300 inline-block"
                              style={{ backgroundColor: bgColor }}
                            />
                            <Palette className="w-3 h-3 text-slate-500" />
                          </button>
                        </div>
                      </div>

                      {isColorOpen && (
                        <div className="px-3.5 py-2 bg-white border-b border-slate-100 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="color"
                              value={bgColor}
                              onChange={e => handleUpdateBgColor(banner, e.target.value)}
                              className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0 bg-white"
                            />
                            <input
                              type="text"
                              value={bgColor}
                              onChange={e => handleUpdateBgColor(banner, e.target.value)}
                              className="w-16 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-[11px] text-slate-800"
                            />
                            {PRESET_COLORS.map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => handleUpdateBgColor(banner, c)}
                                className={`w-4 h-4 rounded-full border transition ${
                                  bgColor.toLowerCase() === c ? 'border-slate-900 scale-110 ring-1 ring-slate-900' : 'border-slate-300'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setOpenColorPickerId(null)}
                            className="text-[11px] text-slate-400 hover:text-slate-700"
                          >
                            Đóng
                          </button>
                        </div>
                      )}

                      <div
                        className="w-full overflow-hidden flex items-center justify-center relative border-b border-slate-100 cursor-pointer transition-colors"
                        style={{
                          aspectRatio: ratioObj.ratio === 'auto' ? undefined : ratioObj.ratio,
                          minHeight: '160px',
                          maxHeight: '320px',
                          backgroundColor: bgColor
                        }}
                        onClick={() => setCinemaReviewBanner(banner)}
                      >
                        {!isImageFailed ? (
                          <div className="w-full h-full relative flex items-center justify-center">
                            {(!isLoaded || isProcessingThis) && (
                              <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-2xs z-10 flex items-center justify-center gap-2 text-xs font-medium text-slate-600">
                                <RotateCw className="w-4 h-4 text-slate-700 animate-spin" />
                              </div>
                            )}
                            <img
                              src={banner.imageUrl}
                              alt={banner.title}
                              onLoad={() => {
                                setLoadedImages(prev => ({ ...prev, [banner.id]: true }));
                                setFailedImages(prev => ({ ...prev, [banner.id]: false }));
                              }}
                              onError={() => {
                                setFailedImages(prev => ({ ...prev, [banner.id]: true }));
                              }}
                              className="w-full h-full object-contain transition-opacity duration-200"
                            />
                          </div>
                        ) : (
                          <div
                            className="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-4 text-center bg-slate-50 space-y-2"
                            onClick={e => e.stopPropagation()}
                          >
                            <span className="text-xs text-slate-500">Không tải được ảnh</span>
                            <label className="cursor-pointer px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              <span>Tải ảnh lên</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={e => handleReplaceBannerFile(banner, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {isEditingThisImg && (
                        <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-500 font-medium">Link ảnh hoặc tải file:</span>
                            <label className="cursor-pointer text-[11px] font-semibold text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              <span>Chọn file</span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isProcessingThis}
                                onChange={e => handleReplaceBannerFile(banner, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={tempBannerImgUrl}
                              onChange={e => setTempBannerImgUrl(e.target.value)}
                              placeholder="https://..."
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
                            />
                            <button
                              onClick={() => handleSaveBannerImgUrl(banner)}
                              disabled={isSavingBannerImg}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
                            >
                              Lưu
                            </button>
                            <button
                              onClick={() => setEditingBannerImgId(null)}
                              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs hover:bg-slate-100"
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="p-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition">
                            <Upload className="w-3 h-3" />
                            <span>{isProcessingThis ? '...' : 'Đổi ảnh'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isProcessingThis}
                              onChange={e => handleReplaceBannerFile(banner, e)}
                              className="hidden"
                            />
                          </label>

                          <button
                            onClick={() => {
                              setEditingBannerImgId(isEditingThisImg ? null : banner.id);
                              setTempBannerImgUrl(banner.originalImageUrl || banner.imageUrl);
                            }}
                            className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-600 text-[11px] flex items-center gap-1 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Link</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(directImageUrl)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] flex items-center gap-1 transition"
                          >
                            {copiedText === directImageUrl ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Chép link</span>
                          </button>
                          <button
                            onClick={() => setCinemaReviewBanner(banner)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
                            title="Phóng to"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`${directImageUrl}?t=${new Date(banner.updatedAt || Date.now()).getTime()}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition"
                            title="Mở tab mới"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, type: 'banner', id: banner.id, slug: banner.slug, title: banner.title })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs text-slate-500 mb-1">Tổng Lượt Click</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {analyticsData.totalClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">+{analyticsData.clicks24h} trong 24h</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs text-slate-500 mb-1">Unique Clicks</div>
                <div className="text-2xl font-bold text-emerald-600 font-mono">
                  {analyticsData.uniqueClicks.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Theo IP & Thiết bị</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs text-slate-500 mb-1">Lượt Xem Banner</div>
                <div className="text-2xl font-bold text-slate-900 font-mono">
                  {analyticsData.totalBannerViews.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Truy cập /image/:slug</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="font-bold text-slate-900 text-xs">Nguồn Truy Cập</div>
                <div className="space-y-2">
                  {analyticsData.sources.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center">Chưa có dữ liệu</div>
                  ) : (
                    analyticsData.sources.map(src => (
                      <div key={src.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 font-medium">{src.name}</span>
                          <span className="font-mono text-slate-500 text-[11px]">{src.count} ({src.percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-slate-900 h-full rounded-full transition-all duration-500"
                            style={{ width: `${src.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="font-bold text-slate-900 text-xs">Thiết Bị</div>
                <div className="grid grid-cols-2 gap-2">
                  {(['Mobile', 'Desktop', 'Tablet', 'Other'] as const).map(dev => (
                    <div key={dev} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-[11px] text-slate-500">{dev}</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                        {analyticsData.devices[dev] || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="font-bold text-slate-900 text-xs">Nhật Ký Click ({logs.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="py-2 px-2">Thời gian</th>
                      <th className="py-2 px-2">Link</th>
                      <th className="py-2 px-2">Nguồn</th>
                      <th className="py-2 px-2">Thiết bị</th>
                      <th className="py-2 px-2">Trình duyệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {logs.slice(0, 15).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN')} {new Date(log.timestamp).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-2 px-2 text-slate-900 font-semibold">/link/{log.linkSlug}</td>
                        <td className="py-2 px-2 text-slate-700">{log.source}</td>
                        <td className="py-2 px-2 text-slate-600">{log.device}</td>
                        <td className="py-2 px-2 text-slate-500">{log.browser}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                          Chưa có lượt click nào.
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

      {cinemaReviewBanner && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setCinemaReviewBanner(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-4 shadow-xl space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{cinemaReviewBanner.title}</span>
                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  /image/{cinemaReviewBanner.slug}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                  {FIT_MODES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleUpdateFitMode(cinemaReviewBanner, m.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        (cardFitModes[cinemaReviewBanner.id] || cinemaReviewBanner.fitMode || 'fit') === m.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <input
                  type="color"
                  value={cardBgColors[cinemaReviewBanner.id] || cinemaReviewBanner.bgColor || '#ffffff'}
                  onChange={e => handleUpdateBgColor(cinemaReviewBanner, e.target.value)}
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer bg-white p-0.5"
                />

                <button
                  onClick={() => setCinemaReviewBanner(null)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="w-full rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center mx-auto bg-slate-50">
              <img
                src={banners.find(b => b.id === cinemaReviewBanner.id)?.imageUrl || cinemaReviewBanner.imageUrl}
                alt={cinemaReviewBanner.title}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
              {ASPECT_RATIOS.map(r => (
                <button
                  key={r.id}
                  onClick={() => handleUpdateBannerRatio(cinemaReviewBanner, r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition ${
                    (cardRatios[cinemaReviewBanner.id] || cinemaReviewBanner.aspectRatio || '16:9') === r.id
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          onClick={() => !isDeleting && setDeleteModal(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Xóa {deleteModal.type === 'link' ? `/link/${deleteModal.slug}` : `/image/${deleteModal.slug}`}?
              </h3>
              <p className="text-xs text-slate-500">
                Dữ liệu sẽ bị xóa vĩnh viễn.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

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