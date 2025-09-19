
# Visor Energético de Colombia

Este repositorio contiene un visor web desarrollado con [Leaflet](https://leafletjs.com/) para explorar capas geoespaciales relacionadas con la infraestructura energética y condicionantes socioambientales de Colombia.

## Características principales

- **Subestaciones** y **red eléctrica** consultadas en tiempo real desde OpenStreetMap mediante la API de Overpass.
- Capas locales configurables para representar:
  - Máscara de pendiente de suelo.
  - Áreas protegidas ambientales.
  - Áreas sensibles por conflictos sociales.
- Compatibilidad con servicios WMS adicionales.
- Control de capas y ventana de estado para conocer el resultado de cada carga.
- Diseño adaptable que funciona tanto en escritorio como en dispositivos móviles.

## Requisitos

No se necesita instalar dependencias. Basta con servir el directorio raíz mediante cualquier servidor web estático.

## Uso

1. Clona el repositorio:

   ```bash
   git clone https://github.com/<tu-usuario>/EnergiaCol.git
   cd EnergiaCol
   ```

2. Inicia un servidor web sencillo (ejemplos):

   ```bash
   # Usando Python 3
   python -m http.server 8000

   # o utilizando Node.js con npx
   npx serve .
   ```

3. Abre el navegador en `http://localhost:8000` (o el puerto que hayas elegido).

El visor cargará automáticamente las capas definidas. Las capas provenientes de Overpass pueden tardar algunos segundos dependiendo de la disponibilidad del servicio y el tamaño de la respuesta.

## Configuración de capas

La configuración se encuentra en `assets/js/app.js`:

- **Capas de Overpass (OSM)**: dentro del objeto `overpassEndpoints`. Ajusta la consulta, estilos o el límite espacial según tus necesidades.
- **Capas locales/WMS**: en el arreglo `customLayersConfig`. Cada elemento admite los siguientes campos:

  ```js
  {
    key: 'identificadorUnico',
    name: 'Nombre visible en el control de capas',
    source: 'geojson' | 'wms',
    path: 'ruta/al/archivo.geojson', // requerido si source === 'geojson'
    url: 'https://servidor/wms',     // requerido si source === 'wms'
    options: {                       // opciones adicionales para L.tileLayer.wms
      layers: 'nombre_capa',
      format: 'image/png',
      transparent: true,
      attribution: 'Fuente',
    },
    style: { ... },                  // estilos para capas GeoJSON
    visibleByDefault: true | false,
  }
  ```

Los archivos GeoJSON de ejemplo ubicados en el directorio `data/` sirven como plantilla para sustituir por tus datos reales.

## Estructura del proyecto

```
.
├── assets
│   ├── css
│   │   └── style.css
│   └── js
│       └── app.js
├── data
│   ├── areas_protegidas.geojson
│   ├── conflictos_sociales.geojson
│   └── pendiente_suelo.geojson
└── index.html
```

## Buenas prácticas y consideraciones

- Respeta las condiciones de uso de la API de Overpass: evita consultas innecesarias y reutiliza los resultados cuando sea posible.
- Si requieres un volumen de datos mayor o una disponibilidad garantizada, considera montar tus propios servicios geoespaciales (por ejemplo, GeoServer) y actualizar la configuración a servicios WMS/WMTS o vector tiles.
- Para despliegues en producción se recomienda empaquetar los recursos estáticos y servirlos mediante un CDN o un servicio web dedicado.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE` si decides añadir uno al repositorio. Los datos de OpenStreetMap se encuentran bajo la licencia [ODbL](https://opendatacommons.org/licenses/odbl/).
=======
