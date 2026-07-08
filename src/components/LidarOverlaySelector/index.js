import React, {useMemo, useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';

const REGIONS = [
  {
    id: 'pl-krakow-lrm',
    country: 'Poland',
    title: 'Kraków Area',
    provider: 'GUGiK',
    source: 'Polish LiDAR / DTM open data',
    visualization: 'LRM',
    bestFor: 'micro-relief, old roads, terraces, embankments',
    area: 'Demo area around Kraków',
    zoom: '12–17',
    size: 'Coming soon',
    fileName: 'poland-krakow-lrm.sqlitedb',
    filePath: '/downloads/lidar/poland-krakow-lrm.sqlitedb',
    available: false,
  },
  {
    id: 'nl-amsterdam-hillshade',
    country: 'Netherlands',
    title: 'Amsterdam Area',
    provider: 'AHN',
    source: 'Dutch LiDAR / DEM open data',
    visualization: 'Multi-hillshade',
    bestFor: 'general terrain reading, embankments, subtle landscape forms',
    area: 'Demo area around Amsterdam',
    zoom: '12–17',
    size: 'Coming soon',
    fileName: 'netherlands-amsterdam-hillshade.sqlitedb',
    filePath: '/downloads/lidar/netherlands-amsterdam-hillshade.sqlitedb',
    available: false,
  },
  {
    id: 'cz-prague-svf',
    country: 'Czechia',
    title: 'Prague Area',
    provider: 'ČÚZK',
    source: 'Czech elevation / terrain data',
    visualization: 'SVF',
    bestFor: 'ditches, hollow ways, terraces, archaeological terrain traces',
    area: 'Demo area around Prague',
    zoom: '12–17',
    size: 'Coming soon',
    fileName: 'czechia-prague-svf.sqlitedb',
    filePath: '/downloads/lidar/czechia-prague-svf.sqlitedb',
    available: false,
  },
];

export default function LidarOverlaySelector() {
  const [selectedId, setSelectedId] = useState(REGIONS[0].id);

  const selectedRegion = useMemo(
    () => REGIONS.find((region) => region.id === selectedId) || REGIONS[0],
    [selectedId],
  );

  const selectedFileUrl = useBaseUrl(selectedRegion.filePath);

  return (
    <section className={styles.lidarSection}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Experimental OsmAnd tool</p>
        <h2>LiDAR Overlay for OsmAnd</h2>
        <p>
          Choose a region, download high-resolution LiDAR relief as an offline
          raster layer, and use it above the standard OsmAnd vector map.
        </p>
      </div>

      <div className={styles.layout}>
        <div className={styles.regionList}>
          {REGIONS.map((region) => (
            <button
              key={region.id}
              type="button"
              className={`${styles.regionButton} ${
                selectedId === region.id ? styles.regionButtonActive : ''
              }`}
              onClick={() => setSelectedId(region.id)}
            >
              <span>{region.country}</span>
              <strong>{region.title}</strong>
              <small>{region.visualization}</small>
            </button>
          ))}
        </div>

        <article className={styles.details}>
          <div className={styles.badges}>
            <span>{selectedRegion.country}</span>
            <span>{selectedRegion.visualization}</span>
            <span>SQLiteDB</span>
          </div>

          <h2>{selectedRegion.title}</h2>

          <p className={styles.description}>
            This overlay is designed for {selectedRegion.bestFor}. It can be
            imported into OsmAnd and selected as an Overlay or Underlay map.
          </p>

          <dl className={styles.meta}>
            <div>
              <dt>Provider</dt>
              <dd>{selectedRegion.provider}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{selectedRegion.source}</dd>
            </div>
            <div>
              <dt>Area</dt>
              <dd>{selectedRegion.area}</dd>
            </div>
            <div>
              <dt>Zoom</dt>
              <dd>{selectedRegion.zoom}</dd>
            </div>
            <div>
              <dt>File</dt>
              <dd>{selectedRegion.fileName}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{selectedRegion.size}</dd>
            </div>
          </dl>

          <div className={styles.actions}>
            {selectedRegion.available ? (
              <a
                className={styles.primaryButton}
                href={selectedFileUrl}
                download
              >
                Download for OsmAnd
              </a>
            ) : (
              <button className={styles.disabledButton} type="button" disabled>
                Demo file coming soon
              </button>
            )}

            <a
              className={styles.secondaryButton}
              href="https://osmand.net/docs/user/map/raster-maps/"
              target="_blank"
              rel="noreferrer"
            >
              OsmAnd raster maps guide
            </a>
          </div>
        </article>
      </div>

      <div className={styles.howTo}>
        <h2>How to use it in OsmAnd</h2>

        <ol>
          <li>Download the <code>.sqlitedb</code> file to your device.</li>
          <li>Open the file with OsmAnd and import it.</li>
          <li>Go to <strong>Menu → Configure map → Overlay map</strong>.</li>
          <li>Select the LiDAR layer and set transparency around 40–60%.</li>
        </ol>

        <p>
          Android note: enable <strong>Menu → Plugins → Online maps</strong> first.
        </p>
      </div>
    </section>
  );
}
