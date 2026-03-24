import Colors from '@/constants/colors';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Home, PieChart, Settings, Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface AITabIconProps {
  focused: boolean;
}

function AITabIcon({ focused }: AITabIconProps) {
  return (
    <View style={styles.aiTabContainer}>
      <LinearGradient
        colors={focused ? [Colors.orangeStart, Colors.orangeEnd] : ['#E8E8ED', '#D8D8DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.aiTabButton}
      >
        <Sparkles size={24} color="#FFFFFF" />
      </LinearGradient>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.orangeStart,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          paddingTop: 8,
          height: 88,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500' as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <Calendar size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: '',
          tabBarIcon: ({ focused }) => <AITabIcon focused={focused} />,
          tabBarLabelStyle: {
            display: 'none',
          },
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistics',
          tabBarIcon: ({ color }) => <PieChart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  aiTabContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
  },
  aiTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orangeStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
