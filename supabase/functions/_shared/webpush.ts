// Deno-native Web Push implementation (VAPID + aes128gcm, RFC 8291 / RFC 8292).
// No npm runtime crypto required — uses only Web Crypto API.

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contact@beree365.app';

export type PushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// ---------- base64url helpers ----------
function b64urlToBytes(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function strToBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}
function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// ---------- VAPID key import ----------
let vapidKeyPair: { privateKey: CryptoKey; publicKeyB64: string } | null = null;

async function importVapidKeys() {
  if (vapidKeyPair) return vapidKeyPair;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('VAPID keys not configured');
  }
  const pub = b64urlToBytes(VAPID_PUBLIC_KEY); // 65 bytes uncompressed
  const priv = b64urlToBytes(VAPID_PRIVATE_KEY); // 32 bytes raw scalar
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error('Invalid VAPID public key (expected 65-byte uncompressed P-256)');
  }
  if (priv.length !== 32) {
    throw new Error('Invalid VAPID private key (expected 32-byte raw scalar)');
  }
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64url(x),
    y: bytesToB64url(y),
    d: bytesToB64url(priv),
    ext: true,
  };
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  vapidKeyPair = { privateKey, publicKeyB64: VAPID_PUBLIC_KEY };
  return vapidKeyPair;
}

// ---------- VAPID JWT (ES256) ----------
async function makeVapidJwt(audience: string): Promise<string> {
  const { privateKey } = await importVapidKeys();
  const header = { typ: 'JWT', alg: 'ES256' };
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12h
  const payload = { aud: audience, exp, sub: VAPID_SUBJECT };
  const enc = (o: unknown) => bytesToB64url(strToBytes(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      strToBytes(signingInput),
    ),
  );
  // Web Crypto already returns raw r||s (64 bytes) — perfect for JOSE.
  return `${signingInput}.${bytesToB64url(sig)}`;
}

// ---------- HKDF (RFC 5869) using Web Crypto ----------
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// ---------- aes128gcm encryption (RFC 8188 + RFC 8291) ----------
async function encryptPayload(
  payload: Uint8Array,
  uaPublicRaw: Uint8Array, // p256dh, 65 bytes
  authSecret: Uint8Array, // 16 bytes
) {
  // Generate ephemeral application server keypair (ECDH P-256)
  const asKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const asPublicRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', asKeyPair.publicKey),
  ); // 65 bytes uncompressed

  // Import UA public key for ECDH
  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    uaPublicRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // ECDH shared secret
  const ecdhBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKey },
    asKeyPair.privateKey,
    256,
  );
  const ecdhSecret = new Uint8Array(ecdhBits);

  // key_info = "WebPush: info\0" || ua_public || as_public
  const keyInfo = concat(
    strToBytes('WebPush: info\0'),
    uaPublicRaw,
    asPublicRaw,
  );

  // IKM = HKDF(auth_secret, ecdhSecret, keyInfo, 32)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // Random 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(
    salt,
    ikm,
    strToBytes('Content-Encoding: aes128gcm\0'),
    16,
  );

  // NONCE = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdf(
    salt,
    ikm,
    strToBytes('Content-Encoding: nonce\0'),
    12,
  );

  // Plaintext + padding delimiter (0x02 for last record)
  const plaintext = concat(payload, new Uint8Array([0x02]));

  const cekKey = await crypto.subtle.importKey(
    'raw',
    cek,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      cekKey,
      plaintext,
    ),
  );

  // Header: salt(16) | rs(4, big-endian) | idlen(1) | keyid(idlen) | ciphertext
  // For WebPush, keyid = as_public (65 bytes), idlen = 65
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  const dv = new DataView(header.buffer);
  dv.setUint32(16, rs, false);
  header[20] = 65;
  header.set(asPublicRaw, 21);

  return { body: concat(header, ciphertext), asPublicRaw };
}

// ---------- public sendPush ----------
export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean; status?: number; error?: string }> {
  try {
    const { publicKeyB64 } = await importVapidKeys();
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await makeVapidJwt(audience);

    const uaPublic = b64urlToBytes(sub.p256dh);
    const authSecret = b64urlToBytes(sub.auth);
    if (uaPublic.length !== 65) {
      return { ok: false, gone: false, error: `bad p256dh length ${uaPublic.length}` };
    }

    const payloadBytes = strToBytes(JSON.stringify(payload));
    const { body } = await encryptPayload(payloadBytes, uaPublic, authSecret);

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${publicKeyB64}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body,
    });

    if (res.status >= 200 && res.status < 300) {
      // Drain body to avoid resource leak
      await res.arrayBuffer().catch(() => {});
      return { ok: true, gone: false, status: res.status };
    }

    const text = await res.text().catch(() => '');
    const gone = res.status === 404 || res.status === 410;
    return {
      ok: false,
      gone,
      status: res.status,
      error: `push ${res.status}: ${text.slice(0, 200)}`,
    };
  } catch (e) {
    return { ok: false, gone: false, error: (e as Error).message ?? String(e) };
  }
}
