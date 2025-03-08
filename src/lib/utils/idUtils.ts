import { useRef } from 'react';

let globalCounter = 0;

export const useStableId = (prefix: string = 'id') => {
  const counterRef = useRef<number | null>(null);
  
  if (counterRef.current === null) {
    globalCounter += 1;
    counterRef.current = globalCounter;
  }
  
  return `${prefix}-${counterRef.current}`;
};

export const generateStableId = (prefix: string = 'id') => {
  globalCounter += 1;
  return `${prefix}-${globalCounter}`;
}; 