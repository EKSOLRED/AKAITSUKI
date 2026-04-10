import { sanitizeUrl } from './url.js';

export function isVideoLike(project) {
  return ['video', 'trailer'].includes(project?.type);
}

export function getVideoSourceHost(url = '') {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (hostname.includes('youtube')) return 'YouTube';
    if (hostname.includes('vk')) return 'VK Видео';
    if (hostname.includes('rutube')) return 'Rutube';
    return hostname;
  } catch {
    return 'Видео';
  }
}

export function getVideoThumbnailUrl(url = '') {
  const value = sanitizeUrl(url);
  if (!value) return '';

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host.includes('youtu.be')) {
      videoId = parsed.pathname.replace(/^\//, '');
    } else if (host.includes('youtube.com')) {
      if (parsed.pathname === '/watch') videoId = parsed.searchParams.get('v') || '';
      if (parsed.pathname.startsWith('/embed/')) videoId = parsed.pathname.split('/embed/')[1] || '';
      if (parsed.pathname.startsWith('/shorts/')) videoId = parsed.pathname.split('/shorts/')[1] || '';
    }

    videoId = videoId.split(/[?&#]/)[0].trim();
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
  } catch {
    return '';
  }
}
