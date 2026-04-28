const basemapStreet = 'https://basemap.mapid.io/styles/street-2d-building/style.json?key=69a8edeffdb1d3dbc8b3022c';
const basemapDark = 'https://basemap.mapid.io/styles/dark/style.json?key=69a8edeffdb1d3dbc8b3022c';
const basemapSatellite = 'https://basemap.mapid.io/styles/satellite/style.json?key=69a8edeffdb1d3dbc8b3022c';

// Inisialisasi peta dengan gaya street dan koordinat awal di Surabaya
const map = new maplibregl.Map({
    container:'map-view', // ID elemen HTML tempat peta akan ditampilkan
    style: basemapStreet, // Gaya peta yang digunakan
    center: [112.77810388583353, -7.597951493434434], // Koordinat pusat peta (longitude, latitude)
    zoom: 8 // Tingkat zoom awal peta
})

// URL basemap API data
// const url_rel = 'https://geoserver.mapid.io/layers_new/get_layer?api_key=316ee5aadc664abfaca1543a7f8affa8&layer_id=69ec2c961adb68b4b789023b&project_id=69ec1aa0c37c0f35bb1cb587'
// const url_perlintasan = ;
// const url_administrasi = ;

import { poiData } from './mapData.js';
import * as turf from 'https://cdn.jsdelivr.net/npm/@turf/turf@6/+esm';

// Menampilkan jumlah data di konsol untuk verifikasi
console.log(`Jumlah titik: ${poiData.features.length}`);
// Contoh akses properti feature pertama
const namaLokasi = poiData.features[0].properties.nama;
console.log(`Lokasi pertama: ${namaLokasi}`)

// Buffer zone color (default)
let bufferColor = 'red';

// Fungsi untuk membuat buffer dari poiData
const createBuffer = (data, distance = 12) => {
    const buffered = turf.buffer(data, distance, { units: 'meters' });
    return buffered;
};

// Default buffer data
let bufferData = createBuffer(poiData, 12);

async function loadData(){
//     // Mengambil data rel dari API
//     const relResponse = await fetch(url_rel);
//     // Mengonversi respons menjadi format JSON
//     const relData = await relResponse.json();

//     // Menampilkan data rel di konsol untuk verifikasi
//     console.log(relResponse);
//     console.log(relData);

    // Cek apakah source 'rel' sudah ada di style yang baru
    if (map.getSource('rel')) return; 

    // Menambahkan data rel ke peta
    map.addSource('rel', {
        type: 'geojson',
        data: poiData,
    });

    // Menambahkan layer untuk menampilkan rel
    map.addLayer({
        id: 'rel-layer',
        source: 'rel',
        type: 'line',
        paint:{
            'line-color': '#F227F5',
            'line-width': 2
        },
        layout:{
            'visibility': 'visible'
        }
    })
}

map.on('load', () =>{
    loadData();
})

// ================= CONTROLS =================
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const locateBtn = document.getElementById('locateBtn');
const basemapBtn = document.getElementById('basemapBtn');


zoomInBtn?.addEventListener('click', () => map.zoomIn());
zoomOutBtn?.addEventListener('click', () => map.zoomOut());

// Variable untuk menyimpan marker agar bisa diupdate/dihapus
let userMarker;
let searchMarker;

locateBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung oleh browser ini.');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.flyTo({
                center: [lng, lat],
                zoom: 16,
                essential: true
            })
            
            if (searchMarker) searchMarker.remove()
            if (userMarker) userMarker.remove(); // Hapus marker lama jika ada

            userMarker = new maplibregl.Marker({color: '#FF0000'})
                .setLngLat([lng, lat])
                .setPopup(new maplibregl.Popup({ offset: 25 })
                    .setHTML("<h4>Lokasi Saya</h4>"))
                .addTo(map);

            userMarker.togglePopup();
        },
        () => {
          alert('Tidak dapat mendapatkan lokasi Anda. Menampilkan peta area default.');
          map.flyTo({center: [112.77810388583353, -7.597951493434434], zoom: 8});
        }
      );
});


// ================= SEARCH =================
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('searchBtn');

// Fungsi pencarian reusable
const performSearch = async () => {
    const query = searchInput.value;
    if (!query.trim()) {
        alert("Masukkan kata kunci pencarian.");
        return;
    }
    
    try{
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,{
                headers:{
                    'User-Agent': 'myWebGISApp/1.0 (karir.hafidh@gmail.com)',
                    'Accept': 'application/json'
                }
            }
        )
        console.log("Response status:", response.status);

        const data = await response.json();
        console.log("Data hasil pencarian:", data);

        if (data.length > 0) {
            const { lon, lat, display_name } = data[0];
            const coords = [parseFloat(lon), parseFloat(lat)];
            console.log("Koordinat hasil:", lon, lat);
            console.log("Nama lokasi:", display_name);

            // Hapus marker sebelumnya jika sudah ada
            if (userMarker) userMarker.remove();
            if (searchMarker) searchMarker.remove();

            // Arahkan peta ke lokasi
            map.flyTo({
                center: coords,
                zoom: 14,
                essential: true
            });

            // Tambahkan Marker/Pin baru
            searchMarker = new maplibregl.Marker({
                color: "#FF0000", // Warna pin merah
                draggable: false
            })
            .setLngLat(coords)
            .setPopup(new maplibregl.Popup({ offset: 25, closeOnClick: false }) // Tambahkan popup keterangan
                .setHTML(`<b>Hasil Pencarian:</b><br><small>${display_name}</small>`))
            .addTo(map)
            .togglePopup();

        } else {
            alert("Lokasi tidak ditemukan.");
        }
    } catch (error) {
        console.error("Error fetching geocode:", error);
        alert("Terjadi kesalahan saat mencari lokasi.");
    }
};

// Trigger pencarian dengan tombol Enter
searchInput.addEventListener('keypress', async (e) =>{
    if (e.key == 'Enter') {
        performSearch();
    }
});

// Trigger pencarian dengan tombol klik
searchBtn?.addEventListener('click', () => {
    performSearch();
});

// ================= BASEMAP SWITCHER =================
basemapBtn?.addEventListener('click', event => {
      event.stopPropagation();
      basemapPanel?.classList.toggle('hidden');
    });

// Fungsi untuk menambahkan kembali source dan layer setelah basemap diganti
const reloadMapData = () => {
    // Tambahkan source jika belum ada
    if (!map.getSource('rel')) {
        map.addSource('rel', {
            type: 'geojson',
            data: poiData,
        });
    }

    // Tambahkan layer rel jika belum ada
    if (!map.getLayer('rel-layer')) {
        map.addLayer({
            id: 'rel-layer',
            source: 'rel',
            type: 'line',
            paint: {
                'line-color': '#F227F5',
                'line-width': 2
            },
            layout: {
                'visibility': 'visible'
            }
        });
    }

    // Tambahkan source buffer jika belum ada
    if (!map.getSource('buffer')) {
        map.addSource('buffer', {
            type: 'geojson',
            data: bufferData,
        });
    }

    // Tambahkan layer buffer jika belum ada
    if (!map.getLayer('buffer-layer')) {
        map.addLayer({
            id: 'buffer-layer',
            source: 'buffer',
            type: 'fill',
            paint: {
                'fill-color': bufferColor,
                'fill-opacity': 0.3
            },
            layout: {
                'visibility': 'visible'
            }
        });
        
        // Pindahkan layer ke paling atas agar selalu terlihat di atas basemap
        map.moveLayer('buffer-layer');
    }
};

// Fungsi untuk mengubah gaya peta ke gaya satelit
window.updateStyleToSatellite = () => {
    map.setStyle(basemapSatellite);
    map.once('style.load', reloadMapData);
};

// Fungsi untuk mengubah gaya peta ke gaya dark
window.updateStyleToDark = () => {
    map.setStyle(basemapDark);
    map.once('style.load', reloadMapData);
};

// Fungsi untuk mengubah gaya peta ke gaya street
window.updateStyleToStreet = () => {
    map.setStyle(basemapStreet);
    map.once('style.load', reloadMapData);
};

// Muat ulang data saat style awal selesai dimuat
map.on('style.load', reloadMapData);

// ================= BUFFER ZONE CONTROLS =================
// Fungsi untuk mengubah warna buffer zone
window.updateBufferColor = (color) => {
    bufferColor = color;
    // Update buffer data dengan warna baru
    bufferData = createBuffer(poiData, 12);
    
    // Update source dan layer jika sudah ada
    if (map.getSource('buffer')) {
        map.getSource('buffer').setData(bufferData);
    }
    if (map.getLayer('buffer-layer')) {
        map.setPaintProperty('buffer-layer', 'fill-color', bufferColor);
    }
};

// Fungsi untuk mengubah jarak buffer
window.updateBufferDistance = (distance) => {
    bufferData = createBuffer(poiData, distance);
    
    if (map.getSource('buffer')) {
        map.getSource('buffer').setData(bufferData);
    }
};