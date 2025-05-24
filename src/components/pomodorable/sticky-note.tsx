
"use client";

import type React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot, updateDoc, DocumentData, setDoc, serverTimestamp } from 'firebase/firestore';
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
    if (!sessionId || !db) return null;
    return doc(db, 'pomodoroSessions', sessionId);
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId || !db) {
      setNoteText('');
      setLastSaved(null);
      setLoading(false);
      return;
    }

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) {
        setLoading(false);
        return;
    }

    setLoading(true);
    console.log(`StickyNote: Setting up snapshot for session ${sessionId}`);
    const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        console.log("StickyNote: Data received from snapshot:", data);
        setNoteText(data.dailyGoals || '');
        if (data.dailyGoalsLastSaved && data.dailyGoalsLastSaved.toDate) {
          setLastSaved(data.dailyGoalsLastSaved.toDate());
        } else {
          setLastSaved(null);
        }
      } else {
        console.warn(`StickyNote: Session document ${sessionId} not found or dailyGoals field missing.`);
        setNoteText('');
        setLastSaved(null);
      }
      setLoading(false);
    }, (error) => {
      console.error(`StickyNote: Error fetching daily goals for session ${sessionId}: `, error);
      toast({ title: "Error Loading Goals", description: `Could not load daily goals: ${error.message}`, variant: "destructive" });
      setLoading(false);
    });

    return () => {
      console.log(`StickyNote: Cleaning up snapshot for session ${sessionId}`);
      unsubscribe();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [db, sessionId, toast, getSessionDocRef]);

  const saveNote = useCallback(async (currentText: string, showToast: boolean = false) => {
    if (isReadOnly || !sessionId || !db) return;
    
    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) {
        toast({ title: "Error", description: "Session document reference is missing.", variant: "destructive" });
        return;
    }

    const dataToSave = {
        dailyGoals: currentText,
        dailyGoalsLastSaved: serverTimestamp(),
    };

    try {
      console.log(`StickyNote: Attempting to save goals for session ${sessionId}:`, dataToSave);
      // Using updateDoc assuming the document already exists from session creation.
      // If it might not (e.g., field added later), setDoc with merge:true is safer.
      // For this flow, session doc is created first.
      await updateDoc(sessionDocRef, dataToSave);
      // setLastSaved will be updated by onSnapshot
      if (showToast) {
        toast({ title: "Goals Saved!", description: "Your session goals are up-to-date." });
      }
      console.log(`StickyNote: Goals saved successfully for session ${sessionId}.`);
    } catch (error: any) {
      console.error(`StickyNote: Error saving daily goals for session ${sessionId}: `, error);
      toast({ title: "Error Saving Goals", description: `Failed to save goals: ${error.message}`, variant: "destructive" });
    }
  }, [isReadOnly, sessionId, db, getSessionDocRef, toast]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isReadOnly) return;
    const newText = e.target.value;
    setNoteText(newText);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      saveNote(newText, false); // Auto-save, no toast unless manual
    }, 1500);
  };

  const handleManualSave = () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    saveNote(noteText, true); // Manual save, show toast
  };

  const handleClearNote = async () => {
    if (isReadOnly || !sessionId || !db) return;
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    setNoteText(''); 
    await saveNote('', true); // Save empty string, show toast for clear
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
          disabled={loading || isReadOnly || !sessionId || !db}
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center p-3 border-t">
        <span className="text-xs text-muted-foreground truncate">
          {loading && "Loading..."}
          {!loading && sessionId && db && (lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : (isReadOnly ? "" : "Not saved yet"))}
          {!loading && (!sessionId || !db) && "Unavailable"}
        </span>
        {!isReadOnly && sessionId && db && (
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

