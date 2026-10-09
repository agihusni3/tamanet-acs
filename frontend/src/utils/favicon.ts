import { BrandSettings } from '../context/AppContext';

/**
 * Menghasilkan SVG Data URI untuk Favicon Tab Browser jika logo berupa vektor/ikon.
 */
function generateSvgFavicon(color: string, iconType: string, appName: string): string {
  const initial = (appName.trim().charAt(0) || 'A').toUpperCase();
  const bg = color || '#2563EB';

  let iconSvg = '';
  switch (iconType) {
    case 'wifi':
      iconSvg = `<path d="M12 20h.01M5 12.859a10 10 0 0114 0M8.5 16.429a5 5 0 017 0" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      break;
    case 'globe':
      iconSvg = `<circle cx="12" cy="12" r="10" stroke="white" stroke-width="2" fill="none"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="white" stroke-width="1.8" fill="none"/>`;
      break;
    case 'server':
      iconSvg = `<rect x="3" y="4" width="18" height="6" rx="2" stroke="white" stroke-width="2" fill="none"/><rect x="3" y="14" width="18" height="6" rx="2" stroke="white" stroke-width="2" fill="none"/><circle cx="7" cy="7" r="1" fill="white"/><circle cx="7" cy="17" r="1" fill="white"/>`;
      break;
    case 'shield':
      iconSvg = `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="white" stroke-width="2" fill="none"/>`;
      break;
    case 'zap':
      iconSvg = `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="white"/>`;
      break;
    case 'activity':
    default:
      iconSvg = `<path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#grad)"/>
    <g transform="translate(4, 4) scale(0.75)">
      ${iconSvg}
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Mengubah favicon tab browser dan judul halaman (document.title)
 * secara langsung & dinamis mengikuti pengaturan branding yang fleksibel.
 */
export function syncBrowserFaviconAndTitle(branding: BrandSettings): void {
  try {
    // 1. Perbarui Document Title
    const titleText = branding.appName
      ? `${branding.appName}${branding.tagline ? ` • ${branding.tagline}` : ''}`
      : 'PROJECT ACS • TR-069 & GIS FTTH';
    document.title = titleText;

    // 2. Tentukan URL Favicon (Bisa gambar upload/URL atau SVG ikon otomatis)
    let faviconUrl = '';
    if (branding.logoType === 'image' && branding.logoImageUrl && branding.logoImageUrl.trim() !== '') {
      faviconUrl = branding.logoImageUrl.trim();
    } else {
      faviconUrl = generateSvgFavicon(
        branding.logoColor || '#2563EB',
        branding.logoIcon || 'activity',
        branding.appName || 'ACS'
      );
    }

    // 3. Perbarui elemen <link rel="icon"> di <head>
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.head.appendChild(link);
    }

    link.type = faviconUrl.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/png';
    link.href = faviconUrl;

    // Beberapa browser membutuhkan trigger reload link favicon
    const newLink = link.cloneNode(true) as HTMLLinkElement;
    newLink.href = faviconUrl;
    link.parentNode?.replaceChild(newLink, link);
  } catch (err) {
    console.warn('[Branding] Gagal memperbarui favicon tab browser:', err);
  }
}
