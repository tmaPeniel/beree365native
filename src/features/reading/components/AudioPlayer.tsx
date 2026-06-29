import { BlurView } from "expo-blur";
import { Headphones, Pause, Play, RotateCcw, RotateCw, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import YoutubePlayer, { PLAYER_STATES, type YoutubeIframeRef } from "react-native-youtube-iframe";
import {
  extractYouTubeVideoId,
  type AudioSource,
} from "@/features/reading/services/audioService";
import Svg, { Circle } from "react-native-svg";

const COLORS = {
  card: "#ffffff",
  cardSoft: "#fbfaf8",
  ink: "#2f261f",
  muted: "#7e6f64",
  border: "#eadfd4",
  copper: "#b76620",
  copperDark: "#2d2018",
  danger: "#b42318",
};

const HIDDEN_PLAYER_SIZE = 200;
const FAB_SIZE = 52;
const RING_SIZE = 64;
const RING_STROKE_WIDTH = 3;
const SKIP_SECONDS = 10;
const PLAYER_COMMAND_TIMEOUT_MS = 700;
const START_SEEK_DELAY_MS = 120;

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
  const panelAnim = useRef(new Animated.Value(0)).current;
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
    panelAnim.setValue(0);
    setHasOpenedPlayer(false);
    setIsExpanded(false);
    setPlaybackCommand(null);
    setPlaybackStatus({
      currentTime: 0,
      duration: source?.durationSeconds || 0,
      hasStarted: false,
      isPlaying: false,
    });
  }, [panelAnim, source?.id]);

  useEffect(() => {
    Animated.timing(panelAnim, {
      duration: isExpanded ? 240 : 170,
      easing: isExpanded ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, panelAnim]);

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
  const panelScale = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });
  const pulseOpacity = fabPulseAnim.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.24, 0.08, 0],
  });
  const pulseScale = fabPulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.55],
  });
  const backdropOpacity = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
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

    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    if (playbackStatus.isPlaying) {
      requestPlayback("pause");
      return;
    }

    setHasOpenedPlayer(true);
    setIsExpanded(true);
    requestPlayback("play");
  };

  return (
    <>
      {source && hasOpenedPlayer ? (
        <Animated.View
          pointerEvents={isExpanded ? "auto" : "none"}
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        >
          <BlurView
            blurReductionFactor={1.2}
            experimentalBlurMethod="dimezisBlurView"
            intensity={92}
            tint="systemThinMaterial"
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.backdropTint} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le lecteur audio"
            onPress={() => setIsExpanded(false)}
            style={styles.backdropPressable}
          />
        </Animated.View>
      ) : null}

      <View pointerEvents="box-none" style={[styles.floatingWrap, { bottom: bottomOffset }]}>
        {source ? (
          <Animated.View
            pointerEvents={isExpanded ? "auto" : "none"}
            style={[
              styles.floatingPanel,
              {
                opacity: panelAnim,
                transform: [{ translateY: panelTranslateY }, { scale: panelScale }],
              },
            ]}
          >
            {hasOpenedPlayer ? (
              <AudioPlayer
                command={playbackCommand}
                onClose={() => setIsExpanded(false)}
                onStatusChange={setPlaybackStatus}
                source={source}
              />
            ) : null}
          </Animated.View>
        ) : null}

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
              accessibilityLabel={playbackStatus.isPlaying ? "Mettre en pause" : "Lancer la lecture audio"}
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
                <Pause size={23} color="#fff" />
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

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lecture audio du jour</Text>
      <Text style={styles.unavailableText}>Audio indisponible</Text>
    </View>
  );
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

export function AudioPlayerError() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Lecture audio du jour</Text>
      <Text style={styles.unavailableText}>Audio indisponible</Text>
    </View>
  );
}

function YoutubeAudioPlayer({ command, onClose, onStatusChange, source }: AudioPlayerProps) {
  const currentTimeRef = useRef(0);
  const lastCommandIdRef = useRef<number | null>(null);
  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const pauseTokenRef = useRef(0);
  const playRequestedRef = useRef(false);
  const playerReadyRef = useRef(false);
  const startTokenRef = useRef(0);
  const videoId = useMemo(() => extractYouTubeVideoId(source.sourceUrl), [source.sourceUrl]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(source.durationSeconds || 0);
  const [hasPlayerError, setHasPlayerError] = useState(false);
  const [playerKey, setPlayerKey] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);

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
    return <AudioPlayerError />;
  }

  const progress = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;

  return (
    <View style={styles.card}>
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

      <View style={styles.header}>
        <View style={styles.headerIdentity}>
          <View style={styles.audioBadge}>
            <Headphones size={15} color={COLORS.copper} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Lecture audio du jour</Text>
            <Text style={styles.dayText}>Jour {source.dayNumber}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le lecteur audio"
          onPress={onClose}
          style={styles.closeButton}
        >
          <X size={19} color={COLORS.ink} />
        </Pressable>
      </View>

      <View style={styles.progressBlock}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Position de lecture audio"
          accessibilityValue={{ now: Math.round(progress * 100), min: 0, max: 100 }}
          disabled={!duration}
          hitSlop={{ bottom: 12, top: 12 }}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          onPress={seekFromTrackPress}
          style={styles.track}
        >
          <View style={[styles.trackFill, { width: `${Math.max(progress * 100, isPlaying ? 2 : 0)}%` }]} />
          <View style={[styles.trackThumb, { left: `${Math.max(progress * 100, 0)}%` }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <IconButton
          accessibilityLabel="Reculer de 10 secondes"
          onPress={() => void seekBy(-SKIP_SECONDS)}
        >
          <RotateCcw size={21} color={COLORS.ink} />
          <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
        </IconButton>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? "Mettre en pause" : "Lancer la lecture audio"}
          onPress={togglePlayback}
          style={styles.playButton}
        >
          {isPlaying ? <Pause size={27} color="#fff" /> : <Play size={27} color="#fff" fill="#fff" />}
        </Pressable>

        <IconButton
          accessibilityLabel="Avancer de 10 secondes"
          onPress={() => void seekBy(SKIP_SECONDS)}
        >
          <RotateCw size={21} color={COLORS.ink} />
          <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
        </IconButton>
      </View>
    </View>
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
    backgroundColor: COLORS.card,
    borderColor: "rgba(43,31,18,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingBottom: 15,
    paddingTop: 15,
    shadowColor: "#000",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 20,
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(43,31,18,0.1)",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingWrap: {
    alignItems: "flex-end",
    left: 13,
    position: "absolute",
    right: 13,
    zIndex: 30,
  },
  floatingPanel: {
    alignSelf: "stretch",
    marginBottom: 12,
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
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 999,
    borderWidth: 1,
    height: FAB_SIZE,
    justifyContent: "center",
    shadowColor: COLORS.copper,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.26,
    shadowRadius: 10,
    width: FAB_SIZE,
  },
  fabDisabled: {
    opacity: 0.52,
  },
  hiddenPlayer: {
    height: HIDDEN_PLAYER_SIZE,
    left: 0,
    opacity: 0.01,
    overflow: "hidden",
    position: "absolute",
    top: 0,
    width: HIDDEN_PLAYER_SIZE,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  audioBadge: {
    alignItems: "center",
    backgroundColor: "#fbf1ea",
    borderRadius: 999,
    height: 31,
    justifyContent: "center",
    width: 31,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  dayText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  closeButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  progressBlock: {
    gap: 5,
  },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 34,
    paddingTop: 4,
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  skipText: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 10,
    marginTop: -2,
  },
  playButton: {
    alignItems: "center",
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    shadowColor: COLORS.copper,
    shadowOpacity: 0.26,
    shadowRadius: 10,
    width: 50,
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
    color: COLORS.muted,
    fontSize: 10,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    minWidth: 36,
  },
  unavailableText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  skeletonTitle: {
    backgroundColor: "#eee6dc",
    borderRadius: 6,
    height: 18,
    width: "58%",
  },
  skeletonControls: {
    alignSelf: "center",
    backgroundColor: "#eee6dc",
    borderRadius: 999,
    height: 56,
    width: 56,
  },
  skeletonTrack: {
    backgroundColor: "#eee6dc",
    borderRadius: 999,
    height: 8,
    width: "100%",
  },
});
