// src/components/starryBackground.ts

export function renderStarryBackground(containerId: string = 'app-root'): void {
	const container = document.getElementById(containerId);
	if (!container) {
	  console.error(`Contenedor con ID "${containerId}" no encontrado para el fondo estrellado.`);
	  return;
	}
  
	// Crea el contenedor para las estrellas
	const starryBackground = document.createElement('div');
	starryBackground.id = 'starry-background';
	starryBackground.style.position = 'fixed';
	starryBackground.style.top = '0';
	starryBackground.style.left = '0';
	starryBackground.style.width = '100%';
	starryBackground.style.height = '100%';
	starryBackground.style.overflow = 'hidden';
	starryBackground.style.zIndex = '-1'; // Asegura que esté detrás de todo
  
	// Genera estrellas
	const numberOfStars = 150; // Puedes ajustar este número
	for (let i = 0; i < numberOfStars; i++) {
	  const star = document.createElement('div');
	  star.className = 'star';
	  star.style.position = 'absolute';
	  star.style.backgroundColor = 'white';
	  star.style.borderRadius = '50%';
	  
	  // Tamaños aleatorios para las estrellas
	  const size = Math.random() * 2 + 0.5; // Entre 0.5px y 2.5px
	  star.style.width = `${size}px`;
	  star.style.height = `${size}px`;
  
	  // Posiciones aleatorias
	  star.style.left = `${Math.random() * 100}%`;
	  star.style.top = `${Math.random() * 100}%`;
  
	  // Animación de parpadeo (duración y retraso aleatorios)
	  star.style.animation = `twinkle ${Math.random() * 3 + 2}s infinite alternate ${Math.random() * 2}s`; // Duración entre 2s y 5s, retraso entre 0s y 2s
  
	  starryBackground.appendChild(star);
	}
  
	// Añade el fondo estrellado al contenedor especificado (por defecto 'app-root')
	container.appendChild(starryBackground);
  }
