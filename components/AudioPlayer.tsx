import { useState, useRef, useEffect } from 'react';

const AudioPlayer: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      // Try to play if not muted and not already playing
      if (!isMuted && audioRef.current.paused) {
        audioRef.current.play().catch(e => {
          console.warn('Audio play failed:', e);
          // Autoplay may be blocked; we'll rely on user interaction to start
        });
      }
    }
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(prev => {
      const newState = !prev;
      if (audioRef.current) {
        audioRef.current.muted = newState;
        // If unmuting and paused, try to play
        if (!newState && audioRef.current.paused) {
          audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
        }
      }
      return newState;
    });
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={toggleMute}
        className="
          w-10 h-10 rounded-full
          bg-field/80 backdrop-blur-sm
          text-ink/90 hover:text-ink
          border border-line/50 hover:border-line/70
          flex items-center justify-center
          transition-all duration-200
          shadow-inner-lg
          hover:shadow-inner
          hover:scale-105
        "
        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      <audio
        ref={audioRef}
        src="/audio/Zoltraak.mp3"
        loop
        preload="auto"
      />
    </div>
  );
};

export default AudioPlayer;