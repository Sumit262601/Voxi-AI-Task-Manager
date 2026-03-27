import Colors from '@/constants/colors';
import { useTasks } from '@/contexts/tasks';
import { useCanUseAI } from '@/contexts/purchases';
import { createRorkTool, useRorkAgent } from '@rork-ai/toolkit-sdk';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Bot, Mic, MicOff, Send, Sparkles, Lock, Crown } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

const SUGGESTIONS = [
  { id: '1', icon: '👔', text: 'Meeting with boss', color: '#E3F2FD' },
  { id: '2', icon: '🌙', text: 'Bedtime prep', color: '#F3E5F5' },
  { id: '3', icon: '🏋️', text: 'Gym reminder', color: '#E8F5E9' },
  { id: '4', icon: '📚', text: 'Study session', color: '#FFF3E0' },
];

export default function AIScreen() {
  const { addTask } = useTasks();
  const { canUseAI } = useCanUseAI();
  const router = useRouter();
  
  const getDefaultDate = () => {
    return new Date().setHours(0, 0, 0, 0);
  };

  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerScale = useRef(new Animated.Value(0.8)).current;
  const welcomeAnim = useRef(new Animated.Value(0)).current;
  const welcomeSlide = useRef(new Animated.Value(40)).current;
  const inputAnim = useRef(new Animated.Value(0)).current;
  const inputSlide = useRef(new Animated.Value(50)).current;
  const suggestionsAnim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  /* eslint-disable react-hooks/exhaustive-deps */
  useFocusEffect(
    useCallback(() => {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      headerScale.setValue(0.8);
      welcomeAnim.setValue(0);
      welcomeSlide.setValue(40);
      inputAnim.setValue(0);
      inputSlide.setValue(50);
      suggestionsAnim.forEach(anim => anim.setValue(0));

      // Start entrance animations
      Animated.parallel([
        // Header animation
        Animated.spring(fadeAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(headerScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Welcome section with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(welcomeAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(welcomeSlide, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, 150);

      // Suggestions with stagger
      suggestionsAnim.forEach((anim, index) => {
        setTimeout(() => {
          Animated.spring(anim, {
            toValue: 1,
            tension: 60,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }, 300 + (index * 80));
      });

      // Input area animation
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(inputAnim, {
            toValue: 1,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(inputSlide, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, 250);

      return () => {};
    }, [])
  );
  /* eslint-enable react-hooks/exhaustive-deps */

  const { messages, error, sendMessage } = useRorkAgent({
    tools: {
      addScheduledTask: createRorkTool({
        description: 'Add a new scheduled task with a specific time to the user\'s calendar',
        zodSchema: z.object({
          title: z.string().describe('Title of the task'),
          time: z.string().describe('Time range for the task (e.g., "11:30 AM - 12:00 PM")'),
          duration: z.string().describe('Duration of the task (e.g., "30m", "1h")'),
          icon: z.string().describe('Emoji icon for the task').optional(),
          date: z.string().describe('Date for the task in YYYY-MM-DD format. Use today\'s date if not specified.').optional(),
        }),
        execute(taskInput) {
          console.log('Adding scheduled task:', taskInput);
          let scheduledDate = getDefaultDate();
          if (taskInput.date) {
            const parsed = new Date(taskInput.date);
            if (!isNaN(parsed.getTime())) {
              scheduledDate = parsed.setHours(0, 0, 0, 0);
            }
          }
          addTask({
            title: taskInput.title,
            time: taskInput.time,
            duration: taskInput.duration,
            icon: taskInput.icon || '📅',
            type: 'scheduled',
            color: '',
            borderColor: '',
            priority: 'Regular',
            priorityColor: '',
            scheduledDate,
          });
          return `Scheduled task "${taskInput.title}" added successfully for ${taskInput.time}`;
        },
      }),
      addChecklistItem: createRorkTool({
        description: 'Add a new checklist item without a specific time',
        zodSchema: z.object({
          title: z.string().describe('Title of the checklist item'),
          icon: z.string().describe('Emoji icon for the item').optional(),
          date: z.string().describe('Date for the task in YYYY-MM-DD format. Use today\'s date if not specified.').optional(),
        }),
        execute(taskInput) {
          console.log('Adding checklist item:', taskInput);
          let scheduledDate = getDefaultDate();
          if (taskInput.date) {
            const parsed = new Date(taskInput.date);
            if (!isNaN(parsed.getTime())) {
              scheduledDate = parsed.setHours(0, 0, 0, 0);
            }
          }
          addTask({
            title: taskInput.title,
            time: '',
            duration: '',
            icon: taskInput.icon || '✓',
            type: 'checklist',
            color: '',
            borderColor: '',
            priority: 'Regular',
            priorityColor: '',
            scheduledDate,
          });
          return `Checklist item "${taskInput.title}" added successfully`;
        },
      }),
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleSuggestionPress = async (text: string) => {
    await sendMessage(text);
  };

  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      
      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Web microphone permission granted');
          stream.getTracks().forEach(track => track.stop());
        } catch (webErr: any) {
          console.error('Web microphone permission denied', webErr);
          const errorMsg = webErr.name === 'NotAllowedError' 
            ? 'Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow access, then try again.'
            : 'Unable to access microphone. Please check your browser settings and ensure microphone access is allowed for this site.';
          alert(errorMsg);
          return;
        }
      } else {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) {
          console.error('Microphone permission denied');
          alert('Microphone access is required for voice input. Please allow microphone access in your device settings.');
          return;
        }
      }
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      console.log('Starting recording..');
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      setRecording(newRecording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (err: any) {
      console.error('Failed to start recording', err);
      const errorMsg = err.message?.includes('Permission') || err.name === 'NotAllowedError'
        ? 'Microphone permission is required. Please allow access in your browser settings.'
        : 'Failed to start recording. Please try again.';
      alert(errorMsg);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    console.log('Stopping recording..');
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      await recording.stopAndUnloadAsync();
      
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      }

      const uri = recording.getURI();
      console.log('Recording stopped and stored at', uri);

      if (uri) {
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];

        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append('audio', blob, `recording.${fileType}`);
        } else {
          const audioFile = {
            uri,
            name: `recording.${fileType}`,
            type: `audio/${fileType}`,
          } as any;
          formData.append('audio', audioFile);
        }

        const sttResponse = await fetch('https://toolkit.rork.com/stt/transcribe/', {
          method: 'POST',
          body: formData,
        });

        if (!sttResponse.ok) {
          throw new Error('Transcription failed');
        }

        const result = await sttResponse.json();
        console.log('Transcription result:', result);

        if (result.text) {
          setInput(result.text);
        }
      }
    } catch (error) {
      console.error('Failed to stop recording or transcribe', error);
    } finally {
      setRecording(null);
      setIsTranscribing(false);
    }
  };

  if (!canUseAI) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF8F5', '#FFF5EE', '#FAF8F5']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView 
              style={styles.lockedScrollView}
              contentContainerStyle={styles.lockedContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.lockedHeader}>
                <LinearGradient
                  colors={[Colors.orangeStart, Colors.peach]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lockedAvatarGradient}
                >
                  <Bot size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.lockedHeaderTitle}>Sara</Text>
                <Text style={styles.lockedHeaderSubtitle}>AI Task Assistant</Text>
              </View>

              <View style={styles.lockedCard}>
                <View style={styles.lockedIconWrapper}>
                  <View style={styles.lockedIconCircle}>
                    <Lock size={28} color={Colors.orangeStart} />
                  </View>
                </View>
                
                <Text style={styles.lockedTitle}>Unlock AI Assistant</Text>
                <Text style={styles.lockedSubtitle}>
                  Upgrade to Monthly or Yearly plan to chat with Sara and create tasks using natural language
                </Text>
                
                <View style={styles.lockedFeatures}>
                  <View style={styles.lockedFeatureRow}>
                    <View style={[styles.lockedFeatureIcon, { backgroundColor: '#FFF0E6' }]}>
                      <Sparkles size={16} color={Colors.orangeStart} />
                    </View>
                    <Text style={styles.lockedFeatureText}>Natural language task creation</Text>
                  </View>
                  <View style={styles.lockedFeatureRow}>
                    <View style={[styles.lockedFeatureIcon, { backgroundColor: '#E8F5E9' }]}>
                      <Bot size={16} color={Colors.green} />
                    </View>
                    <Text style={styles.lockedFeatureText}>Smart scheduling suggestions</Text>
                  </View>
                  <View style={styles.lockedFeatureRow}>
                    <View style={[styles.lockedFeatureIcon, { backgroundColor: '#F3E5F5' }]}>
                      <Mic size={16} color={Colors.purple} />
                    </View>
                    <Text style={styles.lockedFeatureText}>Voice input support</Text>
                  </View>
                </View>
                
                <Pressable
                  style={styles.upgradeButton}
                  onPress={() => router.push('/paywall' as any)}
                >
                  <LinearGradient
                    colors={[Colors.orangeStart, Colors.coral]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.upgradeButtonGradient}
                  >
                    <Crown size={18} color="#FFFFFF" />
                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              <View style={styles.lockedBenefitsRow}>
                <View style={styles.lockedBenefitItem}>
                  <Text style={styles.lockedBenefitEmoji}>🔒</Text>
                  <Text style={styles.lockedBenefitText}>Secure</Text>
                </View>
                <View style={styles.lockedBenefitDivider} />
                <View style={styles.lockedBenefitItem}>
                  <Text style={styles.lockedBenefitEmoji}>⚡</Text>
                  <Text style={styles.lockedBenefitText}>Fast</Text>
                </View>
                <View style={styles.lockedBenefitDivider} />
                <View style={styles.lockedBenefitItem}>
                  <Text style={styles.lockedBenefitEmoji}>✨</Text>
                  <Text style={styles.lockedBenefitText}>Smart</Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF8F5', '#FFF5EE', '#FAF8F5']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: headerScale },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[Colors.orangeStart, Colors.peach]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Bot size={28} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Sara</Text>
              <Text style={styles.headerSubtitle}>AI Task Assistant</Text>
            </View>
          </Animated.View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.content}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <Animated.View 
                  style={[
                    styles.sparkleRow,
                    {
                      opacity: welcomeAnim,
                      transform: [{ translateY: welcomeSlide }],
                    },
                  ]}
                >
                  <Sparkles size={22} color={Colors.orangeStart} />
                  <Text style={styles.welcomeTitle}>How can I help?</Text>
                </Animated.View>
                <Animated.Text 
                  style={[
                    styles.welcomeSubtitle,
                    {
                      opacity: welcomeAnim,
                      transform: [{ translateY: welcomeSlide }],
                    },
                  ]}
                >
                  I can help you create tasks, set reminders, and organize your schedule
                </Animated.Text>
                
                <Animated.Text 
                  style={[
                    styles.suggestionsTitle,
                    {
                      opacity: welcomeAnim,
                    },
                  ]}
                >
                  Quick suggestions
                </Animated.Text>
                <View style={styles.suggestionsList}>
                  {SUGGESTIONS.map((suggestion, index) => (
                    <Animated.View
                      key={suggestion.id}
                      style={{
                        opacity: suggestionsAnim[index],
                        transform: [
                          { 
                            scale: suggestionsAnim[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1],
                            }) 
                          },
                          {
                            translateY: suggestionsAnim[index].interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 0],
                            }),
                          },
                        ],
                      }}
                    >
                      <Pressable
                        style={[styles.suggestionCard, { backgroundColor: suggestion.color }]}
                        onPress={() => handleSuggestionPress(suggestion.text)}
                      >
                        <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                        <Text style={styles.suggestionText}>{suggestion.text}</Text>
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              </View>
            )}

              {messages.map((m) => (
                <View key={m.id} style={styles.messageRow}>
                  {m.role === 'assistant' && (
                    <View style={styles.assistantAvatar}>
                      <Bot size={16} color={Colors.orangeStart} />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      m.role === 'user' ? styles.userBubble : styles.assistantBubble,
                    ]}
                  >
                    {m.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <Text
                              key={`${m.id}-${i}`}
                              style={[
                                styles.messageText,
                                m.role === 'user' ? styles.userText : styles.assistantText,
                              ]}
                            >
                              {part.text}
                            </Text>
                          );
                        case 'tool':
                          switch (part.state) {
                            case 'input-streaming':
                            case 'input-available':
                              return (
                                <View key={`${m.id}-${i}`} style={styles.toolMessage}>
                                  <View style={styles.toolLoadingDot} />
                                  <Text style={styles.toolText}>
                                    Creating task...
                                  </Text>
                                </View>
                              );
                            case 'output-available':
                              return (
                                <View key={`${m.id}-${i}`} style={styles.toolSuccessMessage}>
                                  <Text style={styles.toolSuccessIcon}>✓</Text>
                                  <Text style={styles.toolSuccessText}>
                                    Task created successfully
                                  </Text>
                                </View>
                              );
                            case 'output-error':
                              return (
                                <View key={`${m.id}-${i}`} style={styles.toolErrorMessage}>
                                  <Text style={styles.toolErrorText}>
                                    Error: {part.errorText}
                                  </Text>
                                </View>
                              );
                          }
                      }
                    })}
                  </View>
                </View>
              ))}

              {error && (
                <View style={styles.messageRow}>
                  <View style={[styles.messageBubble, styles.errorBubble]}>
                    <Text style={styles.errorText}>
                      Error: {error.message || 'Something went wrong'}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <Animated.View 
              style={[
                styles.inputContainer,
                {
                  opacity: inputAnim,
                  transform: [{ translateY: inputSlide }],
                },
              ]}
            >
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={isTranscribing ? 'Transcribing...' : 'Message Sara...'}
                  placeholderTextColor={Colors.textSecondary}
                  value={input}
                  onChangeText={setInput}
                  multiline
                  maxLength={500}
                  editable={!isTranscribing}
                />
                <View style={styles.inputActions}>
                  <Pressable
                    onPress={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                  >
                    <Animated.View 
                      style={[
                        styles.micButton, 
                        isRecording && styles.micButtonActive,
                        { transform: [{ scale: isRecording ? pulseAnim : 1 }] }
                      ]}
                    >
                      {isRecording ? (
                        <MicOff size={18} color="#FFFFFF" />
                      ) : (
                        <Mic size={18} color={Colors.textSecondary} />
                      )}
                    </Animated.View>
                  </Pressable>
                  <Pressable
                    onPress={handleSend}
                    disabled={!input.trim() || isTranscribing}
                  >
                    <LinearGradient
                      colors={
                        input.trim() && !isTranscribing
                          ? [Colors.orangeStart, Colors.peach]
                          : ['#E5E5EA', '#D1D1D6']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.sendButton}
                    >
                      <Send size={18} color="#FFFFFF" />
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  lockedScrollView: {
    flex: 1,
  },
  lockedContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  lockedHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  lockedAvatarGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orangeStart,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  lockedHeaderTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  lockedHeaderSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  lockedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 24,
  },
  lockedIconWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockedIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  lockedFeatures: {
    gap: 14,
    marginBottom: 24,
  },
  lockedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  lockedFeatureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedFeatureText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
    fontWeight: '500' as const,
  },
  upgradeButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  lockedBenefitsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  lockedBenefitItem: {
    alignItems: 'center',
    gap: 6,
  },
  lockedBenefitEmoji: {
    fontSize: 20,
  },
  lockedBenefitText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  lockedBenefitDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
    marginHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
  },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 32,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  suggestionIcon: {
    fontSize: 18,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    alignSelf: 'flex-end',
    marginLeft: 'auto',
    backgroundColor: Colors.orangeStart,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  errorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: Colors.text,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  toolMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  toolLoadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orangeStart,
  },
  toolText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  toolSuccessMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  toolSuccessIcon: {
    fontSize: 14,
    color: '#059669',
  },
  toolSuccessText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500' as const,
  },
  toolErrorMessage: {
    paddingVertical: 4,
  },
  toolErrorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    paddingLeft: 18,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
    paddingVertical: 10,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#EF4444',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
