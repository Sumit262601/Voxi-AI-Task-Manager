import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { Camera, User, Mail, Phone, MapPin, Check } from 'lucide-react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React from "react";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState(user?.name || user?.email?.split('@')[0] || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || '');
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => {
    if (user) {
      setName(user.name || user.email?.split('@')[0] || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setProfilePhoto(user.profilePhoto || '');
    }
  }, [user?.id, user?.name, user?.email, user?.phone, user?.address, user?.profilePhoto]);

  const convertBlobToBase64 = useCallback(async (blobUrl: string): Promise<string> => {
    try {
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting blob to base64:', error);
      throw error;
    }
  }, []);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: Platform.OS === 'web',
      });

      if (!result.canceled && result.assets[0]) {
        let imageUri = result.assets[0].uri;
        
        if (Platform.OS === 'web' && imageUri.startsWith('blob:')) {
          console.log('Converting blob URL to base64 for web...');
          imageUri = await convertBlobToBase64(imageUri);
        }
        
        setProfilePhoto(imageUri);
        console.log('Profile photo selected:', imageUri.substring(0, 50) + '...');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email,
        phone: phone.trim(),
        address: address.trim(),
        profilePhoto,
      });
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Profile update error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderInputField = (
    icon: React.ReactNode,
    label: string,
    value: string,
    onChange: (text: string) => void,
    fieldKey: string,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      editable?: boolean;
      multiline?: boolean;
      helperText?: string;
    }
  ) => {
    const isFocused = focusedField === fieldKey;
    const isDisabled = options?.editable === false;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <View style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          isDisabled && styles.inputContainerDisabled,
        ]}>
          <View style={[styles.iconContainer, isFocused && styles.iconContainerFocused]}>
            {icon}
          </View>
          <TextInput
            style={[
              styles.input,
              options?.multiline && styles.textArea,
              isDisabled && styles.inputDisabled,
            ]}
            value={value}
            onChangeText={onChange}
            placeholder={options?.placeholder}
            placeholderTextColor="#A0A0A0"
            keyboardType={options?.keyboardType || 'default'}
            editable={options?.editable !== false}
            multiline={options?.multiline}
            numberOfLines={options?.multiline ? 3 : 1}
            textAlignVertical={options?.multiline ? 'top' : 'center'}
            onFocus={() => setFocusedField(fieldKey)}
            onBlur={() => setFocusedField(null)}
            autoCapitalize={options?.keyboardType === 'email-address' ? 'none' : 'sentences'}
          />
        </View>
        {options?.helperText && (
          <Text style={styles.helperText}>{options.helperText}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.flex} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.flex} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <LinearGradient
            colors={['#1C1C1E', '#2C2C2E', '#1C1C1E']}
            style={styles.headerGradient}
          >
            <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
              <View style={styles.headerContent}>
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                  <Text style={styles.backButtonText}>Cancel</Text>
                </Pressable>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <View style={styles.headerSpacer} />
              </View>
              
              <Animated.View style={[
                styles.avatarSection,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                }
              ]}>
                <Pressable style={styles.avatarContainer} onPress={pickImage}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient
                      colors={[Colors.peach, Colors.coral]}
                      style={styles.avatarPlaceholder}
                    >
                      <User size={48} color="#FFFFFF" />
                    </LinearGradient>
                  )}
                  <View style={styles.cameraOverlay}>
                    <Camera size={16} color="#FFFFFF" />
                  </View>
                </Pressable>
                <Text style={styles.changePhotoText}>Tap to change photo</Text>
              </Animated.View>
            </SafeAreaView>
          </LinearGradient>

          {/* Form Section */}
          <Animated.View style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}>
            <View style={styles.formCard}>
              {renderInputField(
                <User size={20} color={focusedField === 'name' ? Colors.peach : '#8E8E93'} />,
                'Full Name',
                name,
                setName,
                'name',
                { placeholder: 'Enter your full name' }
              )}

              {renderInputField(
                <Mail size={20} color="#8E8E93" />,
                'Email Address',
                email,
                setEmail,
                'email',
                { 
                  placeholder: 'Enter your email',
                  keyboardType: 'email-address',
                  editable: false,
                  helperText: 'Email cannot be changed'
                }
              )}

              {renderInputField(
                <Phone size={20} color={focusedField === 'phone' ? Colors.peach : '#8E8E93'} />,
                'Phone Number',
                phone,
                setPhone,
                'phone',
                { 
                  placeholder: 'Enter your phone number',
                  keyboardType: 'phone-pad'
                }
              )}

              {renderInputField(
                <MapPin size={20} color={focusedField === 'address' ? Colors.peach : '#8E8E93'} />,
                'Address',
                address,
                setAddress,
                'address',
                { 
                  placeholder: 'Enter your address',
                  multiline: true
                }
              )}
            </View>

            {/* Save Button */}
            <Pressable 
              style={({ pressed }) => [
                styles.saveButtonWrapper,
                pressed && styles.saveButtonPressed,
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <LinearGradient
                colors={isSaving ? ['#CCCCCC', '#AAAAAA'] : [Colors.peach, Colors.coral]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButton}
              >
                {isSaving ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <>
                    <Check size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerGradient: {
    paddingBottom: 40,
  },
  headerSafeArea: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.peach,
    fontWeight: '500' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 60,
  },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 16,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative' as const,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cameraOverlay: {
    position: 'absolute' as const,
    bottom: 4,
    right: 4,
    backgroundColor: Colors.peach,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  changePhotoText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
  },
  formContainer: {
    flex: 1,
    marginTop: -20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1C1C1E',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F8FA',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  inputContainerFocused: {
    borderColor: Colors.peach,
    backgroundColor: '#FFFFFF',
  },
  inputContainerDisabled: {
    backgroundColor: '#F0F0F2',
  },
  iconContainer: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEF',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  iconContainerFocused: {
    backgroundColor: `${Colors.peach}15`,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  inputDisabled: {
    color: '#8E8E93',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
    marginTop: 4,
  },
  saveButtonWrapper: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
