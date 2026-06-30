import type { Firestore, DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';

/**
 * Batch-fetch many documents in parallel, preserving input order. Replaces the
 * N+1 sequential `.get()`-in-a-loop pattern in the admin endpoints with a few
 * `getAll` round-trips. Chunked so very large user counts don't build one
 * oversized BatchGetDocuments request.
 *
 * Takes only the `getAll` slice of Firestore so it is trivial to stub in tests.
 */
export async function getAllDocs(
  db: Pick<Firestore, 'getAll'>,
  refs: DocumentReference[],
): Promise<DocumentSnapshot[]> {
  if (refs.length === 0) return [];
  const CHUNK = 300;
  const chunks: DocumentReference[][] = [];
  for (let i = 0; i < refs.length; i += CHUNK) chunks.push(refs.slice(i, i + CHUNK));
  const snapshots = await Promise.all(chunks.map(chunk => db.getAll(...chunk)));
  return snapshots.flat();
}
