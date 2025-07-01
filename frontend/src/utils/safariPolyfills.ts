// Safari compatibility polyfills and fixes

// Safari WebSocket compatibility
export function initSafariWebSocketFixes() {
  // Safari sometimes doesn't properly handle WebSocket close events
  const originalWebSocket = window.WebSocket;
  
  window.WebSocket = class extends originalWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      // Convert to secure WebSocket for Safari if on HTTPS
      let wsUrl = url.toString();
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'wss://');
      }
      
      super(wsUrl, protocols);
      
      // Safari fix: ensure proper close handling
      this.addEventListener('close', (event) => {
        // Safari sometimes doesn't fire close events properly
        if (this.readyState !== WebSocket.CLOSED) {
          setTimeout(() => {
            if (this.readyState !== WebSocket.CLOSED) {
              const closeEvent = new CloseEvent('close', {
                code: 1006,
                reason: 'Safari forced close',
                wasClean: false
              });
              this.dispatchEvent(closeEvent);
            }
          }, 100);
        }
      });
    }
  } as any;
}

// Safari localStorage fixes
export function initSafariStorageFixes() {
  try {
    // Test localStorage availability (Safari private mode blocks it)
    const test = 'safariTest';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
  } catch (e) {
    // Fallback to memory storage for Safari private mode
    const memoryStorage: { [key: string]: string } = {};
    
    (window as any).localStorage = {
      getItem: (key: string) => memoryStorage[key] || null,
      setItem: (key: string, value: string) => { memoryStorage[key] = value; },
      removeItem: (key: string) => { delete memoryStorage[key]; },
      clear: () => { Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]); },
      length: 0,
      key: (index: number) => Object.keys(memoryStorage)[index] || null
    };
  }
}

// Safari audio context fixes
export function initSafariAudioFixes() {
  // Safari requires user interaction before audio context
  const enableAudio = () => {
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const context = new AudioContext();
        context.resume?.();
      }
    } catch (e) {
      console.warn('Audio context not available:', e);
    }
  };

  // Add click listener to enable audio on first interaction
  document.addEventListener('click', enableAudio, { once: true });
  document.addEventListener('touchstart', enableAudio, { once: true });
}

// Safari canvas fixes
export function initSafariCanvasFixes() {
  // Safari sometimes has issues with canvas context
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  
  (HTMLCanvasElement.prototype as any).getContext = function(contextType: string, contextAttributes?: any) {
    const context = originalGetContext.call(this, contextType, contextAttributes);
    
    if (contextType === '2d' && context) {
      // Safari canvas optimization
      (context as any).imageSmoothingEnabled = false;
      (context as any).webkitImageSmoothingEnabled = false;
      (context as any).mozImageSmoothingEnabled = false;
      (context as any).msImageSmoothingEnabled = false;
    }
    
    return context;
  };
}

// Safari touch event fixes
export function initSafariTouchFixes() {
  // Prevent default touch behaviors that interfere with game
  document.addEventListener('touchstart', (e) => {
    if ((e.target as HTMLElement).closest('canvas') || 
        (e.target as HTMLElement).closest('.game-container')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if ((e.target as HTMLElement).closest('canvas') || 
        (e.target as HTMLElement).closest('.game-container')) {
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if ((e.target as HTMLElement).closest('canvas') || 
        (e.target as HTMLElement).closest('.game-container')) {
      e.preventDefault();
    }
  }, { passive: false });
}

// Safari requestAnimationFrame fixes
export function initSafariAnimationFixes() {
  // Safari sometimes doesn't have requestAnimationFrame
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      return window.setTimeout(callback, 1000 / 60);
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => {
      window.clearTimeout(id);
    };
  }
}

// Safari fetch API fixes
export function initSafariFetchFixes() {
  // Safari has some issues with fetch and AbortController
  if (!window.AbortController) {
    (window as any).AbortController = class {
      signal = { aborted: false };
      abort() {
        this.signal.aborted = true;
      }
    };
  }
}

// Safari viewport fixes
export function initSafariViewportFixes() {
  // Safari viewport height fix
  const setViewportHeight = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
  });
}

// Safari performance fixes
export function initSafariPerformanceFixes() {
  // Safari memory management
  if (typeof window !== 'undefined') {
    // Garbage collection hints for Safari
    setInterval(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    }, 30000);
  }
}

// Initialize all Safari fixes
export function initSafariCompatibility() {
  console.log('🍎 Initializing Safari compatibility fixes...');
  
  try {
    initSafariWebSocketFixes();
    initSafariStorageFixes();
    initSafariAudioFixes();
    initSafariCanvasFixes();
    initSafariTouchFixes();
    initSafariAnimationFixes();
    initSafariFetchFixes();
    initSafariViewportFixes();
    initSafariPerformanceFixes();
    
    console.log('✅ Safari compatibility fixes initialized');
  } catch (error) {
    console.error('❌ Error initializing Safari fixes:', error);
  }
}

// Safari detection
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

// iOS Safari detection
export function isIOSSafari(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

