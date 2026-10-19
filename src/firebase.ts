import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  getDocs,
  where,
  increment
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { LinkItem, ImageBannerItem, ClickLog } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);

// Error handling conforming to Skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection on startup
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection confirmed.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    // Expected to succeed or reject gracefully
    return false;
  }
}

testConnection();

// Collection names
const LINKS_COLL = 'links';
const IMAGES_COLL = 'images';
const LOGS_COLL = 'click_logs';

// --- REAL-TIME LISTENERS ---
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
      // Sort newest first
      links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(links);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, LINKS_COLL);
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
          contentType: data.contentType || 'image/png',
          dimensions: data.dimensions,
          aspectRatio: data.aspectRatio || '2.4:1',
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
      handleFirestoreError(error, OperationType.LIST, IMAGES_COLL);
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
      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(logs);
    },
    error => {
      handleFirestoreError(error, OperationType.LIST, LOGS_COLL);
      onError?.(error);
    }
  );
}

// --- CRUD OPERATIONS ---
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

  try {
    await setDoc(doc(db, LINKS_COLL, id), newDoc);
    return { id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${LINKS_COLL}/${id}`);
  }
}

export async function updateLinkInFirestore(id: string, updates: Partial<LinkItem>): Promise<void> {
  const path = `${LINKS_COLL}/${id}`;
  try {
    await updateDoc(doc(db, LINKS_COLL, id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteLinkFromFirestore(id: string, slug?: string): Promise<void> {
  const path = `${LINKS_COLL}/${id}`;
  try {
    await deleteDoc(doc(db, LINKS_COLL, id));
  } catch (error) {
    console.warn(`Direct deleteDoc for link ${id} failed, trying query:`, error);
  }

  if (slug) {
    try {
      const clean = slug.trim().toLowerCase();
      const q = query(collection(db, LINKS_COLL), where('slug', '==', clean));
      const snap = await getDocs(q);
      const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batchDeletes);
    } catch (err) {
      console.warn(`Delete link by slug ${slug} failed:`, err);
    }
  }
}

export async function addBannerToFirestore(payload: {
  title: string;
  slug: string;
  imageUrl: string;
  dimensions?: string;
  aspectRatio?: string;
  fileSize?: string;
  targetLinkSlug?: string;
  notes?: string;
}): Promise<ImageBannerItem> {
  const cleanSlug = payload.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const now = new Date().toISOString();
  const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newDoc = {
    title: payload.title.trim() || `Banner ${cleanSlug}`,
    slug: cleanSlug,
    imageUrl: payload.imageUrl.trim(),
    contentType: payload.imageUrl.endsWith('.png') ? 'image/png' : (payload.imageUrl.endsWith('.webp') ? 'image/webp' : 'image/jpeg'),
    dimensions: payload.dimensions || '1200x630',
    aspectRatio: payload.aspectRatio || '2.4:1',
    fileSize: payload.fileSize || 'Tự động',
    createdAt: now,
    updatedAt: now,
    viewsCount: 0,
    isActive: true,
    targetLinkSlug: payload.targetLinkSlug || '',
    notes: payload.notes || ''
  };

  if (newDoc.imageUrl.length > 5000) {
    throw new Error('Đường dẫn ảnh quá lớn (>5KB). Tệp ảnh đã tải cần được chuyển qua hệ thống lưu trữ máy chủ /uploads thay vì lưu trực tiếp base64 vào Firestore.');
  }

  try {
    await setDoc(doc(db, IMAGES_COLL, id), newDoc);
    return { id, ...newDoc };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${IMAGES_COLL}/${id}`);
  }
}

export async function updateBannerInFirestore(id: string, updates: Partial<ImageBannerItem>): Promise<void> {
  const path = `${IMAGES_COLL}/${id}`;
  try {
    await updateDoc(doc(db, IMAGES_COLL, id), {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBannerFromFirestore(id: string, slug?: string): Promise<void> {
  const path = `${IMAGES_COLL}/${id}`;
  try {
    await deleteDoc(doc(db, IMAGES_COLL, id));
  } catch (error) {
    console.warn(`Direct deleteDoc for image ${id} failed, trying query:`, error);
  }

  if (slug) {
    try {
      const clean = slug.trim().toLowerCase();
      const q = query(collection(db, IMAGES_COLL), where('slug', '==', clean));
      const snap = await getDocs(q);
      const batchDeletes = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batchDeletes);
    } catch (err) {
      console.warn(`Delete image by slug ${slug} failed:`, err);
    }
  }
}

export async function logClickToFirestore(log: Omit<ClickLog, 'id'>): Promise<void> {
  const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    await setDoc(doc(db, LOGS_COLL, id), log);
    // Also increment link counters if linkId exists
    if (log.linkId) {
      const linkRef = doc(db, LINKS_COLL, log.linkId);
      await updateDoc(linkRef, {
        totalClicks: increment(1),
        ...(log.isUnique ? { uniqueClicks: increment(1) } : {}),
        lastClickedAt: log.timestamp
      }).catch(() => {
        // Safe catch if link not found by id
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${LOGS_COLL}/${id}`);
  }
}
