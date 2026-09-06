# AUSTRAL: Ruta 404

Juego estático de exploración y extracción. Canvas 2D, JavaScript nativo, sin dependencias ni peticiones externas. Los recursos se resuelven con rutas relativas y funcionan en `/ruta-404/`.

## Jugar localmente

Desde esta carpeta: `python -m http.server 5204 --bind 127.0.0.1`, luego abrir `http://127.0.0.1:5204/`.

WASD/flechas: movimiento. Espacio: pulso. E: extracción cerca del nodo. Escape: pausa. Controles táctiles en pantallas de hasta 700 px. El archivo y el récord se guardan en el navegador; si el almacenamiento no está disponible, siguen funcionando durante la sesión. Cambiar entre HTTP, HTTPS o www crea un archivo local separado por origen.

## Publicación

La carpeta vive dentro del sitio `indice`, repo `kvothesson/kvothesson.github.io`. Publicar estos archivos en la rama `main` sirve `/ruta-404/` mediante GitHub Pages. No requiere cambios DNS, CNAME, servidores ni build. No copiar credenciales ni archivos del workspace al sitio.

## Diseño y balance inicial

180 segundos, 4 memorias por expedición, 12 fragmentos recuperables. Cada pulso revela durante 3,4 segundos, recarga durante 4,5 segundos y suma 24 de actividad. La actividad disminuye 1,6 por segundo. El Pombero aparece desde 60 y se retira debajo de 28. Auri es más rápida que él. Los píxeles muertos se ven de cerca o con pulso; Luz Mala se confunde con una memoria hasta que se revela. Las memorias pendientes se priorizan cerca del inicio. Puntaje: carga × 250 + integridad × 2 + segundos restantes.

Canon: entidades y textos derivados del skill Kvothesson. La expedición del Litoral en 2074 y las reglas jugables son una adaptación nueva, no un episodio previamente canonizado. No se revela el Verbo. Sonido sintetizado opcional, sin música externa. Pausa automática al perder foco; modo de movimiento reducido respeta el sistema.

## Verificación

`node --test ../games/ruta-404-tests/engine.test.mjs` desde `indice` (o ejecutar el archivo de tests desde el workspace). La lógica está separada en `engine.mjs` para comprobar extracción, daño, tiempo, persecución y persistencia sin navegador.
