import type { R2Bucket } from '@cloudflare/workers-types';

import { fse } from './core-imports';
import { crossPlatformPath } from './cross-platform-path';
import { GlobalStorage } from './global-storage';
import { Helpers } from './helpers';
import { UtilsOs } from './utils-os';

export namespace UtilsTempFolder {
  //#region models
  //#region models / get temp folder options
  export interface GetTempFolderOptions {
    /**
     * Automatically remove this folder after the specified number of days.
     *
     * Folders with expiration enabled are created inside:
     *   <system-temp>/__temp__folders__with__exp__date
     */
    deleteAfterDays?: number;

    /**
     * Optional readable part of the generated folder name.
     */
    prefix?: string;

    /**
     * When true, creates a unique folder on every call.
     *
     * Example:
     *   /tmp/cloudflare-db-1789309118998-1234-a1b2c3d4e5f6
     *
     * When false, creates/reuses a persistent folder:
     *   /tmp/cloudflare-db
     *
     * @default false
     */
    everytimeNew?: boolean;
  }
  //#endregion

  //#region temp folder metadata
  interface TempFolderMetadata {
    createdAt: string;
    expiresAt: string;
    deleteAfterDays: number;
    folderPath: string;
  }
  //#endregion

  //#region constantns
  const MANAGED_TEMP_FOLDER_NAME = '__temp__folders__with__exp__date';
  const TEMP_METADATA_FILE_NAME = '__temp_folder_metadata__.json';

  const CLOUDFLARE_TEMP_ROOT = '__taon_temp__';
  //#endregion
  //#endregion

  //#region API / get temp folder
  export const getPath = async (
    options: GetTempFolderOptions = {},
  ): Promise<string> => {
    //#region @backendFunc

    validateTempFolderOptions(options);

    if (UtilsOs.isRunningInCloudflareWorker()) {
      return await getCloudflareTempFolder(options);
    }

    return getPathForNodeOnly(options);

    //#endregion
  };
  //#endregion

  //#region get cloudflare temp fodler
  async function getCloudflareTempFolder(
    options: GetTempFolderOptions,
  ): Promise<string> {
    //#region @backendFunc

    const storage = GlobalStorage.get('TAON_TEMP_STORAGE') as R2Bucket;

    if (!storage) {
      throw new Error(
        `Cloudflare temporary storage is not configured. ` +
          `Missing GlobalStorage "TAON_TEMP_STORAGE".`,
      );
    }

    const shouldCreateTempFolder =
      options.prefix !== undefined || options.deleteAfterDays !== undefined;

    if (!shouldCreateTempFolder) {
      return CLOUDFLARE_TEMP_ROOT;
    }

    const everytimeNew = options.everytimeNew ?? false;

    if (options.deleteAfterDays !== undefined) {
      await cleanupExpiredCloudflareTempFolders(storage);
    }

    const createdAt = new Date();

    const safePrefix = sanitizeTempFolderPrefix(options.prefix || 'temp');

    let folderName = safePrefix;

    if (everytimeNew) {
      folderName = [safePrefix, createdAt.getTime(), crypto.randomUUID()].join(
        '-',
      );
    }

    const parentPrefix =
      options.deleteAfterDays !== undefined
        ? [CLOUDFLARE_TEMP_ROOT, MANAGED_TEMP_FOLDER_NAME].join('/')
        : CLOUDFLARE_TEMP_ROOT;

    const folderPath = [parentPrefix, folderName].join('/');

    if (options.deleteAfterDays !== undefined) {
      const expiresAt = new Date(
        createdAt.getTime() + options.deleteAfterDays * 24 * 60 * 60 * 1000,
      );

      const metadata: TempFolderMetadata = {
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        deleteAfterDays: options.deleteAfterDays,
        folderPath,
      };

      await storage.put(
        `${folderPath}/${TEMP_METADATA_FILE_NAME}`,
        JSON.stringify(metadata, null, 2),
        {
          httpMetadata: {
            contentType: 'application/json',
          },
        },
      );
    }

    return folderPath;

    //#endregion
  }
  //#endregion

  //#region validate temp folder options
  function validateTempFolderOptions(options: GetTempFolderOptions): void {
    const everytimeNew = options.everytimeNew ?? false;

    if (
      options.deleteAfterDays !== undefined &&
      (!Number.isFinite(options.deleteAfterDays) ||
        options.deleteAfterDays <= 0)
    ) {
      throw new Error(
        `deleteAfterDays must be a finite number greater than zero.`,
      );
    }

    if (options.deleteAfterDays !== undefined && !everytimeNew) {
      throw new Error(
        `deleteAfterDays cannot be used together with ` + `everytimeNew=false.`,
      );
    }
  }
  //#endregion

  //#region remove cloudfalre temp fodler
  async function removeCloudflareTempFolder(
    storage: R2Bucket,
    folderPath: string,
  ): Promise<void> {
    //#region @backendFunc

    const prefix = `${folderPath}/`;

    let cursor: string | undefined;

    do {
      const result = await storage.list({
        prefix,
        cursor,
      });

      if (result.objects.length > 0) {
        await storage.delete(result.objects.map(object => object.key));
      }

      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);

    //#endregion
  }
  //#endregion

  //#region cleanup expierd cloudflare temp folders
  async function cleanupExpiredCloudflareTempFolders(
    storage: R2Bucket,
  ): Promise<void> {
    //#region @backendFunc

    const managedRoot =
      `${CLOUDFLARE_TEMP_ROOT}/` + `${MANAGED_TEMP_FOLDER_NAME}/`;

    const now = Date.now();

    let cursor: string | undefined;

    do {
      const result = await storage.list({
        prefix: managedRoot,
        cursor,
      });

      for (const object of result.objects) {
        if (!object.key.endsWith(`/${TEMP_METADATA_FILE_NAME}`)) {
          continue;
        }

        try {
          const metadataObject = await storage.get(object.key);

          if (!metadataObject) {
            continue;
          }

          const metadata =
            (await metadataObject.json()) as Partial<TempFolderMetadata>;

          const expiresAt = Date.parse(metadata.expiresAt || '');

          if (!Number.isFinite(expiresAt)) {
            continue;
          }

          if (expiresAt > now) {
            continue;
          }

          const folderPath = metadata.folderPath;

          if (!folderPath) {
            continue;
          }

          await removeCloudflareTempFolder(storage, folderPath);
        } catch {
          // One corrupted temp folder shouldn't prevent
          // processing the others.
        }
      }

      cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);

    //#endregion
  }
  //#endregion

  //#region API / get node temp folder
  export function getPathForNodeOnly(options: GetTempFolderOptions): string {
    //#region @backendFunc

    const { randomBytes } = require('crypto');

    const systemTempFolder = getSystemTempFolder();

    const shouldCreateTempFolder =
      options.prefix !== undefined || options.deleteAfterDays !== undefined;

    if (!shouldCreateTempFolder) {
      return systemTempFolder;
    }

    const everytimeNew = options.everytimeNew ?? false;

    const parentFolder =
      options.deleteAfterDays !== undefined
        ? crossPlatformPath([systemTempFolder, MANAGED_TEMP_FOLDER_NAME])
        : systemTempFolder;

    fse.mkdirSync(parentFolder, {
      recursive: true,
    });

    if (options.deleteAfterDays !== undefined) {
      cleanupExpiredTempFolders(parentFolder);
    }

    const createdAt = new Date();

    const safePrefix = sanitizeTempFolderPrefix(options.prefix || 'temp');

    let folderName = safePrefix;

    if (everytimeNew) {
      const uniquePart = [
        createdAt.getTime(),
        process.pid,
        randomBytes(6).toString('hex'),
      ].join('-');

      folderName = `${safePrefix}-${uniquePart}`;
    }

    const tempFolderPath = crossPlatformPath([parentFolder, folderName]);

    fse.mkdirSync(tempFolderPath, {
      recursive: true,
    });

    if (options.deleteAfterDays !== undefined) {
      const expiresAt = new Date(
        createdAt.getTime() + options.deleteAfterDays * 24 * 60 * 60 * 1000,
      );

      const metadata: TempFolderMetadata = {
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        deleteAfterDays: options.deleteAfterDays,
        folderPath: tempFolderPath,
      };

      fse.writeFileSync(
        crossPlatformPath([tempFolderPath, TEMP_METADATA_FILE_NAME]),
        JSON.stringify(metadata, null, 2),
        'utf8',
      );
    }

    return crossPlatformPath(tempFolderPath);

    //#endregion
  }
  //#endregion

  //#region helpers / get system temp folder
  function getSystemTempFolder(): string {
    //#region @backendFunc
    let tempFolder = '/tmp';

    if (process.platform === 'darwin') {
      tempFolder = '/private/tmp';
    }

    if (process.platform === 'win32') {
      tempFolder = crossPlatformPath([
        UtilsOs.getRealHomeDir(),
        '/AppData/Local/Temp',
      ]);
    }

    fse.mkdirSync(tempFolder, {
      recursive: true,
    });

    return tempFolder;
    //#endregion
  }
  //#endregion

  //#region helpers / cleanup expired temp fodlers
  function cleanupExpiredTempFolders(managedTempRoot: string): void {
    //#region @backendFunc
    if (!fse.existsSync(managedTempRoot)) {
      return;
    }

    const now = Date.now();

    for (const entryName of fse.readdirSync(managedTempRoot)) {
      const folderPath = crossPlatformPath([managedTempRoot, entryName]);

      try {
        if (!fse.statSync(folderPath).isDirectory()) {
          continue;
        }

        const metadataPath = crossPlatformPath([
          folderPath,
          TEMP_METADATA_FILE_NAME,
        ]);

        if (!fse.existsSync(metadataPath)) {
          continue;
        }

        const metadata = JSON.parse(
          fse.readFileSync(metadataPath, 'utf8'),
        ) as Partial<TempFolderMetadata>;

        const expiresAt = Date.parse(metadata.expiresAt || '');

        if (!Number.isFinite(expiresAt)) {
          continue;
        }

        if (expiresAt <= now) {
          Helpers.info(`Cleaning expired temp folder ${folderPath}..`);
          fse.rmSync(folderPath, {
            recursive: true,
            force: true,
          });
        }
      } catch {
        // One locked or corrupted temp folder should not prevent
        // creation of another temporary folder.
      }
    }
    //#endregion
  }
  //#endregion

  //#region helpers / sanitize temp folder prefix
  function sanitizeTempFolderPrefix(prefix: string): string {
    //#region @backendFunc
    const result = prefix
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return result || 'temp';
    //#endregion
  }
  //#endregion
}
