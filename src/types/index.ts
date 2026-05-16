export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
}

export interface Sticker {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: Date;
  createdBy: string;
  packId: string;
}

export interface StickerPack {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isPublic: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  stickerCount: number;
  likeCount: number;
  saveCount: number;
  tags?: string[];
}

export interface UserSavedPack {
  packId: string;
  savedAt: Date;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Create: undefined;
  Gallery: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  PackDetail: { packId: string; packName: string };
};

export type CreateStackParamList = {
  CreateScreen: undefined;
  Editor: { imageUri: string };
};
