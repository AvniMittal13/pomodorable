
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Sparkles } from 'lucide-react';
import type { Firestore } from 'firebase/firestore';
import { doc, setDoc, onSnapshot, DocumentData, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type Mood = 'happy' | 'neutral' | 'sad' | null;

interface MoodTrackerProps {
  db: Firestore;
  userId?: string | null; // Retained for future use, e.g. direct user mood logs
  sessionId?: string | null;
  isReadOnly?: boolean;
}

const MoodTracker: React.FC<MoodTrackerProps> = ({ db, userId, sessionId, isReadOnly = false }) => {
  const [currentMood, setCurrentMood] = useState<Mood>(null);
  const [lastMoodSetTime, setLastMoodSetTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getSessionDocRef = useCallback(() => {
    if (!sessionId || !db) return null;
    return doc(db, 'pomodoroSessions', sessionId);
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId || !userId || !db) {
      setLoading(false);
      return;
    }

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) {
        setLoading(false);
        return;
    }

    setLoading(true);
    console.log(`MoodTracker: Setting up snapshot for session ${sessionId}`);
    const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        console.log("MoodTracker: Data received from snapshot:", data);
        setCurrentMood(data.mood || null);
        if (data.moodLastSetTime && data.moodLastSetTime.toDate) {
          setLastMoodSetTime(data.moodLastSetTime.toDate());
        } else {
          setLastMoodSetTime(null);
        }
      } else {
        console.warn(`MoodTracker: Session document ${sessionId} not found or mood field missing.`);
        setCurrentMood(null);
        setLastMoodSetTime(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`MoodTracker: Error fetching mood for session ${sessionId}: `, error);
      toast({ title: "Error Loading Mood", description: `Could not load mood data: ${error.message}`, variant: "destructive" });
      setLoading(false);
    });

    return () => {
        console.log(`MoodTracker: Cleaning up snapshot for session ${sessionId}`);
        unsubscribe();
    }
  }, [db, sessionId, userId, toast, getSessionDocRef]);

  const handleMoodSelect = async (mood: Mood) => {
    if (isReadOnly || !sessionId || !userId || !db) return;

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) {
        toast({ title: "Error", description: "Session document reference is missing.", variant: "destructive" });
        return;
    }

    const moodData = { 
        mood: mood,
        moodLastSetTime: serverTimestamp(), // Use serverTimestamp for consistency
      };

    try {
      console.log(`MoodTracker: Attempting to save mood for session ${sessionId}:`, moodData);
      await setDoc(sessionDocRef, moodData, { merge: true });
      // setCurrentMood and setLastMoodSetTime will be updated by the onSnapshot listener
      toast({ title: "Mood Updated!", description: `Your mood is set to ${mood || 'cleared'}.` });
      console.log(`MoodTracker: Mood saved successfully for session ${sessionId}.`);
    } catch (error: any) {
      console.error(`MoodTracker: Error saving mood for session ${sessionId}: `, error);
      toast({ title: "Error Saving Mood", description: `Could not save mood: ${error.message}`, variant: "destructive" });
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
            disabled={loading || !sessionId || !db}
          >
            <Smile className="h-6 w-6" />
          </Button>
          <Button
            variant={currentMood === 'neutral' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleMoodSelect('neutral')}
            aria-label="Set mood to neutral"
            disabled={loading || !sessionId || !db}
          >
            <Meh className="h-6 w-6" />
          </Button>
          <Button
            variant={currentMood === 'sad' ? 'default' : 'outline'}
            size="icon"
            onClick={() => handleMoodSelect('sad')}
            aria-label="Set mood to sad"
            disabled={loading || !sessionId || !db}
          >
            <Frown className="h-6 w-6" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MoodTracker;
    
