/**
 * XeroSMS API service wrapper.
 *
 * Nothing outside this file should call XeroSMS directly — components, route
 * handlers, and the purchase orchestrator all go through these functions, so
 * retry/timeout/logging behavior lives in exactly one place.
 */

const XEROSMS_BASE_URL = process.env.XEROSMS_BASE_URL ?? "https://api.xerosms.com/v1";
const XEROSMS_API_KEY = process.env.XEROSMS_API_KEY;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

if (!XEROSMS_API_KEY && process.env.NODE_ENV === "production") {
  // Fail loudly at boot rather than silently 401-ing on the first real request.
  throw new Error("XEROSMS_API_KEY is not set");
}

export class XeroSmsError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = "XeroSmsError";
  }
}

export type XeroCountry = { code: string; name: string };
export type XeroService = { code: string; name: string; priceMinor: number; currency: string };
export type XeroPurchaseResult = {
  xeroOrderId: string;
  phoneNumber: string;
  expiresAt: string; // ISO timestamp
};
export type XeroSmsMessage = { id: string; sender: string; content: string; receivedAt: string };

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core request helper: adds auth, timeout, structured error parsing, and
 * exponential-backoff retries for transient failures (network errors, 429, 5xx).
 * Non-retryable errors (4xx other than 429) fail immediately.
 */
async function xeroRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; idempotencyKey?: string } = {}
): Promise<T> {
  const { method = "GET", body, idempotencyKey } = options;

  let lastError: XeroSmsError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${XEROSMS_BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${XEROSMS_API_KEY}`,
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        return (await res.json()) as T;
      }

      const retryable = res.status === 429 || res.status >= 500;
      let code = "unknown_error";
      let message = `XeroSMS request failed with status ${res.status}`;
      try {
        const errBody = await res.json();
        code = errBody.code ?? code;
        message = errBody.message ?? message;
      } catch {
        // Response body wasn't JSON — keep the generic message.
      }

      lastError = new XeroSmsError(message, res.status, code, retryable);
      if (!retryable) {
        logXeroFailure(path, lastError, attempt);
        throw lastError;
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof XeroSmsError) throw err;
      // Network error or abort — treat as retryable.
      lastError = new XeroSmsError(
        err instanceof Error ? err.message : "Unknown network error",
        null,
        "network_error",
        true
      );
    }

    logXeroFailure(path, lastError, attempt);
    if (attempt < MAX_RETRIES) {
      // Exponential backoff with jitter: 300ms, 900ms, 2700ms (+ up to 100ms jitter).
      const backoff = 300 * 3 ** attempt + Math.random() * 100;
      await sleep(backoff);
    }
  }

  throw lastError ?? new XeroSmsError("XeroSMS request failed", null, "unknown_error", false);
}

function logXeroFailure(path: string, error: XeroSmsError | null, attempt: number) {
  console.error(
    `[xerosms] ${path} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ` +
      `${error?.code} — ${error?.message}`
  );
}

export async function listCountries(): Promise<XeroCountry[]> {
  return xeroRequest<XeroCountry[]>("/countries");
}

export async function listServices(countryCode: string): Promise<XeroService[]> {
  return xeroRequest<XeroService[]>(`/countries/${countryCode}/services`);
}

/**
 * Purchases a virtual number. `idempotencyKey` should be the same key used for the
 * wallet debit for this order, so a retried purchase call can't create two numbers
 * (and two charges) for one user action.
 */
export async function purchaseNumber(
  countryCode: string,
  serviceCode: string,
  idempotencyKey: string
): Promise<XeroPurchaseResult> {
  return xeroRequest<XeroPurchaseResult>("/numbers/purchase", {
    method: "POST",
    body: { country: countryCode, service: serviceCode },
    idempotencyKey,
  });
}

export async function getMessages(xeroOrderId: string): Promise<XeroSmsMessage[]> {
  return xeroRequest<XeroSmsMessage[]>(`/numbers/${xeroOrderId}/messages`);
}

export async function cancelNumber(xeroOrderId: string): Promise<void> {
  await xeroRequest<void>(`/numbers/${xeroOrderId}/cancel`, { method: "POST" });
}
