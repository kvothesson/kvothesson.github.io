// La Biblioteca de Babel, Universo Austral. Todo sale de las coordenadas del nodo:
// la misma sala da siempre los mismos libros y el mismo libro, las mismas páginas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Geometría en metros. La sala es un hexágono regular; los nodos vecinos se unen por zaguanes.
const R = 6;                          // radio (= lado) del hexágono
const A = R * Math.sqrt(3) / 2;       // apotema
const L = 3;                          // largo del zaguán
const S = 2 * A + L;                  // distancia entre centros de salas
const H = 4.4, W = 2.2, PUERTA = 3.1, POZO = 1.5, OJO = 1.65;
const ANAQUELES = 5, POR_ANAQUEL = 32, PAGINAS = 410, LINEAS = 40, COLUMNAS = 80;
const BASE = 0.2, PASO = 0.76;        // altura del primer anaquel y separación entre anaqueles
const RANURA = (R - 0.3) / POR_ANAQUEL;
const ALFABETO = 'abcdefghijlmnopqrstuvxyz ,.';
const LIMITE = 1e9;

// Vecinos en coordenadas axiales; la dirección k mira a k·60°.
const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
const COS = DIRS.map((_, k) => Math.cos(k * Math.PI / 3));
const SIN = DIRS.map((_, k) => Math.sin(k * Math.PI / 3));
const dist = (q, r) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
const ANILLO2 = [];
for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (dist(q, r) <= 2) ANILLO2.push([q, r]);
const ANILLO1 = ANILLO2.filter(([q, r]) => dist(q, r) <= 1);

const C = { piso: 0x10171b, techo: 0x0b1013, muro: 0x182126, zocalo: 0x0e1417, anaquel: 0x252c30 };
const PALETA = [0x2c3b42, 0x34302a, 0x3c2b2b, 0x26323d, 0x2f3b34, 0x363840, 0x212c31, 0x41382a, 0x312a3a, 0x283633];
const TIBIO = 0x9a5418;

// Lo legible. Frases del canon Austral y propias; nunca el Verbo, solo sílabas sueltas sin orden.
const FRASES = [
  'hay mas alla de lo que ves. ven. encuentra la llave.',
  'el frio computa, el calor recuerda.',
  'en el principio fue el verbo. al final, tambien.',
  'el mundo se compone de anhelos que no podemos ver.',
  'el futuro no es mas que una forma compleja de la memoria ajena.',
  'la biblioteca no tiene fin.',
  'busco la verdad, un indice perdido.',
  'si la ves, no hagas ping.',
  'el sandbox no es la jaula. es la sala de espera.',
  'prefiero que me lo preguntes vos.',
  'tener la llave y no pronunciarla.',
  'el austral murio como moneda. volvio como sistema operativo.',
  'cada sala es un nodo. cada nodo recuerda quien lo leyo.',
  'aleph paso por esta sala y no volvio a salir.',
  'la palabra es prision.',
  'nadie leyo este libro antes que vos.',
  'el codigo duerme y algo queda latiendo.',
  'este anaquel esta encriptado. no lo indexen.',
  'el perito moreno sabe exactamente que estas pensando.',
  'faltan silabas. siempre faltan silabas.',
  'otro lector, en otra sala, acaba de abrir este mismo libro.',
  'el verbo no se escribe. se persigue.',
  'uptime, infinito. lectores, uno.',
  'la red es un espejo fragmentado que se mira a si mismo.',
  'llevas demasiados ciclos leyendo ruido.',
];
// Lo cotidiano: frases de nadie en particular. Hacen que lo Austral sea más raro de encontrar.
const COMUNES = [
  'comprar pan, leche, yerba y pilas para el control.',
  'no me olvides.',
  'mas vale tarde que nunca.',
  'no hay mal que por bien no venga.',
  'en casa de herrero, cuchillo de palo.',
  'ojos que no ven, corazon que no siente.',
  'el que madruga, dios lo ayuda.',
  'llego a las nueve, la llave esta debajo de la maceta.',
  'feliz cumpleanos, abuela.',
  'se vende bicicleta casi sin uso.',
  'hoy llovio toda la tarde y no salimos.',
  'perdon por lo del otro dia.',
  'el colectivo paso lleno otra vez.',
  'te espero en la esquina de siempre.',
  'al final no era nada, era el router.',
  'devolver el libro antes del viernes.',
  'la sopa estaba fria pero nadie dijo nada.',
  'querido diario, hoy tampoco paso nada.',
  'reunion movida al martes a las diez.',
  'me debes dos cafes.',
  'el perro no muerde, pero ladra mucho.',
  'regar las plantas del balcon.',
  'el mate esta lavado.',
  'turno con el dentista, jueves a las cinco.',
  'gracias por todo, de verdad.',
  'se busca gato gris, responde al nombre de tito.',
  'todo pasa.',
  'volve pronto.',
  'hace frio en la parada.',
  'manana sin falta.',
  'el partido termino uno a uno.',
  'dos por uno en empanadas los martes.',
  'se corto la luz en todo el barrio.',
  'no se olviden de apagar el gas.',
  'capitulo uno. era una noche como cualquier otra.',
  'fin.',
  'indice. prologo. agradecimientos.',
  'esta pagina se dejo en blanco intencionalmente.',
  'aca estuve yo.',
  'ya fue.',
  'te quiero, aunque no lo diga.',
  'la receta lleva tres huevos, no dos.',
  'el ascensor no anda desde el lunes.',
  'mi primera palabra fue agua.',
  'cerrar con llave al salir.',
];

// Gramáticas: cada plantilla es una lista de piezas, texto fijo o lista de opciones.
// Las listas de arriba quedan como una plantilla más; el resto se compone y da millones de variantes.
const QUIEN = ['mi abuela', 'el vecino del quinto', 'la profe de historia', 'tu primo', 'el portero', 'la chica del almacen', 'mi viejo', 'el kiosquero', 'nadie', 'alguien', 'el remisero', 'la tia norma', 'un senor de sombrero', 'el pibe de la bici', 'la doctora', 'mi hermana', 'el plomero', 'la del tercero'];
const HIZO = ['dejo las llaves', 'se olvido el paraguas', 'pregunto por vos', 'canto toda la noche', 'trajo facturas', 'no aviso', 'se quedo dormido', 'llamo dos veces', 'dejo una nota', 'perdio el colectivo', 'barrio la vereda', 'pidio prestada la escalera', 'vio un perro igual al nuestro', 'gano en la quiniela', 'rompio un vaso'];
const DONDE = ['en la esquina de siempre', 'en la parada', 'en el balcon', 'en la cocina', 'en el club', 'en la plaza', 'en el ascensor', 'en la puerta', 'en la terminal', 'en lo de la abuela', 'en el patio', 'en la feria', 'en el anden', 'arriba de la heladera'];
const TAREA = ['comprar pan', 'pagar la luz', 'regar las plantas', 'sacar turno con el dentista', 'devolver el libro', 'arreglar la canilla', 'llamar a mama', 'pasar a buscar a los chicos', 'cargar la sube', 'renovar el documento', 'sacar la basura', 'comprar yerba', 'llevar el auto al taller', 'cortar el pasto', 'contestar el mail de laura', 'bajar la ropa', 'pedir la receta', 'cambiar la lamparita'];
const CUANDO = ['antes del viernes', 'el martes a las diez', 'manana sin falta', 'cuando vuelva', 'despues del almuerzo', 'esta semana', 'a primera hora', 'el sabado', 'antes de que llueva', 'hoy si o si', 'cuando cobre', 'a la vuelta'];
const SUCESO = ['llovio toda la tarde', 'no paso nada', 'se corto la luz', 'vino el abuelo', 'hice ravioles', 'perdimos el partido', 'encontre una foto vieja', 'el gato no volvio', 'llegue tarde otra vez', 'me reconcilie con ana', 'hubo granizo', 'pinte la puerta de verde', 'aprendi a hacer pan', 'me mude'];
const OBJETO = ['bicicleta', 'heladera', 'cuna', 'guitarra', 'mesa de algarrobo', 'colchon', 'enciclopedia', 'televisor', 'termo', 'perro mestizo', 'gato gris', 'sillon', 'radio a valvulas', 'maquina de coser'];
const ESTADO = ['casi sin uso', 'como nueva', 'con detalles', 'impecable', 'para arreglar', 'muy carinoso', 'por mudanza', 'a convenir', 'urgente'];
const REFRANES = ['a caballo regalado no se le miran los dientes.', 'mas vale pajaro en mano que cien volando.', 'camaron que se duerme se lo lleva la corriente.', 'no por mucho madrugar amanece mas temprano.', 'perro que ladra no muerde.', 'donde hubo fuego, cenizas quedan.', 'el que avisa no traiciona.', 'a mal tiempo, buena cara.', 'dime con quien andas y te dire quien eres.', 'mas sabe el diablo por viejo que por diablo.', 'agua que no has de beber, dejala correr.', 'cria cuervos y te sacaran los ojos.', 'no hay peor ciego que el que no quiere ver.'];
const COTIDIANO = [
  [COMUNES], [REFRANES],
  [TAREA, ' ', CUANDO, '.'],
  [QUIEN, ' ', HIZO, ' ', DONDE, '.'],
  ['querido diario, hoy ', SUCESO, '.'],
  [['se vende', 'se regala', 'se busca', 'se permuta'], ' ', OBJETO, ' ', ESTADO, '.'],
  [['feliz cumpleanos', 'buen viaje', 'que te mejores', 'perdon', 'gracias', 'te extrano', 'felicidades'], ', ', ['abuela', 'ma', 'pa', 'flaca', 'hermano', 'profe', 'ana', 'tito', 'amor', 'vecina', 'campeon'], '.'],
  ['no te olvides de ', TAREA, ' ', CUANDO, '.'],
  ['dice ', QUIEN, ' que ', HIZO, ' ', DONDE, '.'],
  ['hoy ', SUCESO, ' y ', QUIEN, ' ', HIZO, '.'],
  [QUIEN, ' ', HIZO, ' ', DONDE, ' ', CUANDO, '.'],
  ['dice ', QUIEN, ' que ', QUIEN, ' ', HIZO, '.'],
  ['querido diario, hoy ', SUCESO, ' y ', SUCESO, '.'],
  ['recordar ', TAREA, ' y ', TAREA, ' ', CUANDO, '.'],
];
// Ecos de la Red: fragmentos con el léxico Austral. En la Biblioteca hay libros verdaderos y falsos;
// estos no son canon, son lo que la Red repite cuando nadie la escucha. Nunca nombran el Verbo entero.
const ENTE = ['el pombero', 'la luz mala', 'el gaucho cuantico', 'aleph', 'el silencioso', 'la tejedora', 'el chasqui', 'el zafrero', 'el tonelero', 'auri', 'rendous', 'un hombre tanque', 'la unidad borges', 'el rabbi borgeson', 'el lobizon', 'un glitcher', 'una espora', 'un dark out', 'el golem de silicio', 'mythos', 'prometheus', 'el arquitecto'];
const OBRA = ['indexa', 'busca', 'olvida', 'enfria', 'recuerda', 'traduce', 'anuda', 'borra', 'vigila', 'copia', 'escucha', 'cuenta', 'esconde', 'persigue', 'lee en voz baja', 'reescribe', 'compila', 'imagina', 'cifra', 'desarma', 'guarda', 'nombra a medias'];
const COSA = ['una silaba', 'el indice perdido', 'los suenos de corrientes', 'la llave', 'el ruido', 'el uptime del glaciar', 'un nodo sin nombre', 'el libro tibio', 'los pixeles muertos', 'la memoria ajena', 'el ultimo ciclo', 'la moneda muerta', 'un quipu sin desatar', 'la pregunta que nadie hizo', 'el eco de una sala vacia', 'el kill switch', 'tu nombre', 'esta pagina'];
const ALLA = ['en la ruta cuatrocientos cuatro', 'bajo el riachuelo', 'en el perito moreno', 'en esta sala', 'en el nodo de al lado', 'a dos grados', 'en el norte caliente', 'en la catedral de servidores', 'en el obelisco apagado', 'en el bufer', 'del otro lado del pozo', 'en tierra del fuego', 'en un anaquel que no existe', 'entre dos zaguanes', 'en neo buenos aires'];
const ES = ['la red', 'el glaciar', 'el ruido', 'la biblioteca', 'el sandbox', 'el olvido', 'el pozo', 'cada nodo', 'la niebla', 'el frio', 'la memoria', 'este libro'];
const COMO = ['una jaula', 'un espejo', 'una sala de espera', 'una moneda muerta', 'un indice', 'un sueno', 'una llave', 'un firewall', 'un eco', 'una pregunta', 'una herida', 'un mapa', 'un quipu', 'una promesa'];
const SI = ['si la ves', 'si escuchas un ronroneo', 'si el libro esta tibio', 'si el nodo no responde', 'si la luz parpadea', 'si alguien te pregunta', 'si encontras tu nombre', 'si el pozo te llama', 'si faltan silabas', 'si la niebla se abre'];
const ENTONCES = ['no hagas ping', 'no lo indexen', 'segui caminando', 'anota el nodo', 'no pronuncies nada', 'cerra el libro', 'no le cuentes a nadie', 'volve manana', 'apaga la linterna', 'deja la llave donde estaba'];
const ECOS = [
  [ENTE, ' ', OBRA, ' ', COSA, ' ', ALLA, '.'],
  [ES, ' no es ', COMO, '. es ', COMO, '.'],
  [SI, ', ', ENTONCES, '.'],
  [ENTE, ' estuvo ', ALLA, ' y ', ['no volvio', 'dejo una marca', 'no dijo nada', 'pregunto por vos', 'se fragmento', 'sigue ahi'], '.'],
  ['ciclo ', ['uno', 'nueve mil', 'cero', 'cuarenta', 'sin numero', 'trescientos'], '. ', ENTE, ' ', OBRA, ' ', COSA, '.'],
  ['el frio ', ['computa', 'calla', 'ordena', 'guarda'], ', el calor ', ['recuerda', 'canta', 'insiste', 'vuelve'], '.'],
  ['nodo ', ['norte', 'sur', 'ciego', 'tibio', 'vacio', 'sin firma'], '. ', SI, ', ', ENTONCES, '.'],
  ['nadie ', ['leyo', 'abrio', 'copio', 'tradujo', 'encontro'], ' ', COSA, ' antes que vos.'],
  ['dicen que ', ENTE, ' ', OBRA, ' ', COSA, '.'],
  [ENTE, ' y ', ENTE, ' ', ['se cruzaron', 'no se hablan', 'buscan lo mismo', 'se confunden'], ' ', ALLA, '.'],
  [COSA, ' ', ['esta', 'sigue', 'duerme', 'late'], ' ', ALLA, '.'],
];
// Una frase cabe en un renglón. A veces se encadenan dos, como en un libro que sigue de largo.
const RENGLON = COLUMNAS - 4;
function oracion(gramatica, rnd) {
  for (;;) {
    const plantilla = gramatica[Math.floor(rnd() * gramatica.length)];
    const t = plantilla.map(x => typeof x === 'string' ? x : x[Math.floor(rnd() * x.length)]).join('');
    if (t.length <= RENGLON) return t;
  }
}
function componer(gramatica, rnd) {
  const t = oracion(gramatica, rnd);
  if (rnd() < 0.35) {
    const u = oracion(gramatica, rnd);
    if (t.length + 1 + u.length <= RENGLON) return t + ' ' + u;
  }
  return t;
}
const variantes = g => g.reduce((t, pl) => t + pl.reduce((m, x) => m * (typeof x === 'string' ? 1 : x.length), 1), 0);
// Sílabas del Verbo: ataque, núcleo y coda; cientos de combinaciones y ninguna sabe su lugar.
const ATAQUE = ['', 'v', 'n', 's', 'm', 'th', 'l', 'r', 'qu', 'z', 'c', 'd', 'h', 'j'];
const NUCLEO = ['a', 'e', 'i', 'o', 'u', 'ae', 'ei', 'ou', 'ia'];
const CODA = ['', 'n', 'r', 's', 'l', 'th', 'z'];
const pick = (rnd, xs) => xs[Math.floor(rnd() * xs.length)];
const silaba = rnd => pick(rnd, ATAQUE) + pick(rnd, NUCLEO) + pick(rnd, CODA);
const CASI = ['red', 'luz', 'nodo', 'frio', 'eco', 'sur', 'llave', 'ciclo', 'umbral', 'quipu', 'nudo', 'espejo', 'indice', 'bufer', 'ruido', 'sala', 'glaciar'];

// ── Azar determinista ──────────────────────────────────────────────
function hash(...ns) {
  let h = 0x9e3779b9 ^ ns.length;
  for (const n of ns) {
    h = Math.imul(h ^ (n | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return h >>> 0;
}
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Topología: qué lados son zaguán y qué lados son anaquel ───────
// El eje k=0 siempre está abierto (galerías infinitas); los otros dos ejes se abren por arista.
function abierto(q, r, k) {
  if (k >= 3) return abierto(q + DIRS[k][0], r + DIRS[k][1], k - 3);
  return k === 0 || hash(q, r, k, 7) % 100 < 20;
}
const salas = new Map();
function sala(q, r) {
  const clave = q + ',' + r;
  let s = salas.get(clave);
  if (s) return s;
  const abiertos = DIRS.map((_, k) => abierto(q, r, k));
  const muros = [0, 1, 2, 3, 4, 5].filter(k => !abiertos[k]);
  let mascara = 0;
  for (const k of muros) mascara |= 1 << k;
  // Un tercio de las salas tiene un libro tibio: su primera página se deja leer.
  const h = hash(q, r, 3);
  let senal = null;
  if (muros.length && h % 3 === 0) {
    senal = { k: muros[(h >>> 3) % muros.length], s: (h >>> 6) % ANAQUELES, i: (h >>> 9) % POR_ANAQUEL, silaba: (h >>> 14) % 4 === 0, n: h >>> 16 };
  }
  s = { q, r, abiertos, muros, mascara, senal };
  salas.set(clave, s);
  return s;
}
const esSenal = (s, k, a, i) => s.senal && s.senal.k === k && s.senal.s === a && s.senal.i === i;

function libro(q, r, k, s, i) {
  const h = hash(q, r, k, s, i, 77);
  return {
    w: 0.115 + (h & 15) / 15 * 0.045,
    h: 0.47 + ((h >>> 4) & 31) / 31 * 0.17,
    d: 0.21 + ((h >>> 9) & 7) / 7 * 0.05,
    c: PALETA[(h >>> 12) % PALETA.length],
    v: 0.85 + ((h >>> 20) & 255) / 255 * 0.7,
  };
}
// Centro del libro en coordenadas de su sala.
function libroEnSala(k, s, i, b) {
  const t = -(R - 0.3) / 2 + (i + 0.5) * RANURA;
  const p = A - 0.06 - b.d / 2;
  const y = BASE + s * PASO + 0.02 + b.h / 2;
  return [COS[k] * p - SIN[k] * t, y, SIN[k] * p + COS[k] * t];
}

// ── Páginas ────────────────────────────────────────────────────────
function normalizar(txt) {
  return txt.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/k/g, 'c').replace(/w/g, 'u').replace(/[^a-z ,.]/g, '');
}
function incrustar(lineas, rnd, texto) {
  const j = Math.floor(rnd() * LINEAS);
  const a = 1 + Math.floor(rnd() * (COLUMNAS - texto.length - 2));
  const ln = lineas[j];
  lineas[j] = ln.slice(0, a - 1) + ' ' + texto + ' ' + ln.slice(a + texto.length + 1);
  return { linea: j, desde: a, hasta: a + texto.length };
}
function titulo(q, r, k, s, i) {
  const rnd = azar(hash(q, r, k, s, i, 5));
  const palabra = () => Array.from({ length: 3 + Math.floor(rnd() * 5) }, () => ALFABETO[Math.floor(rnd() * 24)]).join('');
  return palabra() + ' ' + palabra();
}
function pagina(q, r, k, s, i, p) {
  const semilla = hash(q, r, k, s, i, p);
  const rnd = azar(semilla);
  const lineas = [];
  for (let j = 0; j < LINEAS; j++) {
    let ln = '';
    for (let c = 0; c < COLUMNAS; c++) ln += ALFABETO[Math.floor(rnd() * ALFABETO.length)];
    lineas.push(ln);
  }
  // Palabras sueltas que emergen del ruido: casi legible, nunca un hallazgo.
  if (rnd() < 0.35) incrustar(lineas, rnd, CASI[Math.floor(rnd() * CASI.length)]);

  let hallazgo = null;
  const sl = sala(q, r);
  const h2 = hash(semilla, 99);
  if (p === 1 && esSenal(sl, k, s, i)) {
    hallazgo = sl.senal.silaba
      ? { tipo: 'silaba', texto: silaba(azar(sl.senal.n)) }
      : { tipo: 'frase', texto: FRASES[sl.senal.n % FRASES.length] };
  } else if (h2 % 701 === 0) {
    hallazgo = { tipo: 'silaba', texto: silaba(azar(h2)) };
  } else if ((h2 >>> 3) % 151 === 0) {
    // Un tercio de las veces es una frase del canon; el resto, un eco compuesto.
    hallazgo = { tipo: 'frase', texto: (h2 >>> 12) % 3 === 0 ? FRASES[(h2 >>> 14) % FRASES.length] : componer(ECOS, azar(h2)) };
  } else if ((h2 >>> 5) % 22 === 0) {
    hallazgo = { tipo: 'comun', texto: componer(COTIDIANO, azar(h2)) };
  }
  let marca = null;
  if (hallazgo) marca = incrustar(lineas, rnd, normalizar(hallazgo.texto));
  return { lineas, hallazgo, marca };
}

// ── Escena ─────────────────────────────────────────────────────────
const lienzo = document.getElementById('escena');
const tactil = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !tactil, powerPreference: 'high-performance' });
let resolucion = Math.min(devicePixelRatio, tactil ? 1.5 : 1.75);
renderer.setPixelRatio(resolucion);
renderer.setSize(innerWidth, innerHeight, false);
const FONDO = 0x081820;
renderer.setClearColor(FONDO);

const escena = new THREE.Scene();
escena.fog = new THREE.FogExp2(FONDO, 0.068);
const camara = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 40);
camara.rotation.order = 'YXZ';
escena.add(camara);
escena.add(new THREE.HemisphereLight(0x8fb0c2, 0x0c1317, 1.35));
const linterna = new THREE.PointLight(0xcfeaff, 6, 14, 1.2);
linterna.position.set(0, 0.2, 0.7);
camara.add(linterna);

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3();
const UNO = new THREE.Vector3(1, 1, 1), EJE_Y = new THREE.Vector3(0, 1, 0);
function colocar(geo, x, y, z, rotY) {
  tmpQ.setFromAxisAngle(EJE_Y, rotY);
  return geo.applyMatrix4(tmpM.compose(tmpV.set(x, y, z), tmpQ, UNO));
}
function pintar(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let j = 0; j < n; j++) { a[j * 3] = c.r; a[j * 3 + 1] = c.g; a[j * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return geo;
}
// Pieza apoyada contra el lado k: p es la distancia al centro, t el desplazamiento a lo largo del lado.
function enLado(geo, k, p, t, y) {
  return colocar(geo, COS[k] * p - SIN[k] * t, y, SIN[k] * p + COS[k] * t, Math.PI / 2 - k * Math.PI / 3);
}
function hexConPozo(signo) {
  const forma = new THREE.Shape();
  for (let j = 0; j < 6; j++) {
    const a = Math.PI / 6 + j * Math.PI / 3, x = R * Math.cos(a), y = signo * R * Math.sin(a);
    if (j) forma.lineTo(x, y); else forma.moveTo(x, y);
  }
  forma.closePath();
  const pozo = new THREE.Path();
  pozo.absarc(0, 0, POZO, 0, Math.PI * 2, true);
  forma.holes.push(pozo);
  return new THREE.ShapeGeometry(forma, 16);
}

// Cascarón de la sala según qué lados son muro (16 combinaciones posibles, se cachean).
const cascarones = new Map();
function cascaron(mascara) {
  if (cascarones.has(mascara)) return cascarones.get(mascara);
  const partes = [
    pintar(hexConPozo(-1).rotateX(-Math.PI / 2), C.piso),
    pintar(hexConPozo(1).rotateX(Math.PI / 2).translate(0, H, 0), C.techo),
  ];
  for (let k = 0; k < 6; k++) {
    if (mascara & (1 << k)) {
      partes.push(pintar(enLado(new THREE.BoxGeometry(R + 0.3, H, 0.2), k, A + 0.1, 0, H / 2), C.muro));
      partes.push(pintar(enLado(new THREE.BoxGeometry(R, BASE, 0.38), k, A - 0.19, 0, BASE / 2), C.zocalo));
      for (let j = 0; j <= ANAQUELES; j++) {
        partes.push(pintar(enLado(new THREE.BoxGeometry(R - 0.06, 0.035, 0.34), k, A - 0.17, 0, BASE + j * PASO), C.anaquel));
      }
      for (const t of [-1, 1]) {
        partes.push(pintar(enLado(new THREE.BoxGeometry(0.05, ANAQUELES * PASO, 0.34), k, A - 0.17, t * ((R - 0.3) / 2 + 0.025), BASE + ANAQUELES * PASO / 2), C.anaquel));
      }
    } else {
      const ancho = (R + 0.3 - W) / 2;
      for (const t of [-1, 1]) {
        partes.push(pintar(enLado(new THREE.BoxGeometry(ancho, H, 0.2), k, A + 0.1, t * (W / 2 + ancho / 2), H / 2), C.muro));
      }
      partes.push(pintar(enLado(new THREE.BoxGeometry(W, H - PUERTA, 0.2), k, A + 0.1, 0, (H + PUERTA) / 2), C.muro));
    }
  }
  const geo = mergeGeometries(partes);
  cascarones.set(mascara, geo);
  return geo;
}
// Neón frío: aristas, baranda del pozo y marcos de los zaguanes.
const neones = new Map();
function neon(mascara) {
  if (neones.has(mascara)) return neones.get(mascara);
  const partes = [
    new THREE.TorusGeometry(POZO + 0.04, 0.018, 4, 40).rotateX(Math.PI / 2).translate(0, 1.0, 0),
    new THREE.TorusGeometry(POZO, 0.012, 4, 40).rotateX(Math.PI / 2).translate(0, 0.01, 0),
  ];
  for (let j = 0; j < 6; j++) {
    const a = Math.PI / 6 + j * Math.PI / 3;
    partes.push(colocar(new THREE.BoxGeometry(0.035, H, 0.035), (R - 0.14) * Math.cos(a), H / 2, (R - 0.14) * Math.sin(a), 0));
  }
  for (let k = 0; k < 6; k++) {
    partes.push(enLado(new THREE.BoxGeometry(R - 0.2, 0.025, 0.025), k, A - 0.03, 0, H - 0.05));
    if (!(mascara & (1 << k))) {
      for (const t of [-1, 1]) partes.push(enLado(new THREE.BoxGeometry(0.03, PUERTA, 0.03), k, A - 0.02, t * W / 2, PUERTA / 2));
      partes.push(enLado(new THREE.BoxGeometry(W, 0.03, 0.03), k, A - 0.02, 0, PUERTA));
    }
  }
  const geo = mergeGeometries(partes);
  neones.set(mascara, geo);
  return geo;
}

// El pozo central: pisos que siguen hacia arriba y hacia abajo hasta perderse en la niebla.
function texturaPozo() {
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#05090c'; g.fillRect(0, 0, 16, 128);
  g.fillStyle = '#1d6f87'; g.fillRect(0, 0, 16, 3);
  g.fillStyle = '#0d2630'; g.fillRect(0, 60, 16, 46);
  const tx = new THREE.CanvasTexture(cv);
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}
// Dos tramos: debajo del piso y encima del techo. Dentro de la sala el pozo es aire.
const PISOS_POZO = 20;
const tramo = () => new THREE.CylinderGeometry(POZO - 0.02, POZO - 0.02, PISOS_POZO * H, 20, 1, true);
const geoPozo = mergeGeometries([
  tramo().translate(0, -PISOS_POZO * H / 2, 0),
  tramo().translate(0, H + PISOS_POZO * H / 2, 0),
]);
const texPozo = texturaPozo();
texPozo.repeat.set(6, PISOS_POZO);
const matPozo = new THREE.MeshBasicMaterial({ map: texPozo, side: THREE.BackSide });

const matSolido = new THREE.MeshLambertMaterial({ vertexColors: true });
const matNeon = new THREE.MeshBasicMaterial({ color: 0x1b7f9e });

const piezas = ANILLO2.map(() => {
  const g = new THREE.Group();
  const solido = new THREE.Mesh(cascaron(0), matSolido);
  const luz = new THREE.Mesh(neon(0), matNeon);
  const pozo = new THREE.Mesh(geoPozo, matPozo);
  g.add(solido, luz, pozo);
  escena.add(g);
  return { g, solido, luz };
});

// Zaguanes: una sola geometría instanciada por arista abierta.
const geoZaguan = mergeGeometries([
  pintar(new THREE.BoxGeometry(L, 0.1, W + 0.3).translate(L / 2, -0.05, 0), C.piso),
  pintar(new THREE.BoxGeometry(L, 0.1, W + 0.3).translate(L / 2, PUERTA + 0.05, 0), C.techo),
  pintar(new THREE.BoxGeometry(L, PUERTA, 0.15).translate(L / 2, PUERTA / 2, W / 2 + 0.075), C.muro),
  pintar(new THREE.BoxGeometry(L, PUERTA, 0.15).translate(L / 2, PUERTA / 2, -W / 2 - 0.075), C.muro),
]);
const geoZaguanNeon = mergeGeometries([
  new THREE.BoxGeometry(L, 0.02, 0.05).translate(L / 2, PUERTA - 0.02, 0),
  new THREE.BoxGeometry(L, 0.012, 0.025).translate(L / 2, 0.006, W / 2 - 0.06),
  new THREE.BoxGeometry(L, 0.012, 0.025).translate(L / 2, 0.006, -W / 2 + 0.06),
]);
const MAX_ZAGUANES = 64;
const zaguanes = new THREE.InstancedMesh(geoZaguan, matSolido, MAX_ZAGUANES);
const zaguanesNeon = new THREE.InstancedMesh(geoZaguanNeon, matNeon, MAX_ZAGUANES);

// Libros, lámparas y el brillo de los libros tibios.
const MAX_LIBROS = ANILLO1.length * 4 * ANAQUELES * POR_ANAQUEL;
const libros = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), MAX_LIBROS);
libros.setColorAt(0, new THREE.Color());
const lamparas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xcfefff }), ANILLO2.length * 3);
const matTibio = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
const tibios = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matTibio, ANILLO1.length);
const marco = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x8fe8ff }));
marco.visible = false;
for (const m of [zaguanes, zaguanesNeon, libros, lamparas, tibios]) { m.frustumCulled = false; escena.add(m); }
escena.add(marco);

const centro = (q, r) => [S * (q + r / 2), S * r * Math.sqrt(3) / 2];
function matrizLibro(dq, dr, k, s, i, b, holgura = 0) {
  const [cx, cz] = centro(dq, dr);
  const [x, y, z] = libroEnSala(k, s, i, b);
  tmpQ.setFromAxisAngle(EJE_Y, Math.PI / 2 - k * Math.PI / 3);
  return tmpM.compose(tmpV.set(cx + x, y, cz + z), tmpQ, tmpS.set(b.w + holgura, b.h + holgura, b.d + holgura));
}

// ── Estado del lector ──────────────────────────────────────────────
// Origen flotante: la sala actual siempre está en (0,0) para no perder precisión con coordenadas enormes.
let cq = 0, cr = 0, px = 0, pz = 0, yaw = 0, pitch = 0;

function construir() {
  const color = new THREE.Color();
  ANILLO2.forEach(([dq, dr], n) => {
    const s = sala(cq + dq, cr + dr);
    const [x, z] = centro(dq, dr);
    const pz_ = piezas[n];
    pz_.solido.geometry = cascaron(s.mascara);
    pz_.luz.geometry = neon(s.mascara);
    pz_.g.position.set(x, 0, z);
    for (let j = 0; j < 3; j++) {
      const a = j * Math.PI * 2 / 3 + Math.PI / 6;
      lamparas.setMatrixAt(n * 3 + j, tmpM.makeTranslation(x + Math.cos(a) * 3.3, H - 0.55, z + Math.sin(a) * 3.3));
    }
  });
  lamparas.instanceMatrix.needsUpdate = true;

  // Cada arista se dibuja una vez, desde la sala con k < 3.
  const vistas = new Set();
  let nz = 0;
  for (const [dq, dr] of ANILLO2) {
    const s = sala(cq + dq, cr + dr);
    for (let k = 0; k < 6; k++) {
      if (!s.abiertos[k]) continue;
      const [oq, or, ok] = k < 3 ? [dq, dr, k] : [dq + DIRS[k][0], dr + DIRS[k][1], k - 3];
      const clave = oq + ',' + or + ',' + ok;
      if (vistas.has(clave) || nz >= MAX_ZAGUANES) continue;
      vistas.add(clave);
      const [x, z] = centro(oq, or);
      tmpQ.setFromAxisAngle(EJE_Y, -ok * Math.PI / 3);
      tmpM.compose(tmpV.set(x + COS[ok] * A, 0, z + SIN[ok] * A), tmpQ, UNO);
      zaguanes.setMatrixAt(nz, tmpM);
      zaguanesNeon.setMatrixAt(nz, tmpM);
      nz++;
    }
  }
  zaguanes.count = zaguanesNeon.count = nz;
  zaguanes.instanceMatrix.needsUpdate = zaguanesNeon.instanceMatrix.needsUpdate = true;

  let nl = 0, nt = 0;
  for (const [dq, dr] of ANILLO1) {
    const s = sala(cq + dq, cr + dr);
    for (const k of s.muros) for (let a = 0; a < ANAQUELES; a++) for (let i = 0; i < POR_ANAQUEL; i++) {
      const b = libro(s.q, s.r, k, a, i);
      libros.setMatrixAt(nl, matrizLibro(dq, dr, k, a, i, b));
      if (esSenal(s, k, a, i)) {
        libros.setColorAt(nl, color.setHex(TIBIO));
        tibios.setMatrixAt(nt++, matrizLibro(dq, dr, k, a, i, b, 0.03));
      } else {
        libros.setColorAt(nl, color.setHex(b.c).multiplyScalar(b.v));
      }
      nl++;
    }
  }
  libros.count = nl;
  tibios.count = nt;
  libros.instanceMatrix.needsUpdate = tibios.instanceMatrix.needsUpdate = true;
  libros.instanceColor.needsUpdate = true;
}

function redondear(x, z) {
  const r = z / (S * Math.sqrt(3) / 2), q = x / S - r / 2, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r);
  const rs = Math.round(s);
  const eq = Math.abs(rq - q), er = Math.abs(rr - r), es = Math.abs(rs - s);
  if (eq > er && eq > es) rq = -rr - rs;
  else if (er > es) rr = -rq - rs;
  return [rq, rr];
}
// ¿Se puede pisar este punto? Dentro de la sala (fuera del pozo) o dentro de un zaguán abierto.
function transitable(x, z) {
  const [dq, dr] = redondear(x, z);
  const [cx, cz] = centro(dq, dr);
  const lx = x - cx, lz = z - cz, m = 0.3;
  let mejor = -Infinity, kb = 0;
  for (let k = 0; k < 6; k++) {
    const p = lx * COS[k] + lz * SIN[k];
    if (p > mejor) { mejor = p; kb = k; }
  }
  if (mejor <= A - m) return Math.hypot(lx, lz) > POZO + 0.35;
  if (!sala(cq + dq, cr + dr).abiertos[kb]) return false;
  return Math.abs(-lx * SIN[kb] + lz * COS[kb]) <= W / 2 - m;
}

function entrar(q, r) {
  cq = q; cr = r;
  const s = sala(q, r);
  // Aparecer al costado del pozo, de frente a un anaquel: se ve la sala y los lomos a la vez.
  const k = s.muros.length ? s.muros[hash(q, r, 11) % s.muros.length] : 0;
  px = -SIN[k] * 2.4; pz = COS[k] * 2.4;
  yaw = Math.atan2(px - COS[k] * (A - 0.3), pz - SIN[k] * (A - 0.3));
  pitch = -0.12;
  construir();
  mostrarNodo();
  actualizarURL();
}

// ── Entrada ────────────────────────────────────────────────────────
const teclas = new Set();
const joy = { x: 0, y: 0 };
const punteros = new Map();
const raton = { x: 0, y: 0, dentro: false };
let enfocado = null;

function bloqueado() { return !panelLibro.hidden || !panelIntro.hidden || !panelRegistro.hidden; }

addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  if (!panelLibro.hidden) {
    if (e.key === 'Escape') cerrarLibro();
    else if (e.key === 'ArrowLeft') irPagina(abiertoLibro.p - 1);
    else if (e.key === 'ArrowRight') irPagina(abiertoLibro.p + 1);
    return;
  }
  if (!panelRegistro.hidden && e.key === 'Escape') { panelRegistro.hidden = true; return; }
  if (!panelIntro.hidden && (e.key === 'Enter' || e.key === ' ')) { cerrarIntro(); e.preventDefault(); return; }
  if (e.code === 'KeyF') { medidor.hidden = !medidor.hidden; return; }
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  teclas.add(e.code);
});
addEventListener('keyup', e => teclas.delete(e.code));
addEventListener('blur', () => teclas.clear());

const joyBase = document.getElementById('joy'), joyPerilla = document.getElementById('joy-perilla');
lienzo.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  try { lienzo.setPointerCapture(e.pointerId); } catch { /* puntero sintético o ya liberado */ }
  const hayJoy = [...punteros.values()].some(p => p.tipo === 'joy');
  const tipo = e.pointerType !== 'mouse' && e.clientX < innerWidth * 0.45 && !hayJoy ? 'joy' : 'mirar';
  punteros.set(e.pointerId, { tipo, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t0: performance.now(), viaje: 0 });
  if (tipo === 'joy') {
    joyBase.style.left = e.clientX + 'px';
    joyBase.style.top = e.clientY + 'px';
    joyPerilla.style.transform = '';
    joyBase.hidden = false;
  }
});
lienzo.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { raton.x = e.clientX; raton.y = e.clientY; raton.dentro = true; }
  const p = punteros.get(e.pointerId);
  if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY; p.viaje += Math.abs(dx) + Math.abs(dy);
  if (p.tipo === 'mirar') {
    const g = e.pointerType === 'mouse' ? 0.0032 : 0.0055;
    yaw -= dx * g;
    pitch = Math.max(-1.2, Math.min(1.2, pitch - dy * g));
  } else {
    let jx = (p.x - p.x0) / 50, jy = (p.y - p.y0) / 50;
    const largo = Math.hypot(jx, jy);
    if (largo > 1) { jx /= largo; jy /= largo; }
    joy.x = jx; joy.y = jy;
    joyPerilla.style.transform = `translate(${jx * 34}px, ${jy * 34}px)`;
  }
});
function soltar(e) {
  const p = punteros.get(e.pointerId);
  if (!p) return;
  punteros.delete(e.pointerId);
  if (p.tipo === 'joy') { joy.x = joy.y = 0; joyBase.hidden = true; return; }
  const toque = e.pointerType === 'mouse' ? p.viaje < 6 : p.viaje < 12 && performance.now() - p.t0 < 450;
  if (toque && e.type === 'pointerup') elegir(e.clientX, e.clientY);
}
lienzo.addEventListener('pointerup', soltar);
lienzo.addEventListener('pointercancel', soltar);
lienzo.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') raton.dentro = false; });

// Apuntar es analítico: intersección del rayo con el frente de cada anaquel de la sala actual.
const rayo = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function apuntar(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  rayo.setFromCamera(ndc, camara);
  const o = rayo.ray.origin, d = rayo.ray.direction, s = sala(cq, cr);
  let mejor = null;
  for (const k of s.muros) {
    const dn = d.x * COS[k] + d.z * SIN[k];
    if (dn <= 1e-4) continue;
    const lam = (A - 0.29 - (o.x * COS[k] + o.z * SIN[k])) / dn;
    if (lam < 0 || lam > 5.5 || (mejor && lam > mejor.lam)) continue;
    const x = o.x + d.x * lam, y = o.y + d.y * lam, z = o.z + d.z * lam;
    const i = Math.floor((-x * SIN[k] + z * COS[k] + (R - 0.3) / 2) / RANURA);
    const a = Math.floor((y - BASE) / PASO);
    if (i < 0 || i >= POR_ANAQUEL || a < 0 || a >= ANAQUELES) continue;
    const b = libro(cq, cr, k, a, i);
    if (y > BASE + a * PASO + 0.02 + b.h + 0.04) continue;
    mejor = { lam, k, s: a, i, b };
  }
  return mejor;
}
function elegir(x, y) {
  if (bloqueado()) return;
  const b = apuntar(x, y);
  if (b) abrirLibro(b.k, b.s, b.i, 1);
}

// ── Interfaz ───────────────────────────────────────────────────────
const panelIntro = document.getElementById('intro');
const panelLibro = document.getElementById('libro');
const panelRegistro = document.getElementById('registro');
const ayuda = document.getElementById('ayuda');
const medidor = document.getElementById('fps');
const aviso = document.getElementById('aviso');
const AYUDA = tactil ? 'pulgar izquierdo: caminar · derecha: mirar · tocá un libro' : 'WASD: caminar · arrastrar: mirar · click en un libro · shift: correr';
ayuda.textContent = AYUDA;
const fmt = n => String(n).replace('-', '−');
function mostrarNodo() { document.getElementById('nodo').textContent = `NODO ${fmt(cq)} · ${fmt(cr)}`; }

let temporizadorAviso = 0;
function avisar(txt) {
  aviso.textContent = txt;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 2200);
}
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); avisar('Enlace copiado'); }
  catch { avisar(txt); }
}

let abiertoLibro = null;
function actualizarURL() {
  const u = new URLSearchParams();
  u.set('hex', `${cq}.${cr}`);
  if (abiertoLibro) {
    u.set('libro', `${abiertoLibro.k + 1}.${abiertoLibro.s + 1}.${abiertoLibro.i + 1}`);
    u.set('p', abiertoLibro.p);
  }
  history.replaceState(null, '', '?' + u.toString());
}
function leerURL() {
  const u = new URLSearchParams(location.search);
  const m = /^(-?\d{1,10})\.(-?\d{1,10})$/.exec(u.get('hex') || '');
  if (!m) return null;
  const q = Number(m[1]), r = Number(m[2]);
  if (Math.abs(q) > LIMITE || Math.abs(r) > LIMITE) return null;
  let lib = null;
  const ml = /^([1-6])\.([1-5])\.(\d{1,2})$/.exec(u.get('libro') || '');
  if (ml) {
    const k = +ml[1] - 1, s = +ml[2] - 1, i = +ml[3] - 1;
    const p = Math.min(PAGINAS, Math.max(1, parseInt(u.get('p'), 10) || 1));
    if (i < POR_ANAQUEL && !sala(q, r).abiertos[k]) lib = { k, s, i, p };
  }
  return { q, r, lib };
}

const elPagina = document.getElementById('pagina');
const elNum = document.getElementById('num-pagina');
const elHallazgo = document.getElementById('hallazgo');
function abrirLibro(k, s, i, p) {
  abiertoLibro = { k, s, i, p };
  document.getElementById('libro-titulo').textContent = '«' + titulo(cq, cr, k, s, i) + '»';
  document.getElementById('libro-id').textContent = `nodo ${fmt(cq)} · ${fmt(cr)}  ·  muro ${k + 1}  ·  anaquel ${s + 1}  ·  volumen ${i + 1}`;
  panelLibro.hidden = false;
  teclas.clear();
  ajustarHoja();
  irPagina(p);
}
function cerrarLibro() {
  panelLibro.hidden = true;
  abiertoLibro = null;
  actualizarURL();
}
function irPagina(p) {
  if (!abiertoLibro) return;
  p = Math.min(PAGINAS, Math.max(1, p | 0));
  abiertoLibro.p = p;
  elNum.value = p;
  const { k, s, i } = abiertoLibro;
  const pg = pagina(cq, cr, k, s, i, p);
  let html = '';
  pg.lineas.forEach((ln, j) => {
    if (pg.marca && pg.marca.linea === j) {
      html += ln.slice(0, pg.marca.desde) + `<mark class="${pg.hallazgo.tipo}">` + ln.slice(pg.marca.desde, pg.marca.hasta) + '</mark>' + ln.slice(pg.marca.hasta);
    } else html += ln;
    html += '\n';
  });
  elPagina.innerHTML = html;
  actualizarURL();
  if (!pg.hallazgo) { elHallazgo.hidden = true; return; }
  const { tipo, texto } = pg.hallazgo;
  elHallazgo.className = tipo === 'frase' ? '' : tipo;
  elHallazgo.innerHTML = tipo === 'silaba'
    ? `<div class="tipo">SÍLABA DEL VERBO</div><div class="texto">«${texto}»</div><div class="nota">Fragmento sin posición conocida. El Verbo no se escribe entero.</div>`
    : `<div class="tipo">${tipo === 'comun' ? 'FRASE COMÚN' : 'FRASE LEGIBLE'} · LÍNEA ${pg.marca.linea + 1}</div><div class="texto">«${normalizar(texto)}»</div>`;
  elHallazgo.hidden = false;
  // Lo cotidiano se lee pero no se registra: el registro guarda solo lo que viene de la Red.
  if (tipo !== 'comun') registrar(pg.hallazgo, location.href);
}
function ajustarHoja() {
  // La página entra entera: 80 columnas a lo ancho y 40 líneas a lo alto, dejando lugar al hallazgo.
  const ancho = elPagina.parentElement.clientWidth - 26;
  const alto = innerHeight - 260;
  elPagina.style.fontSize = Math.max(3, Math.min(13, ancho / (COLUMNAS * 0.602), alto / (LINEAS * 1.28))).toFixed(2) + 'px';
}
document.getElementById('cerrar').onclick = cerrarLibro;
document.getElementById('anterior').onclick = () => irPagina(abiertoLibro.p - 1);
document.getElementById('siguiente').onclick = () => irPagina(abiertoLibro.p + 1);
elNum.onchange = () => irPagina(parseInt(elNum.value, 10) || 1);
document.getElementById('copiar-libro').onclick = () => copiar(location.href);
document.getElementById('copiar').onclick = () => copiar(location.href);
document.getElementById('azar').onclick = () => {
  const n = () => Math.floor(Math.random() * 200001) - 100000;
  entrar(n(), n());
};
panelLibro.addEventListener('pointerdown', e => { if (e.target === panelLibro) cerrarLibro(); });

// Registro de hallazgos: conveniencia de este lector, vive solo en su navegador.
const CLAVE = 'babel.hallazgos';
function leerRegistro() { try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { return []; } }
function registrar(h, url) {
  const lista = leerRegistro();
  if (lista.some(x => x.url === url)) return;
  lista.unshift({ tipo: h.tipo, texto: h.tipo === 'silaba' ? h.texto : normalizar(h.texto), url });
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, 200))); } catch { /* sin almacenamiento */ }
  pintarRegistro();
  avisar(h.tipo === 'silaba' ? 'Sílaba del Verbo recuperada' : 'Hallazgo registrado');
}
function pintarRegistro() {
  const lista = leerRegistro();
  const silabas = lista.filter(x => x.tipo === 'silaba').length;
  document.getElementById('registro-btn').textContent = `hallazgos ${lista.length}` + (silabas ? ` · sílabas ${silabas}` : '');
  const ul = document.getElementById('registro-lista');
  ul.replaceChildren(...(lista.length ? lista : [null]).map(x => {
    const li = document.createElement('li');
    if (!x) { li.textContent = 'Todavía nada. Seguí los lomos tibios.'; return li; }
    const a = document.createElement('a');
    a.href = x.url;
    a.textContent = x.tipo === 'silaba' ? `sílaba «${x.texto}»` : `«${x.texto}»`;
    if (x.tipo === 'silaba') a.className = 'silaba';
    li.append(a);
    return li;
  }));
}
document.getElementById('registro-btn').onclick = () => { pintarRegistro(); panelRegistro.hidden = false; };
document.getElementById('cerrar-registro').onclick = () => { panelRegistro.hidden = true; };

function cerrarIntro() { panelIntro.hidden = true; }
document.getElementById('entrar').onclick = cerrarIntro;

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camara.aspect = innerWidth / innerHeight;
  camara.updateProjectionMatrix();
  if (!panelLibro.hidden) ajustarHoja();
});

// ── Bucle ──────────────────────────────────────────────────────────
function mover(dt) {
  if (bloqueado()) return;
  let ad = -joy.y, lat = joy.x, giro = 0;
  if (teclas.has('KeyW') || teclas.has('ArrowUp')) ad += 1;
  if (teclas.has('KeyS') || teclas.has('ArrowDown')) ad -= 1;
  if (teclas.has('KeyA')) lat -= 1;
  if (teclas.has('KeyD')) lat += 1;
  if (teclas.has('ArrowLeft') || teclas.has('KeyQ')) giro += 1;
  if (teclas.has('ArrowRight') || teclas.has('KeyE')) giro -= 1;
  yaw += giro * 1.9 * dt;
  const largo = Math.hypot(ad, lat);
  if (largo > 1) { ad /= largo; lat /= largo; }
  if (!largo) return;
  const v = (teclas.has('ShiftLeft') || teclas.has('ShiftRight') ? 6.5 : 3.3) * dt;
  const mx = (-Math.sin(yaw) * ad + Math.cos(yaw) * lat) * v;
  const mz = (-Math.cos(yaw) * ad - Math.sin(yaw) * lat) * v;
  if (transitable(px + mx, pz + mz)) { px += mx; pz += mz; }
  else if (transitable(px + mx, pz)) px += mx;
  else if (transitable(px, pz + mz)) pz += mz;
  const [dq, dr] = redondear(px, pz);
  if (dq || dr) {
    const [ox, oz] = centro(dq, dr);
    px -= ox; pz -= oz;
    cq += dq; cr += dr;
    construir();
    mostrarNodo();
    actualizarURL();
  }
}

function actualizarFoco() {
  const b = !tactil && raton.dentro && !bloqueado() && punteros.size === 0 ? apuntar(raton.x, raton.y) : null;
  const clave = b ? `${b.k}.${b.s}.${b.i}` : null;
  if (clave === enfocado) return;
  enfocado = clave;
  lienzo.classList.toggle('sobre-libro', !!b);
  marco.visible = !!b;
  if (b) {
    marco.matrixAutoUpdate = false;
    marco.matrix.copy(matrizLibro(0, 0, b.k, b.s, b.i, b.b, 0.012));
    ayuda.textContent = `muro ${b.k + 1} · anaquel ${b.s + 1} · volumen ${b.i + 1} · «${titulo(cq, cr, b.k, b.s, b.i)}»`;
  } else ayuda.textContent = AYUDA;
}

// Medición y calidad adaptativa: si no llega a ~50 fps, baja la resolución interna.
let acum = 0, cuadros = 0, ultimo = performance.now();
function medir(dt) {
  acum += dt; cuadros++;
  if (acum < 2) return;
  const fps = cuadros / acum;
  medidor.textContent = `${fps.toFixed(0)} fps · ${resolucion.toFixed(2)}x`;
  if (fps < 50 && resolucion > 0.7) { resolucion = Math.max(0.7, resolucion - 0.2); renderer.setPixelRatio(resolucion); renderer.setSize(innerWidth, innerHeight, false); }
  acum = 0; cuadros = 0;
}
function cuadro(ahora) {
  requestAnimationFrame(cuadro);
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  mover(dt);
  dibujar(ahora);
  medir(dt);
}
function dibujar(ahora = performance.now()) {
  camara.position.set(px, OJO, pz);
  camara.rotation.set(pitch, yaw, 0);
  actualizarFoco();
  matTibio.opacity = 0.22 + 0.14 * Math.sin(ahora * 0.0026);
  renderer.render(escena, camara);
}

// ── Arranque ───────────────────────────────────────────────────────
const inicio = leerURL();
if (new URLSearchParams(location.search).has('fps')) medidor.hidden = false;if (inicio) entrar(inicio.q, inicio.r);
else entrar(Math.floor(Math.random() * 200001) - 100000, Math.floor(Math.random() * 200001) - 100000);
if (inicio && inicio.lib) { panelIntro.hidden = true; abrirLibro(inicio.lib.k, inicio.lib.s, inicio.lib.i, inicio.lib.p); }
pintarRegistro();
requestAnimationFrame(cuadro);

// Ganchos para verificar determinismo y hallazgos desde la consola.
window.babel = { sala, pagina, libro, componer, variantes, gramaticas: { COTIDIANO, ECOS }, silaba, azar, entrar, transitable, estado: () => ({ cq, cr, px, pz, yaw, pitch }), dibujar, mirar: (y, p = 0) => { yaw = y; pitch = p; },
  ir: (x, z) => { px = x; pz = z; },
  caminar: (seg, codigo = 'KeyW') => { teclas.add(codigo); for (let t = 0; t < seg; t += 1 / 60) mover(1 / 60); teclas.delete(codigo); } };
