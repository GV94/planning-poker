import { verifyCaptcha } from './captcha.js';

const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

describe('verifyCaptcha', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return true when no secret is configured (dev mode bypass)', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');

    const result = await verifyCaptcha('some-token');

    expect(result).toBe(true);
  });

  it('should return true when TURNSTILE_SECRET_KEY is undefined', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    const result = await verifyCaptcha('some-token');

    expect(result).toBe(true);
  });

  it('should return false when no token is provided but secret is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

    const result = await verifyCaptcha();

    expect(result).toBe(false);
  });

  it('should return false when token is empty string and secret is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

    const result = await verifyCaptcha('');

    expect(result).toBe(false);
  });

  it('should return true for a valid captcha token', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyCaptcha('valid-token');

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: expect.any(FormData),
    });
  });

  it('should return false for an invalid captcha token', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyCaptcha('invalid-token');

    expect(result).toBe(false);
  });

  it('should return false when fetch throws a network error', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await verifyCaptcha('some-token');

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'Turnstile verification error:',
      expect.any(Error)
    );
  });

  it('should include remoteip in FormData when ip is provided', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

    let capturedBody: FormData | undefined;
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      capturedBody = init.body;
      return Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    await verifyCaptcha('valid-token', '192.168.1.1');

    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody!.get('secret')).toBe('test-secret');
    expect(capturedBody!.get('response')).toBe('valid-token');
    expect(capturedBody!.get('remoteip')).toBe('192.168.1.1');
  });

  it('should not include remoteip in FormData when ip is not provided', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');

    let capturedBody: FormData | undefined;
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      capturedBody = init.body;
      return Promise.resolve({
        json: () => Promise.resolve({ success: true }),
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    await verifyCaptcha('valid-token');

    expect(capturedBody).toBeInstanceOf(FormData);
    expect(capturedBody!.get('secret')).toBe('test-secret');
    expect(capturedBody!.get('response')).toBe('valid-token');
    expect(capturedBody!.has('remoteip')).toBe(false);
  });
});
