import { useCallback, useEffect, useRef, useState } from 'react';

interface GameSounds {
  [key: string]: HTMLAudioElement[];
}

interface AudioContextState {
  context: AudioContext | null;
  buffers: Map<string, AudioBuffer>;
}

interface UseGameSoundsOptions {
  soundsEnabled?: boolean;
  volume?: number;
}

export const useGameSounds = (soundPaths: Record<string, string>, options: UseGameSoundsOptions = {}) => {
  const { soundsEnabled = true, volume = 0.5 } = options;
  const [isLoaded, setIsLoaded] = useState(false);
  const [soundsEnabledState, setSoundsEnabledState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gameSoundsEnabled');
      return saved !== null ? JSON.parse(saved) : soundsEnabled;
    }
    return soundsEnabled;
  });
  
  const soundsRef = useRef<GameSounds>({});
  const loadingPromisesRef = useRef<Promise<void>[]>([]);
  const audioContextRef = useRef<AudioContextState>({ context: null, buffers: new Map() });
  const poolSizeRef = useRef(3); // Number of audio instances per sound for pooling

  // Initialize sounds with pooling and Web Audio API
  useEffect(() => {
    const loadSounds = async () => {
      const promises: Promise<void>[] = [];
      
      // Initialize Web Audio API context
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContextRef.current.context = new AudioContextClass();
        }
      } catch (e) {
        console.warn('Web Audio API not supported, falling back to HTML Audio');
      }
      
      Object.entries(soundPaths).forEach(([key, path]) => {
        // Create audio pool for non-lounge sounds (gameplay sounds)
        const isLoungeSound = key === 'lounge';
        const poolSize = isLoungeSound ? 1 : poolSizeRef.current;
        const audioPool: HTMLAudioElement[] = [];
        
        for (let i = 0; i < poolSize; i++) {
          const audio = new Audio(path);
          audio.volume = volume;
          audio.preload = 'auto';
          
          // Force immediate load for gameplay sounds
          if (!isLoungeSound) {
            audio.load();
          }
          
          const promise = new Promise<void>((resolve) => {
            const onCanPlayThrough = () => {
              audio.removeEventListener('canplaythrough', onCanPlayThrough);
              audio.removeEventListener('error', onError);
              resolve();
            };
            
            const onError = () => {
              audio.removeEventListener('canplaythrough', onCanPlayThrough);
              audio.removeEventListener('error', onError);
              console.warn(`Failed to load sound: ${path}`);
              resolve(); // Don't reject to avoid blocking other sounds
            };
            
            audio.addEventListener('canplaythrough', onCanPlayThrough);
            audio.addEventListener('error', onError);
            
            // Fallback timeout to prevent hanging
            setTimeout(() => {
              audio.removeEventListener('canplaythrough', onCanPlayThrough);
              audio.removeEventListener('error', onError);
              resolve();
            }, 5000);
          });
          
          if (i === 0) promises.push(promise); // Only wait for first instance
          audioPool.push(audio);
        }
        
        soundsRef.current[key] = audioPool;
        
        // Load into Web Audio API buffer for even faster playback (gameplay sounds only)
        if (!isLoungeSound && audioContextRef.current.context) {
          fetch(path)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContextRef.current.context!.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
              audioContextRef.current.buffers.set(key, audioBuffer);
            })
            .catch(err => console.warn(`Failed to load ${key} into Web Audio API:`, err));
        }
      });
      
      loadingPromisesRef.current = promises;
      
      try {
        await Promise.all(promises);
        setIsLoaded(true);
      } catch (error) {
        console.warn('Some sounds failed to load:', error);
        setIsLoaded(true); // Still set as loaded to allow the game to continue
      }
    };

    loadSounds();
    
    // Resume AudioContext on first user interaction
    const resumeAudioContext = () => {
      if (audioContextRef.current.context && audioContextRef.current.context.state === 'suspended') {
        audioContextRef.current.context.resume();
      }
    };
    
    document.addEventListener('click', resumeAudioContext, { once: true });
    document.addEventListener('touchstart', resumeAudioContext, { once: true });

    // Cleanup
    return () => {
      Object.values(soundsRef.current).forEach(audioPool => {
        audioPool.forEach(audio => {
          audio.pause();
          audio.src = '';
        });
      });
      soundsRef.current = {};
      
      if (audioContextRef.current.context) {
        audioContextRef.current.context.close();
      }
    };
  }, [soundPaths, volume]);

  // Update volume when it changes
  useEffect(() => {
    Object.values(soundsRef.current).forEach(audioPool => {
      audioPool.forEach(audio => {
        audio.volume = volume;
      });
    });
  }, [volume]);

  // Save sounds enabled state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gameSoundsEnabled', JSON.stringify(soundsEnabledState));
    }
  }, [soundsEnabledState]);

  const playSound = useCallback((soundKey: string, options: { loop?: boolean; volume?: number } = {}) => {
    if (!soundsEnabledState) return;
    
    const audioPool = soundsRef.current[soundKey];
    if (!audioPool || audioPool.length === 0) {
      console.warn(`Sound not found: ${soundKey}`);
      return;
    }

    try {
      // For lounge sound, use the single instance
      if (soundKey === 'lounge') {
        const audio = audioPool[0];
        audio.currentTime = 0;
        if (options.loop !== undefined) audio.loop = options.loop;
        if (options.volume !== undefined) audio.volume = Math.max(0, Math.min(1, options.volume));
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => console.warn('Audio play was prevented:', error));
        }
        return;
      }
      
      // For gameplay sounds, try Web Audio API first for instant playback
      if (audioContextRef.current.context && audioContextRef.current.buffers.has(soundKey)) {
        const context = audioContextRef.current.context;
        const buffer = audioContextRef.current.buffers.get(soundKey);
        
        if (buffer && context.state !== 'suspended') {
          const source = context.createBufferSource();
          source.buffer = buffer;
          
          const gainNode = context.createGain();
          gainNode.gain.value = options.volume !== undefined ? options.volume : volume;
          
          source.connect(gainNode);
          gainNode.connect(context.destination);
          source.start(0);
          return; // Successfully played via Web Audio API
        }
      }
      
      // Fallback to HTML Audio with pooling for gameplay sounds
      // Find an available audio instance (not currently playing)
      let audio = audioPool.find(a => a.paused || a.ended);
      
      // If all instances are playing, use the first one
      if (!audio) {
        audio = audioPool[0];
      }
      
      // Don't reset currentTime if audio is already at start - saves time
      if (audio.currentTime > 0.1) {
        audio.currentTime = 0;
      }
      
      // Set options
      if (options.loop !== undefined) {
        audio.loop = options.loop;
      }
      if (options.volume !== undefined) {
        audio.volume = Math.max(0, Math.min(1, options.volume));
      }
      
      // Play the sound
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play was prevented
          console.warn('Audio play was prevented:', error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundKey}:`, error);
    }
  }, [soundsEnabledState, volume]);

  const stopSound = useCallback((soundKey: string) => {
    const audioPool = soundsRef.current[soundKey];
    if (audioPool) {
      audioPool.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }, []);

  const stopAllSounds = useCallback(() => {
    Object.values(soundsRef.current).forEach(audioPool => {
      audioPool.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    });
  }, []);

  const playLoungeSoundLoop = useCallback(() => {
    if (!soundsEnabledState || !isLoaded) return;
    
    const loungeAudioPool = soundsRef.current['lounge'];
    if (!loungeAudioPool || loungeAudioPool.length === 0) {
      console.warn('Lounge sound not found');
      return;
    }

    const loungeAudio = loungeAudioPool[0];
    try {
      loungeAudio.loop = true;
      loungeAudio.volume = 0.3; // Lower volume for background music
      loungeAudio.currentTime = 0;
      
      const playPromise = loungeAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Lounge audio play was prevented:', error);
        });
      }
    } catch (error) {
      console.warn('Error playing lounge sound:', error);
    }
  }, [soundsEnabledState, isLoaded]);

  const stopLoungeSound = useCallback(() => {
    const loungeAudioPool = soundsRef.current['lounge'];
    if (loungeAudioPool && loungeAudioPool.length > 0) {
      const loungeAudio = loungeAudioPool[0];
      loungeAudio.pause();
      loungeAudio.currentTime = 0;
      loungeAudio.loop = false;
    }
  }, []);

  const toggleSounds = useCallback(() => {
    setSoundsEnabledState((prev: boolean) => !prev);
  }, []);

  return {
    playSound,
    stopSound,
    stopAllSounds,
    playLoungeSoundLoop,
    stopLoungeSound,
    toggleSounds,
    soundsEnabled: soundsEnabledState,
    setSoundsEnabled: setSoundsEnabledState,
    isLoaded,
  };
};

// Predefined sound sets for each game
export const COINFLIP_SOUNDS = {
  flip: '/assets/coinflip/Animations/sfx/sfx_coin_flip.wav',
  win1: '/assets/coinflip/Animations/sfx/sfx_coin_win_1.wav',
  win2: '/assets/coinflip/Animations/sfx/sfx_coin_win_2.wav',
  lounge: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_1_lounge_zoggi_1.mp3',
};

export const DICE_SOUNDS = {
  flip: '/assets/dice/Animations/sfx/sfx_coin_flip.wav',
  win1: '/assets/dice/Animations/sfx/sfx_coin_win_1.wav',
  win2: '/assets/dice/Animations/sfx/sfx_coin_win_2.wav',
  lounge: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_2_lounge_zoggi_1.mp3',
};

// For mines, we'll use the character sounds from the JSON
export const MINES_SOUNDS = {
  clap: '/assets/Mines/Animations/Spine/sounds/zoggy_2/sound_7_clap_zoggi_2.mp3',
  laughter: '/assets/Mines/Animations/Spine/sounds/zoggy_1/sound_10_laughter_zoggi_1.mp3',
  explosion: '/assets/Mines/Animations/Spine/sounds/zoggy_2/sound_12_explosion_zoggi_2.mp3',
  bling: '/assets/Mines/Animations/Spine/sounds/zoggy_2/sound_6_bling_zoggi_2.mp3',
  crystal: '/assets/Mines/Animations/Spine/sounds/zoggy_2/sound_5_crystal-glass_zoggi_2.mp3',
  chips: '/assets/Mines/Animations/Spine/sounds/zoggy_1/sound_3_casino_chips_zoggi1.mp3',
  fanfareShort: '/assets/Mines/Animations/Spine/sounds/zoggy_1/sound_8_fanfare_short_zoggi_1.mp3',
  fanfareLong: '/assets/Mines/Animations/Spine/sounds/zoggy_1/sound_9_fanfare_long_zoggi_1.mp3',
  lounge: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_2/sound_1_lounge_zoggi_2.mp3',
};

// For slots, use Meme Slot specific sounds
export const SLOTS_SOUNDS = {
  spin: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_5_spin_reel_zoggi_1.mp3',
  win: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_6_cash-register_zoggi_1.mp3',
  fanfare: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_8_fanfare_short_zoggi_1.mp3',
  fanfareLong: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_9_fanfare_long_zoggi_1.mp3',
  coins: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_7_coin_zoggi_1.mp3',
  chips: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_4_casino_chips_zoggi1.mp3',
  laughter: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_10_laughter_zoggi_1.mp3',
  lounge: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_2/sound_2_lounge_zoggi_2.mp3',
};

// For chests, use dedicated chest sounds
export const CHEST_SOUNDS = {
  open: '/assets/Chests/sfx/sfx_open.wav',
  reveal: '/assets/Chests/sfx/sfx_reveal.wav',
};

// For crash, use rocket sounds
export const CRASH_SOUNDS = {
  lounge: '/assets/Meme Slot/Animations/Spine/sounds/zoggy_1/sound_1_lounge_zoggi_1.mp3', // Background sound for idle mode
  reveal: '/assets/Crash/Animations/sfx/rocket_reveal_sfx.wav',
  idle: '/assets/Crash/Animations/sfx/rocket_idle_sfx.wav', // Rocket engine sound during flight
  explosion: '/assets/Crash/Animations/sfx/rocket_explosion_sfx.wav',
};
