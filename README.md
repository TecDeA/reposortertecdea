# RepoSorter — PWA

Conversión a **Progressive Web App** de la aplicación *Organizador y Ordenador de Repositorios GitHub*.

## Contenido del paquete

```
pwa/
├── index.html              ← App HTML modificada (PWA + botón "Instalar app")
├── manifest.json           ← Web App Manifest (scope relativo "./")
├── sw.js                   ← Service Worker (scope "./" → no afecta al portal)
├── icon.svg                ← Icono vectorial (fuente de verdad)
├── icon-192.png            ← 192×192 (PWA, propósito "any")
├── icon-512.png            ← 512×512 (PWA, propósito "any")
├── icon-maskable-512.png   ← 512×512 (PWA, propósito "maskable")
├── apple-touch-icon.png    ← 180×180 (iOS)
└── favicon.ico             ← Multi-resolución 16/32/48
```

## Cómo no interfiere con el portal `https://tecdea.github.io/`

La PWA está diseñada para **convivir** con el portal sin afectarlo:

| Mecanismo | Detalle |
|---|---|
| `scope: "./"` en `manifest.json` | El alcance de instalación se limita a la subcarpeta donde vive la PWA. |
| SW registrado con `scope: "./"` | El service worker solo intercepta peticiones dentro de esa subcarpeta. |
| Comprobación `url.href.startsWith(self.registration.scope)` | Ignora cualquier URL fuera del subdirectorio, incluyendo la raíz del portal. |
| Cross-origin no interceptado | Los CDNs (Tailwind, FontAwesome, Google Fonts) y `api.github.com` pasan directos al navegador. |
| `start_url: "./index.html?source=pwa"` | Al abrirse la app instalada, no "secuestra" la URL raíz del portal. |

## Despliegue recomendado en GitHub Pages

1. Sube **todo el contenido de la carpeta `pwa/`** a un subdirectorio del repo del portal, por ejemplo:  
   `TecDeA/tecdea.github.io/reposorter/`
2. La app quedará accesible en:  
   `https://tecdea.github.io/reposorter/`
3. Verifica en DevTools → Application → Manifest que el scope es  
   `https://tecdea.github.io/reposorter/`
4. Verifica en Application → Service Workers que el SW está activo con el mismo scope.

> Alternativa: crea un repo aparte `TecDeA/reposorter` con GitHub Pages activado → `https://tecdea.github.io/reposorter/`. Misma URL, mismo resultado.

## Probar localmente antes de desplegar

El SW solo funciona bajo `http://` o `https://` (no `file://`). Para probarlo:

```bash
cd pwa
python3 -m http.server 8080
# Abre http://localhost:8080/index.html
```

## Comandos de GitHub CLI (recordatorio del propio app)

```bash
gh repo list TECDEA --limit 100 --json name,url > repos.json
```

## Personalización rápida

- **Cambiar la paleta de iconos**: edita `icon.svg` (colores `#16a34a`/`#34d399` para el verde) y regenera los PNG con `python3 /home/z/my-project/scripts/generate_pwa_icons.py`.
- **Cambiar `theme_color`**: en `manifest.json` y en la etiqueta `<meta name="theme-color">` de `index.html`.
- **Añadir caché offline adicional**: edita el array `APP_SHELL` en `sw.js` y sube `VERSION` (p.ej. `v1.1.0`) para forzar la actualización en clientes existentes.
- **Accesos directos del menú contextual** (clic largo en el icono): ya configurados en `manifest.json` → `shortcuts` (`?action=sample` y `?action=import`).

## Compatibilidad

- ✅ **Chromium (Chrome/Edge/Brave)** — instalación completa, beforeinstallprompt, SW.
- ✅ **Firefox** — SW y manifest funcionan; sin botón "Instalar" nativo.
- ✅ **Safari iOS 16.4+** — soporta manifest y SW. En iOS 15 y anteriores, usa las meta tags Apple incluidas ("Añadir a pantalla de inicio").
- ✅ **Android (Chrome)** — instalación con icono en escritorio y nombre `RepoSorter`.
- ✅ **Escritorio (Chrome/Edge)** — instalable como app standalone.
