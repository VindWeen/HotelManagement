/**
 * Lấy URL đầy đủ của hình ảnh.
 * Do API trả về đường dẫn tương đối (VD: /uploads/images/...),
 * ta cần ghép với VITE_API_URL (hoặc BASE_URL) để hiển thị trên frontend.
 */
export function getFullImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  
  // Lấy API URL từ env, ví dụ "http://localhost:5279/api" -> cắt "/api" đi thành "http://localhost:5279"
  const apiUrl = import.meta.env.VITE_API_URL || '';
  const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;

  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  return `${baseUrl}/${url}`;
}
