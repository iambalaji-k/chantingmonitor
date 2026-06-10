import React, { useRef, useState, useEffect } from 'react';

interface ScrollPickerProps {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
}

export const ScrollPicker: React.FC<ScrollPickerProps> = ({ min, max, value, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<number[]>([]);
  const ITEM_HEIGHT = 40;

  useEffect(() => {
    const arr = [];
    for (let i = min; i <= max; i++) {
      arr.push(i);
    }
    setItems(arr);
  }, [min, max]);

  // Handle scroll snap detection
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const selectedIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const selectedVal = min + selectedIndex;
    
    if (selectedVal >= min && selectedVal <= max && selectedVal !== value) {
      onChange(selectedVal);
    }
  };

  // Scroll to current value on mount or when value changes externally
  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;
    
    const index = value - min;
    const targetScrollTop = index * ITEM_HEIGHT;
    
    // Only scroll if there's a significant difference and we aren't currently scrolling
    if (Math.abs(containerRef.current.scrollTop - targetScrollTop) > 2) {
      containerRef.current.scrollTop = targetScrollTop;
    }
  }, [value, items, min]);

  const handleItemClick = (item: number) => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: (item - min) * ITEM_HEIGHT,
        behavior: 'smooth'
      });
    }
    onChange(item);
  };

  return (
    <div 
      className="scroll-picker" 
      ref={containerRef} 
      onScroll={handleScroll}
      style={{
        scrollSnapType: 'y mandatory',
      }}
    >
      {/* Spacer padding so top items can align to center */}
      <div style={{ height: '40px', flexShrink: 0 }} />
      
      {items.map((item) => (
        <div
          key={item}
          className={`scroll-picker-item ${item === value ? 'selected' : ''}`}
          style={{
            scrollSnapAlign: 'center',
            flexShrink: 0,
          }}
          onClick={() => handleItemClick(item)}
        >
          {item}
        </div>
      ))}
      
      {/* Spacer padding so bottom items can align to center */}
      <div style={{ height: '40px', flexShrink: 0 }} />
    </div>
  );
};
