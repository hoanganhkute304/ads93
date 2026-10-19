import fs from 'fs';
import path from 'path';
import { DatabaseSchema, LinkItem, ImageBannerItem, ClickLog } from './types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Generate realistic seed logs for initial display
function generateSeedData(): DatabaseSchema {
  const now = new Date();

  // Real clean initial state without mock banners or fake click logs
  const initialLinks: LinkItem[] = [
    {
      id: 'link_1',
      title: 'Kênh TikTok Neon 9393',
      slug: 'link1',
      destinationUrl: 'https://www.tiktok.com/@neon_9393',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      isActive: true,
      tags: ['tiktok', 'kol'],
      totalClicks: 0,
      uniqueClicks: 0,
      notes: 'Đường dẫn chuyển hướng chính'
    }
  ];

  // Banners completely cleared as requested by user
  const initialImages: ImageBannerItem[] = [];

  const seedLogs: ClickLog[] = [];
  const ipMap: Record<string, string[]> = {
    link_1: []
  };

  // Sort logs latest first
  seedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    links: initialLinks,
    images: initialImages,
    logs: seedLogs,
    ipSeen: ipMap
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    ensureDataDir();
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.links && parsed.images && parsed.logs) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Error loading database file, initializing seed:', err);
    }

    const initial = generateSeedData();
    this.save(initial);
    return initial;
  }

  private save(data?: DatabaseSchema) {
    try {
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(data || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  // Links CRUD
  getLinks(): LinkItem[] {
    return this.data.links;
  }

  getLinkBySlug(slug: string): LinkItem | undefined {
    return this.data.links.find(l => l.slug.toLowerCase() === slug.toLowerCase());
  }

  getLinkById(id: string): LinkItem | undefined {
    return this.data.links.find(l => l.id === id);
  }

  createLink(payload: { title: string; slug: string; destinationUrl: string; tags?: string[]; notes?: string }): LinkItem {
    const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (this.getLinkBySlug(cleanSlug)) {
      throw new Error(`Đường dẫn rút gọn (slug) "${cleanSlug}" đã tồn tại!`);
    }

    const now = new Date().toISOString();
    const newLink: LinkItem = {
      id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: payload.title.trim() || `Link ${cleanSlug}`,
      slug: cleanSlug,
      destinationUrl: payload.destinationUrl.trim(),
      createdAt: now,
      updatedAt: now,
      isActive: true,
      tags: payload.tags || [],
      totalClicks: 0,
      uniqueClicks: 0,
      notes: payload.notes || ''
    };

    this.data.links.unshift(newLink);
    if (!this.data.ipSeen) this.data.ipSeen = {};
    this.data.ipSeen[newLink.id] = [];
    this.save();
    return newLink;
  }

  updateLink(id: string, payload: Partial<LinkItem>): LinkItem {
    const index = this.data.links.findIndex(l => l.id === id);
    if (index === -1) throw new Error('Không tìm thấy link');

    const current = this.data.links[index];
    if (payload.slug && payload.slug.toLowerCase() !== current.slug.toLowerCase()) {
      const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const conflict = this.getLinkBySlug(cleanSlug);
      if (conflict && conflict.id !== id) {
        throw new Error(`Slug "${cleanSlug}" đã được sử dụng bởi link khác!`);
      }
      payload.slug = cleanSlug;
    }

    const updated = {
      ...current,
      ...payload,
      updatedAt: new Date().toISOString()
    };
    this.data.links[index] = updated;
    this.save();
    return updated;
  }

  deleteLink(id: string): boolean {
    const prevCount = this.data.links.length;
    this.data.links = this.data.links.filter(l => l.id !== id);
    if (this.data.links.length !== prevCount) {
      this.save();
      return true;
    }
    return false;
  }

  // Images CRUD
  getImages(): ImageBannerItem[] {
    return this.data.images;
  }

  getImageBySlug(slug: string): ImageBannerItem | undefined {
    return this.data.images.find(img => img.slug.toLowerCase() === slug.toLowerCase());
  }

  createImage(payload: { title: string; slug: string; imageUrl: string; dimensions?: string; fileSize?: string; targetLinkSlug?: string; notes?: string }): ImageBannerItem {
    const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (this.getImageBySlug(cleanSlug)) {
      throw new Error(`Mã ảnh (slug) "${cleanSlug}" đã tồn tại!`);
    }

    const now = new Date().toISOString();
    const newImage: ImageBannerItem = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: payload.title.trim() || `Banner ${cleanSlug}`,
      slug: cleanSlug,
      imageUrl: payload.imageUrl.trim(),
      contentType: payload.imageUrl.endsWith('.png') ? 'image/png' : (payload.imageUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg'),
      dimensions: payload.dimensions || '1200x630',
      fileSize: payload.fileSize || 'Tự động',
      createdAt: now,
      updatedAt: now,
      viewsCount: 0,
      isActive: true,
      targetLinkSlug: payload.targetLinkSlug || '',
      notes: payload.notes || ''
    };

    this.data.images.unshift(newImage);
    this.save();
    return newImage;
  }

  updateImage(id: string, payload: Partial<ImageBannerItem>): ImageBannerItem {
    const index = this.data.images.findIndex(img => img.id === id);
    if (index === -1) throw new Error('Không tìm thấy ảnh');

    const current = this.data.images[index];
    if (payload.slug && payload.slug.toLowerCase() !== current.slug.toLowerCase()) {
      const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const conflict = this.getImageBySlug(cleanSlug);
      if (conflict && conflict.id !== id) {
        throw new Error(`Slug "${cleanSlug}" đã được sử dụng!`);
      }
      payload.slug = cleanSlug;
    }

    const updated = {
      ...current,
      ...payload,
      updatedAt: new Date().toISOString()
    };
    this.data.images[index] = updated;
    this.save();
    return updated;
  }

  deleteImage(id: string): boolean {
    const prevCount = this.data.images.length;
    this.data.images = this.data.images.filter(img => img.id !== id);
    if (this.data.images.length !== prevCount) {
      this.save();
      return true;
    }
    return false;
  }

  incrementImageView(slug: string) {
    const image = this.getImageBySlug(slug);
    if (image) {
      image.viewsCount += 1;
      this.save();
    }
  }

  // Click Tracking
  recordClick(link: LinkItem, meta: {
    source: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    referrer: string;
    userAgent: string;
    device: 'Mobile' | 'Desktop' | 'Tablet' | 'Other';
    browser: string;
    os: string;
    ip: string;
  }): ClickLog {
    if (!this.data.ipSeen) this.data.ipSeen = {};
    if (!this.data.ipSeen[link.id]) this.data.ipSeen[link.id] = [];

    const isUnique = !this.data.ipSeen[link.id].includes(meta.ip);
    if (isUnique) {
      this.data.ipSeen[link.id].push(meta.ip);
    }

    // Update link counters
    link.totalClicks += 1;
    if (isUnique) {
      link.uniqueClicks += 1;
    }
    link.lastClickedAt = new Date().toISOString();

    const log: ClickLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      linkId: link.id,
      linkSlug: link.slug,
      targetUrl: link.destinationUrl,
      timestamp: new Date().toISOString(),
      source: meta.source,
      utmSource: meta.utmSource,
      utmMedium: meta.utmMedium,
      utmCampaign: meta.utmCampaign,
      referrer: meta.referrer,
      userAgent: meta.userAgent,
      device: meta.device,
      browser: meta.browser,
      os: meta.os,
      ip: meta.ip.replace(/\.\d+$/, '.xxx'),
      isUnique
    };

    this.data.logs.unshift(log);
    // Keep max 2000 logs in memory/disk to keep it fast
    if (this.data.logs.length > 2000) {
      this.data.logs = this.data.logs.slice(0, 2000);
    }

    this.save();
    return log;
  }

  getLogs(limit = 200, linkSlug?: string, source?: string): ClickLog[] {
    let filtered = this.data.logs;
    if (linkSlug) {
      filtered = filtered.filter(l => l.linkSlug.toLowerCase() === linkSlug.toLowerCase());
    }
    if (source) {
      filtered = filtered.filter(l => l.source.toLowerCase() === source.toLowerCase());
    }
    return filtered.slice(0, limit);
  }

  getAnalytics() {
    const totalClicks = this.data.links.reduce((acc, l) => acc + l.totalClicks, 0);
    const uniqueClicks = this.data.links.reduce((acc, l) => acc + l.uniqueClicks, 0);
    const totalBannerViews = this.data.images.reduce((acc, img) => acc + img.viewsCount, 0);

    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

    const clicks24h = this.data.logs.filter(l => new Date(l.timestamp).getTime() >= oneDayAgo).length;
    const clicks7d = this.data.logs.filter(l => new Date(l.timestamp).getTime() >= sevenDaysAgo).length;

    // Sources breakdown
    const sourceCount: Record<string, { count: number; unique: number }> = {};
    for (const log of this.data.logs) {
      const src = log.source || 'Direct';
      if (!sourceCount[src]) {
        sourceCount[src] = { count: 0, unique: 0 };
      }
      sourceCount[src].count += 1;
      if (log.isUnique) {
        sourceCount[src].unique += 1;
      }
    }

    const sources = Object.entries(sourceCount)
      .map(([name, data]) => ({
        name,
        count: data.count,
        unique: data.unique,
        percentage: this.data.logs.length > 0 ? Math.round((data.count / this.data.logs.length) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Devices breakdown
    const deviceCount: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0, Other: 0 };
    for (const log of this.data.logs) {
      const dev = log.device || 'Other';
      deviceCount[dev] = (deviceCount[dev] || 0) + 1;
    }

    // Hourly clicks last 24h
    const hourlyMap: Record<string, number> = {};
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600 * 1000);
      const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
      hourlyMap[hourStr] = 0;
    }

    for (const log of this.data.logs) {
      const logTime = new Date(log.timestamp).getTime();
      if (logTime >= oneDayAgo) {
        const d = new Date(logTime);
        const hourStr = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyMap[hourStr] !== undefined) {
          hourlyMap[hourStr] += 1;
        }
      }
    }

    const hourlyTrend = Object.entries(hourlyMap).map(([hour, count]) => ({
      hour,
      count
    }));

    return {
      totalClicks,
      uniqueClicks,
      totalBannerViews,
      clicks24h,
      clicks7d,
      activeLinksCount: this.data.links.filter(l => l.isActive).length,
      activeBannersCount: this.data.images.filter(i => i.isActive).length,
      sources,
      devices: deviceCount,
      hourlyTrend
    };
  }

  resetSeed() {
    this.data = generateSeedData();
    this.save();
    return true;
  }
}

export const db = new Database();
