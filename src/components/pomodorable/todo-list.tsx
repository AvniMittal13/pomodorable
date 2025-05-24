
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, DocumentData, serverTimestamp, setDoc } from 'firebase/firestore';
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
  createdAt: number; // Timestamp for sorting (client-side, consider serverTimestamp for creation if strict order is critical across clients)
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
    if (!sessionId || !db) return null;
    return doc(db, 'pomodoroSessions', sessionId);
  }, [db, sessionId]);

  useEffect(() => {
    if (!sessionId || !db) {
      setLoading(false);
      setTasks([]);
      return;
    }

    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) {
        setLoading(false);
        return;
    }
    
    setLoading(true);
    console.log(`TodoList: Setting up snapshot for session ${sessionId}`);
    const unsubscribe = onSnapshot(sessionDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as DocumentData;
        console.log("TodoList: Data received from snapshot:", data);
        const sessionTasks = (data.todos || []) as Task[];
        setTasks(sessionTasks.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        console.warn(`TodoList: Session document ${sessionId} not found or todos field missing.`);
        setTasks([]);
      }
      setLoading(false);
    }, (error) => {
      console.error(`TodoList: Error fetching todos for session ${sessionId}: `, error);
      toast({ title: "Error Loading Todos", description: `Could not load to-do list: ${error.message}`, variant: "destructive" });
      setLoading(false);
    });

    return () => {
        console.log(`TodoList: Cleaning up snapshot for session ${sessionId}`);
        unsubscribe();
    };
  }, [db, sessionId, toast, getSessionDocRef]);

  const updateTasksInFirestore = async (updatedTasks: Task[], operationMessage: string) => {
    if (isReadOnly || !sessionId || !db) return false;
    const sessionDocRef = getSessionDocRef();
    if (!sessionDocRef) {
      toast({ title: "Error", description: "Session reference missing.", variant: "destructive" });
      return false;
    }

    try {
      console.log(`TodoList: Attempting to ${operationMessage} for session ${sessionId}. New tasks array:`, updatedTasks);
      // Using updateDoc to replace the entire todos array.
      // setDoc with merge: true could also be used if creating the field initially.
      await updateDoc(sessionDocRef, {
        todos: updatedTasks,
        todosLastUpdated: serverTimestamp() // Optional: track when todos were last changed
      });
      // Toast for individual operations can be noisy; consider a general "changes saved" or rely on optimistic updates.
      // toast({ title: "To-Do List Updated", description: operationMessage });
      console.log(`TodoList: ${operationMessage} successful for session ${sessionId}.`);
      return true;
    } catch (error: any) {
      console.error(`TodoList: Error ${operationMessage.toLowerCase()} for session ${sessionId}:`, error);
      toast({ title: `Error ${operationMessage}`, description: `Failed to update tasks: ${error.message}`, variant: "destructive" });
      return false;
    }
  };

  const addTask = async () => {
    if (newTaskText.trim() === '') return;

    const newTask: Task = {
      id: Date.now().toString(), 
      text: newTaskText.trim(),
      completed: false,
      createdAt: Date.now(),
    };
    
    const updatedTasks = [newTask, ...tasks]; // Add to beginning for optimistic UI
    if (await updateTasksInFirestore(updatedTasks, "adding task")) {
        setNewTaskText('');
        // setTasks(updatedTasks); // Handled by onSnapshot for consistency
    }
  };

  const toggleTask = async (taskId: string) => {
    const updatedTasks = tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    await updateTasksInFirestore(updatedTasks, "toggling task");
    // setTasks(updatedTasks); // Handled by onSnapshot
  };

  const deleteTask = async (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    await updateTasksInFirestore(updatedTasks, "deleting task");
    // setTasks(updatedTasks); // Handled by onSnapshot
  };
  
  const clearCompletedTasks = async () => {
    const activeTasks = tasks.filter(task => !task.completed);
    if (tasks.length === activeTasks.length) { // No completed tasks to clear
        toast({title: "No tasks to clear", description: "There are no completed tasks in your list."});
        return;
    }
    if (await updateTasksInFirestore(activeTasks, "clearing completed tasks")) {
        // setTasks(activeTasks); // Handled by onSnapshot
        toast({ title: "Completed Tasks Cleared" });
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
                disabled={loading || !sessionId || isReadOnly || !db}
              />
              <Button 
                onClick={addTask} 
                aria-label="Add task" 
                disabled={loading || !sessionId || isReadOnly || newTaskText.trim() === '' || !db}>
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
                      disabled={isReadOnly || loading || !db}
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
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteTask(task.id)} 
                        aria-label={`Delete task ${task.text}`} 
                        disabled={loading || !db}
                    >
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
               <Button 
                variant="link" 
                onClick={clearCompletedTasks} 
                className="text-xs p-0 h-auto" 
                disabled={loading || !db}
                >
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

