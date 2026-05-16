import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { logoutUser } from '../../services/authService';
import { getSavedPacks, getUserPacks } from '../../services/stickerService';
import { StickerPack } from '../../types';
import { Ionicons } from '@expo/vector-icons';

type Tab = 'my' | 'saved';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('my');
  const [myPacks, setMyPacks] = useState<StickerPack[]>([]);
  const [savedPacks, setSavedPacks] = useState<StickerPack[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [my, saved] = await Promise.all([
      getUserPacks(user.uid),
      getSavedPacks(),
    ]);
    setMyPacks(my);
    setSavedPacks(saved);
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logoutUser },
    ]);
  };

  const packs = tab === 'my' ? myPacks : savedPacks;

  const renderPack = ({ item }: { item: StickerPack }) => (
    <View style={styles.packCard}>
      <Text style={styles.packName}>{item.name}</Text>
      <Text style={styles.packMeta}>
        {item.stickerCount}개 · {item.isPublic ? '공개' : '비공개'} · ♥ {item.likeCount}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 프로필 헤더 */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.displayName}>{user?.displayName ?? '사용자'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4d6d" />
        </TouchableOpacity>
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{myPacks.length}</Text>
          <Text style={styles.statLabel}>내 팩</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>{savedPacks.length}</Text>
          <Text style={styles.statLabel}>저장한 팩</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            {myPacks.reduce((acc, p) => acc + p.likeCount, 0)}
          </Text>
          <Text style={styles.statLabel}>받은 좋아요</Text>
        </View>
      </View>

      {/* 탭 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'my' && styles.tabActive]}
          onPress={() => setTab('my')}
        >
          <Text style={[styles.tabText, tab === 'my' && styles.tabTextActive]}>내 팩</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'saved' && styles.tabActive]}
          onPress={() => setTab('saved')}
        >
          <Text style={[styles.tabText, tab === 'saved' && styles.tabTextActive]}>저장한 팩</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#fff" />
      ) : (
        <FlatList
          data={packs}
          keyExtractor={(item) => item.id}
          renderItem={renderPack}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'my' ? '아직 만든 팩이 없습니다.' : '저장한 팩이 없습니다.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  profileSection: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#0a0a0a', gap: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#000', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  email: { fontSize: 13, color: '#888', marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: '#0a0a0a', borderTopWidth: 1, borderTopColor: '#222', paddingVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  divider: { width: 1, backgroundColor: '#222' },
  tabs: { flexDirection: 'row', backgroundColor: '#0a0a0a', borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { fontSize: 15, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { padding: 16 },
  packCard: { backgroundColor: '#111', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  packName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  packMeta: { fontSize: 13, color: '#888' },
  empty: { textAlign: 'center', color: '#666', marginTop: 60, fontSize: 15 },
});
