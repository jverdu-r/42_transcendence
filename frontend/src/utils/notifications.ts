// Sistema de notificaciones internas de la web

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationOptions {
  type?: NotificationType;
  duration?: number;
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';
}

/**
 * Muestra una notificación elegante dentro de la web
 */
export function showNotification(
  message: string,
  options: NotificationOptions = {}
): void {
  const {
    type = 'info',
    duration = 4000,
    position = 'top-right'
  } = options;

  // Limpiar notificaciones anteriores del mismo tipo
  document.querySelectorAll('.custom-notification').forEach(n => {
    if (n.classList.contains(`notification-${type}`)) {
      n.remove();
    }
  });

  // Crear contenedor de notificación
  const notification = document.createElement('div');
  notification.className = `custom-notification notification-${type} notification-${position}`;

  // Iconos según el tipo
  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  // Colores según el tipo
  const colors = {
    success: 'bg-green-500 border-green-400',
    error: 'bg-red-500 border-red-400',
    info: 'bg-blue-500 border-blue-400',
    warning: 'bg-yellow-500 border-yellow-400'
  };

  // Posiciones
  const positions = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  notification.className = `
    custom-notification
    fixed ${positions[position]}
    z-[9999]
    min-w-[300px] max-w-md
    p-4 rounded-lg shadow-2xl
    ${colors[type]}
    text-white border-2
    transform transition-all duration-300
    animate-slide-in
  `.trim().replace(/\s+/g, ' ');

  notification.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-2xl flex-shrink-0">${icons[type]}</span>
      <div class="flex-1">
        <p class="text-sm font-medium leading-relaxed break-words">${message}</p>
      </div>
      <button class="notification-close flex-shrink-0 text-white hover:text-gray-200 transition-colors ml-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;

  // Agregar estilos de animación si no existen
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slide-in {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slide-out {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
      
      .animate-slide-in {
        animation: slide-in 0.3s ease-out forwards;
      }
      
      .animate-slide-out {
        animation: slide-out 0.3s ease-in forwards;
      }
      
      .notification-top-center.animate-slide-in {
        animation: slide-in-center 0.3s ease-out forwards;
      }
      
      @keyframes slide-in-center {
        from {
          opacity: 0;
          transform: translate(-50%, -100%);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Agregar al DOM
  document.body.appendChild(notification);

  // Función para cerrar la notificación
  const closeNotification = () => {
    notification.classList.remove('animate-slide-in');
    notification.classList.add('animate-slide-out');
    setTimeout(() => {
      notification.remove();
    }, 300);
  };

  // Botón de cerrar
  const closeBtn = notification.querySelector('.notification-close');
  closeBtn?.addEventListener('click', closeNotification);

  // Auto-cerrar después de la duración especificada
  if (duration > 0) {
    setTimeout(closeNotification, duration);
  }
}

/**
 * Atajos para tipos específicos de notificaciones
 */
export const notify = {
  success: (message: string, duration?: number) => 
    showNotification(message, { type: 'success', duration }),
  
  error: (message: string, duration?: number) => 
    showNotification(message, { type: 'error', duration }),
  
  info: (message: string, duration?: number) => 
    showNotification(message, { type: 'info', duration }),
  
  warning: (message: string, duration?: number) => 
    showNotification(message, { type: 'warning', duration })
};
