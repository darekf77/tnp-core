//#region @backend
import { PathLike } from 'node:fs';

import { Memory, MemorySync } from '../adapters/Memory';
import { JSONFile, JSONFileSync } from '../adapters/node/JSONFile';
import { Low, LowSync } from '../core/Low';

export async function JSONFilePreset<Data>(
  filename: PathLike,
  defaultData: Data,
  useInMemory = false,
): Promise<Low<Data>> {
  const adapter = useInMemory
    ? new Memory<Data>()
    : new JSONFile<Data>(filename);
  const db = new Low<Data>(adapter, defaultData);
  await db.read();
  return db;
}

export function JSONFileSyncPreset<Data>(
  filename: PathLike,
  defaultData: Data,
  useInMemory = false,
): LowSync<Data> {
  const adapter = useInMemory
    ? new MemorySync<Data>()
    : new JSONFileSync<Data>(filename);
  const db = new LowSync<Data>(adapter, defaultData);
  db.read();
  return db;
}
//#endregion
