# Índice

Una sola página con todo lo publicado: las GitHub Pages que corren y los videos
del canal, agrupados por **obsesión** y no por fecha.

La apuesta es que el material ya viene agrupado y una grilla cronológica lo
desperdicia: 48 repos no son 48 proyectos y 337 videos no son 337 ideas. Son
seis obsesiones intentadas muchas veces.

## Correrlo

```bash
python -m http.server 5199 --directory indice
```

No hay build. HTML, CSS y JS vanilla; los datos salen de `data/catalogo.json`.

## Regenerar los datos

```bash
python indice/sync.py
```

Baja el canal por la YouTube Data API (usa el `token.pickle` de
`production/experimento_laberinto/`; si venció, se reautoriza en el browser) y
los repos con `gh api`. Escribe `data/catalogo.json` e imprime un resumen.

## La curaduría

Vive arriba de todo en `sync.py`, en `OBSESIONES`. Cada obsesión tiene:

| campo | qué es |
|---|---|
| `tesis` | la línea que se lee bajo el título |
| `detalle` | el párrafo de contexto, a la derecha |
| `pages` | repos con GitHub Pages que le pertenecen |
| `repos` | repos sin Pages que igual son parte del arco |
| `videos` | regex contra el título; se evalúan en orden, la primera que matchea gana |

Un video que no matchea ninguna regla **no entra**. Hoy entran 120 de 337: el
índice lista series, no archivo. Al final `sync.py` imprime los más vistos que
quedaron afuera, para que el descarte sea una decisión visible y no un olvido.

Para casos sueltos hay `FORZAR` (`{"videoId": "obsesion_id"}`) y `EXCLUIR`.

## Detalles del render

- **Las Pages se muestran corriendo.** Cada tarjeta monta un `iframe` real a
  1280×800 escalado, no una captura. Se montan al entrar en pantalla y se
  desmontan al salir, así no quedan diez apps con su render loop girando.
- **Los repos sin Pages llevan sello procedural**, derivado del nombre por
  hash: mismo nombre, mismo sello, siempre.
- **Teclado**: `/` enfoca el buscador, `Esc` limpia.

## Publicar

Pensado para `kvothesson.github.io` (user page, raíz). Los archivos de esta
carpeta van al root del repo.
