
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PlusSquare, Trash2, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number; // Timestamp for sorting
}

interface TodoListProps {
  db: Firestore;
  sessionId?: string | null;
  isReadOnly?: boolean;
}

const TodoList: React.FC<TodoListProps> = ({ db, sessionId, isReadOnly = false }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getSessionDocRef = useCallback(() => {
    if (!sessionId) return null;
    return doc(db, 'pomodoroSessions', sessionId);
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setTasks([]); // Clear tasks if no session ID
      return;
    }

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    setLoading(true);
    const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        const sessionTasks = (data.todos || []) as Task[];
        // Sort tasks by creation time, newest first
        setTasks(sessionTasks.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setTasks([]);
        // console.warn("Session document not found for todos, or todos field is missing.");
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching todos: ", error);
      toast({ title: "Error", description: "Could not load to-do list.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId, toast, getSessionDocRef]);

  const addTask = async () => {
    if (isReadOnly || !sessionId || newTaskText.trim() === '') return;

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    const newTask: Task = {
      id: Date.now().toString(), // Simple unique ID
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    try {
      await updateDoc(sessionDocRef, {
        todos: arrayUnion(newTask)
      });
      setNewTaskText('');
      // toast({ title: "Task Added", description: `"${newTask.text}" added to your list.` });
      // Snapshot listener will update local state
    } catch (error) {
      console.error('Error adding task:', error);
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" });
    }
  };

  const toggleTask = async (taskId: string) => {
    if (isReadOnly || !sessionId) return;
    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    const taskToToggle = tasks.find(t => t.id === taskId);
    if (!taskToToggle) return;

    const updatedTask = { ...taskToToggle, completed: !taskToToggle.completed };

    try {
      // This is a bit more complex: remove the old, add the new.
      // Firestore's arrayUnion/Remove work with exact matches.
      // A simpler way if order doesn't matter or if you re-fetch/re-sort:
      // Fetch current tasks, modify, then set the whole array.
      // For now, let's try replacing the entire array.
      const newTasksArray = tasks.map(t => t.id === taskId ? updatedTask : t);
      await updateDoc(sessionDocRef, {
        todos: newTasksArray
      });
      // toast({ title: "Task Updated", description: `Task status changed.` });
    } catch (error) {
      console.error('Error toggling task:', error);
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    }
  };

  const deleteTask = async (taskId: string) => {
    if (isReadOnly || !sessionId) return;
    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    try {
      await updateDoc(sessionDocRef, {
        todos: arrayRemove(taskToDelete)
      });
      // toast({ title: "Task Deleted", description: `Task removed from your list.` });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" });
    }
  };
  
  const clearCompletedTasks = async () => {
    if (isReadOnly || !sessionId) return;
    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) return;

    const activeTasks = tasks.filter(task => !task.completed);
    try {
      await updateDoc(sessionDocRef, {
        todos: activeTasks
      });
      // toast({ title: "Completed Tasks Cleared" });
    } catch (error) {
      console.error('Error clearing completed tasks:', error);
      toast({ title: "Error", description: "Failed to clear completed tasks.", variant: "destructive" });
    }
  };

  const completedTasksCount = tasks.filter(task => task.completed).length;
  const totalTasksCount = tasks.length;

  return (
    <Card className="shadow-lg w-full flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ListChecks className="mr-2 h-6 w-6 text-primary" />
          Session To-Do List
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
        {!isReadOnly && (
          <div className="p-6">
            <div className="flex space-x-2 mb-4">
              <Input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a new task for this session..."
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                aria-label="New task input"
                disabled={loading || !sessionId || isReadOnly}
              />
              <Button onClick={addTask} aria-label="Add task" disabled={loading || !sessionId || isReadOnly || newTaskText.trim() === ''}>
                <PlusSquare className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
        
        <ScrollArea className="flex-grow px-6 pb-6">
          {loading && <p className="text-center text-muted-foreground py-4">Loading tasks...</p>}
          {!loading && tasks.length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              {isReadOnly ? "No tasks were added to this session." : "No tasks yet. Add some for this session!"}
            </p>
          )}
          {!loading && tasks.length > 0 && (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-3 bg-card/60 rounded-md shadow-sm hover:bg-accent/20 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      aria-labelledby={`task-label-${task.id}`}
                      disabled={isReadOnly || loading}
                    />
                    <label
                      htmlFor={`task-${task.id}`}
                      id={`task-label-${task.id}`}
                      className={`text-sm ${isReadOnly ? '' : 'cursor-pointer'} ${task.completed ? 'line-through text-muted-foreground' : 'text-card-foreground'}`}
                    >
                      {task.text}
                    </label>
                  </div>
                  {!isReadOnly && (
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} aria-label={`Delete task ${task.text}`} disabled={loading}>
                      <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
      {totalTasksCount > 0 && (
        <>
          <Separator className="my-0" />
          <CardFooter className="p-4 flex justify-between items-center text-sm text-muted-foreground">
            <span>{completedTasksCount} / {totalTasksCount} completed</span>
            {!isReadOnly && completedTasksCount > 0 && (
               <Button variant="link" onClick={clearCompletedTasks} className="text-xs p-0 h-auto" disabled={loading}>
                 Clear completed
               </Button>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default TodoList;
