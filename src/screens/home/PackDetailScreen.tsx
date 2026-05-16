import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList, Sticker, StickerPack } from '../../types';
import {
  getPackStickers,
  toggleLike,
  isLiked,
  savePack,
  unsavePack,
  isSaved,
} from '../../services/stickerService';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'PackDetail'>;
  route: RouteProp<HomeStackParamList, 'PackDetail'>;
};

export default function PackDetailScreen({ route }: Props) {
  const { packId, packName } = route.params;
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const [data, likedStatus, savedStatus] = await Promise.all([
      getPackStickers(packId),
      isLiked(packId),
      isSaved(packId),
    ]);
    setStickers(data);
    setLiked(likedStatus);
    setSaved(savedStatus);
    setLoading(false);
  }, [packId]);

  useEffect(() => { load(); }, [load]);

  const handleLike = async () => {
    const result = await toggleLike(packId);
    setLiked(result);
  };

  const handleSave = async () => {
    if (saved) {
      await unsavePack(packId);
      setSaved(false);
      Alert.alert('삭제됨', '내 팩에서 제거했습니다.');
    } else {
      await savePack(packId);
      setSaved(true);
      Alert.alert('저장됨', '내 스티커 팩에 저장했습니다!');
    }
  };

  const handleShareSticker = async (sticker: Sticker) => {
    try {
      const localUri = FileSystem.cacheDirectory + `sticker_${sticker.id}.png`;
      await FileSystem.downloadAsync(sticker.imageUrl, localUri);
      await Sharing.shareAsync(localUri, { mimeType: 'image/png' });
    } catch {
      Alert.alert('오류', '스티커 공유에 실패했습니다.');
    }
  };

  const renderSticker = ({ item }: { item: Sticker }) => (
    <TouchableOpacity
      style={styles.stickerBox}
      onLongPress={() => handleShareSticker(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.stickerImg} resizeMode="contain" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={22}
            color={liked ? '#ff4d6d' : '#666'}
          />
          <Text style={styles.actionLabel}>좋아요</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleSave}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? '#5B4FF5' : '#666'}
          />
          <Text style={styles.actionLabel}>{saved ? '저장됨' : '내 팩에 저장'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>스티커를 길게 누르면 공유할 수 있어요</Text>

      <FlatList
        data={stickers}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={renderSticker}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <Text style={styles.empty}>스티커가 없습니다.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#1a1a1a', borderRadius: 20 },
  actionLabel: { fontSize: 14, color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#666', textAlign: 'center', marginVertical: 10 },
  grid: { padding: 8 },
  stickerBox: {
    flex: 1,
    margin: 10,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerImg: { width: '100%', height: '100%' },
  empty: { textAlign: 'center', color: '#666', marginTop: 60, fontSize: 15 },
});
