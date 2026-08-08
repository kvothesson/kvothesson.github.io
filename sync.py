# -*- coding: utf-8 -*-
"""Regenera data/catalogo.json desde YouTube y GitHub.

    python sync.py

La curaduria vive arriba de todo, en OBSESIONES: cada obsesion tiene una tesis,
las Pages que le pertenecen y las reglas que capturan sus videos. Un video que
no matchea ninguna regla NO entra al indice; el canal tiene 345 videos y el
indice muestra series, no archivo. Al final se imprime que quedo afuera, para
que ese descarte sea una decision visible y no un olvido.
"""
import json
import pickle
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
REPO = AQUI.parent
CLIENT_SECRETS = REPO / "client_secret.json"
TOKEN = REPO / "production" / "experimento_laberinto" / "token.pickle"
CANAL = "UCubQ5dgtAK878M-lbDyoAuQ"
USUARIO = "kvothesson"
SALIDA = AQUI / "data" / "catalogo.json"

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

# ─── CURADURIA ───────────────────────────────────────────────────────────────
# `pages`  : repos con GitHub Pages que pertenecen a la obsesion.
# `repos`  : repos sin Pages que igual son parte del arco (se linkean a GitHub).
# `videos` : regex contra el titulo. Se evalua en orden, primera que matchea gana.

OBSESIONES = [
    {
        "id": "emergencia",
        "nombre": "EMERGENCIA",
        "tesis": "Dejar corriendo un sistema que nadie diseñó y mirar qué aparece.",
        "detalle": (
            "Bichos ciegos que negocian cuatro palabras sin que nadie se las enseñe, "
            "planetas que se ordenan solos. La regla es la misma: no se dibuja el "
            "resultado, se dibujan las condiciones y se espera."
        ),
        "pages": ["sistema-solar"],
        "repos": [],
        "videos": [
            r"^EL POZO",
            r"^EL PERMISO",
            r"^EL EXPERIMENTO",
        ],
    },
    {
        "id": "dato-duro",
        "nombre": "DATO DURO",
        "tesis": "La Argentina, medida. El dato existe y casi siempre contradice la intuición.",
        "detalle": (
            "Fuentes oficiales, INDEC por departamento, georef del IGN. Nada de "
            "estimaciones: si el número no se puede rastrear hasta una tabla "
            "pública, el video no se hace."
        ),
        "pages": [
            "argentina-oil-boom",
            "calculadora-firma-hipotecaria-uva-ar",
            "la-bola",
        ],
        "repos": [],
        "videos": [
            r"Si cavás derecho",
            r"^Ushuaia no es el fin",
            r"^El promedio miente",
            r"^El mediodía en Argentina",
            r"^Por qué se corta la luz",
            r"^LA LEY PRIMERA",
            r"^MALVINAS: El Nodo",
            r"^CEREBRO AUSTRAL: El Nodo",
            r"vendiera su FRÍO",
            r"hormigas argentinas",
        ],
    },
    {
        "id": "gran-presidente",
        "nombre": "EL GRAN PRESIDENTE",
        "tesis": "La historia argentina puesta a juicio por quien no puede opinar: falla.",
        "detalle": (
            "Tres temporadas más los cruces de San Martín con siete presidentes. "
            "El Gran Presidente no da opinión ni ranking: recibe el caso, aplica el "
            "criterio y falla."
        ),
        "pages": [],
        "repos": [],
        "videos": [
            r"El Gran Presidente",
            r"San Martín le respondió",
            r"San Martin le respondio",
            r"San Martín le recordó",
            r"San Martín cruzó",
            r"San Martín dejó",
            r"Le mostramos 7 presidentes",
            r"^CADENA NACIONAL",
        ],
    },
    {
        "id": "corpus",
        "nombre": "LEER UN CORPUS",
        "tesis": "Tirarle un montón de material a un modelo y quedarte con algo caminable.",
        "detalle": (
            "Siete intentos de la misma idea antes de entender que el problema nunca "
            "fue el modelo sino el formato. Estas cuatro son las que sobrevivieron: "
            "no son CLIs, son cosas que se abren y se recorren."
        ),
        "pages": ["anecdotas", "quipu", "OceaniDex", "lyra"],
        "repos": ["verbo", "ar-plugins"],
        "videos": [
            r"Indexó 279 Anécdotas",
            r"^EL STACK",
            r"^MYTHOS",
        ],
    },
    {
        "id": "austral",
        "nombre": "UNIVERSO AUSTRAL",
        "tesis": "Folklore argentino corriendo sobre fibra óptica. Ficción, terror y mitología.",
        "detalle": (
            "El Archivo Onírico, los dioses selknam del fin del mundo, el bestiario "
            "de la Ruta 404. En el terror la entidad no se dibuja: se dibuja el "
            "agujero que deja."
        ),
        "pages": ["kvothesson-game", "tajo"],
        "repos": ["pombero-exe"],
        "videos": [
            r"Archivo Onírico",
            r"^EL ARCHIVO ONÍRICO",
            r"^RUTA 404",
            r"^EL UNCIDO",
            r"^RENDOUS",
            r"^LA LUZ MALA",
            r"^CACHÓN",
            r"^TATU-NIL",
            r"^EL FRAGMENTADOR",
            r"^EL REFLEJO SONRÍE",
            r"^ALEPH",
            r"NODO USHUAIA",
            r"Dioses del Fin del Mundo",
            r"#HAIN",
            r"^HAIN",
            r"Tribus de 2030",
            r"RITUAL_404",
            r"^CERATI 2026",
            r"Cerati te habla",
            r"último adiós de Gustavo",
            r"ANIME EDITION",
            r"^Borges y Yo",
            r"Borges y Messi",
        ],
    },
    {
        "id": "musica",
        "nombre": "MÚSICA",
        "tesis": "Himnos para próceres y para dioses que no tuvieron banda de sonido.",
        "detalle": (
            "Zambas y chacareras para San Martín, Güemes y Belgrano; himnos en "
            "latín, griego antiguo y nórdico antiguo. Todo generado, todo con "
            "letra escrita para que cierre en el idioma original."
        ),
        "pages": [],
        "repos": [],
        "videos": [
            r"Zamba",
            r"Chacarera",
            r"Inmortal",
            r"^BESTIARIO AUSTRAL",
            r"Hymn",
            r"Latin",
            r"Roman Music",
            r"Greek",
            r"Norse",
            r"Viking",
            r"Choral",
        ],
    },
]

# Videos que entran o salen a mano, por id, cuando la regla no alcanza.
FORZAR = {}       # {"videoId": "obsesion_id"}
EXCLUIR = set()   # {"videoId"}


# ─── YOUTUBE ─────────────────────────────────────────────────────────────────

def credenciales():
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if TOKEN.exists():
        with open(TOKEN, "rb") as f:
            creds = pickle.load(f)
    if not creds or not creds.valid:
        ok = False
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                ok = True
            except Exception as e:
                print(f"  token vencido, reautorizando en el browser: {e}")
        if not ok:
            flow = InstalledAppFlow.from_client_secrets_file(str(CLIENT_SECRETS), SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN, "wb") as f:
            pickle.dump(creds, f)
    return creds


def segundos(iso):
    m = re.match(r"^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$", iso or "")
    if not m:
        return 0
    h, mi, se = [int(x or 0) for x in m.groups()]
    return h * 3600 + mi * 60 + se


def bajar_videos():
    from googleapiclient.discovery import build

    yt = build("youtube", "v3", credentials=credenciales())
    ch = yt.channels().list(part="contentDetails,statistics,snippet", id=CANAL).execute()
    info = ch["items"][0]
    uploads = info["contentDetails"]["relatedPlaylists"]["uploads"]

    ids, tok = [], None
    while True:
        r = yt.playlistItems().list(part="contentDetails", playlistId=uploads,
                                    maxResults=50, pageToken=tok).execute()
        ids += [it["contentDetails"]["videoId"] for it in r["items"]]
        tok = r.get("nextPageToken")
        if not tok:
            break

    videos = []
    for i in range(0, len(ids), 50):
        r = yt.videos().list(part="snippet,statistics,contentDetails,status",
                             id=",".join(ids[i:i + 50])).execute()
        for v in r["items"]:
            if v["status"]["privacyStatus"] != "public":
                continue
            videos.append({
                "tipo": "video",
                "id": v["id"],
                "titulo": v["snippet"]["title"],
                "fecha": v["snippet"]["publishedAt"][:10],
                "seg": segundos(v["contentDetails"]["duration"]),
                "views": int(v["statistics"].get("viewCount", 0)),
                "likes": int(v["statistics"].get("likeCount", 0)),
            })
    canal = {
        "titulo": info["snippet"]["title"],
        "subs": int(info["statistics"].get("subscriberCount", 0)),
        "videos": int(info["statistics"].get("videoCount", 0)),
        "views": int(info["statistics"].get("viewCount", 0)),
    }
    return canal, videos


# ─── GITHUB ──────────────────────────────────────────────────────────────────

GH = shutil.which("gh")


def gh(ruta):
    if not GH:
        sys.exit("falta el CLI de GitHub (gh) en el PATH")
    out = subprocess.run([GH, "api", ruta], capture_output=True, text=True,
                         encoding="utf-8")
    if out.returncode != 0:
        print(f"  ! gh api {ruta}: {out.stderr.strip()[:200]}")
        return None
    return json.loads(out.stdout)


def bajar_repos():
    todos, pagina = [], 1
    while True:
        r = gh(f"users/{USUARIO}/repos?per_page=100&page={pagina}")
        if not r:
            break
        todos += r
        if len(r) < 100:
            break
        pagina += 1
    por_nombre = {}
    for r in todos:
        por_nombre[r["name"]] = {
            "tipo": "page" if r["has_pages"] else "repo",
            "id": r["name"],
            "titulo": r["name"],
            "desc": r["description"] or "",
            "url": (f"https://{USUARIO}.github.io/{r['name']}/" if r["has_pages"]
                    else r["html_url"]),
            "repo": r["html_url"],
            "fecha": r["pushed_at"][:10],
            "lenguaje": r["language"] or "",
            "stars": r["stargazers_count"],
        }
    return por_nombre


# ─── ARMADO ──────────────────────────────────────────────────────────────────

def main():
    print("bajando YouTube...")
    canal, videos = bajar_videos()
    print(f"  {len(videos)} videos publicos")

    print("bajando GitHub...")
    repos = bajar_repos()
    con_pages = [r for r in repos.values() if r["tipo"] == "page"]
    print(f"  {len(repos)} repos, {len(con_pages)} con Pages")

    reglas = [(o["id"], re.compile(p, re.I)) for o in OBSESIONES for p in o["videos"]]
    asignado, sobrantes = {}, []
    for v in videos:
        if v["id"] in EXCLUIR:
            continue
        destino = FORZAR.get(v["id"])
        if not destino:
            for oid, rx in reglas:
                if rx.search(v["titulo"]):
                    destino = oid
                    break
        if destino:
            asignado.setdefault(destino, []).append(v)
        else:
            sobrantes.append(v)

    salida, usadas = [], set()
    for o in OBSESIONES:
        items = []
        for nombre in o["pages"] + o["repos"]:
            r = repos.get(nombre)
            if not r:
                print(f"  ! {nombre} no existe en GitHub")
                continue
            items.append(r)
            usadas.add(nombre)
        vids = sorted(asignado.get(o["id"], []), key=lambda x: x["fecha"], reverse=True)
        items += vids
        salida.append({
            "id": o["id"], "nombre": o["nombre"], "tesis": o["tesis"],
            "detalle": o["detalle"], "items": items,
            "n_pages": sum(1 for i in items if i["tipo"] == "page"),
            "n_videos": len(vids),
        })

    data = {
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "canal": canal,
        "usuario": USUARIO,
        "obsesiones": salida,
    }
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    print()
    for o in salida:
        print(f"  {o['nombre']:<20} {o['n_pages']} pages · {o['n_videos']} videos")
    huerfanas = [r["id"] for r in con_pages if r["id"] not in usadas]
    if huerfanas:
        print(f"\n  ! Pages sin obsesion: {', '.join(huerfanas)}")
    print(f"\n  {len(sobrantes)} videos fuera del indice (de {len(videos)}).")
    print("  Los 12 mas vistos que quedaron afuera:")
    for v in sorted(sobrantes, key=lambda x: -x["views"])[:12]:
        print(f"    {v['views']:>6}v  {v['fecha']}  {v['titulo'][:66]}")
    print(f"\n  -> {SALIDA}")


if __name__ == "__main__":
    sys.exit(main())
