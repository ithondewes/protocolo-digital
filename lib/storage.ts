import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Bytes for a protocol's documents. The local disk driver is the development
 * implementation. A later driver can store the same keys somewhere else.
 */
export interface ObjectStore {
  put(key: string, body: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

const STORAGE_KEY = /^[a-z0-9][a-z0-9/_-]{0,180}$/;

export function assertStorageKey(key: string): void {
  if (
    !STORAGE_KEY.test(key) ||
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("//")
  ) {
    throw new Error("Invalid storage key.");
  }
}

export function documentStorageKey(
  code: string,
  requirementKey: string,
  objectId: string,
): string {
  const key = `${code.toLowerCase()}/${requirementKey}/${objectId}`;
  assertStorageKey(key);
  return key;
}

export function uploadRoot(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(process.cwd(), "data", "uploads");
}

export function createFileStore(): ObjectStore {
  return new LocalDiskStore(uploadRoot());
}

export class LocalDiskStore implements ObjectStore {
  constructor(private readonly root: string) {}

  async put(key: string, body: Uint8Array): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async read(key: string): Promise<Uint8Array | null> {
    try {
      return await readFile(this.resolve(key));
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  private resolve(key: string): string {
    assertStorageKey(key);
    const root = path.resolve(this.root);
    const full = path.resolve(root, key);
    if (full !== root && !full.startsWith(`${root}${path.sep}`)) {
      throw new Error("Invalid storage key.");
    }
    return full;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}
