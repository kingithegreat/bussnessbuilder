import { getAllDocs } from './server-firestore';
import type { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';

// Minimal fake: getAll echoes each ref back as a snapshot carrying its id, so we
// can assert ordering and chunking without a real Firestore.
function fakeDb() {
  const calls: number[] = [];
  const db = {
    getAll(...refs: DocumentReference[]): Promise<DocumentSnapshot[]> {
      calls.push(refs.length);
      return Promise.resolve(refs.map(r => ({ id: r.id }) as unknown as DocumentSnapshot));
    },
  };
  return { db, calls };
}

const refs = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `doc-${i}` }) as unknown as DocumentReference);

describe('getAllDocs', () => {
  it('returns an empty array and makes no call for no refs', async () => {
    const { db, calls } = fakeDb();
    const result = await getAllDocs(db, []);
    expect(result).toEqual([]);
    expect(calls).toEqual([]);
  });

  it('fetches a single chunk in one call', async () => {
    const { db, calls } = fakeDb();
    const result = await getAllDocs(db, refs(5));
    expect(result.map(s => s.id)).toEqual(['doc-0', 'doc-1', 'doc-2', 'doc-3', 'doc-4']);
    expect(calls).toEqual([5]);
  });

  it('chunks large ref lists (300 per call) and preserves overall order', async () => {
    const { db, calls } = fakeDb();
    const result = await getAllDocs(db, refs(650));
    expect(calls).toEqual([300, 300, 50]); // chunk boundaries
    expect(result).toHaveLength(650);
    expect(result.map(s => s.id)).toEqual(refs(650).map(r => r.id)); // order intact across chunks
  });
});
