
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Sparkles } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import { doc, setDoc, onSnapshot, DocumentData } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type Mood = 'happy' | 'neutral' | 'sad' | null;

interface MoodTrackerProps {
  db: Firestore;
  userId?: string | null;
  sessionId?: string | null;
  isReadOnly?: boolean;
}

const MoodTracker: React.FC<MoodTrackerProps> = ({ db, userId, sessionId, isReadOnly = false }) => {
  const [currentMood, setCurrentMood] = useState<Mood>(null);
  const [lastMoodSetTime, setLastMoodSetTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getSessionDocRef = useCallback(() => {
    if (!sessionId) return null;
    return doc(db, 'pomodoroSessions', sessionId);
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId || !userId) {
      setLoading(false);
      return;
    }

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    setLoading(true);
    const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        setCurrentMood(data.mood || null);
        if (data.moodLastSetTime && data.moodLastSetTime.toDate) {
          setLastMoodSetTime(data.moodLastSetTime.toDate());
        } else {
          setLastMoodSetTime(null);
        }
      } else {
        // Session doc might not exist yet if it's a brand new session being initialized
        // Or if there's an issue. For now, assume new session starts with no mood.
        setCurrentMood(null);
        setLastMoodSetTime(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching mood: ", error);
      toast({ title: "Error", description: "Could not load mood data.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db, sessionId, userId, toast, getSessionDocRef]);

  const handleMoodSelect = async (mood: Mood) => {
    if (isReadOnly || !sessionId || !userId) return;

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    const now = new Date();
    try {
      await setDoc(sessionDocRef, { 
        mood: mood,
        moodLastSetTime: now,
      }, { merge: true });
      // setCurrentMood(mood); // Handled by onSnapshot
      // setLastMoodSetTime(now); // Handled by onSnapshot
      toast({ title: "Mood Updated!", description: `Your mood is set to ${mood || 'cleared'}.` });
    } catch (error) {
      console.error("Error saving mood: ", error);
      toast({ title: "Error", description: "Could not save mood.", variant: "destructive" });
    }
  };
  
  const getMoodDisplay = () => {
    if (loading) {
      return <p className="text-muted-foreground">Loading mood...</p>;
    }
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
      {!isReadOnly && (
        <CardFooter className="flex justify-around">
          <Button
            variant={currentMood === 'happy' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleMoodSelect('happy')}
            aria-label="Set mood to happy"
            disabled={loading || !sessionId}
          >
            <Smile className="h-6 w-6" />
          </Button>
          <Button
            variant={currentMood === 'neutral' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleMoodSelect('neutral')}
            aria-label="Set mood to neutral"
            disabled={loading || !sessionId}
          >
            <Meh className="h-6 w-6" />
          </Button>
          <Button
            variant={currentMood === 'sad' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleMoodSelect('sad')}
            aria-label="Set mood to sad"
            disabled={loading || !sessionId}
          >
            <Frown className="h-6 w-6" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MoodTracker;
    