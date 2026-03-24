import Colors from '@/constants/colors';
import { Star, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface RateUsModalProps {
  visible: boolean;
  onClose: () => void;
  onRate?: (rating: number) => void;
}

export default function RateUsModal({ visible, onClose, onRate }: RateUsModalProps) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonScale = useRef(new Animated.Value(1)).current;
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const ratingTextOpacity = useRef(new Animated.Value(0)).current;
  const ratingTextScale = useRef(new Animated.Value(0.8)).current;
  const submitButtonOpacity = useRef(new Animated.Value(0)).current;
  const submitButtonScale = useRef(new Animated.Value(0.8)).current;

  // Star animations
  const [starAnims] = useState(() =>
    Array.from({ length: 5 }, () => ({
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  );

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
        // Animate stars appearing with stagger
        const animations = starAnims.map((anim, index) =>
          Animated.parallel([
            Animated.spring(anim.scale, {
              toValue: 1,
              delay: index * 100,
              useNativeDriver: true,
              damping: 12,
              stiffness: 200,
            }),
            Animated.sequence([
              Animated.timing(anim.rotate, {
                toValue: 1,
                duration: 200,
                delay: index * 100,
                useNativeDriver: true,
              }),
              Animated.timing(anim.rotate, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
          ])
        );
        Animated.stagger(100, animations).start();
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
          // Reset animations
          setSelectedRating(0);
          setHoveredRating(0);
          starAnims.forEach((anim) => {
            anim.scale.setValue(1);
            anim.rotate.setValue(0);
          });
          ratingTextOpacity.setValue(0);
          ratingTextScale.setValue(0.8);
          submitButtonOpacity.setValue(0);
          submitButtonScale.setValue(0.8);
        });
      });
    }
  }, [visible, slideAnim, scaleAnim, backdropOpacity, starAnims]);

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

  const handleStarPress = (rating: number) => {
    setSelectedRating(rating);
    // Animate the pressed star
    const anim = starAnims[rating - 1];
    Animated.sequence([
      Animated.spring(anim.scale, {
        toValue: 1.3,
        useNativeDriver: true,
        damping: 8,
        stiffness: 300,
      }),
      Animated.spring(anim.scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 200,
      }),
    ]).start();

    // Animate rating text and submit button appearing
    Animated.parallel([
      Animated.spring(ratingTextOpacity, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.spring(ratingTextScale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 200,
      }),
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
  };

  const handleStarPressIn = (rating: number) => {
    setHoveredRating(rating);
    const anim = starAnims[rating - 1];
    Animated.spring(anim.scale, {
      toValue: 1.2,
      useNativeDriver: true,
      damping: 10,
      stiffness: 300,
    }).start();
  };

  const handleStarPressOut = (rating: number) => {
    setHoveredRating(0);
    const anim = starAnims[rating - 1];
    Animated.spring(anim.scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  };

  const getStarRotation = (index: number) => {
    return starAnims[index].rotate.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
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
            styles.rateUsModalContainer,
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
                  <Star size={24} color={Colors.orangeStart} fill={Colors.orangeStart} />
                </View>
                <Text style={styles.modalTitle}>Rate Us</Text>
              </View>
              <Pressable onPress={handleClosePress} style={styles.closeButton}>
                <Animated.View style={{ transform: [{ scale: closeButtonScale }] }}>
                  <X size={24} color={Colors.textSecondary} />
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.modalHandle} />

            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                How would you rate your experience with our app?
              </Text>

              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((rating) => {
                  const anim = starAnims[rating - 1];
                  const isSelected = rating <= selectedRating;
                  const isHovered = rating <= hoveredRating && hoveredRating > 0;
                  const shouldFill = isSelected || isHovered;

                  return (
                    <Pressable
                      key={rating}
                      onPress={() => handleStarPress(rating)}
                      onPressIn={() => handleStarPressIn(rating)}
                      onPressOut={() => handleStarPressOut(rating)}
                      style={styles.starButton}
                    >
                      <Animated.View
                        style={[
                          styles.starWrapper,
                          {
                            transform: [
                              { scale: anim.scale },
                              { rotate: getStarRotation(rating - 1) },
                            ],
                          },
                        ]}
                      >
                        <Star
                          size={48}
                          color={shouldFill ? Colors.orangeStart : '#E5E5E5'}
                          fill={shouldFill ? Colors.orangeStart : 'transparent'}
                        />
                      </Animated.View>
                    </Pressable>
                  );
                })}
              </View>

              {selectedRating > 0 && (
                <Animated.View
                  style={[
                    styles.ratingTextContainer,
                    {
                      opacity: ratingTextOpacity,
                      transform: [{ scale: ratingTextScale }],
                    },
                  ]}
                >
                  <Text style={styles.ratingText}>
                    {selectedRating === 1 && 'Poor'}
                    {selectedRating === 2 && 'Fair'}
                    {selectedRating === 3 && 'Good'}
                    {selectedRating === 4 && 'Very Good'}
                    {selectedRating === 5 && 'Excellent'}
                  </Text>
                </Animated.View>
              )}

              {selectedRating > 0 && (
                <Animated.View
                  style={{
                    opacity: submitButtonOpacity,
                    transform: [{ scale: submitButtonScale }],
                  }}
                >
                  <Pressable
                    style={styles.submitButton}
                    onPress={() => {
                      if (onRate) {
                        onRate(selectedRating);
                      }
                      onClose();
                    }}
                  >
                    <Text style={styles.submitButtonText}>Submit Rating</Text>
                  </Pressable>
                </Animated.View>
              )}
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
  rateUsModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    maxHeight: Dimensions.get('window').height * 0.6,
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
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  starWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingTextContainer: {
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.orangeStart,
  },
  submitButton: {
    backgroundColor: Colors.orangeStart,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
