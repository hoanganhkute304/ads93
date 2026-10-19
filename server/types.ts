export interface LinkItem {
  id: string;
  title: string;
  slug: string;
  destinationUrl: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  tags: string[];
  totalClicks: number;
  uniqueClicks: number;
  lastClickedAt?: string;
  notes?: string;
}

export interface ImageBannerItem {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  contentType: string;
  dimensions?: string;
  aspectRatio?: string;
  fileSize?: string;
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  isActive: boolean;
  targetLinkSlug?: string;
  notes?: string;
}

export interface ClickLog {
  id: string;
  linkId: string;
  linkSlug: string;
  targetUrl: string;
  timestamp: string;
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
  isUnique: boolean;
}

export interface DatabaseSchema {
  links: LinkItem[];
  images: ImageBannerItem[];
  logs: ClickLog[];
  ipSeen: Record<string, string[]>; // linkId -> array of IP hashes
}
