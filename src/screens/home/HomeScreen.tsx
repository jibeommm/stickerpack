import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList, Sticker } from '../../types';
import { getPublicStickers } from '../../services/stickerService';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'>;
};

export default function HomeScreen({ navigation }: Props) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStickers = useCallback(async () => {
    try {
      const data = await getPublicStickers();
      setStickers(data);
    } catch (e) {
      console.error('스티커 로딩 실패:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchStickers(); }, [fetchStickers]);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (sticker: Sticker) => {
    try {
      if (Platform.OS === 'web') {
        // 웹: ClipboardItem에 Promise를 직접 전달 (사용자 제스처 컨텍스트 유지)
        const ClipboardItemCtor = (window as any).ClipboardItem;
        if (!ClipboardItemCtor || !navigator.clipboard?.write) {
          throw new Error('이 브라우저는 이미지 복사를 지원하지 않습니다.');
        }

        // CORS 우회: Image + Canvas로 PNG blob 생성
        const blobPromise: Promise<Blob> = (async () => {
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('이미지 로드 실패'));
            img.src = sticker.imageUrl;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob 변환 실패'))), 'image/png');
          });
        })();

        await navigator.clipboard.write([
          new ClipboardItemCtor({ 'image/png': blobPromise }),
        ]);
      } else {
        // 모바일: base64로 변환해서 클립보드에 복사
        const localUri = FileSystem.cacheDirectory + `sticker_${sticker.id}.png`;
        await FileSystem.downloadAsync(sticker.imageUrl, localUri);
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Clipboard.setImageAsync(base64);
      }
      setCopiedId(sticker.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch (e: any) {
      console.error('복사 실패:', e);
      // 폴백: 이미지 URL을 텍스트로 복사
      try {
        if (Platform.OS === 'web' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(sticker.imageUrl);
          setCopiedId(sticker.id);
          setTimeout(() => setCopiedId(null), 1200);
          return;
        }
      } catch {}
      Alert.alert('오류', '복사 실패: ' + (e?.message ?? '알 수 없는 오류'));
    }
  };

  const handleShare = async (sticker: Sticker) => {
    try {
      if (!(await Sharing.isAvailableAsync())) return;
      const localUri = FileSystem.cacheDirectory + `sticker_${sticker.id}.png`;
      await FileSystem.downloadAsync(sticker.imageUrl, localUri);
      await Sharing.shareAsync(localUri, { mimeType: 'image/png' });
    } catch {}
  };

  const renderSticker = ({ item }: { item: Sticker }) => (
    <TouchableOpacity
      style={styles.stickerBox}
      onPress={() => handleCopy(item)}
      onLongPress={() => handleShare(item)}
      activeOpacity={0.6}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.stickerImg} resizeMode="contain" />
      {copiedId === item.id && (
        <View style={styles.copiedBadge}>
          <Text style={styles.copiedText}>복사됨!</Text>
        </View>
      )}
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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="settings-sharp" size={32} color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>STICKER</Text>
          <Text style={styles.title}>ME!</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="search-sharp" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={stickers}
        keyExtractor={(item) => item.id}
        renderItem={renderSticker}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchStickers(); }}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>공개된 스티커가 없습니다.{'\n'}내 팩에서 공개 팩을 만들어보세요!</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 28 },
  iconBtn: { padding: 6 },
  titleWrap: { alignItems: 'center' },
  title: { fontSize: 38, color: '#fff', letterSpacing: 2, lineHeight: 40, textAlign: 'center', fontFamily: 'PermanentMarker_400Regular' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { gap: 14, marginBottom: 18 },
  stickerBox: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickerImg: { width: '85%', height: '85%' },
  copiedBadge: { position: 'absolute', bottom: 0, backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  copiedText: { fontSize: 11, fontWeight: '700', color: '#000' },
  empty: { textAlign: 'center', color: '#666', marginTop: 60, fontSize: 15, lineHeight: 22 },
});
