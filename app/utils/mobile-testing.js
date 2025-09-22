/**
 * Mobile testing utilities for the scriberr app
 * Provides tools for testing mobile functionality across different devices
 */

// Device simulation utilities
export const DEVICE_CONFIGS = {
  'iPhone SE': {
    width: 375,
    height: 667,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iPhone 12': {
    width: 390,
    height: 844,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iPhone 12 Pro Max': {
    width: 428,
    height: 926,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'Samsung Galaxy S21': {
    width: 384,
    height: 854,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
  },
  'iPad': {
    width: 768,
    height: 1024,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iPad Pro': {
    width: 1024,
    height: 1366,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
  }
};

// Mobile feature detection
export const detectMobileFeatures = () => {
  const features = {
    // Touch support
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    
    // Device orientation
    orientation: window.screen?.orientation?.type || 'unknown',
    
    // Viewport dimensions
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    
    // Screen dimensions
    screen: {
      width: window.screen?.width || 0,
      height: window.screen?.height || 0,
      pixelRatio: window.devicePixelRatio || 1
    },
    
    // Browser capabilities
    browser: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    },
    
    // Performance
    performance: {
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      timing: performance.timing ? {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
      } : null
    },
    
    // Accessibility
    accessibility: {
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
      prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
    }
  };
  
  return features;
};

// Mobile testing scenarios
export const MOBILE_TEST_SCENARIOS = [
  {
    name: 'Basic Navigation',
    description: 'Test basic mobile navigation between sections',
    steps: [
      'Navigate to folders section',
      'Navigate to notes section', 
      'Navigate to editor section',
      'Verify smooth transitions'
    ]
  },
  {
    name: 'Note Creation',
    description: 'Test creating a new note on mobile',
    steps: [
      'Tap "New Note" button',
      'Enter note title',
      'Enter note content',
      'Select folder',
      'Save note',
      'Verify note appears in list'
    ]
  },
  {
    name: 'Note Editing',
    description: 'Test editing existing notes',
    steps: [
      'Tap on a note card',
      'Verify editor opens',
      'Modify note content',
      'Save changes',
      'Verify changes are reflected'
    ]
  },
  {
    name: 'Search Functionality',
    description: 'Test search functionality on mobile',
    steps: [
      'Enter search query',
      'Verify results filter correctly',
      'Clear search',
      'Verify all notes return'
    ]
  },
  {
    name: 'Touch Gestures',
    description: 'Test touch gesture interactions',
    steps: [
      'Test tap interactions',
      'Test swipe gestures',
      'Test long press actions',
      'Verify gesture responsiveness'
    ]
  },
  {
    name: 'Performance',
    description: 'Test mobile performance',
    steps: [
      'Load app with many notes',
      'Test scrolling performance',
      'Test search responsiveness',
      'Monitor memory usage'
    ]
  }
];

// Performance monitoring
export const createPerformanceMonitor = () => {
  const metrics = {
    renderTimes: [],
    memoryUsage: [],
    frameRates: [],
    networkRequests: []
  };
  
  // Monitor render times
  const measureRenderTime = (componentName) => {
    const start = performance.now();
    
    return () => {
      const end = performance.now();
      const renderTime = end - start;
      metrics.renderTimes.push({
        component: componentName,
        time: renderTime,
        timestamp: Date.now()
      });
    };
  };
  
  // Monitor memory usage
  const measureMemory = () => {
    if (performance.memory) {
      metrics.memoryUsage.push({
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        timestamp: Date.now()
      });
    }
  };
  
  // Monitor frame rate
  const measureFrameRate = () => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrames = (currentTime) => {
      frameCount++;
      
      if (currentTime - lastTime >= 1000) {
        metrics.frameRates.push({
          fps: frameCount,
          timestamp: Date.now()
        });
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(countFrames);
    };
    
    requestAnimationFrame(countFrames);
  };
  
  // Network monitoring
  const monitorNetwork = () => {
    const originalFetch = window.fetch;
    
    window.fetch = (...args) => {
      const start = performance.now();
      
      return originalFetch(...args).then(response => {
        const end = performance.now();
        metrics.networkRequests.push({
          url: args[0],
          duration: end - start,
          timestamp: Date.now(),
          status: response.status
        });
        
        return response;
      });
    };
  };
  
  return {
    metrics,
    measureRenderTime,
    measureMemory,
    measureFrameRate,
    monitorNetwork,
    getReport: () => ({
      ...metrics,
      summary: {
        avgRenderTime: metrics.renderTimes.reduce((sum, m) => sum + m.time, 0) / metrics.renderTimes.length,
        avgMemoryUsage: metrics.memoryUsage.reduce((sum, m) => sum + m.used, 0) / metrics.memoryUsage.length,
        avgFrameRate: metrics.frameRates.reduce((sum, m) => sum + m.fps, 0) / metrics.frameRates.length,
        totalRequests: metrics.networkRequests.length
      }
    })
  };
};

// Mobile testing checklist
export const MOBILE_TEST_CHECKLIST = [
  {
    category: 'Layout & Design',
    items: [
      'All content is visible and accessible',
      'Text is readable without zooming',
      'Buttons are large enough for touch (44px minimum)',
      'Navigation is intuitive and consistent',
      'Loading states are clear and informative',
      'Error states provide helpful feedback'
    ]
  },
  {
    category: 'Performance',
    items: [
      'App loads quickly on mobile networks',
      'Scrolling is smooth and responsive',
      'Search results appear quickly',
      'Memory usage is reasonable',
      'No memory leaks detected',
      'Battery usage is optimized'
    ]
  },
  {
    category: 'Accessibility',
    items: [
      'Screen reader compatibility',
      'Keyboard navigation works',
      'High contrast mode support',
      'Reduced motion preferences respected',
      'Touch targets meet accessibility guidelines',
      'Color contrast meets WCAG standards'
    ]
  },
  {
    category: 'Functionality',
    items: [
      'All features work on mobile',
      'Data persistence works correctly',
      'Offline functionality (if applicable)',
      'Cross-platform consistency',
      'Error handling is robust',
      'User feedback is clear and timely'
    ]
  }
];

// Device-specific testing
export const testOnDevice = async (deviceConfig) => {
  const results = {
    device: deviceConfig.name,
    timestamp: new Date().toISOString(),
    tests: []
  };
  
  // Simulate device viewport
  const originalViewport = {
    width: window.innerWidth,
    height: window.innerHeight
  };
  
  // Mock viewport size (in real testing, this would be done through browser dev tools)
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: deviceConfig.width
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: deviceConfig.height
  });
  
  // Mock user agent
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    configurable: true,
    value: deviceConfig.userAgent
  });
  
  // Run tests
  for (const scenario of MOBILE_TEST_SCENARIOS) {
    try {
      const testResult = await runTestScenario(scenario);
      results.tests.push({
        scenario: scenario.name,
        status: 'passed',
        result: testResult
      });
    } catch (error) {
      results.tests.push({
        scenario: scenario.name,
        status: 'failed',
        error: error.message
      });
    }
  }
  
  // Restore original viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: originalViewport.width
  });
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: originalViewport.height
  });
  
  return results;
};

// Mock test scenario runner
const runTestScenario = async (scenario) => {
  // In a real implementation, this would run actual tests
  // For now, we'll simulate test execution
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        duration: Math.random() * 1000,
        steps: scenario.steps.length,
        passed: Math.random() > 0.1 // 90% pass rate simulation
      });
    }, 100);
  });
};

// Generate testing report
export const generateTestingReport = (results) => {
  const report = {
    summary: {
      totalTests: results.length,
      passed: results.filter(r => r.tests.every(t => t.status === 'passed')).length,
      failed: results.filter(r => r.tests.some(t => t.status === 'failed')).length,
      totalScenarios: results.reduce((sum, r) => sum + r.tests.length, 0)
    },
    devices: results.map(r => ({
      name: r.device,
      passed: r.tests.filter(t => t.status === 'passed').length,
      failed: r.tests.filter(t => t.status === 'failed').length
    })),
    details: results
  };
  
  return report;
};

export default {
  DEVICE_CONFIGS,
  detectMobileFeatures,
  MOBILE_TEST_SCENARIOS,
  createPerformanceMonitor,
  MOBILE_TEST_CHECKLIST,
  testOnDevice,
  generateTestingReport
};