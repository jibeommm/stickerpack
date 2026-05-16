import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import { RootStackParamList, AuthStackParamList, MainTabParamList, HomeStackParamList } from '../types';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/home/HomeScreen';
import PackDetailScreen from '../screens/home/PackDetailScreen';
import CreateScreen from '../screens/create/CreateScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff' },
      }}
    >
      <HomeStack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="PackDetail"
        component={PackDetailScreen}
        options={({ route }) => ({
          title: route.params.packName,
          headerBackTitle: '뒤로',
        })}
      />
    </HomeStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#555',
        tabBarStyle: { backgroundColor: '#000', borderTopColor: '#222', paddingBottom: 4 },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, { outline: string; filled: string }> = {
            Home: { outline: 'compass-outline', filled: 'compass' },
            Create: { outline: 'add-circle-outline', filled: 'add-circle' },
            Profile: { outline: 'person-outline', filled: 'person' },
          };
          const name = icons[route.name];
          const iconName = focused ? name.filled : name.outline;
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} options={{ title: '갤러리' }} />
      <Tab.Screen
        name="Create"
        component={CreateScreen}
        options={{
          title: '내 팩',
          headerShown: true,
          headerTitle: '내 스티커 팩',
          headerStyle: { backgroundColor: '#000' },
          headerTitleStyle: { color: '#fff' },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: '프로필',
          headerShown: true,
          headerTitle: '프로필',
          headerStyle: { backgroundColor: '#000' },
          headerTitleStyle: { color: '#fff' },
          headerTintColor: '#fff',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
