
"use client";

import type React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlayCircle, PauseCircle, Music, Volume2, VolumeX } from 'lucide-react';

interface Track {
  name: string;
  artist: string;
  url: string;
}

const tracks: Track[] = [
  { name: "Empty Road", artist: "Lofi Hour", url: "https://cdn.pixabay.com/download/audio/2024/02/09/audio_6cebf04af0.mp3?filename=empty-road-188201.mp3" },
  { name: "Lofi Chill", artist: "BoDleasons", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_15df9a6000.mp3?filename=lofi-chill-117099.mp3" },
  { name: "Chill Abstract", artist: "ComaStudio", url: "https://cdn.pixabay.com/download/audio/2022/07/01/audio_5881715a17.mp3?filename=chill-abstract-intention-12099.mp3" },
];

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Effect for managing volume and mute state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Combined effect for loading track, playing, and pausing
  useEffect(() => {
    if (!audioRef.current || tracks.length === 0) return;

    const currentTrack = tracks[currentTrackIndex];
    if (!currentTrack) return; 

    const newSrc = currentTrack.url;

    // Update src and load only if it's a new track or src is not set
    if (audioRef.current.src !== newSrc) {
      audioRef.current.src = newSrc;
      audioRef.current.load(); // Important to load the new source
    }

    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Error playing audio:", error);
          setIsPlaying(false); // If playing fails, set isPlaying to false
        });
      }
    } else {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  }, [currentTrackIndex, isPlaying, tracks]);


  // Effect to pause music when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleTrackEnd = () => {
    setCurrentTrackIndex(prevIndex => (prevIndex + 1) % tracks.length);
  };
  
  const handleTrackSelect = (trackIndexValue: string) => {
    const trackIndex = parseInt(trackIndexValue, 10);
    setCurrentTrackIndex(trackIndex);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };
  
  const currentTrackDetails = tracks[currentTrackIndex] || { name: "No track selected", artist: "" };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Music className="mr-2 h-6 w-6 text-primary" />
          Lo-fi Beats
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="mb-3">
          <p className="font-semibold truncate text-lg">{currentTrackDetails.name}</p>
          <p className="text-sm text-muted-foreground truncate">{currentTrackDetails.artist}</p>
        </div>
        
        <audio ref={audioRef} onEnded={handleTrackEnd} preload="metadata" />

        <div className="px-4 mb-4">
          <Select onValueChange={handleTrackSelect} value={currentTrackIndex.toString()}>
            <SelectTrigger className="w-full" aria-label="Select track">
              <SelectValue placeholder="Select a track" />
            </SelectTrigger>
            <SelectContent>
              {tracks.map((track, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {track.name} - {track.artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-center space-x-2 mt-2">
          <Button variant="default" size="icon" onClick={togglePlayPause} className="w-12 h-12 rounded-full" aria-label={isPlaying ? "Pause music" : "Play music"}>
            {isPlaying ? <PauseCircle className="h-7 w-7" /> : <PlayCircle className="h-7 w-7" />}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex items-center space-x-2 px-4 pt-2 pb-4">
        <Button variant="ghost" size="icon" onClick={toggleMute} aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className="flex-1"
          aria-label="Volume control"
        />
      </CardFooter>
    </Card>
  );
};

export default MusicPlayer;
