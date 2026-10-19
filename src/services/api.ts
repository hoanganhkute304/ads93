import { LinkItem, ImageBannerItem, AnalyticsData, ClickLog } from '../types';

export const api = {
  async getLinks(): Promise<LinkItem[]> {
    const res = await fetch('/api/links');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch links');
    return json.data;
  },

  async createLink(payload: { title: string; slug: string; destinationUrl: string; tags?: string[]; notes?: string }): Promise<LinkItem> {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create link');
    return json.data;
  },

  async updateLink(id: string, payload: Partial<LinkItem>): Promise<LinkItem> {
    const res = await fetch(`/api/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update link');
    return json.data;
  },

  async deleteLink(id: string): Promise<boolean> {
    const res = await fetch(`/api/links/${id}`, { method: 'DELETE' });
    const json = await res.json();
    return json.success;
  },

  async getImages(): Promise<ImageBannerItem[]> {
    const res = await fetch('/api/images');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch images');
    return json.data;
  },

  async createImage(payload: { title: string; slug: string; imageUrl: string; dimensions?: string; fileSize?: string; targetLinkSlug?: string; notes?: string }): Promise<ImageBannerItem> {
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to create banner');
    return json.data;
  },

  async updateImage(id: string, payload: Partial<ImageBannerItem>): Promise<ImageBannerItem> {
    const res = await fetch(`/api/images/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to update image');
    return json.data;
  },

  async deleteImage(id: string): Promise<boolean> {
    const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
    const json = await res.json();
    return json.success;
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch('/api/analytics');
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch analytics');
    return json.data;
  },

  async getLogs(limit = 100, slug?: string, source?: string): Promise<ClickLog[]> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (slug) params.set('slug', slug);
    if (source) params.set('source', source);

    const res = await fetch(`/api/logs?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch logs');
    return json.data;
  },

  async simulateClick(slug: string, source: string, device: string): Promise<any> {
    const res = await fetch('/api/test-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, source, device })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to simulate click');
    return json.data;
  },

  async resetSeed(): Promise<void> {
    const res = await fetch('/api/reset', { method: 'POST' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to reset seed');
  }
};
