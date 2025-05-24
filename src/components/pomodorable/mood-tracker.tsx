
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Sparkles } from 'lucide-react';

type Mood = 'happy' | 'neutral' | 'sad' | null;

const MoodTracker: React.FC = () => {
  const [currentMood, setCurrentMood] = useState<Mood>(null);
  const [lastMoodSetTime, setLastMoodSetTime] = useState<Date | null>(null);

  useEffect(() => {
    const storedMood = localStorage.getItem('pomodorable-mood') as Mood;
    const storedTime = localStorage.getItem('pomodorable-mood-time');
    if (storedMood) {
      setCurrentMood(storedMood);
    }
    if (storedTime) {
      setLastMoodSetTime(new Date(storedTime));
    }
  }, []);

  const handleMoodSelect = (mood: Mood) => {
    setCurrentMood(mood);
    const now = new Date();
    setLastMoodSetTime(now);
    if (mood) {
      localStorage.setItem('pomodorable-mood', mood);
      localStorage.setItem('pomodorable-mood-time', now.toISOString());
    } else {
      localStorage.removeItem('pomodorable-mood');
      localStorage.removeItem('pomodorable-mood-time');
    }
  };
  
  const getMoodDisplay = () => {
    if (!currentMood) return <p className="text-muted-foreground">How are you feeling?</p>;
    
    let moodText = '';
    let MoodIconComponent = Sparkles;

    switch (currentMood) {
      case 'happy':
        moodText = "Feeling great!";
        MoodIconComponent = Smile;
        break;
      case 'neutral':
        moodText = "Feeling okay.";
        MoodIconComponent = Meh;
        break;
      case 'sad':
        moodText = "Feeling a bit down.";
        MoodIconComponent = Frown;
        break;
    }
    return (
      <div className="flex flex-col items-center space-y-2">
        <MoodIconComponent className="h-12 w-12 text-primary" />
        <p className="font-semibold">{moodText}</p>
        {lastMoodSetTime && (
          <p className="text-xs text-muted-foreground">
            Logged: {lastMoodSetTime.toLocaleTimeString()}
          </p>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="mr-2 h-6 w-6 text-primary" />
          Mood Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center min-h-[120px] flex items-center justify-center">
        {getMoodDisplay()}
      </CardContent>
      <CardFooter className="flex justify-around">
        <Button
          variant={currentMood === 'happy' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleMoodSelect('happy')}
          aria-label="Set mood to happy"
        >
          <Smile className="h-6 w-6" />
        </Button>
        <Button
          variant={currentMood === 'neutral' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleMoodSelect('neutral')}
          aria-label="Set mood to neutral"
        >
          <Meh className="h-6 w-6" />
        </Button>
        <Button
          variant={currentMood === 'sad' ? 'default' : 'outline'}
          size="icon"
          onClick={() => handleMoodSelect('sad')}
          aria-label="Set mood to sad"
        >
          <Frown className="h-6 w-6" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MoodTracker;
