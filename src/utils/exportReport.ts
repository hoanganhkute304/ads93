import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalyticsData, LinkItem, ImageBannerItem, ClickLog } from '../types';

export function exportToExcel(
  analytics: AnalyticsData,
  links: LinkItem[],
  banners: ImageBannerItem[],
  logs: ClickLog[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Overview sheet
  const overviewData = [
    { 'Chỉ Số': 'Nền Tảng', 'Giá Trị': 'ADS93 - Hệ Thống Quản Lý Link & Banner Quảng Cáo' },
    { 'Chỉ Số': 'Thời Gian Xuất Báo Cáo', 'Giá Trị': new Date().toLocaleString('vi-VN') },
    { 'Chỉ Số': 'Tổng Lượt Click (All-time)', 'Giá Trị': analytics.totalClicks },
    { 'Chỉ Số': 'Lượt Click Duy Nhất (Unique Clicks)', 'Giá Trị': analytics.uniqueClicks },
    { 'Chỉ Số': 'Tỷ Lệ Unique (%)', 'Giá Trị': analytics.totalClicks > 0 ? `${Math.round((analytics.uniqueClicks / analytics.totalClicks) * 100)}%` : '0%' },
    { 'Chỉ Số': 'Lượt Click Trong 24 Giờ Qua', 'Giá Trị': analytics.clicks24h },
    { 'Chỉ Số': 'Lượt Click Trong 7 Ngày Qua', 'Giá Trị': analytics.clicks7d },
    { 'Chỉ Số': 'Tổng Lượt Hiển Thị Banner (Impressions)', 'Giá Trị': analytics.totalBannerViews },
    { 'Chỉ Số': 'Số Lượng Link Đang Hoạt Động', 'Giá Trị': analytics.activeLinksCount },
    { 'Chỉ Số': 'Số Lượng Banner Đang Hoạt Động', 'Giá Trị': analytics.activeBannersCount },
  ];
  const wsOverview = XLSX.utils.json_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Tong_Quan');

  // 2. Sources breakdown sheet
  const sourcesData = analytics.sources.map(s => ({
    'Nguồn Lưu Lượng (Source)': s.name,
    'Tổng Lượt Click': s.count,
    'Click Duy Nhất (Unique)': s.unique,
    'Tỷ Lệ Chiếm (%)': `${s.percentage}%`
  }));
  const wsSources = XLSX.utils.json_to_sheet(sourcesData);
  XLSX.utils.book_append_sheet(wb, wsSources, 'Nguon_Traffic');

  // 3. Links list sheet
  const linksData = links.map(l => ({
    'Mã Rút Gọn (Slug)': l.slug,
    'Tên Chiến Dịch': l.title,
    'Link Rút Gọn ADS93': `/link/${l.slug}`,
    'Trang Đích Thực Tế': l.destinationUrl,
    'Tổng Clicks': l.totalClicks,
    'Unique Clicks': l.uniqueClicks,
    'Trạng Thái': l.isActive ? 'Đang Chạy' : 'Tạm Dừng',
    'Nhãn Phân Loại': l.tags.join(', '),
    'Click Cuối Cùng': l.lastClickedAt ? new Date(l.lastClickedAt).toLocaleString('vi-VN') : 'Chưa có',
    'Ghi Chú': l.notes || ''
  }));
  const wsLinks = XLSX.utils.json_to_sheet(linksData);
  XLSX.utils.book_append_sheet(wb, wsLinks, 'Danh_Sach_Links');

  // 4. Banners list sheet
  const bannersData = banners.map(b => ({
    'Mã Banner (Slug)': b.slug,
    'Tên Banner': b.title,
    'Đường Dẫn Trực Tiếp': `/image/${b.slug}`,
    'Nguồn Ảnh Gốc': b.imageUrl,
    'Kích Thước': b.dimensions || 'N/A',
    'Lượt Hiển Thị (Views)': b.viewsCount,
    'Trạng Thái': b.isActive ? 'Đang Chạy' : 'Tạm Dừng',
    'Link Đính Kèm': b.targetLinkSlug ? `/link/${b.targetLinkSlug}` : 'Không',
    'Ghi Chú': b.notes || ''
  }));
  const wsBanners = XLSX.utils.json_to_sheet(bannersData);
  XLSX.utils.book_append_sheet(wb, wsBanners, 'Danh_Sach_Banners');

  // 5. Detailed Click Logs sheet
  const logsData = logs.map(log => ({
    'Mã Log': log.id,
    'Thời Gian': new Date(log.timestamp).toLocaleString('vi-VN'),
    'Link Slug': log.linkSlug,
    'Nguồn Truy Cập': log.source,
    'UTM Campaign': log.utmCampaign || '',
    'Thiết Bị': log.device,
    'Trình Duyệt': log.browser,
    'Hệ Điều Hành': log.os,
    'IP Khách': log.ip,
    'Unique': log.isUnique ? 'Có' : 'Không',
    'Trang Đích Nhảy Tới': log.targetUrl
  }));
  const wsLogs = XLSX.utils.json_to_sheet(logsData);
  XLSX.utils.book_append_sheet(wb, wsLogs, 'Nhat_Ky_Click');

  // Download file
  const fileName = `ADS93_Bao_Cao_Marketing_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportToPdf(
  analytics: AnalyticsData,
  links: LinkItem[],
  banners: ImageBannerItem[],
  logs: ClickLog[]
) {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleString('vi-VN');

  // Header background
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 38, 'F');

  // Title
  doc.setTextColor(245, 158, 11); // Amber
  doc.setFontSize(22);
  doc.text('ADS93 - BAO CAO QUANG CAO & TRAFFIC', 14, 18);

  doc.setTextColor(200, 200, 200);
  doc.setFontSize(10);
  doc.text(`Bao cao thong ke luot click thoi gian thuc - Xuat luc: ${dateStr}`, 14, 28);

  let startY = 46;

  // Overview Table
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.text('1. Tong Quan Hieu Suat Chien Dich', 14, startY);

  const summaryRows = [
    ['Tong Luot Click', String(analytics.totalClicks), 'Luot Click Duy Nhat (Unique)', String(analytics.uniqueClicks)],
    ['Luot Click 24h Qua', String(analytics.clicks24h), 'Luot Click 7 Ngay Qua', String(analytics.clicks7d)],
    ['Tong Luot Xem Banner', String(analytics.totalBannerViews), 'So Link / Banner Dang Chay', `${analytics.activeLinksCount} Links / ${analytics.activeBannersCount} Banners`]
  ];

  autoTable(doc, {
    startY: startY + 4,
    head: [['Chi So', 'Gia Tri', 'Chi So', 'Gia Tri']],
    body: summaryRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    styles: { fontSize: 9 }
  });

  const afterSummary = (doc as any).lastAutoTable.finalY + 12;

  // Source distribution table
  doc.setFontSize(13);
  doc.text('2. Phan Bo Luot Click Theo Nguon (Traffic Sources)', 14, afterSummary);

  const sourcesRows = analytics.sources.map(s => [
    s.name,
    String(s.count),
    String(s.unique),
    `${s.percentage}%`
  ]);

  autoTable(doc, {
    startY: afterSummary + 4,
    head: [['Nguon Traffic', 'Tong Clicks', 'Unique Clicks', 'Ti Le Chi Phi & Dong Gop (%)']],
    body: sourcesRows,
    theme: 'striped',
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0] },
    styles: { fontSize: 9 }
  });

  const afterSources = (doc as any).lastAutoTable.finalY + 12;

  // Top Links table
  doc.setFontSize(13);
  doc.text('3. Danh Sach Cac Duong Dan Quang Cao (Short Links)', 14, afterSources);

  const linksRows = links.slice(0, 10).map(l => [
    `/link/${l.slug}`,
    l.title,
    l.destinationUrl.length > 35 ? l.destinationUrl.substring(0, 32) + '...' : l.destinationUrl,
    String(l.totalClicks),
    String(l.uniqueClicks),
    l.isActive ? 'Active' : 'Paused'
  ]);

  autoTable(doc, {
    startY: afterSources + 4,
    head: [['Duong Dan Rút Gon', 'Tieu De Chien Dich', 'Trang Dich Thuc Te', 'Clicks', 'Unique', 'Trang Thai']],
    body: linksRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    styles: { fontSize: 8 }
  });

  // Page 2: Logs sample
  doc.addPage();

  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(14);
  doc.text('ADS93 - Nhat Ky Truy Cap Gan Day (Click Stream Logs)', 14, 15);

  const logRows = logs.slice(0, 25).map(l => [
    new Date(l.timestamp).toLocaleTimeString('vi-VN') + ' ' + new Date(l.timestamp).toLocaleDateString('vi-VN'),
    `/link/${l.linkSlug}`,
    l.source,
    `${l.device} (${l.browser})`,
    l.ip,
    l.isUnique ? 'Unique' : 'Repeat'
  ]);

  autoTable(doc, {
    startY: 30,
    head: [['Thoi Gian', 'Link', 'Nguon', 'Thiet Bi & Trinh Duyet', 'IP Mask', 'Kiem Tra']],
    body: logRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    styles: { fontSize: 8 }
  });

  // Footer note
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Bao cao tu dong tao boi ADS93. Giai phap quan ly link quang cao & banner tap trung toi gian.', 14, finalY);

  const fileName = `ADS93_Bao_Cao_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
