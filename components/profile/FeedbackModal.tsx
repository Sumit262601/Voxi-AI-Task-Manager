import Colors from '@/constants/colors';
import { MessageSquare, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit?: (feedback: string) => void;
}

export default function FeedbackModal({ visible, onClose, onSubmit }: FeedbackModalProps) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonScale = useRef(new Animated.Value(1)).current;
  const [feedback, setFeedback] = useState('');
  const submitButtonOpacity = useRef(new Animated.Value(0)).current;
  const submitButtonScale = useRef(new Animated.Value(0.8)).current;
  const submitButtonPressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Animate backdrop fade in
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Animate modal slide up with scale
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 100,
          mass: 0.8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }),
      ]).start(() => {
        // Animate submit button appearing
        Animated.parallel([
          Animated.spring(submitButtonOpacity, {
            toValue: 1,
            delay: 100,
            useNativeDriver: true,
            damping: 15,
            stiffness: 200,
          }),
          Animated.spring(submitButtonScale, {
            toValue: 1,
            delay: 100,
            useNativeDriver: true,
            damping: 12,
            stiffness: 200,
          }),
        ]).start();
      });
    } else {
      // Animate backdrop fade out
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After backdrop fades out, animate modal slide down
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: Dimensions.get('window').height,
            useNativeDriver: true,
            damping: 20,
            stiffness: 100,
            mass: 0.8,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0.85,
            useNativeDriver: true,
            damping: 18,
            stiffness: 90,
          }),
        ]).start(() => {
          // Reset animations and state
          setFeedback('');
          // Use setTimeout to defer setValue calls outside animation callback
          setTimeout(() => {
            submitButtonOpacity.setValue(0); 
            submitButtonScale.setValue(0.8);
            submitButtonPressScale.setValue(1);
          }, 0);
        });
      });
    }
  }, [visible, slideAnim, scaleAnim, backdropOpacity]);

  const handleClosePress = () => {
    Animated.sequence([
      Animated.timing(closeButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(closeButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleSubmit = () => {
    if (feedback.trim()) {
      if (onSubmit) {
        onSubmit(feedback.trim());
      }
      onClose();
    }
  };

  const handleSubmitPressIn = () => {
    Animated.spring(submitButtonPressScale, {
      toValue: 0.95,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  const handleSubmitPressOut = () => {
    Animated.spring(submitButtonPressScale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 300,
    }).start();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.feedbackModalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.iconContainer}>
                  <MessageSquare size={24} color={Colors.orangeStart} />
                </View>
                <Text style={styles.modalTitle}>Feedback</Text>
              </View>
              <Pressable onPress={handleClosePress} style={styles.closeButton}>
                <Animated.View style={{ transform: [{ scale: closeButtonScale }] }}>
                  <X size={24} color={Colors.textSecondary} />
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.modalHandle} />

            <View style={styles.modalContent}>
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type your feedback here..."
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={feedback}
                  onChangeText={(text) => {
                    if (text.length <= 500) {
                      setFeedback(text);
                    }
                  }}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {feedback.length} / 500
                </Text>
              </View>

              <View
                style={[
                  styles.submitButtonContainer,
                ]}
              >
                <Pressable
                  style={[
                    styles.submitButton,
                    !feedback.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  onPressIn={handleSubmitPressIn}
                  onPressOut={handleSubmitPressOut}
                  disabled={!feedback.trim()}
                >
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </Pressable>
              </View>
              
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  feedbackModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF9E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  textInputContainer: {
    marginBottom: 24,
  },
  textInput: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    minHeight: 150,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  submitButtonContainer: {
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: Colors.orangeStart,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.border,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
