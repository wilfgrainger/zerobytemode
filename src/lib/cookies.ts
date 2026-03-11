// Cookie helpers (avoids direct document.cookie access per lint rules)
export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
};

export const setCookie = (name: string, value: string, options: string) => {
  // Ensure cookies are shared across apex and www subdomains
  const { hostname } = window.location;
  const isProd = hostname === 'zerobytemode.com' || hostname.endsWith('.zerobytemode.com');
  const domain = isProd ? "; domain=.zerobytemode.com" : "";
  const secure = isProd ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; ${options}${domain}${secure}`;
};

export const deleteCookie = (name: string) => {
  const { hostname } = window.location;
  const isProd = hostname === 'zerobytemode.com' || hostname.endsWith('.zerobytemode.com');
  const baseOptions = "path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";

  // 1. Try deleting without a domain
  document.cookie = `${name}=; ${baseOptions}`;
  document.cookie = `${name}=; ${baseOptions}; Secure`;

  // 2. Try deleting with the apex domain explicitly if on production
  if (isProd) {
    document.cookie = `${name}=; ${baseOptions}; domain=.zerobytemode.com`;
    document.cookie = `${name}=; ${baseOptions}; domain=.zerobytemode.com; Secure`;
    document.cookie = `${name}=; ${baseOptions}; domain=zerobytemode.com`;
    document.cookie = `${name}=; ${baseOptions}; domain=zerobytemode.com; Secure`;
  }
};
