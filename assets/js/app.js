const mapConfig = {
  center: [4.5709, -74.2973],
  zoom: 6,
  minZoom: 5,
  maxZoom: 14,
};

const colombiaBounds = L.latLngBounds(
  L.latLng(-4.5, -79.1),
  L.latLng(13.6, -66.8)
);

const colombiaBbox = [
  colombiaBounds.getSouth(),
  colombiaBounds.getWest(),
  colombiaBounds.getNorth(),
  colombiaBounds.getEast(),
].join(',');

const overpassEndpoints = {
  subestaciones: {
    label: 'Subestaciones (OSM)',
    query: `[out:json][timeout:180];
      (
        node["power"="substation"](${colombiaBbox});
        way["power"="substation"](${colombiaBbox});
        relation["power"="substation"](${colombiaBbox});
      );
      out body center;`,
    style: {
      radius: 6,
      fillColor: '#2c7fb8',
      color: '#0b3d91',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    },
  },
  redElectrica: {
    label: 'Red eléctrica (OSM)',
    query: `[out:json][timeout:180];
      (
        way["power"="line"](${colombiaBbox});
        relation["power"="line"](${colombiaBbox});
      );
      out body;
      >;
      out skel qt;`,
    style: {
      color: '#fdae61',
      weight: 2,
      opacity: 0.85,
    },
  },
};

const customLayersConfig = [
  {
    key: 'slopeMask',
    name: 'Máscara de pendiente de suelo',
    source: 'geojson',
    path: 'data/pendiente_suelo.geojson',
    style: {
      color: '#7fc97f',
      weight: 1,
      fillColor: '#b8e186',
      fillOpacity: 0.35,
    },
    visibleByDefault: true,
  },
  {
    key: 'protectedAreas',
    name: 'Áreas protegidas ambientales',
    source: 'geojson',
    path: 'data/areas_protegidas.geojson',
    style: {
      color: '#386cb0',
      weight: 1,
      fillColor: '#8da0cb',
      fillOpacity: 0.4,
    },
    visibleByDefault: false,
  },
  {
    key: 'socialConflict',
    name: 'Áreas sensibles por conflictos sociales',
    source: 'geojson',
    path: 'data/conflictos_sociales.geojson',
    style: {
      color: '#ef3b2c',
      weight: 1,
      fillColor: '#fb6a4a',
      fillOpacity: 0.35,
    },
    visibleByDefault: false,
  },
  // Ejemplo de configuración para servicios WMS.
  // Descomenta y ajusta para utilizar un servicio externo.
  // {
  //   key: 'wmsExample',
  //   name: 'Ejemplo WMS',
  //   source: 'wms',
  //   url: 'https://tuservidor/wms',
  //   options: {
  //     layers: 'capa_wms',
  //     format: 'image/png',
  //     transparent: true,
  //     attribution: 'Fuente WMS',
  //   },
  //   visibleByDefault: false,
  // },
];

const statusList = document.getElementById('status-list');

function updateStatus(message, status = 'loading') {
  const icons = {
    loading: '⏳',
    success: '✅',
    error: '⚠️',
  };

  const listItem = document.createElement('li');
  listItem.innerHTML = `<span class="status-icon">${icons[status]}</span>${message}`;
  statusList.appendChild(listItem);
}

function clearStatus() {
  statusList.innerHTML = '';
}

function buildBaseLayers() {
  const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  });

  const cartoPositron = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://carto.com/attributions">CARTO</a>, &copy; OpenStreetMap contributors',
    }
  );

  return {
    OpenStreetMap: osmStandard,
    'CartoDB Positron': cartoPositron,
  };
}

function buildMap() {
  const baseLayers = buildBaseLayers();
  const map = L.map('map', {
    center: mapConfig.center,
    zoom: mapConfig.zoom,
    minZoom: mapConfig.minZoom,
    maxZoom: mapConfig.maxZoom,
    layers: [baseLayers.OpenStreetMap],
    maxBounds: colombiaBounds.pad(0.2),
    maxBoundsViscosity: 0.6,
  });

  L.control.scale({ metric: true }).addTo(map);

  return { map, baseLayers };
}

async function fetchOverpassData(query) {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(overpassUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Error en Overpass: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return osmtogeojson(data);
}

function createPopupContent(properties = {}, layerName) {
  const title = properties.name || properties.ref || 'Elemento sin nombre';
  const entries = Object.entries(properties)
    .filter(([key]) => !['@id', 'name'].includes(key))
    .map(([key, value]) => `<li><strong>${key}</strong>: ${value}</li>`)
    .join('');

  const listContent = entries || '<li>Sin atributos adicionales disponibles.</li>';

  return `
    <article class="popup-content">
      <h3>${layerName}</h3>
      <h4>${title}</h4>
      <ul>${listContent}</ul>
    </article>
  `;
}

function setupGeoJsonLayer(geojson, options = {}) {
  const { style = {}, pointToLayer, onEachFeature } = options;

  return L.geoJSON(geojson, {
    style,
    pointToLayer:
      pointToLayer || ((feature, latlng) => L.circleMarker(latlng, Object.assign({ radius: 6 }, style))),
    onEachFeature,
  });
}

async function addOverpassLayer(map, layerControl, layerKey, config) {
  try {
    updateStatus(`Cargando ${config.label} desde Overpass...`, 'loading');
    const geojson = await fetchOverpassData(config.query);

    const layer = setupGeoJsonLayer(geojson, {
      style: config.style,
      onEachFeature: (feature, layerItem) => {
        const popupHtml = createPopupContent(feature.properties, config.label);
        layerItem.bindPopup(popupHtml);
      },
    });

    layer.addTo(map);
    layerControl.addOverlay(layer, config.label);
    updateStatus(
      `${config.label} cargada (${geojson.features?.length ?? 0} elementos).`,
      'success'
    );
  } catch (error) {
    console.error(error);
    updateStatus(`No se pudo cargar ${config.label}: ${error.message}`, 'error');
  }
}

async function addCustomLayer(map, layerControl, config) {
  try {
    updateStatus(`Cargando ${config.name}...`, 'loading');
    let layer;

    if (config.source === 'geojson') {
      const response = await fetch(config.path);
      if (!response.ok) {
        throw new Error(`Archivo no disponible (${response.status})`);
      }

      const geojson = await response.json();
      layer = setupGeoJsonLayer(geojson, {
        style: config.style,
        onEachFeature: (feature, layerItem) => {
          const popupHtml = createPopupContent(feature.properties, config.name);
          layerItem.bindPopup(popupHtml);
        },
      });
    } else if (config.source === 'wms') {
      layer = L.tileLayer.wms(config.url, config.options);
    } else {
      throw new Error(`Fuente desconocida: ${config.source}`);
    }

    if (config.visibleByDefault) {
      layer.addTo(map);
    }

    layerControl.addOverlay(layer, config.name);
    updateStatus(`${config.name} disponible.`, 'success');
  } catch (error) {
    console.error(error);
    updateStatus(`No se pudo cargar ${config.name}: ${error.message}`, 'error');
  }
}

async function init() {
  clearStatus();

  const { map, baseLayers } = buildMap();
  const layerControl = L.control.layers(baseLayers, {}, { collapsed: false }).addTo(map);

  // Capas OSM (Overpass)
  for (const [layerKey, config] of Object.entries(overpassEndpoints)) {
    await addOverpassLayer(map, layerControl, layerKey, config);
  }

  // Capas locales o WMS
  for (const config of customLayersConfig) {
    await addCustomLayer(map, layerControl, config);
  }
}

window.addEventListener('DOMContentLoaded', init);
