import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc, 
  increment,
  getDocs,
  query,
  where,
  deleteDoc
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initialize Firestore on backend
const firebaseConfigFile = path.resolve(__dirname, 'firebase-applet-config.json');
let firestoreDb: any = null;
const liveLinks = new Map<string, any>();
const liveImages = new Map<string, any>();

if (fs.existsSync(firebaseConfigFile)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestoreDb = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

    onSnapshot(collection(firestoreDb, 'links'), snapshot => {
      snapshot.docChanges().forEach(change => {
        const data = { id: change.doc.id, ...change.doc.data() } as any;
        const slug = data.slug?.toLowerCase();
        if (!slug) return;
        if (change.type === 'removed') {
          liveLinks.delete(slug);
        } else {
          liveLinks.set(slug, data);
        }
      });
    });

    onSnapshot(collection(firestoreDb, 'images'), snapshot => {
      snapshot.docChanges().forEach(change => {
        const data = { id: change.doc.id, ...change.doc.data() } as any;
        const slug = data.slug?.toLowerCase();
        if (!slug) return;
        if (change.type === 'removed') {
          liveImages.delete(slug);
        } else {
          liveImages.set(slug, data);
        }
      });
    });

    console.log('[ADS93] Connected to real Firestore database successfully.');
  } catch (err) {
    console.error('[ADS93] Failed to initialize backend Firestore:', err);
  }
}

// Tìm file thực tế trong thư mục data/uploads kể cả khi URL thiếu đuôi (.png, .gif, .jpg)
function resolveUploadFilePath(requestedName: string): string | null {
  const cleanName = path.basename(requestedName);
  const directPath = path.join(UPLOADS_DIR, cleanName);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  const exts = ['.png', '.gif', '.jpg', '.jpeg', '.webp', '.svg'];
  for (const ext of exts) {
    const candidate = path.join(UPLOADS_DIR, `${cleanName}${ext}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  // Tìm file có tiền tố khớp (VD: 12345_...)
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const matched = files.find(
      f => f.toLowerCase() === cleanName.toLowerCase() ||
           f.toLowerCase().startsWith(cleanName.toLowerCase() + '.')
    );
    if (matched) return path.join(UPLOADS_DIR, matched);
  } catch {}

  return null;
}

function parseSource(req: Request): { source: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; referrer?: string } {
  const query = req.query as Record<string, string>;
  const utmSource = query.utm_source;
  const utmMedium = query.utm_medium;
  const utmCampaign = query.utm_campaign;
  const customSrc = query.src || query.source || query.ref;
  const referer = (req.headers['referer'] || req.headers['referrer'] || '') as string;

  if (utmSource) return { source: utmSource, utmSource, utmMedium, utmCampaign };
  if (customSrc) return { source: customSrc, utmSource: customSrc, utmMedium, utmCampaign };
  if (referer) {
    const lowerRef = referer.toLowerCase();
    if (lowerRef.includes('tiktok.com') || lowerRef.includes('musical.ly')) return { source: 'TikTok', referrer: referer };
    if (lowerRef.includes('facebook.com') || lowerRef.includes('fb.me') || lowerRef.includes('m.facebook.com')) return { source: 'Facebook', referrer: referer };
    if (lowerRef.includes('zalo.me') || lowerRef.includes('zaloapp.com')) return { source: 'Zalo', referrer: referer };
    if (lowerRef.includes('google.com') || lowerRef.includes('google.')) return { source: 'Google', referrer: referer };
    if (lowerRef.includes('instagram.com')) return { source: 'Instagram', referrer: referer };
    if (lowerRef.includes('youtube.com') || lowerRef.includes('youtu.be')) return { source: 'YouTube', referrer: referer };
    if (lowerRef.includes('threads.net')) return { source: 'Threads', referrer: referer };
    if (lowerRef.includes('t.me') || lowerRef.includes('telegram')) return { source: 'Telegram', referrer: referer };
    
    try {
      const url = new URL(referer);
      return { source: url.hostname.replace('www.', ''), referrer: referer };
    } catch {
      return { source: 'Referral', referrer: referer };
    }
  }

  if (query.ttclid) return { source: 'TikTok Ads' };
  if (query.fbclid) return { source: 'Facebook Ads' };
  if (query.gclid) return { source: 'Google Ads' };

  return { source: 'Direct' };
}

function parseDevice(userAgent: string): 'Mobile' | 'Desktop' | 'Tablet' | 'Other' {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) return 'Tablet';
  if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(ua)) {
    return 'Mobile';
  }
  return 'Desktop';
}

function parseBrowser(userAgent: string): { browser: string; os: string } {
  const ua = userAgent || '';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  if (/tiktok/i.test(ua)) browser = 'TikTok App';
  else if (/fban|fbav/i.test(ua)) browser = 'Facebook App';
  else if (/zalo/i.test(ua)) browser = 'Zalo App';
  else if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  return { browser, os };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Phục vụ thông minh cho route /uploads/:filename (Hỗ trợ cả khi không gõ đuôi .png/.gif hoặc dùng mã slug)
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

    const rawName = req.params.filename;
    const foundFile = resolveUploadFilePath(rawName);
    if (foundFile) {
      return res.sendFile(foundFile);
    }

    // Nếu người dùng gõ /uploads/12345 mà 12345 là slug của banner, trả về ảnh của banner đó
    const slug = rawName.replace(/\.[^/.]+$/, '').toLowerCase();
    const banner = liveImages.get(slug) || db.getImageBySlug(slug);
    if (banner && banner.imageUrl) {
      if (banner.imageUrl.startsWith('/uploads/')) {
        const bannerFile = resolveUploadFilePath(banner.imageUrl);
        if (bannerFile) return res.sendFile(bannerFile);
      }
      return res.redirect(banner.imageUrl);
    }

    return res.status(404).send('Not found');
  });

  app.use('/uploads', express.static(UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-cache');
    }
  }));

  // --- REDIRECT ROUTE: /link/:slug ---
  app.get('/link/:slug', async (req: Request, res: Response) => {
    const rawSlug = req.params.slug;
    const slug = rawSlug.trim().toLowerCase();

    let link = liveLinks.get(slug);

    if (!link && firestoreDb) {
      try {
        const q = query(collection(firestoreDb, 'links'), where('slug', '==', slug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          link = { id: snap.docs[0].id, ...snap.docs[0].data() };
          liveLinks.set(slug, link);
        }
      } catch (err) {
        console.error('Direct Firestore query error:', err);
      }
    }

    if (!link) link = db.getLinkBySlug(slug);
    if (!link || link.isActive === false) return res.redirect(302, '/');

    const userAgent = (req.headers['user-agent'] || '') as string;
    const referrer = (req.headers['referer'] || req.headers['referrer'] || '') as string;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const sourceInfo = parseSource(req);
    const device = parseDevice(userAgent);
    const { browser, os } = parseBrowser(userAgent);
    const timestamp = new Date().toISOString();

    if (firestoreDb) {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      setDoc(doc(firestoreDb, 'click_logs', logId), {
        linkId: link.id || '',
        linkSlug: link.slug,
        targetUrl: link.destinationUrl,
        timestamp,
        source: sourceInfo.source,
        utmSource: sourceInfo.utmSource || '',
        utmMedium: sourceInfo.utmMedium || '',
        utmCampaign: sourceInfo.utmCampaign || '',
        referrer,
        userAgent,
        device,
        browser,
        os,
        ip: ip.replace(/\.\d+$/, '.xxx'),
        isUnique: true
      }).catch(() => {});

      if (link.id) {
        updateDoc(doc(firestoreDb, 'links', link.id), {
          totalClicks: increment(1),
          uniqueClicks: increment(1),
          lastClickedAt: timestamp
        }).catch(() => {});
      }
    }

    try {
      db.recordClick(link, {
        source: sourceInfo.source,
        utmSource: sourceInfo.utmSource,
        utmMedium: sourceInfo.utmMedium,
        utmCampaign: sourceInfo.utmCampaign,
        referrer,
        userAgent,
        device,
        browser,
        os,
        ip
      });
    } catch {}

    let finalUrl = (link.destinationUrl || '').trim();
    if (!finalUrl) return res.redirect(302, '/');
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;

    const queryEntries = Object.entries(req.query);
    if (queryEntries.length > 0) {
      try {
        const dest = new URL(finalUrl);
        for (const [key, val] of queryEntries) {
          if (typeof val === 'string' && !dest.searchParams.has(key) && key !== '_preview') {
            dest.searchParams.set(key, val);
          }
        }
        finalUrl = dest.toString();
      } catch {}
    }

    res.setHeader('Location', finalUrl);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(302).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${encodeURI(finalUrl)}"><script>window.location.replace(${JSON.stringify(finalUrl)});</script></head><body style="background:#f8fafc;margin:0;"></body></html>`);
  });

  // --- IMAGE BANNER ROUTE: /image/:slug ---
  app.get('/image/:slug', async (req: Request, res: Response) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const rawSlug = req.params.slug;
    const slug = rawSlug.trim().toLowerCase().replace(/\.[^/.]+$/, '');

    let banner = liveImages.get(slug);

    if (!banner && firestoreDb) {
      try {
        const q = query(collection(firestoreDb, 'images'), where('slug', '==', slug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          banner = { id: snap.docs[0].id, ...snap.docs[0].data() };
          liveImages.set(slug, banner);
        }
      } catch (err) {
        console.error('Direct Firestore image query error:', err);
      }
    }

    if (!banner) banner = db.getImageBySlug(slug);

    if (!banner) {
      // Thử kiểm tra xem có file trực tiếp trong /uploads trùng tên slug không
      const fallbackUpload = resolveUploadFilePath(rawSlug);
      if (fallbackUpload) {
        return res.sendFile(fallbackUpload);
      }

      res.setHeader('Content-Type', 'image/svg+xml');
      return res.status(404).send(`
        <svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
          <rect width="600" height="300" fill="#f8fafc"/>
          <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="#0f172a" font-family="sans-serif" font-size="20" font-weight="bold">ADS93 - Không tìm thấy ảnh</text>
          <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="14">/image/${slug}</text>
        </svg>
      `);
    }

    if (firestoreDb && banner.id) {
      updateDoc(doc(firestoreDb, 'images', banner.id), {
        viewsCount: increment(1)
      }).catch(() => {});
    }
    db.incrementImageView(slug);

    if (req.query.format === 'json') {
      return res.json({ success: true, banner });
    }

    const imageUrl = banner.imageUrl;

    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      const found = resolveUploadFilePath(imageUrl);
      if (found) {
        return res.sendFile(found);
      }
    }

    if (imageUrl.startsWith('data:image/')) {
      const parts = imageUrl.split(',');
      const match = parts[0].match(/:(.*?);/);
      const mime = match ? match[1] : 'image/png';
      const buffer = Buffer.from(parts[1], 'base64');
      res.setHeader('Content-Type', mime);
      return res.send(buffer);
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Nếu là URL trỏ về chính /uploads/ của localhost, phục vụ trực tiếp từ ổ cứng
      try {
        const parsedUrl = new URL(imageUrl);
        if (parsedUrl.pathname.startsWith('/uploads/')) {
          const localFound = resolveUploadFilePath(parsedUrl.pathname);
          if (localFound) return res.sendFile(localFound);
        }
      } catch {}

      try {
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
          }
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type') || banner.contentType || 'image/png';
          res.setHeader('Content-Type', contentType);
          const arrayBuffer = await response.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (err) {
        console.error('Failed to proxy image, redirecting instead:', err);
      }
      return res.redirect(imageUrl);
    }

    return res.redirect(imageUrl);
  });

  // Proxy helper cho phép Canvas tải ảnh ngoài không bị dính lỗi CORS
  app.get('/api/proxy-image', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url');
    try {
      const parsed = new URL(targetUrl);
      if (parsed.pathname.startsWith('/uploads/')) {
        const localFile = resolveUploadFilePath(parsed.pathname);
        if (localFile) return res.sendFile(localFile);
      }
    } catch {}

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8'
        }
      });
      if (!response.ok) return res.status(response.status).send('Fetch failed');
      const contentType = response.headers.get('content-type') || 'image/png';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch {
      return res.status(500).send('Proxy error');
    }
  });

  // Upload API
  app.post('/api/upload', (req: Request, res: Response) => {
    try {
      const { filename, data, exactName } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: 'Thiếu dữ liệu ảnh' });
      }

      const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      let buffer: Buffer;
      let ext = 'png';

      if (matches && matches.length === 3) {
        const mime = matches[1];
        if (mime.includes('gif')) ext = 'gif';
        else if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('svg')) ext = 'svg';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(data, 'base64');
      }

      const safeName = (filename || 'banner')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      const finalFilename = exactName ? `${safeName}.${ext}` : `${safeName}_${Date.now()}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, finalFilename);

      fs.writeFileSync(filePath, buffer);

      const relativeUrl = `/uploads/${finalFilename}`;
      const sizeInKb = `${Math.round(buffer.length / 1024)} KB`;

      res.json({
        success: true,
        url: relativeUrl,
        filename: finalFilename,
        fileSize: sizeInKb
      });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ success: false, error: err.message || 'Lỗi khi lưu ảnh' });
    }
  });

  // API Đổi tên file / đường dẫn ảnh (VD: từ /uploads/123 sang /uploads/12345 hoặc /image/12345)
  app.post('/api/rename-banner-link', (req: Request, res: Response) => {
    try {
      const { currentImageUrl, currentOriginalUrl, newName } = req.body;
      const cleanNewName = String(newName || '')
        .trim()
        .replace(/^.*\/(uploads|image)\//i, '')
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '-');

      if (!cleanNewName) {
        return res.status(400).json({ success: false, error: 'Tên đường dẫn mới không hợp lệ' });
      }

      let finalImageUrl = currentImageUrl;
      let finalOriginalUrl = currentOriginalUrl || currentImageUrl;

      // Sao chép file trong /uploads sang tên mới để cả /uploads/<newName> và /image/<newName> đều hoạt động
      const existingFile = resolveUploadFilePath(currentImageUrl || '') || resolveUploadFilePath(currentOriginalUrl || '');
      if (existingFile) {
        const ext = path.extname(existingFile) || '.png';
        const newFileName = `${cleanNewName}${ext}`;
        const newFilePath = path.join(UPLOADS_DIR, newFileName);
        if (existingFile !== newFilePath) {
          fs.copyFileSync(existingFile, newFilePath);
        }
        finalImageUrl = `/uploads/${newFileName}`;
      }

      return res.json({
        success: true,
        newSlug: cleanNewName.toLowerCase(),
        newImageUrl: finalImageUrl,
        newOriginalUrl: finalOriginalUrl
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || 'Lỗi đổi tên link ảnh' });
    }
  });

  // Links REST API
  app.get('/api/links', (_req: Request, res: Response) => {
    if (liveLinks.size > 0) {
      return res.json({ success: true, data: Array.from(liveLinks.values()) });
    }
    res.json({ success: true, data: db.getLinks() });
  });

  app.post('/api/links', (req: Request, res: Response) => {
    try {
      const link = db.createLink(req.body);
      if (link.slug) liveLinks.set(link.slug.toLowerCase(), link);
      res.status(201).json({ success: true, data: link });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/links/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const payload = req.body;
      
      let updated: any = null;
      try {
        updated = db.updateLink(id, payload);
      } catch {
        updated = { id, ...payload };
      }

      if (firestoreDb) {
        try {
          await updateDoc(doc(firestoreDb, 'links', id), {
            ...payload,
            updatedAt: new Date().toISOString()
          });
        } catch {
          if (payload.slug) {
            const q = query(collection(firestoreDb, 'links'), where('slug', '==', payload.slug));
            const snap = await getDocs(q);
            if (!snap.empty) {
              await updateDoc(snap.docs[0].ref, {
                ...payload,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      }

      if (payload.slug) {
        liveLinks.set(payload.slug.toLowerCase(), { ...updated, ...payload });
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/links/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      db.deleteLink(id);
      
      for (const [slug, item] of liveLinks.entries()) {
        if (item.id === id || slug === id.toLowerCase()) {
          liveLinks.delete(slug);
        }
      }

      if (firestoreDb) {
        try {
          await deleteDoc(doc(firestoreDb, 'links', id));
        } catch {
          const q = query(collection(firestoreDb, 'links'), where('slug', '==', id.toLowerCase()));
          const snap = await getDocs(q);
          snap.forEach(d => deleteDoc(d.ref));
        }
      }

      res.json({ success: true });
    } catch {
      res.json({ success: true });
    }
  });

  // Images REST API
  app.get('/api/images', (_req: Request, res: Response) => {
    if (liveImages.size > 0) {
      return res.json({ success: true, data: Array.from(liveImages.values()) });
    }
    res.json({ success: true, data: db.getImages() });
  });

  app.post('/api/images', (req: Request, res: Response) => {
    try {
      const image = db.createImage(req.body);
      if (image.slug) liveImages.set(image.slug.toLowerCase(), image);
      res.status(201).json({ success: true, data: image });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.put('/api/images/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      let existingInMem: any = null;
      let oldSlugKey: string | null = null;

      for (const [k, v] of liveImages.entries()) {
        if (v.id === id) {
          existingInMem = v;
          oldSlugKey = k;
          break;
        }
      }

      let updated: any = null;
      try {
        updated = db.updateImage(id, req.body);
      } catch {
        updated = { ...(existingInMem || {}), id, ...req.body };
      }

      const finalSlug = (req.body.slug || updated.slug || '').toLowerCase();
      if (oldSlugKey && finalSlug && oldSlugKey !== finalSlug) {
        liveImages.delete(oldSlugKey);
      }
      if (finalSlug) {
        liveImages.set(finalSlug, { ...(existingInMem || {}), ...updated, ...req.body });
      }

      if (firestoreDb) {
        try {
          await updateDoc(doc(firestoreDb, 'images', id), {
            ...req.body,
            updatedAt: new Date().toISOString()
          });
        } catch {}
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/images/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      db.deleteImage(id);

      for (const [slug, item] of liveImages.entries()) {
        if (item.id === id || slug === id.toLowerCase()) {
          liveImages.delete(slug);
        }
      }

      if (firestoreDb) {
        try {
          await deleteDoc(doc(firestoreDb, 'images', id));
        } catch {
          const q = query(collection(firestoreDb, 'images'), where('slug', '==', id.toLowerCase()));
          const snap = await getDocs(q);
          snap.forEach(d => deleteDoc(d.ref));
        }
      }

      res.json({ success: true });
    } catch {
      res.json({ success: true });
    }
  });

  // Analytics & Logs
  app.get('/api/analytics', (_req: Request, res: Response) => {
    res.json({ success: true, data: db.getAnalytics() });
  });

  app.get('/api/logs', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 200;
    const linkSlug = req.query.slug as string;
    const source = req.query.source as string;
    res.json({ success: true, data: db.getLogs(limit, linkSlug, source) });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ADS93] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start ADS93 server:', err);
  process.exit(1);
});