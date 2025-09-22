import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Accessibility enhancements for mobile notes
 */

// Keyboard navigation hook
export const useKeyboardNavigation = (items, onSelect) => {
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const containerRef = useRef();

  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          onSelect(items[focusedIndex]);
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        containerRef.current?.blur();
        break;
    }
  }, [items, focusedIndex, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      container.setAttribute('tabindex', '0');
      container.setAttribute('role', 'listbox');
      
      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown]);

  return { focusedIndex, containerRef };
};

// Screen reader announcements
export const useScreenReaderAnnouncements = () => {
  const announceRef = useRef();

  const announce = useCallback((message, priority = 'polite') => {
    if (announceRef.current) {
      announceRef.current.textContent = message;
      announceRef.current.setAttribute('aria-live', priority);
    }
  }, []);

  useEffect(() => {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
    
    announceRef.current = liveRegion;
    
    return () => {
      document.body.removeChild(liveRegion);
    };
  }, []);

  return announce;
};

// Focus management hook
export const useFocusManagement = () => {
  const previousFocusRef = useRef();
  const focusableElementsRef = useRef([]);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
      previousFocusRef.current.focus();
    }
  }, []);

  const trapFocus = useCallback((container) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElementsRef.current = Array.from(focusableElements);
    
    const firstElement = focusableElementsRef.current[0];
    const lastElement = focusableElementsRef.current[focusableElementsRef.current.length - 1];

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return { saveFocus, restoreFocus, trapFocus };
};

// Touch gesture accessibility
export const useTouchGestures = () => {
  const [gestureState, setGestureState] = React.useState({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isDragging: false
  });

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setGestureState({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: true
    });
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (gestureState.isDragging) {
      const touch = e.touches[0];
      setGestureState(prev => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY
      }));
    }
  }, [gestureState.isDragging]);

  const handleTouchEnd = useCallback(() => {
    setGestureState(prev => ({
      ...prev,
      isDragging: false
    }));
  }, []);

  const getSwipeDirection = useCallback(() => {
    const deltaX = gestureState.currentX - gestureState.startX;
    const deltaY = gestureState.currentY - gestureState.startY;
    
    const minSwipeDistance = 50;
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      return deltaX > 0 ? 'right' : 'left';
    } else if (Math.abs(deltaY) > minSwipeDistance) {
      return deltaY > 0 ? 'down' : 'up';
    }
    
    return null;
  }, [gestureState]);

  return {
    gestureState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getSwipeDirection
  };
};

// High contrast mode detection
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = React.useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      const mediaQuery = window.matchMedia('(prefers-contrast: high)');
      setIsHighContrast(mediaQuery.matches);
    };

    checkHighContrast();
    
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = () => checkHighContrast();
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isHighContrast;
};

// Reduced motion detection
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  useEffect(() => {
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
    };

    checkReducedMotion();
    
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => checkReducedMotion();
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
};

// Accessible button component
export const AccessibleButton = React.memo(({ 
  children, 
  onClick, 
  onKeyDown,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  className = '',
  style = {},
  ...props 
}) => {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!disabled) {
        onClick?.(e);
      }
    }
    onKeyDown?.(e);
  }, [onClick, onKeyDown, disabled]);

  const buttonStyle = {
    ...style,
    ...(prefersReducedMotion && {
      transition: 'none'
    }),
    ...(isHighContrast && {
      border: '2px solid currentColor',
      backgroundColor: 'transparent'
    })
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      className={`accessible-button ${variant} ${size} ${className}`}
      style={buttonStyle}
      {...props}
    >
      {children}
    </button>
  );
});

// Accessible input component
export const AccessibleInput = React.memo(({ 
  value,
  onChange,
  placeholder,
  ariaLabel,
  ariaDescribedBy,
  ariaInvalid,
  error,
  type = 'text',
  className = '',
  style = {},
  ...props 
}) => {
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  const inputStyle = {
    ...style,
    ...(error && {
      borderColor: '#d72c0d',
      boxShadow: '0 0 0 1px #d72c0d'
    }),
    ...(isHighContrast && {
      border: '2px solid currentColor',
      backgroundColor: 'transparent'
    })
  };

  return (
    <div className="accessible-input-container">
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid || !!error}
        aria-errormessage={error ? errorId : undefined}
        className={`accessible-input ${className}`}
        style={inputStyle}
        {...props}
      />
      {error && (
        <div id={errorId} role="alert" className="error-message">
          {error}
        </div>
      )}
    </div>
  );
});

// Skip links component
export const SkipLinks = () => (
  <div className="skip-links">
    <a href="#main-content" className="skip-link">
      Skip to main content
    </a>
    <a href="#navigation" className="skip-link">
      Skip to navigation
    </a>
    <a href="#search" className="skip-link">
      Skip to search
    </a>
  </div>
);

// Loading state with accessibility
export const AccessibleLoadingState = ({ message = 'Loading...' }) => (
  <div 
    role="status" 
    aria-live="polite" 
    aria-label={message}
    className="accessible-loading"
  >
    <div className="loading-spinner" aria-hidden="true">
      <div className="spinner"></div>
    </div>
    <span className="loading-text">{message}</span>
  </div>
);

// Error state with accessibility
export const AccessibleErrorState = ({ 
  error, 
  onRetry,
  title = 'Something went wrong' 
}) => (
  <div 
    role="alert" 
    aria-live="assertive"
    className="accessible-error"
  >
    <h2 className="error-title">{title}</h2>
    <p className="error-message">{error}</p>
    {onRetry && (
      <AccessibleButton onClick={onRetry} variant="secondary">
        Try again
      </AccessibleButton>
    )}
  </div>
);

export default {
  useKeyboardNavigation,
  useScreenReaderAnnouncements,
  useFocusManagement,
  useTouchGestures,
  useHighContrastMode,
  useReducedMotion,
  AccessibleButton,
  AccessibleInput,
  SkipLinks,
  AccessibleLoadingState,
  AccessibleErrorState
};