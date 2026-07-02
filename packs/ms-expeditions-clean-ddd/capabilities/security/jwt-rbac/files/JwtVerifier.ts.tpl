export interface JwtVerifier { verify(token: string): Promise<Record<string, unknown>>; }
