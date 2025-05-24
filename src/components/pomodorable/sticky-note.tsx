
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot, updateDoc, DocumentData, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StickyNote as StickyNoteIcon, Save, Eraser } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StickyNoteProps {
  db: Firestore;
  sessionId?: string | null;
  isReadOnly?: boolean;
}

const StickyNote: React.FC<StickyNoteProps> = ({ db, sessionId, isReadOnly = false }) => {
  const [noteText, setNoteText] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getSessionDocRef = useCallback(() => {
    if (!sessionId) return null;
    return doc(db, 'pomodoroSessions', sessionId);
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setNoteText('');
      setLastSaved(null);
      setLoading(false);
      return;
    }

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    setLoading(true);
    const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        setNoteText(data.dailyGoals || '');
        if (data.dailyGoalsLastSaved && data.dailyGoalsLastSaved.toDate) {
          setLastSaved(data.dailyGoalsLastSaved.toDate());
        } else {
          setLastSaved(null);
        }
      } else {
        setNoteText('');
        setLastSaved(null);
        // console.warn("Session document not found for daily goals, or field is missing.");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching daily goals: ", error);
      toast({ title: "Error", description: "Could not load daily goals.", variant: "destructive" });
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [sessionId, toast, getSessionDocRef]);

  const saveNote = useCallback(async (currentText: string) => {
    if (isReadOnly || !sessionId) return;
    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    const now = new Date();
    try {
      await updateDoc(sessionDocRef, {
        dailyGoals: currentText,
        dailyGoalsLastSaved: now,
      });
      // setLastSaved(now); // Handled by onSnapshot to avoid race conditions
      // No toast here for auto-save to avoid being too noisy
    } catch (error: any) {
      // Check if error is due to non-existent document (e.g., very new session)
      if (error.code === 'not-found' || error.message?.includes('No document to update')) {
        try {
            await setDoc(sessionDocRef, { 
                dailyGoals: currentText, 
                dailyGoalsLastSaved: now 
            }, { merge: true });
        } catch (setError) {
            console.error("Error setting daily goals after update failed: ", setError);
            toast({ title: "Error", description: "Failed to save goals.", variant: "destructive" });
        }
      } else {
        console.error("Error saving daily goals: ", error);
        toast({ title: "Error", description: "Failed to save goals.", variant: "destructive" });
      }
    }
  }, [isReadOnly, sessionId, getSessionDocRef, toast]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const newText = e.target.value;
    setNoteText(newText);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveNote(newText);
    }, 1500); // Auto-save after 1.5 seconds of inactivity
  };

  const handleManualSave = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    saveNote(noteText);
    toast({ title: "Goals Saved!", description: "Your session goals are up-to-date." });
  };

  const handleClearNote = async () => {
    if (isReadOnly || !sessionId) return;
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setNoteText(''); // Optimistic update
    await saveNote(''); // Save empty string
    toast({ title: "Goals Cleared!", variant: "default" });
  };

  return (
    <Card className="shadow-lg w-full flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <StickyNoteIcon className="mr-2 h-6 w-6 text-primary" />
          Session Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <Textarea
          value={noteText}
          onChange={handleTextChange}
          placeholder={isReadOnly && !noteText ? "No goals were set for this session." : "Jot down your goals for this session..."}
          className="h-full min-h-[150px] resize-none bg-card/60 focus:bg-background disabled:cursor-not-allowed disabled:opacity-70"
          aria-label="Session goals text area"
          disabled={loading || isReadOnly || !sessionId}
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center p-3 border-t">
        <span className="text-xs text-muted-foreground truncate">
          {loading && "Loading..."}
          {!loading && sessionId && (lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : (isReadOnly ? "" : "Not saved yet"))}
          {!loading && !sessionId && "No active session"}
        </span>
        {!isReadOnly && sessionId && (
          <div className="space-x-2">
            <Button onClick={handleManualSave} size="sm" variant="default" disabled={loading}>
              <Save className="mr-1.5 h-4 w-4" /> Save
            </Button>
            {noteText && (
              <Button onClick={handleClearNote} size="sm" variant="outline" disabled={loading}>
                <Eraser className="mr-1.5 h-4 w-4" /> Clear
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default StickyNote;
