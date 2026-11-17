# Categorías y portada

El selector de categoría del producto incluye «Nueva categoría…»: muestra un campo de nombre y la categoría se registra después de guardar el producto correctamente (sin duplicados por mayúsculas o espacios). La sección «Categorías de la carta» permite renombrar categorías conservando su identificador y la asociación de todos sus productos, y eliminar categorías sin productos activos y subir una portada JPG/PNG/WebP de hasta 10 MB. Para quitar una categoría con productos, reasignarlos desde Editar o eliminarlos primero. La selección múltiple de productos se conserva.

Los ajustes se comparten entre dispositivos mediante la tabla existente `configuracion` (`clave`, `valor`):

- `menu_<RESTAURANT_ID>_categorias`: JSON con objetos `{id, nombre}`.
- `menu_<RESTAURANT_ID>_portada`: URL pública codificada como cadena JSON.

Cuando no existen estas filas, se mantienen las categorías originales y `fondo-real.jpg`. Las categorías nuevas se incorporan a los filtros y secciones de la carta. Las categorías antiguas con productos siguen visibles como protección ante configuraciones desactualizadas.

La portada se optimiza a WebP (máximo 1280 × 720, sin recortar ni ampliar imágenes pequeñas, hasta 150 KB ajustando calidad y dimensiones automáticamente) y se sube al bucket existente `img real`. Se usan nombres únicos y caché de un año para evitar descargas repetidas y caché antigua al cambiar la foto. La optimización ocurre antes de subir la imagen; no modifica las portadas ya guardadas. La foto anterior se conserva para no romper referencias; una subida cuya configuración no logra guardarse intenta limpiarse.

## Permisos de Supabase

No se modificaron políticas ni datos del restaurante. Antes de usarlo en producción, comprobar con una cuenta administradora que las políticas existentes permiten:

- Lectura pública de las dos claves de configuración de este restaurante.
- INSERT y UPDATE de esas claves únicamente para administradores autorizados del restaurante.
- Subida de imágenes al bucket `img real` para esos administradores y lectura pública de las imágenes.

Mantener RLS habilitado. No conceder escrituras a usuarios anónimos ni usar una clave de servicio en el navegador. Si las políticas bloquean una operación, el panel muestra el error sin confirmar un guardado inexistente. No se presume que cualquier usuario autenticado sea administrador.

## Pruebas locales

Con Node.js, Playwright y Chromium disponibles:

```sh
python3 -m http.server 8000 --bind 0.0.0.0 --directory /workspace/el-real
# En otra terminal:
node tests/admin-settings.cjs
```

El test intercepta Supabase y recursos externos; no escribe en producción. Comprueba creación desde el producto, cambio de nombre con identificador estable, duplicados, protección de categorías ocupadas, eliminación de categorías vacías, persistencia y visualización de portada/categorías en la carta, selección de productos y ancho móvil. La autorización real de Supabase debe verificarse por separado con la cuenta administradora.
