/**
 * Cliente mínimo da API v1 do Moloni (https://www.moloni.pt/dev/).
 *
 * Protocolo (documentação oficial):
 *  - /grant/ é um GET com os parâmetros na query string; devolve access_token (1 h) e refresh_token (14 dias).
 *  - Todos os outros pedidos são POST, com `access_token` na query string. O corpo é form-urlencoded por
 *    omissão; com `json=true` na query string aceita JSON.
 *  - Os `insert` devolvem `{ valid: 1, ... }`; erros de dados vêm como lista de códigos; erros de autenticação
 *    vêm com HTTP 400 e `{ error, error_description }`.
 *
 * Nada aqui regista a URL (leva o access_token) nem as credenciais.
 */

export interface MoloniConfig {
  baseUrl?: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  companyId: number;
}

type FetchFn = (url: string, init?: any) => Promise<any>;

export class MoloniError extends Error {
  constructor(message: string, readonly detail?: unknown) {
    super(message);
    this.name = 'MoloniError';
  }
}

export class MoloniClient {
  private accessToken?: string;
  private refreshToken?: string;
  private expiresAt = 0;
  private readonly base: string;

  constructor(private readonly cfg: MoloniConfig, private readonly fetchFn: FetchFn = (u, i) => fetch(u, i)) {
    this.base = (cfg.baseUrl || 'https://api.moloni.pt/v1').replace(/\/+$/, '');
  }

  get companyId() { return this.cfg.companyId; }

  private async grant(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    const res = await this.fetchFn(`${this.base}/grant/?${qs}`, { method: 'GET' });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      throw new MoloniError(`Moloni: autenticação falhou (${data.error_description || data.error || res.status})`);
    }
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60_000;
  }

  private async token(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) return this.accessToken;
    const base = { client_id: this.cfg.clientId, client_secret: this.cfg.clientSecret };
    if (this.refreshToken) {
      try {
        await this.grant({ ...base, grant_type: 'refresh_token', refresh_token: this.refreshToken });
        return this.accessToken!;
      } catch { /* refresh token expirado: autentica de novo */ }
    }
    await this.grant({ ...base, grant_type: 'password', username: this.cfg.username, password: this.cfg.password });
    return this.accessToken!;
  }

  /** POST genérico. Devolve o JSON; lança em erro HTTP. */
  async post<T = any>(path: string, body: Record<string, unknown> = {}): Promise<T> {
    const token = await this.token();
    const url = `${this.base}/${path.replace(/^\/+|\/+$/g, '')}/?access_token=${encodeURIComponent(token)}&json=true&human_errors=true`;
    const res = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company_id: this.cfg.companyId, ...body }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      throw new MoloniError(`Moloni ${path}: HTTP ${res.status} ${data?.error_description || data?.error || ''}`.trim(), data);
    }
    return data as T;
  }

  /** Leitura que devolve sempre uma lista (getAll, getByVat, getByReference…). */
  async list<T = any>(path: string, body: Record<string, unknown> = {}): Promise<T[]> {
    const data = await this.post<any>(path, body);
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Object.keys(data).length) return [data as T];
    return [];
  }

  /** Escrita (insert): exige `valid: 1`. */
  async insert<T extends { valid?: number }>(path: string, body: Record<string, unknown>): Promise<T> {
    const data: any = await this.post<any>(path, body);
    if (!data || data.valid !== 1) {
      throw new MoloniError(`Moloni ${path}: recusado ${JSON.stringify(data)?.slice(0, 400)}`, data);
    }
    return data as T;
  }
}
