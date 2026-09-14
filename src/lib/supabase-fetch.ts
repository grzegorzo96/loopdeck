const JWT_FUTURE_CODE = "PGRST303";
const JWT_FUTURE_MESSAGE = "JWT issued at future";
const DEFAULT_DELAYS_MS = [400, 1000];

export type JwtSkewRetryOptions = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  delaysMs?: number[];
};

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function isJwtIssuedAtFutureBody(body: unknown): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }

  const rec = body as { code?: unknown; message?: unknown };
  return rec.code === JWT_FUTURE_CODE || rec.message === JWT_FUTURE_MESSAGE;
}

async function isJwtIssuedAtFutureResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }

  try {
    const body: unknown = await response.clone().json();
    return isJwtIssuedAtFutureBody(body);
  } catch {
    return false;
  }
}

export function createJwtSkewRetryFetch(options: JwtSkewRetryOptions = {}): typeof fetch {
  const fetchImpl = options.fetch ?? fetch;
  const sleep = options.sleep ?? sleepMs;
  const delaysMs = options.delaysMs ?? DEFAULT_DELAYS_MS;

  return async function fetchWithJwtSkewRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let response = await fetchImpl(input, init);

    for (const delay of delaysMs) {
      if (!(await isJwtIssuedAtFutureResponse(response))) {
        return response;
      }
      await sleep(delay);
      response = await fetchImpl(input, init);
    }

    return response;
  };
}
