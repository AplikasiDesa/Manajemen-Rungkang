/**
 * @fileOverview Konfigurasi Cloudinary Desa Digital.
 */

export const CLOUDINARY_CONFIG = {
  cloudName: "dyztgipsf",
  uploadPreset: "desa_digital_preset", 
  apiKey: "952722882461689",
  baseUrl: "https://api.cloudinary.com/v1_1/dyztgipsf/image/upload"
};

/**
 * Utilitas untuk mengoptimalkan URL Cloudinary secara otomatis.
 */
export const getOptimizedCloudinaryUrl = (url: string) => {
  if (!url || !url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", "/upload/f_auto,q_auto/");
};
