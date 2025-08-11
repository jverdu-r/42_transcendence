#!/bin/bash

# Función para detectar si un archivo es de texto
is_text_file() {
  file -b --mime-encoding "$1" | grep -q -v 'binary'
}

# Mostrar estructura de directorios (excluyendo .git, node_modules, styles y pages)
echo -e "\033[1;32m=== ESTRUCTURA DE DIRECTORIOS ===\033[0m"
tree -a -I '.git|node_modules' --dirsfirst

# Mostrar contenido de archivos de texto, ignorando .git, node_modules, styles y pages
echo -e "\n\033[1;32m=== CONTENIDO DE ARCHIVOS DE TEXTO ===\033[0m"
find . -type f \
  ! -path '*/.git/*' \
  ! -path '*/print-tree.sh' \
  ! -path '*/README.md' \
  ! -path '*/node_modules/*' \
  | while read -r file; do
    if is_text_file "$file"; then
      echo -e "\n\033[1;34m=== $file ===\033[0m"
      cat "$file"
      echo -e "\033[1;30m----------------------------------------\033[0m"
    else
      echo -e "\n\033[1;31m=== $file (archivo binario, omitido) ===\033[0m"
    fi
done



  # ! -path '*/.api-gateway/src/*' \
  # ! -path '*/.api-gateway/package.json' \
  # ! -path '*/.api-gateway/tsconfig.json' \
  # ! -path '*/.chat-service/src/*' \
  # ! -path '*/.chat-service/package.json' \
  # ! -path '*/.chat-service/tsconfig.json' \
  # ! -path '*/frontend/src/*' \
  # ! -path '*/frontend/package.json' \
  # ! -path '*/frontend/tailwind.config.js' \
  # ! -path '*/frontend/tsconfig.json' \
  # ! -path '*/frontend/webpack.config.js' \
  # ! -path '*/game-service/tsconfig.json' \
  # ! -path '*/game-service/package.json' \
  # ! -path '*/game-service/src/*' \