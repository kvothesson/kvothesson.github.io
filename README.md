# kvothesson.github.io

Sitio raíz de kvothesson.com. Casi no tiene nada a propósito: cada proyecto vive
en su propio repo y GitHub Pages lo sirve en `kvothesson.com/<repo>/`.

| URL | Repo |
|---|---|
| /babel/ | [kvothesson/babel](https://github.com/kvothesson/babel) |
| /ruta-404/ | [kvothesson/ruta-404](https://github.com/kvothesson/ruta-404) |
| /el-gran-presidente/ | [kvothesson/el-gran-presidente](https://github.com/kvothesson/el-gran-presidente) |
| /ar-plugins/ | [kvothesson/ar-plugins](https://github.com/kvothesson/ar-plugins) |
| /chasqui/ | [kvothesson/chasqui](https://github.com/kvothesson/chasqui) |
| /radio/ | [kvothesson/radio](https://github.com/kvothesson/radio) |

Lo que queda acá:

- `CNAME`: el dominio. Todas las project pages lo heredan.
- `index.html`: la landing, con una tarjeta por proyecto. Al sumar un proyecto, agregar su tarjeta.
- `robots.txt` y `sitemap.xml`: un solo sitemap para todo el dominio. Al sumar un proyecto, agregarlo ahí.
- `404.html`: además de la página de error, redirige las URLs viejas `/decretos/` y `/plugins/` a `/el-gran-presidente/` y `/ar-plugins/`, porque esos links ya circularon. Para sumar otra mudanza, agregarla en `MUDANZAS`.

Un proyecto nuevo no va en este repo: va en un repo propio con Pages activado.
