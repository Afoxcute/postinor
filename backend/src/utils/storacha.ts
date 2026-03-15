/**
 * Storacha Network upload utilities for IP assets.
 * Uses @storacha/client with KEY + PROOF (env) for server-side uploads.
 * @see https://docs.storacha.network/how-to/upload/
 */

import path from 'path';
import fs from 'fs';

const STORACHA_GATEWAY = 'https://storacha.link';
const STORACHA_SUBDOMAIN_GATEWAY = 'https://storacha.link'; // ${cid}.ipfs.storacha.link for subdomain style

let storachaClient: Awaited<ReturnType<typeof getClient>> | null = null;

const distDir = path.dirname(require.resolve('@storacha/client'));

/** Load ESM subpath; use file URL with encoded path so @ in node_modules/@storacha is not treated as userinfo. */
async function loadStorachaSubpath<T = unknown>(subpath: string): Promise<T> {
  const pkgPath = path.join(distDir, subpath);
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Storacha: missing file ${pkgPath}`);
  }
  const absolutePath = path.resolve(pkgPath);
  const pathWithForwardSlashes = absolutePath.split(path.sep).join('/');
  const fileUrl = 'file:///' + pathWithForwardSlashes.replace(/@/g, '%40');
  return import(fileUrl) as Promise<T>;
}

async function getClient(): Promise<{
  uploadFile: (file: Blob | File) => Promise<string>;
  uploadDirectory: (files: File[]) => Promise<string>;
}> {
  const key = (process.env.STORACHA_KEY ?? '').trim();
  const proof = (process.env.STORACHA_PROOF ?? '').trim().replace(/\s+/g, '');
  if (!key || !proof) {
    throw new Error('Storacha is not configured: set STORACHA_KEY and STORACHA_PROOF in backend/.env');
  }
  if (storachaClient) return storachaClient;
  const Client = await import('@storacha/client');
  // Load subpaths via dist file paths (package subpaths often fail from CJS on Windows)
  const storeMemoryMod = await loadStorachaSubpath<{ StoreMemory?: unknown; default?: unknown }>(path.join('stores', 'memory.js'));
  const proofMod = await loadStorachaSubpath<{ parse: (s: string) => Promise<unknown>; default?: unknown }>(path.join('proof.js'));
  const signerMod = await loadStorachaSubpath<{ Signer?: unknown; default?: unknown }>(path.join('principal', 'ed25519.js'));
  const StoreMemory = storeMemoryMod.StoreMemory ?? (storeMemoryMod as { default: unknown }).default;
  const Proof = proofMod.default ?? proofMod;
  const Signer = signerMod.Signer ?? (signerMod as { default: unknown }).default;
  if (!StoreMemory || !Proof || !Signer) {
    throw new Error('Storacha client: could not load StoreMemory, Proof, or Signer from @storacha/client');
  }
  const principal = (Signer as { parse: (s: string) => unknown }).parse(key);
  const store = new (StoreMemory as new () => {})();
  const client = await (Client as { create: (opts: unknown) => Promise<unknown> }).create({
    principal,
    store,
  });
  const proofParsed = await (Proof as { parse: (s: string) => Promise<unknown> }).parse(proof);
  const space = await (client as { addSpace: (p: unknown) => Promise<{ did: () => string }> }).addSpace(
    proofParsed
  );
  await (client as { setCurrentSpace: (did: string) => Promise<unknown> }).setCurrentSpace(
    space.did()
  );
  storachaClient = client as {
    uploadFile: (file: Blob | File) => Promise<string>;
    uploadDirectory: (files: File[]) => Promise<string>;
  };
  return storachaClient;
}

export function isStorachaConfigured(): boolean {
  const key = (process.env.STORACHA_KEY ?? '').trim();
  const proof = (process.env.STORACHA_PROOF ?? '').trim();
  return key.length > 0 && proof.length > 0;
}

/**
 * Upload a single file to Storacha. Returns CID (content identifier).
 */
export async function uploadFileToStoracha(file: Blob | File): Promise<string> {
  const client = await getClient();
  const cid = await client.uploadFile(file);
  return typeof cid === 'string' ? cid : String(cid);
}

/**
 * Upload JSON metadata to Storacha as a file. Returns CID.
 */
export async function uploadJSONToStoracha(data: unknown): Promise<string> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const name = `metadata-${Date.now()}.json`;
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'application/json' }) : blob;
  return uploadFileToStoracha(file);
}

/**
 * Gateway URL for retrieving content by CID.
 * Subdomain style: https://${cid}.ipfs.storacha.link
 * Path style: https://storacha.link/ipfs/${cid}
 */
export function getStorachaGatewayUrl(cid: string, pathStyle: boolean = false): string {
  const cleanCid = cid.replace(/^ipfs:\/\//, '').trim();
  if (pathStyle) return `${STORACHA_GATEWAY}/ipfs/${cleanCid}`;
  return `https://${cleanCid}.ipfs.storacha.link`;
}
