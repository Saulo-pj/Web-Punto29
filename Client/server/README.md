# Base de datos del plano

El servidor de Vite (`npm run dev` o `npm run preview`) ofrece `/api/floor-layouts` y utiliza SQLite en `Client/data/floor-layouts.sqlite`. Requiere Node con `node:sqlite` (el entorno actual usa Node 26).

Al iniciar, se migran los pisos guardados en el navegador únicamente si todavía no existen en la base. Después, la base es la fuente principal y el navegador conserva una copia para la vista. Guardar confirma éxito después de escribir en SQLite. Posición, rotación, dimensiones y mesas añadidas se conservan.

Conserva y respalda la carpeta `data` al mover o reinstalar el proyecto. La base no se incluye en Git ni en `dist`. Un alojamiento de archivos estáticos por sí solo no ejecuta la API: para publicar, se necesita un servidor persistente y autenticación de administradores. La API actual permite escrituras solo desde la máquina local y rechaza otros orígenes.
