function getApiBase(): string {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NEXT_PUBLIC_API_URL
  ) {
    return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.protocol}//${window.location.host}`;
  }

  return "http://localhost:6700";
}

function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export async function fetchWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
) {
  // Browser-only helper: use token from localStorage / sessionStorage and
  // always include credentials so servers using cookies still work.
  let resolvedInput: RequestInfo = input;

  if (typeof input === "string") {
    const str = input;

    if (!isAbsoluteUrl(str)) {
      const base = getApiBase();
      // ensure leading slash
      const path = str.startsWith("/") ? str : `/${str}`;

      resolvedInput = `${base}${path}`;
    }
  }

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("unite_token") ||
        sessionStorage.getItem("unite_token")
      : null;
  const headers: Record<string, any> = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  } as any;

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(resolvedInput, {
    credentials: "include",
    ...init,
    headers,
  });

  return res;
}

export async function fetchJsonWithAuth(
  input: RequestInfo,
  init: RequestInit = {},
) {
  const res = await fetchWithAuth(input, init);
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (body && (body.message || body.error)) ||
      res.statusText ||
      "Request failed";
    const err: any = new Error(msg);

    err.response = res;
    err.body = body;
    throw err;
  }

  return body;
}

export default fetchWithAuth;
