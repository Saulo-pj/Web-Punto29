# Base de datos local del proyecto

El servidor local de Vite (`npm run dev` o `npm run preview`) ofrece `/api/floor-layouts` y `/api/site-content` en la base SQLite `Client/data/floor-layouts.sqlite`. Requiere Node con `node:sqlite` (Node 26).

En desarrollo, las mesas y el contenido del sitio se guardan en SQLite; el navegador conserva una copia de los planos para la vista de reservas. El CMS guarda textos, imágenes, recomendaciones, chefs, horarios y diapositivas de Happy Hour. Las imágenes subidas se almacenan como datos de imagen en SQLite y cada archivo puede pesar hasta 2 MB. El carrusel requiere al menos tres diapositivas.

La lectura del contenido funciona desde la red local; las escrituras del CMS y del plano solo se aceptan desde la computadora que ejecuta Vite y con el mismo origen. Abre el administrador en `http://localhost:5173/admin/mesas` para guardar. Conserva y respalda la carpeta `data` al mover o reinstalar el proyecto. La base no se incluye en Git ni en `dist`. Un alojamiento de archivos estáticos por sí solo no ejecuta la API: para publicar, se necesita un servidor persistente y autenticación de administradores.
