import { services } from './api.mjs';

export const config = { schedule: '@hourly' };
export default async function cleanup() {
  const { db } = services();
  const snap = await db.ref('rooms').get();
  const now = Date.now();
  const updates = {};
  snap.forEach(room => {
    const data = room.val();
    const finished = data.public?.status === 'FINISHED';
    const maxAge = finished ? 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
    if (now - (data.meta?.updatedAt || data.meta?.createdAt || now) > maxAge) updates[room.key] = null;
  });
  if (Object.keys(updates).length) await db.ref('rooms').update(updates);
}
