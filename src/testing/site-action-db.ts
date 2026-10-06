import type { Firestore } from 'firebase-admin/firestore';

interface TestReference { path: string }
interface TestWrite { path: string; operation: string; data?: Record<string, unknown> }

/** In-memory I/O for real action-core and HTTP tests; never imported by production. */
export function createSiteActionTestDb(initialDocuments: Record<string, Record<string, unknown>> = {}) {
  const documents = new Map<string, Record<string, unknown>>(
    Object.entries(initialDocuments).map(([path, data]) => [path, structuredClone(data)]),
  );
  const writes: TestWrite[] = [];
  const queryCalls: { path: string; field: string; direction: string; limit?: number }[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  const snapshot = (path: string) => ({
    id: path.split('/').at(-1), exists: documents.has(path),
    data: () => documents.has(path) ? structuredClone(documents.get(path)) : undefined,
  });
  const reference = (path: string) => ({ path, id: path.split('/').at(-1), get: async () => snapshot(path) });
  const db = {
    doc: reference,
    runTransaction: (work: (transaction: unknown) => Promise<unknown>) => {
      const result = queue.then(async () => {
        const pending: TestWrite[] = [];
        const answer = await work({
          get: async (ref: TestReference) => snapshot(ref.path),
          set: (ref: TestReference, data: Record<string, unknown>) => pending.push({ path: ref.path, operation: 'set', data }),
          update: (ref: TestReference, data: Record<string, unknown>) => pending.push({ path: ref.path, operation: 'update', data }),
          delete: (ref: TestReference) => pending.push({ path: ref.path, operation: 'delete' }),
        });
        // Commit only when the transaction callback succeeded, matching atomic rollback.
        for (const mutation of pending) {
          if (mutation.operation === 'delete') documents.delete(mutation.path);
          else if (mutation.operation === 'set') documents.set(mutation.path, structuredClone(mutation.data!));
          else {
            const next = structuredClone(documents.get(mutation.path)!);
            for (const [key, value] of Object.entries(mutation.data!)) {
              if (key === 'profile.tagline') (next['profile'] as Record<string, unknown>)['tagline'] = value;
              else next[key] = value;
            }
            documents.set(mutation.path, next);
          }
          writes.push(mutation);
        }
        return answer;
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
    collection: (path: string) => ({
      orderBy: (field: string, direction: string) => {
        const query = { path, field, direction, limit: undefined as number | undefined };
        queryCalls.push(query);
        return { limit: (limit: number) => {
          query.limit = limit;
          return { get: async () => ({ docs: [...documents.entries()]
            .filter(([key]) => key.startsWith(`${path}/`))
            .sort((a, b) => String(b[1][field]).localeCompare(String(a[1][field])))
            .slice(0, limit)
            .map(([key]) => snapshot(key)) }),
          };
        } };
      },
    }),
  } as unknown as Firestore;
  return { db, documents, writes, queryCalls };
}
