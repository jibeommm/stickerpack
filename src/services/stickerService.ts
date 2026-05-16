import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  setDoc,
  deleteField,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { db, storage, auth } from './firebase';
import { StickerPack, Sticker } from '../types';

// ─── 스티커 팩 ─────────────────────────────────────────────

export const createPack = async (
  name: string,
  description: string,
  isPublic: boolean,
  tags: string[]
): Promise<string> => {
  const user = auth.currentUser!;
  const docRef = await addDoc(collection(db, 'packs'), {
    name,
    description,
    isPublic,
    tags,
    createdBy: user.uid,
    createdByName: user.displayName ?? '익명',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    stickerCount: 0,
    likeCount: 0,
    saveCount: 0,
  });
  return docRef.id;
};

export const getUserPacks = async (userId: string): Promise<StickerPack[]> => {
  const q = query(collection(db, 'packs'), where('createdBy', '==', userId));
  const snap = await getDocs(q);
  const packs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StickerPack));
  return packs.sort((a, b) => {
    const at = (a.updatedAt as any)?.toMillis?.() ?? 0;
    const bt = (b.updatedAt as any)?.toMillis?.() ?? 0;
    return bt - at;
  });
};

export const getPublicPacks = async (limitCount = 20): Promise<StickerPack[]> => {
  const q = query(collection(db, 'packs'), where('isPublic', '==', true), limit(limitCount));
  const snap = await getDocs(q);
  const packs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StickerPack));
  return packs.sort((a, b) => b.likeCount - a.likeCount);
};

export const updatePack = async (
  packId: string,
  data: Partial<Pick<StickerPack, 'name' | 'description' | 'isPublic' | 'tags'>>
) => {
  await updateDoc(doc(db, 'packs', packId), { ...data, updatedAt: serverTimestamp() });
};

export const deletePack = async (packId: string) => {
  const stickers = await getPackStickers(packId);
  await Promise.all(stickers.map((s) => deleteSticker(s.id, s.imageUrl)));
  await deleteDoc(doc(db, 'packs', packId));
};

// ─── 스티커 ────────────────────────────────────────────────

export const uploadSticker = async (
  packId: string,
  localUri: string
): Promise<Sticker> => {
  const user = auth.currentUser!;
  const fileName = `stickers/${user.uid}/${packId}/${Date.now()}.png`;
  const storageRef = ref(storage, fileName);

  const response = await fetch(localUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob, { contentType: blob.type || 'image/png' });
  const imageUrl = await getDownloadURL(storageRef);

  const stickerRef = await addDoc(collection(db, 'stickers'), {
    imageUrl,
    packId,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'packs', packId), {
    stickerCount: increment(1),
    updatedAt: serverTimestamp(),
  });

  return { id: stickerRef.id, imageUrl, packId, createdBy: user.uid, createdAt: new Date() };
};

// 모든 공개 팩의 스티커 모아오기 (갤러리용)
export const getPublicStickers = async (): Promise<Sticker[]> => {
  const packsSnap = await getDocs(
    query(collection(db, 'packs'), where('isPublic', '==', true), limit(30))
  );
  const packIds = packsSnap.docs.map((d) => d.id);
  if (packIds.length === 0) return [];

  // Firestore 'in' 쿼리는 최대 30개
  const chunks: string[][] = [];
  for (let i = 0; i < packIds.length; i += 30) chunks.push(packIds.slice(i, i + 30));

  const batches = await Promise.all(
    chunks.map((ids) =>
      getDocs(query(collection(db, 'stickers'), where('packId', 'in', ids)))
    )
  );
  const stickers = batches.flatMap((snap) =>
    snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sticker))
  );
  return stickers.sort((a, b) => {
    const at = (a.createdAt as any)?.toMillis?.() ?? 0;
    const bt = (b.createdAt as any)?.toMillis?.() ?? 0;
    return bt - at;
  });
};

export const getPackStickers = async (packId: string): Promise<Sticker[]> => {
  const q = query(collection(db, 'stickers'), where('packId', '==', packId));
  const snap = await getDocs(q);
  const stickers = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sticker));
  return stickers.sort((a, b) => {
    const at = (a.createdAt as any)?.toMillis?.() ?? 0;
    const bt = (b.createdAt as any)?.toMillis?.() ?? 0;
    return bt - at;
  });
};

export const deleteSticker = async (stickerId: string, imageUrl: string) => {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch {}
  const stickerDoc = await getDoc(doc(db, 'stickers', stickerId));
  if (stickerDoc.exists()) {
    const { packId } = stickerDoc.data();
    await updateDoc(doc(db, 'packs', packId), { stickerCount: increment(-1) });
  }
  await deleteDoc(doc(db, 'stickers', stickerId));
};

// ─── 좋아요 / 저장 ─────────────────────────────────────────

export const toggleLike = async (packId: string): Promise<boolean> => {
  const user = auth.currentUser!;
  const likeRef = doc(db, 'packs', packId, 'likes', user.uid);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'packs', packId), { likeCount: increment(-1) });
    return false;
  } else {
    await setDoc(likeRef, { likedAt: serverTimestamp() });
    await updateDoc(doc(db, 'packs', packId), { likeCount: increment(1) });
    return true;
  }
};

export const isLiked = async (packId: string): Promise<boolean> => {
  const user = auth.currentUser!;
  const likeSnap = await getDoc(doc(db, 'packs', packId, 'likes', user.uid));
  return likeSnap.exists();
};

export const savePack = async (packId: string): Promise<void> => {
  const user = auth.currentUser!;
  await setDoc(doc(db, 'users', user.uid, 'savedPacks', packId), {
    packId,
    savedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'packs', packId), { saveCount: increment(1) });
};

export const unsavePack = async (packId: string): Promise<void> => {
  const user = auth.currentUser!;
  await deleteDoc(doc(db, 'users', user.uid, 'savedPacks', packId));
  await updateDoc(doc(db, 'packs', packId), { saveCount: increment(-1) });
};

export const isSaved = async (packId: string): Promise<boolean> => {
  const user = auth.currentUser!;
  const snap = await getDoc(doc(db, 'users', user.uid, 'savedPacks', packId));
  return snap.exists();
};

export const getSavedPacks = async (): Promise<StickerPack[]> => {
  const user = auth.currentUser!;
  const savedSnap = await getDocs(
    collection(db, 'users', user.uid, 'savedPacks')
  );
  const packIds = savedSnap.docs.map((d) => d.data().packId as string);
  if (packIds.length === 0) return [];

  const packs = await Promise.all(
    packIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'packs', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as StickerPack) : null;
    })
  );
  return packs.filter(Boolean) as StickerPack[];
};

// 팩 커버 이미지 업데이트
export const updatePackCover = async (packId: string, coverUrl: string) => {
  await updateDoc(doc(db, 'packs', packId), { coverUrl, updatedAt: serverTimestamp() });
};

// 샘플 스티커 (트위터 이모지 CDN)
const SAMPLE_STICKERS = [
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f600.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f970.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f60d.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f923.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f44d.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/2764.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f389.png',
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f525.png',
];

export const addSampleStickers = async (packId: string): Promise<void> => {
  const user = auth.currentUser!;
  await Promise.all(
    SAMPLE_STICKERS.map((imageUrl) =>
      addDoc(collection(db, 'stickers'), {
        imageUrl,
        packId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
    )
  );
  await updateDoc(doc(db, 'packs', packId), {
    stickerCount: increment(SAMPLE_STICKERS.length),
    coverUrl: SAMPLE_STICKERS[0],
    updatedAt: serverTimestamp(),
  });
};
