
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { StickyNote as StickyNoteIcon, Save, Trash } from 'lucide-react'; // Renamed to avoid conflict
import { useToast } from '@/hooks/use-toast';


const StickyNote: React.FC = () => {
  const [noteText, setNoteText] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedNote = localStorage.getItem('pomodorable-sticky-note');
    const savedTime = localStorage.getItem('pomodorable-sticky-note-time');
    if (savedNote) {
      setNoteText(savedNote);
    }
    if (savedTime) {
      setLastSaved(new Date(savedTime));
    }
  }, []);

  const handleSaveNote = () => {
    localStorage.setItem('pomodorable-sticky-note', noteText);
    const now = new Date();
    localStorage.setItem('pomodorable-sticky-note-time', now.toISOString());
    setLastSaved(now);
    toast({ title: "Note Saved!", description: "Your thoughts are safe." });
  };

  const handleClearNote = () => {
    setNoteText('');
    localStorage.removeItem('pomodorable-sticky-note');
    localStorage.removeItem('pomodorable-sticky-note-time');
    setLastSaved(null);
    toast({ title: "Note Cleared!", variant: "destructive" });
  };
  
  // Auto-save after a delay of inactivity
  useEffect(() => {
    const handler = setTimeout(() => {
      if (document.hasFocus() && noteText !== (localStorage.getItem('pomodorable-sticky-note') || '')) {
         // Only save if there's a change and window is focused
        handleSaveNote();
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => {
      clearTimeout(handler);
    };
  }, [noteText]);


  return (
    <Card className="shadow-lg w-full flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <StickyNoteIcon className="mr-2 h-6 w-6 text-primary" />
          Daily Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Jot down your goals for the day..."
          className="h-full min-h-[150px] resize-none bg-accent/20 focus:bg-background"
          aria-label="Sticky note text area"
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center p-3 border-t">
        <span className="text-xs text-muted-foreground">
          {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved yet'}
        </span>
        <div className="space-x-2">
          <Button onClick={handleSaveNote} size="sm" variant="default">
            <Save className="mr-1.5 h-4 w-4" /> Save
          </Button>
           {noteText && (
            <Button onClick={handleClearNote} size="sm" variant="outline">
              <Trash className="mr-1.5 h-4 w-4" /> Clear
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default StickyNote;
