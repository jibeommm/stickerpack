import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import {
  getUserPacks,
  createPack,
  uploadSticker,
  addSampleStickers,
} from '../../services/stickerService';
import { StickerPack } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function CreateScreen() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showNewPack, setShowNewPack] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackDesc, setNewPackDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await getUserPacks(user.uid);
      setPacks(data);
    } catch (e: any) {
      console.error('팩 로딩 실패:', e);
      Alert.alert('오류', '팩을 불러올 수 없습니다: ' + (e?.message ?? '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadPacks(); }, [loadPacks]));

  const handleCreatePack = async () => {
    if (!newPackName.trim()) {
      Alert.alert('이름을 입력해주세요.');
      return;
    }
    const id = await createPack(newPackName.trim(), newPackDesc.trim(), isPublic, []);
    setShowNewPack(false);
    setNewPackName('');
    setNewPackDesc('');
    await loadPacks();
  };

  const handlePickImage = async (packId: string) => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return;

    setUploading(true);
    setSelectedPackId(packId);
    try {
      for (const asset of result.assets) {
        await uploadSticker(packId, asset.uri);
      }
      Alert.alert('완료', `${result.assets.length}개의 스티커가 추가됐어요!`);
      await loadPacks();
    } catch (e: any) {
      console.error('업로드 실패:', e);
      Alert.alert('오류', '업로드 실패: ' + (e?.message ?? '알 수 없는 오류'));
    } finally {
      setUploading(false);
      setSelectedPackId(null);
    }
  };

  const handleAddSamples = async (packId: string) => {
    try {
      await addSampleStickers(packId);
      Alert.alert('완료', '샘플 스티커 8개가 추가됐어요!');
      await loadPacks();
    } catch (e: any) {
      Alert.alert('오류', '샘플 추가 실패: ' + (e?.message ?? '알 수 없는 오류'));
    }
  };

  const renderPack = ({ item }: { item: StickerPack }) => (
    <View style={styles.packCard}>
      <View style={styles.packInfo}>
        <Text style={styles.packName}>{item.name}</Text>
        <Text style={styles.packMeta}>
          {item.stickerCount}개 · {item.isPublic ? '공개' : '비공개'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.sampleBtn}
        onPress={() => handleAddSamples(item.id)}
      >
        <Text style={styles.sampleBtnText}>🎁 샘플</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => handlePickImage(item.id)}
        disabled={uploading && selectedPackId === item.id}
      >
        {uploading && selectedPackId === item.id ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Ionicons name="add" size={22} color="#000" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>내 스티커 팩</Text>
        <TouchableOpacity style={styles.newPackBtn} onPress={() => setShowNewPack(true)}>
          <Ionicons name="add-circle" size={18} color="#fff" />
          <Text style={styles.newPackText}>새 팩</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#fff" />
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(item) => item.id}
          renderItem={renderPack}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>스티커 팩을 만들어보세요!</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowNewPack(true)}>
                <Text style={styles.emptyBtnText}>팩 만들기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* 새 팩 모달 */}
      <Modal visible={showNewPack} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>새 스티커 팩</Text>
            <TouchableOpacity onPress={() => setShowNewPack(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="팩 이름 *"
            value={newPackName}
            onChangeText={setNewPackName}
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="설명 (선택)"
            value={newPackDesc}
            onChangeText={setNewPackDesc}
            multiline
            numberOfLines={3}
            placeholderTextColor="#aaa"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>커뮤니티에 공개</Text>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#333', true: '#fff' }}
            />
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreatePack}>
            <Text style={styles.createBtnText}>팩 만들기</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  header: { fontSize: 22, fontWeight: '800', color: '#fff' },
  newPackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newPackText: { color: '#000', fontWeight: '700', fontSize: 14 },
  list: { padding: 16, paddingTop: 0 },
  packCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  packInfo: { flex: 1 },
  packName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  packMeta: { fontSize: 13, color: '#888' },
  addBtn: { backgroundColor: '#fff', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sampleBtn: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  sampleBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 20 },
  emptyBtn: { backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, padding: 24, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  input: { borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 14, backgroundColor: '#111', color: '#fff' },
  inputMulti: { height: 90, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  switchLabel: { fontSize: 16, color: '#fff' },
  createBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center' },
  createBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
