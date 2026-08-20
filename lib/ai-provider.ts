export function normalizeOpenAICompatibleBaseURL(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) throw new Error("Custom endpoint is required");

  const endpointUrl = /^\d{1,5}$/.test(value)
    ? `http://127.0.0.1:${value}`
    : /^[a-z][a-z\d+.-]*:\/\//i.test(value)
      ? value
      : `http://${value}`;
  const url = new URL(endpointUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Custom endpoint must use http or https");
  }

  url.search = "";
  url.hash = "";

  let pathname = url.pathname.replace(/\/+$/, "");
  pathname = pathname.replace(/\/(?:models|chat\/completions|responses)$/i, "");
  if (!pathname.toLowerCase().endsWith("/v1")) {
    pathname = `${pathname}/v1`;
  }

  url.pathname = pathname.replace(/\/+/g, "/");
  return url.toString().replace(/\/$/, "");
}
