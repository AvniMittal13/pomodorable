
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Leaf, Droplet } from 'lucide-react';

const plantStages = [
  { src: "https://placehold.co/200x200/A0D2DB/34495e.png?text=Sprout", alt: "A tiny sprout", dataAiHint: "plant sprout" },
  { src: "https://placehold.co/200x200/A0D2DB/34495e.png?text=Seedling", alt: "A small seedling", dataAiHint: "plant seedling" },
  { src: "https://placehold.co/200x200/A0D2DB/34495e.png?text=Young+Plant", alt: "A young plant", dataAiHint: "young plant" },
  { src: "https://placehold.co/200x200/A0D2DB/34495e.png?text=Mature+Plant", alt: "A mature plant", dataAiHint: "mature plant" },
  { src: "https://placehold.co/200x200/A0D2DB/34495e.png?text=Flowering+Plant", alt: "A flowering plant", dataAiHint: "flowering plant" },
];

const MAX_GROWTH = 100;
const GROWTH_PER_WATER = 20;


const PlantTracker: React.FC = () => {
  const [growthLevel, setGrowthLevel] = useState(0);

  useEffect(() => {
    const storedGrowth = localStorage.getItem('pomodorable-plant-growth');
    if (storedGrowth) {
      setGrowthLevel(JSON.parse(storedGrowth));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pomodorable-plant-growth', JSON.stringify(growthLevel));
  }, [growthLevel]);

  const waterPlant = () => {
    setGrowthLevel(prev => Math.min(prev + GROWTH_PER_WATER, MAX_GROWTH));
  };
  
  const resetPlant = () => {
    setGrowthLevel(0);
  }

  const currentStageIndex = Math.floor((growthLevel / MAX_GROWTH) * (plantStages.length -1));
  const currentPlant = plantStages[Math.min(currentStageIndex, plantStages.length - 1)];


  return (
    <Card className="shadow-lg w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Leaf className="mr-2 h-6 w-6 text-primary" />
          Plant Friend
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20 bg-secondary/30">
          <Image 
            src={currentPlant.src} 
            alt={currentPlant.alt} 
            data-ai-hint={currentPlant.dataAiHint}
            width={200} 
            height={200} 
            className="object-cover"
            priority
          />
        </div>
        <Progress value={growthLevel} className="mb-2 h-3" />
        <p className="text-sm text-muted-foreground">Growth: {growthLevel}%</p>
      </CardContent>
      <CardFooter className="flex justify-center space-x-2">
        <Button onClick={waterPlant} disabled={growthLevel === MAX_GROWTH} aria-label="Water plant">
          <Droplet className="mr-2 h-5 w-5" />
          Water
        </Button>
        {growthLevel > 0 && (
          <Button onClick={resetPlant} variant="outline" aria-label="Reset plant growth">
            Reset
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PlantTracker;
