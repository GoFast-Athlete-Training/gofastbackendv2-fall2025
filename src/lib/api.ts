const sanitizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const envValue = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!envValue) {
    return '';
  }

  return sanitizeBaseUrl(envValue.trim());
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
};


