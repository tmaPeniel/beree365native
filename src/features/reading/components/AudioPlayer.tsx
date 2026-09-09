import { StatusBar } from "expo-status-bar";
import { ChevronDown, Headphones, Pause, Play, RotateCcw, RotateCw } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  type GestureResponderEvent,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import {
  extractYouTubeVideoId,
  type AudioSource,
} from "@/features/reading/services/audioService";
import { fonts } from "@/shared/theme/styles";
import Svg, { Circle } from "react-native-svg";

const COLORS = {
  playerBackground: "#221a16",
  playerSurface: "#30231d",
  playerInk: "#fffaf4",
  playerMuted: "#cab8ab",
  playerTrack: "#59443a",
  copper: "#d9773f",
  copperSoft: "#f0a072",
  danger: "#b42318",
};

const HIDDEN_PLAYER_SIZE = 200;
const FAB_SIZE = 52;
const RING_SIZE = 64;
const RING_STROKE_WIDTH = 3;
const SKIP_SECONDS = 10;
const PLAYER_COMMAND_TIMEOUT_MS = 700;
const START_SEEK_DELAY_MS = 120;
const WAVEFORM_HEIGHTS = [
  18, 35, 26, 44, 23, 31, 52, 28, 38, 21, 47, 33, 25, 41, 56, 30, 22, 45,
  37, 29, 50, 25, 40, 32, 20, 47, 34, 26, 54, 39, 24, 43, 30, 51, 28, 36,
  22, 46, 31, 41, 27, 49, 34, 23, 44, 29,
] as const;

type PlaybackCommand = {
  action: "pause" | "play";
  id: number;
};

type PlaybackStatus = {
  currentTime: number;
  duration: number;
  hasStarted: boolean;
  isPlaying: boolean;
};

type AudioPlayerProps = {
  command?: PlaybackCommand | null;
  onClose?: () => void;
  onStatusChange?: (status: PlaybackStatus) => void;
  source: AudioSource;
};

type FloatingAudioPlayerProps = {
  error?: unknown;
  loading: boolean;
  source: AudioSource | null;
};

export function FloatingAudioPlayer({ error, loading, source }: FloatingAudioPlayerProps) {
  const insets = useSafeAreaInsets();
  const fabPressAnim = useRef(new Animated.Value(1)).current;
  const fabPulseAnim = useRef(new Animated.Value(0)).current;
  const playbackCommandIdRef = useRef(0);
  const [hasOpenedPlayer, setHasOpenedPlayer] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [playbackCommand, setPlaybackCommand] = useState<PlaybackCommand | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>({
    currentTime: 0,
    duration: source?.durationSeconds || 0,
    hasStarted: false,
    isPlaying: false,
  });
  const canOpenPlayer = !!source && !loading && !error;

  useEffect(() => {
    setHasOpenedPlayer(false);
    setIsExpanded(false);
    setPlaybackCommand(null);
    setPlaybackStatus({
      currentTime: 0,
      duration: source?.durationSeconds || 0,
      hasStarted: false,
      isPlaying: false,
    });
  }, [source?.id]);

  useEffect(() => {
    if (!canOpenPlayer || isExpanded) {
      fabPulseAnim.stopAnimation();
      fabPulseAnim.setValue(0);
      return undefined;
    }

    const pulse = Animated.loop(
      Animated.timing(fabPulseAnim, {
        duration: 1700,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
    );

    pulse.start();

    return () => pulse.stop();
  }, [canOpenPlayer, fabPulseAnim, isExpanded]);

  if (!loading && !source) {
    return null;
  }

  const bottomOffset = Math.max(insets.bottom, 10) + 82;
  const pulseOpacity = fabPulseAnim.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.24, 0.08, 0],
  });
  const pulseScale = fabPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  });
  const requestPlayback = (action: PlaybackCommand["action"]) => {
    playbackCommandIdRef.current += 1;
    setPlaybackCommand({ action, id: playbackCommandIdRef.current });
    setPlaybackStatus((current) => ({
      ...current,
      hasStarted: true,
      isPlaying: action === "play",
    }));
  };

  const handleFabPress = () => {
    if (!canOpenPlayer) return;
    setHasOpenedPlayer(true);
    setIsExpanded(true);
    if (!playbackStatus.isPlaying) requestPlayback("play");
  };

  return (
    <>
      {isExpanded ? <StatusBar style="light" /> : null}

      {source && hasOpenedPlayer ? (
        <Modal
          animationType="slide"
          hardwareAccelerated
          onRequestClose={() => setIsExpanded(false)}
          presentationStyle="fullScreen"
          statusBarTranslucent
          visible={isExpanded}
        >
          <View style={styles.fullScreenPlayer}>
            <AudioPlayer
              command={playbackCommand}
              onClose={() => setIsExpanded(false)}
              onStatusChange={setPlaybackStatus}
              source={source}
            />
          </View>
        </Modal>
      ) : null}

      <View pointerEvents="box-none" style={[styles.floatingWrap, { bottom: bottomOffset }]}>
        {!isExpanded ? (
          <Animated.View
            style={[
              styles.fabMotion,
              {
                transform: [{ scale: fabPressAnim }],
              },
            ]}
          >
            {canOpenPlayer ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.fabPulse,
                  {
                    opacity: pulseOpacity,
                    transform: [{ scale: pulseScale }],
                  },
                ]}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir le lecteur audio"
              disabled={!canOpenPlayer}
              onPress={handleFabPress}
              onPressIn={() => {
                if (!canOpenPlayer) return;
                Animated.spring(fabPressAnim, {
                  friction: 6,
                  tension: 210,
                  toValue: 0.93,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(fabPressAnim, {
                  friction: 5,
                  tension: 180,
                  toValue: 1,
                  useNativeDriver: true,
                }).start();
              }}
              style={[styles.fab, !canOpenPlayer && styles.fabDisabled]}
            >
              {!loading && source ? (
                <FabProgressRing
                  progress={playbackStatus.duration > 0 ? playbackStatus.currentTime / playbackStatus.duration : 0}
                />
              ) : null}

              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : playbackStatus.isPlaying ? (
                <Headphones size={23} color="#fff" />
              ) : (
                <Play size={24} color="#fff" fill="#fff" />
              )}
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
}

export function AudioPlayer({ command, onClose, onStatusChange, source }: AudioPlayerProps) {
  if (source.sourceType === "youtube") {
    return (
      <YoutubeAudioPlayer
        command={command}
        onClose={onClose}
        onStatusChange={onStatusChange}
        source={source}
      />
    );
  }

  return <AudioPlayerError onClose={onClose} />;
}

export function AudioPlayerLoading() {
  return (
    <View style={styles.card}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonControls} />
      <View style={styles.skeletonTrack} />
    </View>
  );
}

export function AudioPlayerError({ onClose }: { onClose?: () => void } = {}) {
  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.playerScreen}>
      <View style={styles.playerHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réduire le lecteur audio"
          disabled={!onClose}
          onPress={onClose}
          style={styles.dismissButton}
        >
          {onClose ? <ChevronDown size={27} color={COLORS.playerInk} strokeWidth={2.2} /> : null}
        </Pressable>
        <Text numberOfLines={1} style={styles.nowPlayingLabel}>Lecture en cours</Text>
        <View style={styles.headerBalance} />
      </View>
      <View style={styles.errorBody}>
        <View style={styles.errorIcon}>
          <Headphones color="#ffb49d" size={30} />
        </View>
        <Text style={styles.errorTitle}>Audio indisponible</Text>
        <Text style={styles.errorText}>Impossible de lancer la lecture pour le moment.</Text>
      </View>
    </SafeAreaView>
  );
}

function YoutubeAudioPlayer({ command, onClose, onStatusChange, source }: AudioPlayerProps) {
  const { height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight < 720;
  const currentTimeRef = useRef(0);
  const lastCommandIdRef = useRef<number | null>(null);
  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const titleScrollRef = useRef<ScrollView | null>(null);
  const titleScrollPosition = useRef(new Animated.Value(0)).current;
  const pauseTokenRef = useRef(0);
  const playRequestedRef = useRef(false);
  const playerReadyRef = useRef(false);
  const startTokenRef = useRef(0);
  const videoId = useMemo(() => extractYouTubeVideoId(source.sourceUrl), [source.sourceUrl]);
  const passageTitle = useMemo(
    () => source.passageReferences?.length
      ? source.passageReferences.join(", ")
      : "Lecture audio du jour",
    [source.passageReferences],
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.durationSeconds || 0);
  const [hasPlayerError, setHasPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [titleContentWidth, setTitleContentWidth] = useState(0);
  const [titleViewportWidth, setTitleViewportWidth] = useState(0);

  useEffect(() => {
    const listenerId = titleScrollPosition.addListener(({ value }) => {
      titleScrollRef.current?.scrollTo({ animated: false, x: value, y: 0 });
    });

    return () => titleScrollPosition.removeListener(listenerId);
  }, [titleScrollPosition]);

  useEffect(() => {
    titleScrollPosition.stopAnimation();
    titleScrollPosition.setValue(0);

    const overflowWidth = Math.max(0, titleContentWidth - titleViewportWidth);
    if (overflowWidth <= 1) return undefined;

    const marquee = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(titleScrollPosition, {
          duration: Math.max(2800, overflowWidth * 35),
          easing: Easing.linear,
          toValue: overflowWidth,
          useNativeDriver: false,
        }),
        Animated.delay(900),
        Animated.timing(titleScrollPosition, {
          duration: 0,
          toValue: 0,
          useNativeDriver: false,
        }),
      ]),
    );

    marquee.start();
    return () => marquee.stop();
  }, [passageTitle, titleContentWidth, titleScrollPosition, titleViewportWidth]);

  useEffect(() => {
    pauseTokenRef.current += 1;
    playerReadyRef.current = false;
    playRequestedRef.current = false;
    lastCommandIdRef.current = null;
    startTokenRef.current += 1;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(source.durationSeconds || 0);
    setHasPlayerError(false);
    setPlayerKey((current) => current + 1);
  }, [source.id, source.durationSeconds]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    onStatusChange?.({
      currentTime,
      duration,
      hasStarted: isPlaying || currentTime > 0,
      isPlaying,
    });
  }, [currentTime, duration, isPlaying, onStatusChange]);

  useEffect(() => {
    if (!isPlaying) return undefined;

    const timer = setInterval(() => {
      playerRef.current
        ?.getCurrentTime()
        .then((time) => setCurrentTime(Math.max(0, time)))
        .catch(() => undefined);

      if (!duration) {
        playerRef.current
          ?.getDuration()
          .then((nextDuration) => {
            if (nextDuration > 0) setDuration(nextDuration);
          })
          .catch(() => undefined);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [duration, isPlaying]);

  const pausePlayback = useCallback(() => {
    const pauseToken = pauseTokenRef.current + 1;
    pauseTokenRef.current = pauseToken;
    playRequestedRef.current = false;
    setIsPlaying(false);

    readCurrentTime(playerRef.current, currentTime).then((time) => {
      if (pauseTokenRef.current !== pauseToken || playRequestedRef.current) {
        return;
      }

      setCurrentTime(time);
      setPlayerKey((current) => current + 1);
    });
  }, [currentTime]);

  const startPlayback = useCallback(() => {
    if (!videoId || hasPlayerError) return;
    const startToken = startTokenRef.current + 1;
    startTokenRef.current = startToken;
    pauseTokenRef.current += 1;
    playRequestedRef.current = true;
    setIsPlaying(true);

    setTimeout(() => {
      if (startTokenRef.current !== startToken || !playRequestedRef.current) {
        return;
      }

      const seekTime = Math.max(0.1, currentTimeRef.current);
      playerRef.current?.seekTo(seekTime, true);
    }, START_SEEK_DELAY_MS);
  }, [hasPlayerError, videoId]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
      return;
    }

    startPlayback();
  }, [isPlaying, pausePlayback, startPlayback]);

  useEffect(() => {
    if (!command) return;
    if (lastCommandIdRef.current === command.id) return;

    lastCommandIdRef.current = command.id;

    if (command.action === "play") {
      startPlayback();
      return;
    }

    pausePlayback();
  }, [command, pausePlayback, startPlayback]);

  const seekToTime = useCallback(
    (nextTime: number) => {
      if (!videoId || hasPlayerError) return;

      const safeDuration = duration || Number.MAX_SAFE_INTEGER;
      const safeTime = clamp(nextTime, 0, safeDuration);

      playerRef.current?.seekTo(safeTime, true);
      setCurrentTime(safeTime);

      if (!playRequestedRef.current) {
        setPlayerKey((current) => current + 1);
      }
    },
    [duration, hasPlayerError, videoId],
  );

  const seekBy = useCallback(
    async (offsetSeconds: number) => {
      if (!videoId || hasPlayerError) return;

      try {
        const time = await playerRef.current?.getCurrentTime();
        seekToTime((time || currentTime) + offsetSeconds);
      } catch {
        // La lecture reste utilisable meme si la recuperation du temps echoue.
      }
    },
    [currentTime, hasPlayerError, seekToTime, videoId],
  );

  const seekFromTrackPress = useCallback(
    (event: GestureResponderEvent) => {
      if (!duration || !trackWidth) return;

      const ratio = clamp(event.nativeEvent.locationX / trackWidth, 0, 1);
      seekToTime(duration * ratio);
    },
    [duration, seekToTime, trackWidth],
  );

  const handleReady = useCallback(() => {
    playerReadyRef.current = true;
    playerRef.current
      ?.getDuration()
      .then((nextDuration) => {
        if (nextDuration > 0) setDuration(nextDuration);
      })
      .catch(() => undefined);

    if (playRequestedRef.current) {
      const seekTime = Math.max(0.1, currentTimeRef.current);
      playerRef.current?.seekTo(seekTime, true);
      setIsPlaying(true);
    }
  }, []);

  const handleStateChange = useCallback((state: PLAYER_STATES) => {
    if (state === PLAYER_STATES.PLAYING) {
      if (playRequestedRef.current) {
        setIsPlaying(true);
      }
      return;
    }

    if (state === PLAYER_STATES.PAUSED) {
      if (!playRequestedRef.current) {
        setIsPlaying(false);
      }
      return;
    }

    if (state === PLAYER_STATES.ENDED) {
      playRequestedRef.current = false;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  if (!videoId || hasPlayerError) {
    return <AudioPlayerError onClose={onClose} />;
  }

  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const displayedDayNumber =
    Number.isFinite(source.dayNumber) && source.dayNumber > 0
      ? Math.round(source.dayNumber)
      : 1;

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[
        styles.playerScreen,
        {
          paddingHorizontal: isCompact ? 20 : 24,
        },
      ]}
    >
      <View pointerEvents="none" style={styles.hiddenPlayer}>
        <YoutubePlayer
          key={`${source.id}-${playerKey}`}
          ref={playerRef}
          height={HIDDEN_PLAYER_SIZE}
          width={HIDDEN_PLAYER_SIZE}
          forceAndroidAutoplay
          play={isPlaying}
          videoId={videoId}
          initialPlayerParams={{
            controls: false,
            preventFullScreen: true,
            rel: false,
            showClosedCaptions: false,
            start: Math.max(0, Math.floor(currentTime)),
          }}
          onChangeState={handleStateChange}
          onError={() => {
            playRequestedRef.current = false;
            setIsPlaying(false);
            setHasPlayerError(true);
          }}
          onReady={handleReady}
        />
      </View>

      <View style={styles.playerHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Réduire le lecteur audio"
          onPress={onClose}
          style={styles.dismissButton}
        >
          <ChevronDown size={27} color={COLORS.playerInk} strokeWidth={2.2} />
        </Pressable>
        <Text numberOfLines={1} style={styles.nowPlayingLabel}>Lecture en cours</Text>
        <View style={styles.headerBalance} />
      </View>

      <View style={styles.playerBody}>
        <View style={[styles.artworkStage, isCompact && styles.artworkStageCompact]}>
          <View style={[styles.artworkGlow, isCompact && styles.artworkGlowCompact]} />
          <View style={[styles.artworkRing, isCompact && styles.artworkRingCompact]}>
            <View style={[styles.coverArt, isCompact && styles.coverArtCompact]}>
              <Image
                accessibilityLabel="Logo Bérée 365"
                resizeMode="contain"
                source={require("../../../assets/beree-icon.png")}
                style={styles.coverArtImage}
              />
            </View>
          </View>
        </View>

        <View style={[styles.trackIdentity, isCompact && styles.trackIdentityCompact]}>
          <ScrollView
            ref={titleScrollRef}
            accessibilityLabel={`Lecture de ${passageTitle}`}
            bounces={false}
            contentContainerStyle={styles.trackTitleContent}
            directionalLockEnabled
            horizontal
            onContentSizeChange={(width) => setTitleContentWidth(width)}
            onLayout={(event) => setTitleViewportWidth(event.nativeEvent.layout.width)}
            showsHorizontalScrollIndicator={false}
            style={styles.trackTitleViewport}
          >
            <Text
              style={[styles.trackTitle, isCompact && styles.trackTitleCompact]}
            >
              {passageTitle}
            </Text>
          </ScrollView>
          <View style={styles.trackMetaRow}>
            <Text style={styles.trackSubtitle}>Plan de lecture</Text>
            <View style={styles.trackMetaDot} />
            <Text style={styles.trackDay}>Jour {displayedDayNumber}</Text>
          </View>
        </View>

        <View style={styles.progressBlock}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Position de lecture audio"
            accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
            disabled={!duration}
            hitSlop={{ bottom: 14, top: 14 }}
            onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
            onPress={seekFromTrackPress}
            style={[styles.waveformPressable, isCompact && styles.waveformPressableCompact]}
          >
            <View pointerEvents="none" style={styles.waveform}>
              {WAVEFORM_HEIGHTS.map((height, index) => (
                <View
                  key={`${height}-${index}`}
                  style={[
                    styles.waveformBar,
                    { height, opacity: index / (WAVEFORM_HEIGHTS.length - 1) <= progress ? 1 : 0.52 },
                    index / (WAVEFORM_HEIGHTS.length - 1) <= progress
                      ? styles.waveformBarPlayed
                      : styles.waveformBarRemaining,
                  ]}
                />
              ))}
            </View>
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.controls, isCompact && styles.controlsCompact]}>
        <IconButton
          accessibilityLabel="Reculer de 10 secondes"
          onPress={() => void seekBy(-SKIP_SECONDS)}
        >
          <RotateCcw size={24} color={COLORS.playerInk} />
          <Text style={styles.skipText}>{SKIP_SECONDS} s</Text>
        </IconButton>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Mettre en pause" : "Lancer la lecture audio"}
          onPress={togglePlayback}
          style={[styles.playButton, isCompact && styles.playButtonCompact]}
        >
          {isPlaying ? <Pause size={30} color="#fff" fill="#fff" /> : <Play size={30} color="#fff" fill="#fff" />}
        </Pressable>

        <IconButton
          accessibilityLabel="Avancer de 10 secondes"
          onPress={() => void seekBy(SKIP_SECONDS)}
        >
          <RotateCw size={24} color={COLORS.playerInk} />
          <Text style={styles.skipText}>{SKIP_SECONDS} s</Text>
        </IconButton>
      </View>
    </SafeAreaView>
  );
}

function IconButton({
  accessibilityLabel,
  children,
  onPress,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.iconButton}
    >
      {children}
    </Pressable>
  );
}

function FabProgressRing({ progress }: { progress: number }) {
  const normalizedProgress = clamp(progress, 0, 1);
  const radius = (RING_SIZE - RING_STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - normalizedProgress);

  return (
    <View pointerEvents="none" style={styles.fabRing}>
      <Svg height={RING_SIZE} width={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="transparent"
          r={radius}
          stroke="rgba(255,255,255,0.32)"
          strokeWidth={RING_STROKE_WIDTH}
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="transparent"
          originX={RING_SIZE / 2}
          originY={RING_SIZE / 2}
          r={radius}
          rotation={-90}
          stroke="#fff"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          strokeWidth={RING_STROKE_WIDTH}
        />
      </Svg>
    </View>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function readCurrentTime(player: YoutubeIframeRef | null, fallback: number) {
  if (!player) return Promise.resolve(fallback);

  return Promise.race([
    player.getCurrentTime(),
    new Promise<number>((resolve) => {
      setTimeout(() => resolve(fallback), PLAYER_COMMAND_TIMEOUT_MS);
    }),
  ]).then((time) => (Number.isFinite(time) ? Math.max(0, time) : fallback));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "center",
    backgroundColor: COLORS.playerSurface,
    borderRadius: 16,
    gap: 10,
    margin: 24,
    padding: 20,
  },
  floatingWrap: {
    alignItems: "flex-end",
    left: 13,
    position: "absolute",
    right: 13,
    zIndex: 60,
  },
  fullScreenPlayer: {
    backgroundColor: COLORS.playerBackground,
    flex: 1,
  },
  fabMotion: {
    borderRadius: 999,
  },
  fabPulse: {
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    bottom: 0,
    height: FAB_SIZE,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: FAB_SIZE,
  },
  fabRing: {
    height: RING_SIZE,
    left: -(RING_SIZE - FAB_SIZE) / 2,
    position: "absolute",
    top: -(RING_SIZE - FAB_SIZE) / 2,
    width: RING_SIZE,
  },
  fab: {
    alignItems: "center",
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    boxShadow: "0 4px 8px rgba(217, 119, 63, 0.3)",
    height: FAB_SIZE,
    justifyContent: "center",
    width: FAB_SIZE,
  },
  fabDisabled: {
    opacity: 0.52,
  },
  hiddenPlayer: {
    height: 1,
    left: -HIDDEN_PLAYER_SIZE * 2,
    opacity: 0,
    overflow: "hidden",
    position: "absolute",
    top: -HIDDEN_PLAYER_SIZE * 2,
    width: 1,
    zIndex: -1,
  },
  playerScreen: {
    backgroundColor: COLORS.playerBackground,
    flex: 1,
    paddingBottom: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  playerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  dismissButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  nowPlayingLabel: {
    color: COLORS.playerInk,
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 16,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  headerBalance: {
    width: 44,
  },
  playerBody: {
    flex: 1,
    justifyContent: "space-evenly",
  },
  errorBody: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: "rgba(180,35,24,0.18)",
    borderRadius: 999,
    height: 68,
    justifyContent: "center",
    marginBottom: 8,
    width: 68,
  },
  errorTitle: {
    color: COLORS.playerInk,
    fontFamily: fonts.semibold,
    fontSize: 22,
    textAlign: "center",
  },
  errorText: {
    color: COLORS.playerMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  artworkStage: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 254,
  },
  artworkStageCompact: {
    minHeight: 188,
  },
  artworkGlow: {
    backgroundColor: "rgba(217,119,63,0.21)",
    borderRadius: 999,
    height: 236,
    position: "absolute",
    width: 236,
  },
  artworkGlowCompact: {
    height: 180,
    width: 180,
  },
  artworkRing: {
    alignItems: "center",
    borderColor: COLORS.copper,
    borderRadius: 999,
    borderWidth: 2,
    height: 218,
    justifyContent: "center",
    width: 218,
  },
  artworkRingCompact: {
    height: 168,
    width: 168,
  },
  coverArt: {
    backgroundColor: "#fffdf9",
    borderRadius: 999,
    height: 208,
    overflow: "hidden",
    width: 208,
  },
  coverArtCompact: {
    height: 158,
    width: 158,
  },
  coverArtImage: {
    height: "100%",
    transform: [{ scale: 1.45 }],
    width: "100%",
  },
  title: {
    color: COLORS.playerInk,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  trackIdentity: {
    alignItems: "center",
    gap: 7,
    width: "100%",
  },
  trackIdentityCompact: {
    gap: 3,
  },
  trackTitleViewport: {
    flexGrow: 0,
    width: "100%",
  },
  trackTitleContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  trackTitle: {
    color: COLORS.playerInk,
    flexShrink: 0,
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  trackTitleCompact: {
    fontSize: 14,
    lineHeight: 20,
  },
  trackMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  trackMetaDot: {
    backgroundColor: COLORS.playerMuted,
    borderRadius: 999,
    height: 3,
    opacity: 0.7,
    width: 3,
  },
  trackDay: {
    color: COLORS.copperSoft,
    fontFamily: fonts.semibold,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    lineHeight: 21,
  },
  trackSubtitle: {
    color: COLORS.playerMuted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
  },
  progressBlock: {
    gap: 9,
    paddingHorizontal: 2,
  },
  waveformPressable: {
    height: 62,
    justifyContent: "center",
  },
  waveformPressableCompact: {
    height: 48,
  },
  waveform: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    justifyContent: "space-between",
  },
  waveformBar: {
    borderRadius: 999,
    flex: 1,
    maxWidth: 4,
    minWidth: 2,
  },
  waveformBarPlayed: {
    backgroundColor: COLORS.copperSoft,
  },
  waveformBarRemaining: {
    backgroundColor: COLORS.playerMuted,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 38,
    paddingTop: 10,
  },
  controlsCompact: {
    paddingHorizontal: 30,
    paddingTop: 4,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 58,
    justifyContent: "center",
    width: 52,
  },
  skipText: {
    color: COLORS.playerMuted,
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  playButton: {
    alignItems: "center",
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    boxShadow: "0 6px 8px rgba(217, 119, 63, 0.28)",
    height: 74,
    justifyContent: "center",
    width: 74,
  },
  playButtonCompact: {
    height: 64,
    width: 64,
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  track: {
    backgroundColor: "#efe7df",
    borderRadius: 999,
    height: 5,
    overflow: "visible",
  },
  trackFill: {
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    height: "100%",
  },
  trackThumb: {
    backgroundColor: "#fff",
    borderColor: COLORS.copper,
    borderRadius: 999,
    borderWidth: 1.4,
    height: 17,
    marginLeft: -8.5,
    position: "absolute",
    top: -6,
    width: 17,
  },
  timeText: {
    color: COLORS.playerMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
  },
  unavailableText: {
    color: "#ffd2ca",
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  skeletonTitle: {
    backgroundColor: COLORS.playerTrack,
    borderRadius: 6,
    height: 18,
    width: "58%",
  },
  skeletonControls: {
    alignSelf: "center",
    backgroundColor: COLORS.playerTrack,
    borderRadius: 999,
    height: 56,
    width: 56,
  },
  skeletonTrack: {
    backgroundColor: COLORS.playerTrack,
    borderRadius: 999,
    height: 8,
    width: "100%",
  },
});
