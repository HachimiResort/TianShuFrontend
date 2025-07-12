import { useEffect, useState } from 'react';
import  { Map as ReactMap, type MapProps ,Marker, Popup, Source, Layer} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
interface Location {
    index: string
    sensor_id: string
    latitude: string
    longitude: string
}

interface LineData {
    id: string;
    coordinates: [number, number][]; // 线段的经纬度坐标数组
}

function processAdjacencyMatrix(matrix: string[], locations: Location[]): LineData[] {
    const lineDataArray: LineData[] = [];
    // 创建一个快速查找的映射，从index到location
    const locationMap = new Map<string, Location>();
    locations.forEach(location => {
        locationMap.set(location.index, location);
    });

    // 遍历邻接矩阵，连接有关系的 index
    for (let i = 0; i < matrix.length; i++) {
        const row = matrix[i].split(',').map(Number);
        for (let j = 0; j < row.length; j++) {
            if (row[j] !== 0 && i !== j) { // 有关系且不是自身
                const location1 = locationMap.get(locations[i].index);
                const location2 = locationMap.get(locations[j].index);
                if (location1 && location2) {
                    // 避免重复连线（只保留 i < j 的线）
                    if(i>j) {
                      lineDataArray.push({
                        id: `line_${location1.index}_${location2.index}`,
                        coordinates: [
                            [parseFloat(location1.longitude), parseFloat(location1.latitude)],
                            [parseFloat(location2.longitude), parseFloat(location2.latitude)]
                        ]
                      });
                    }
                }
            }
        }
    }
    return lineDataArray;
}

export function MapLocation() {
    const [locationList, setLocationList] = useState<Location[]>([])
    const [selectedLocation, setSelectedLocation] = useState<Location|null>(null)
    const [lineArray, setLineArray] = useState<LineData[]>([])
    const [error, setError] = useState<string | null>(null);

    useEffect(()=> {
        const fetchLocations = async () => {
        try {
            console.log("加载--------")
            const response = await fetch('https://18b3cbee-5ec5-4459-8bbf-b69927c64682.mock.pstmn.io/location');
            const matrix_response = await fetch('https://18b3cbee-5ec5-4459-8bbf-b69927c64682.mock.pstmn.io/matrix');
            if (!response.ok || !matrix_response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data: Location[] = await response.json();
            const matrix_json = await matrix_response.json();
            // matrix_json 结构: { matrix: [string1, string2, ...] }
            const matrix_data: string[] = matrix_json.matrix;
            setLocationList(data);
            setLineArray(processAdjacencyMatrix(matrix_data,data))
        } catch (err) {
            setError('Failed to fetch locations');
            console.error(err);
            console.log(error)
        }
        };
        fetchLocations();
    }, [])

    // 初始视图状态
    const [viewState, setViewState] = useState({
        longitude: 0,
        latitude: 0,
        zoom: 15,
    });

    // 当 locationList 加载后，自动定位到第一个元素
    useEffect(() => {
        if (locationList.length > 1) {
          console.log(`经纬坐标:${Number(locationList[0].longitude)},${Number(locationList[0].latitude)}`)
            setViewState({
                longitude: Number(locationList[1].longitude),
                latitude: Number(locationList[1].latitude),
                zoom: 15,
            });
        }
    }, [locationList]);

    const mapProps: MapProps = {
        initialViewState: viewState,
        style: { width: '100%', height: '100%' },
        mapStyle : "https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"
    }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <ReactMap
        {...mapProps}
        onMove={evt => setViewState(evt.viewState)}
      >
        {selectedLocation && (
          <Popup
            longitude={Number(selectedLocation.longitude)}
            latitude={Number(selectedLocation.latitude)}
            closeOnClick={false}
            onClose={() => setSelectedLocation(null)}
          >
            <div style={{ color: '#1976d2' }}>
              <h3>Sensor:{selectedLocation.sensor_id}</h3>
              <p>Index:{selectedLocation.index}</p>
              <p>latitude:{selectedLocation.latitude}</p>
              <p>longitude:{selectedLocation.longitude}</p>
            </div>
          </Popup>
        )}
        
        {locationList.map(location => (
          <Marker
            key={location.index}
            longitude={Number(location.longitude)}
            latitude={Number(location.latitude)}
            onClick={() => setSelectedLocation(location)}
          />
        ))}
        {
          lineArray.map((line) => (  // 注意这里改成了箭头函数返回 JSX
            <Source
              key={line.id}
              id={line.id}
              type="geojson"
              data={{
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: line.coordinates,
                },
                properties: {},
              }}
            >
              <Layer
                id={line.id}
                type="line"
                paint={{
                  'line-color': '#ff0000', // 线段颜色
                  'line-width': 3,         // 线段宽度
                }}
              />
            </Source>
          ))
        }
      </ReactMap>
    </div>
  );
}



//mapStyle="https://api.maptiler.com/maps/streets/style.json?key=AKUofKhmm1j1S5bzzZ0F"