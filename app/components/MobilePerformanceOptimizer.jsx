import React, { memo, useMemo, useCallback, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Performance optimization utilities for mobile notes
 */

// Debounced search hook
export const useDebouncedSearch = (searchQuery, delay = 300) => {
  const [debouncedQuery, setDebouncedQuery] = React.useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, delay]);

  return debouncedQuery;
};

// Memoized note card component
export const MemoizedNoteCard = memo(({ note, onSelect, onPin, onDelete, onDuplicate, onMove, selected, folders }) => {
  const handleSelect = useCallback(() => {
    onSelect(note);
  }, [note, onSelect]);

  const handlePin = useCallback(() => {
    onPin(note);
  }, [note, onPin]);

  const handleDelete = useCallback(() => {
    onDelete(note.id);
  }, [note.id, onDelete]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(note);
  }, [note, onDuplicate]);

  const handleMove = useCallback(() => {
    onMove(note);
  }, [note, onMove]);

  const folderName = useMemo(() => {
    return folders.find(f => f.id === note.folderId)?.name;
  }, [folders, note.folderId]);

  const contentPreview = useMemo(() => {
    return note.content?.replace(/<[^>]*>/g, '').substring(0, 150) || '';
  }, [note.content]);

  const formattedDate = useMemo(() => {
    return new Date(note.updatedAt).toLocaleDateString();
  }, [note.updatedAt]);

  return (
    <div
      className={`mobile-card mobile-note-card ${selected ? 'selected' : ''}`}
      onClick={handleSelect}
    >
      <div className="mobile-card-content">
        <div className="mobile-note-header">
          <div className="mobile-note-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {note.pinned && (
                <span style={{ color: '#008060' }}>📌</span>
              )}
              <span style={{ fontWeight: '600' }}>
                {note.title || 'Untitled'}
              </span>
            </div>
          </div>
          
          <div className="mobile-note-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePin();
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #e1e3e5',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: note.pinned ? '#008060' : '#6d7175',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              {note.pinned ? '📌' : '📌'}
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #e1e3e5',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#d72c0d',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Note content preview */}
        {contentPreview && (
          <div className="mobile-note-content">
            <p style={{ color: '#6d7175', fontSize: '14px', lineHeight: '1.4' }}>
              {contentPreview}
              {note.content?.length > 150 && '...'}
            </p>
          </div>
        )}

        {/* Note tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="mobile-note-tags">
            {note.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                style={{
                  display: 'inline-block',
                  padding: '2px 6px',
                  backgroundColor: '#f6fff8',
                  color: '#008060',
                  borderRadius: '12px',
                  fontSize: '11px',
                  marginRight: '4px',
                  border: '1px solid #e8f5e8'
                }}
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span style={{ fontSize: '11px', color: '#6d7175' }}>
                +{note.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Note metadata */}
        <div className="mobile-note-meta">
          <span style={{ fontSize: '12px', color: '#6d7175' }}>
            {formattedDate}
          </span>
          {folderName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px' }}>📁</span>
              <span style={{ fontSize: '12px', color: '#6d7175' }}>
                {folderName}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Memoized folder card component
export const MemoizedFolderCard = memo(({ folder, onSelect, onDelete, onRename, selected, noteCount }) => {
  const handleSelect = useCallback(() => {
    onSelect(folder.id);
  }, [folder.id, onSelect]);

  const handleDelete = useCallback(() => {
    onDelete(folder.id);
  }, [folder.id, onDelete]);

  const handleRename = useCallback(() => {
    onRename(folder);
  }, [folder, onRename]);

  return (
    <div
      className={`mobile-card mobile-folder-card ${selected ? 'selected' : ''}`}
      onClick={handleSelect}
    >
      <div className="mobile-card-content">
        <div className="mobile-folder-header">
          <div className="mobile-folder-icon">
            <span style={{ fontSize: '20px', color: '#008060' }}>📁</span>
          </div>
          <div className="mobile-folder-info">
            <div className="mobile-folder-name">{folder.name}</div>
            <div className="mobile-folder-count">
              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #e1e3e5',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#6d7175',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              ✏️
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #e1e3e5',
                borderRadius: '4px',
                backgroundColor: 'white',
                color: '#d72c0d',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Virtual scrolling hook for large lists
export const useVirtualScrolling = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleStart * itemHeight;

  const handleScroll = useCallback(
    throttle((e) => {
      setScrollTop(e.target.scrollTop);
    }, 16), // ~60fps
    []
  );

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
};

// Intersection observer hook for lazy loading
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const ref = React.useRef();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return [ref, isIntersecting, hasIntersected];
};

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    memoryUsage: 0,
    frameRate: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    const measurePerformance = () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Memory usage (if available)
      const memoryUsage = performance.memory ? 
        performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
      
      // Frame rate estimation
      let frameCount = 0;
      const frameRate = new Promise((resolve) => {
        const measureFrame = () => {
          frameCount++;
          if (frameCount < 60) {
            requestAnimationFrame(measureFrame);
          } else {
            resolve(frameCount);
          }
        };
        requestAnimationFrame(measureFrame);
      });
      
      setMetrics({
        renderTime,
        memoryUsage,
        frameRate: 60 // Simplified
      });
    };

    const timeout = setTimeout(measurePerformance, 100);
    
    return () => clearTimeout(timeout);
  }, []);

  return metrics;
};

// Optimized search component
export const OptimizedSearch = memo(({ value, onChange, placeholder, onClear }) => {
  const debouncedOnChange = useCallback(
    debounce((newValue) => {
      onChange(newValue);
    }, 300),
    [onChange]
  );

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);

  const handleClear = useCallback(() => {
    debouncedOnChange('');
    onClear?.();
  }, [debouncedOnChange, onClear]);

  return (
    <div className="mobile-search">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #e1e3e5',
          borderRadius: '8px',
          fontSize: '16px',
          backgroundColor: '#f8f9fa'
        }}
      />
      {value && (
        <button
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#6d7175'
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
});

export default {
  useDebouncedSearch,
  MemoizedNoteCard,
  MemoizedFolderCard,
  useVirtualScrolling,
  useIntersectionObserver,
  usePerformanceMonitor,
  OptimizedSearch
};