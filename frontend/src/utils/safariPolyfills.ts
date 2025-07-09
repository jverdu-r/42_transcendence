// src/utils/safariPolyfills.ts

/**
 * Detecta si el navegador es Safari
 */
export function isSafari(): boolean {
    return /constructor/i.test(window.HTMLElement.toString()) || 
           (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!((window as any).safari) || (typeof (window as any).safari !== 'undefined' && (window as any).safari.pushNotification));
}

/**
 * Detecta si es Safari en iOS
 */
export function isIOSSafari(): boolean {
    const ua = window.navigator.userAgent;
    const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
    const webkit = !!ua.match(/WebKit/i);
    const iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
    return iOSSafari;
}

/**
 * Inicializa correcciones de compatibilidad para Safari
 */
export function initSafariCompatibility(): void {
    if (isSafari() || isIOSSafari()) {
        // Evitar zoom en inputs en iOS Safari
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                // Temporal para evitar el zoom
                const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
                if (viewport) {
                    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                }
            });
            
            input.addEventListener('blur', () => {
                // Restaurar zoom después del focus
                const viewport = document.querySelector('meta[name=viewport]') as HTMLMetaElement;
                if (viewport) {
                    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
                }
            });
        });

        // Fix para la altura del viewport en Safari móvil
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };

        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });

        console.log('🍎 Safari compatibility fixes applied');
    }
}
