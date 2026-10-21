import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  query,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  where,
  increment
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { LinkItem, ImageBannerItem, ClickLog, BannerFitMode } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error:', errInfo);
  throw new Error(errInfo.error);
}

export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch {
    return false;
  }
}

const LINKS_COLL = 'links';
const IMAGES_COLL = 'images';
const LOGS_COLL = 'click_logs';

export function subscribeLinks(onUpdate: (links: LinkItem[]) => void, onError?: (err: any) => void) {
  const q = query(collection(db, LINKS_COLL));
  return onSnapshot(
    q,
    snapshot => {
      const links: LinkItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        links.push({
          id: docSnap.id,
          title: data.title || '',
          slug: data.slug || '',
          destinationUrl: data.destinationUrl || '',
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          isActive: data.isActive !== false,
          tags: data.tags || [],
          totalClicks: data.totalClicks || 0,
          uniqueClicks: data.uniqueClicks || 0,
          lastClickedAt: data.lastClickedAt,
          notes: data.notes || ''
        });
      });
      links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(links);
    },
    error => {
      onError?.(error);
    }
  );
}

export function subscribeBanners(onUpdate: (banners: ImageBannerItem[]) => void, onError?: (err: any) => void) {
  const q = query(collection(db, IMAGES_COLL));
  return onSnapshot(
    q,
    snapshot => {
      const banners: ImageBannerItem[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        banners.push({
          id: docSnap.id,
          title: data.title || '',
          slug: data.slug || '',
          imageUrl: data.imageUrl || '',
          originalImageUrl: data.originalImageUrl || data.imageUrl || '',
          contentType: data.contentType || 'image/png',
          dimensions: data.dimensions,
          aspectRatio: data.aspectRatio || '16:9',
          fitMode: (data.fitMode as BannerFitMode) || 'fit',
          bgColor: data.bgColor || '#ffffff',
          rotation: data.rotation || 0,
          flipH: !!data.flipH,
          flipV: !!data.flipV,
          offsetY: data.offsetY || 0,
          scale: data.scale !== undefined ? data.scale : 1.0,
          opacity: data.opacity !== undefined ? data.opacity : 1.0,
          fileSize: data.fileSize,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          viewsCount: data.viewsCount || 0,
          isActive: data.isActive !== false,
          targetLinkSlug: data.targetLinkSlug || '',
          notes: data.notes || ''
        });
      });
      banners.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(banners);
    },
    error => {
      onError?.(error);
    }
  );
}

export function subscribeClickLogs(onUpdate: (logs: ClickLog[]) => void, onError?: (err: any) => void) {
  const q = query(collection(db, LOGS_COLL));
  return onSnapshot(
    q,
    snapshot => {
      const logs: ClickLog[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          linkId: data.linkId || '',
          linkSlug: data.linkSlug || '',
          targetUrl: data.targetUrl || '',
          timestamp: data.timestamp || new Date().toISOString(),
          source: data.source || 'Direct',
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          referrer: data.referrer || '',
          userAgent: data.userAgent || '',
          device: data.device || 'Desktop',
          browser: data.browser || '',
          os: data.os || '',
          ip: data.ip || '127.0.0.1',
          isUnique: data.isUnique !== false
        });
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(logs);
    },
    error => {
      onError?.(error);
    }
  );
}

export async function addLinkToFirestore(payload: {
  title: string;
  slug: string;
  destinationUrl: string;
  tags?: string[];
  notes?: string;
}): Promise<LinkItem> {
  const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const now = new Date().toISOString();
  const id = `link_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newDoc = {
    title: payload.title.trim() || cleanSlug,
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
  await setDoc(doc(db, LINKS_COLL, id), newDoc);
  return { id, ...newDoc };
}

export async function updateLinkInFirestore(id: string, updates: Partial<LinkItem>): Promise<void> {
  await updateDoc(doc(db, LINKS_COLL, id), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteLinkFromFirestore(id: string, slug?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, LINKS_COLL, id));
  } catch {}
  if (slug) {
    try {
      const clean = slug.trim().toLowerCase();
      const q = query(collection(db, LINKS_COLL), where('slug', '==', clean));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch {}
  }
}

export async function addBannerToFirestore(payload: {
  title: string;
  slug: string;
  imageUrl: string;
  originalImageUrl?: string;
  dimensions?: string;
  aspectRatio?: string;
  fitMode?: BannerFitMode;
  bgColor?: string;
  rotation?: number;
  flipH?: boolean;
  flipV?: boolean;
  offsetY?: number;
  scale?: number;
  opacity?: number;
  fileSize?: string;
  targetLinkSlug?: string;
  notes?: string;
}): Promise<ImageBannerItem> {
  const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const now = new Date().toISOString();
  const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newDoc = {
    title: payload.title.trim() || cleanSlug,
    slug: cleanSlug,
    imageUrl: payload.imageUrl.trim(),
    originalImageUrl: (payload.originalImageUrl || payload.imageUrl).trim(),
    contentType: payload.imageUrl.endsWith('.gif') ? 'image/gif' : 'image/png',
    dimensions: payload.dimensions || '1600x900',
    aspectRatio: payload.aspectRatio || '16:9',
    fitMode: payload.fitMode || 'fit',
    bgColor: payload.bgColor || '#ffffff',
    rotation: payload.rotation || 0,
    flipH: !!payload.flipH,
    flipV: !!payload.flipV,
    offsetY: payload.offsetY || 0,
    scale: payload.scale !== undefined ? payload.scale : 1.0,
    opacity: payload.opacity !== undefined ? payload.opacity : 1.0,
    fileSize: payload.fileSize || 'Auto',
    createdAt: now,
    updatedAt: now,
    viewsCount: 0,
    isActive: true,
    targetLinkSlug: payload.targetLinkSlug || '',
    notes: payload.notes || ''
  };

  await setDoc(doc(db, IMAGES_COLL, id), newDoc);
  return { id, ...newDoc };
}

export async function updateBannerInFirestore(id: string, updates: Partial<ImageBannerItem>): Promise<void> {
  await updateDoc(doc(db, IMAGES_COLL, id), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteBannerFromFirestore(id: string, slug?: string): Promise<void> {
  try {
    await deleteDoc(doc(db, IMAGES_COLL, id));
  } catch {}
  if (slug) {
    try {
      const clean = slug.trim().toLowerCase();
      const q = query(collection(db, IMAGES_COLL), where('slug', '==', clean));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    } catch {}
  }
}

export async function logClickToFirestore(log: Omit<ClickLog, 'id'>): Promise<void> {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  await setDoc(doc(db, LOGS_COLL, id), log);
  if (log.linkId) {
    const linkRef = doc(db, LINKS_COLL, log.linkId);
    await updateDoc(linkRef, {
      totalClicks: increment(1),
      ...(log.isUnique ? { uniqueClicks: increment(1) } : {}),
      lastClickedAt: log.timestamp
    }).catch(() => {});
  }
}