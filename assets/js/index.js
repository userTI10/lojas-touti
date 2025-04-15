// Inicializa o mapa
const map = L.map('map').setView([-23.550520, -46.633308], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Cria um ícone personalizado
const customIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/srubens/lojas-touti/main/touti-nlogo-wbg.jpg',
    iconSize: [32, 32], // tamanho do ícone
    iconAnchor: [16, 32], // ponto do ícone que corresponderá à localização
    popupAnchor: [0, -32] // ponto de onde o popup deve abrir em relação ao iconAnchor
});

const estadosCoordenadas = {
    'AC': [-8.77, -70.55, 7],
    'AL': [-9.71, -35.73, 8],
    'AM': [-3.07, -61.66, 6],
    'AP': [1.41, -51.77, 7],
    'BA': [-12.96, -38.51, 7],
    'CE': [-3.71, -38.54, 7],
    'DF': [-15.83, -47.86, 9],
    'ES': [-19.19, -40.34, 8],
    'GO': [-16.64, -49.31, 7],
    'MA': [-2.55, -44.30, 7],
    'MG': [-18.10, -44.38, 7],
    'MS': [-20.51, -54.54, 7],
    'MT': [-12.64, -55.42, 7],
    'PA': [-5.53, -52.29, 6],
    'PB': [-7.06, -35.55, 8],
    'PE': [-8.28, -35.07, 8],
    'PI': [-8.28, -43.68, 7],
    'PR': [-24.89, -51.55, 7],
    'RJ': [-22.84, -43.15, 8],
    'RN': [-5.79, -36.51, 8],
    'RO': [-11.22, -62.80, 7],
    'RR': [1.89, -61.22, 7],
    'RS': [-30.01, -51.22, 7],
    'SC': [-27.33, -49.44, 7],
    'SE': [-10.90, -37.07, 8],
    'SP': [-23.55, -46.63, 7],
    'TO': [-10.25, -48.25, 7]
};

function filtrarPorEstado(uf) {
    if (!uf) return;
    const coords = estadosCoordenadas[uf];
    if (coords) {
        map.setView([coords[0], coords[1]], coords[2]);
    }
}

function formatCEP(cep) {
    return cep ? String(cep).replace(/[^0-9]/g, '').padStart(8, '0') : '00000000';
}

fetch('data.xlsx')
    .then(response => response.arrayBuffer())
    .then(async (data) => {
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = XLSX.utils.sheet_to_json(firstSheet).map(row => ({
            'NOME FANTASIA': row['NOME FANTASIA'],
            'CEP': formatCEP(row['CEP']),
            'LOGRADOURO': row['LOGRADOURO'],
            'COMPLEMENTO': row['COMPLEMENTO'],
            'BAIRRO': row['BAIRRO'],
            'CIDADE': row['CIDADE'],
            'UF': row['UF']
        }));

        const estados = [...new Set(jsonData.map(item => item.UF))].sort();
        const selectEstado = document.getElementById('estadoFilter');
        estados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            selectEstado.appendChild(option);
        });

        for (const item of jsonData) {
            const coords = await buscarCoordenadas(item.CEP);
            if (coords) {
                const marker = L.marker([coords.lat, coords.lon], {
                    icon: customIcon
                }).addTo(map);
                
                // Adiciona dados ao marcador
                marker.getData = () => ({
                    nomeFantasia: item['NOME FANTASIA'],
                    cep: item.CEP
                });

                marker.bindPopup(`
                    <b>${item['NOME FANTASIA']}</b><br>
                    ${item.LOGRADOURO}, ${item.COMPLEMENTO}<br>
                    ${item.BAIRRO} - ${item.CIDADE}/${item.UF}<br>
                    CEP: ${item.CEP}
                `);

                markers.push(marker);
            }
        }
    })
    .catch(error => console.error('Erro ao carregar o arquivo:', error));

async function buscarCoordenadas(cep) {
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
        const data = await response.json();
        
        if (!data || data.errors) return null;

        // Monta o endereço usando os dados da Brasil API
        const endereco = `${data.street || ''}, ${data.city}, ${data.state}, Brasil`;
        const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`;
        
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.length > 0) {
            return {
                lat: geocodeData[0].lat,
                lon: geocodeData[0].lon,
                endereco: endereco
            };
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar coordenadas:', error);
        return null;
    }
}

let markers = []; // Array para armazenar todos os marcadores

function buscarLocal() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const searchCEP = searchTerm.replace(/[^0-9]/g, '');

    // Procura marcador correspondente
    const foundMarker = markers.find(marker => {
        const data = marker.getData();
        return data.nomeFantasia.toLowerCase().includes(searchTerm) || 
               data.cep === searchCEP;
    });

    if (foundMarker) {
        map.setView(foundMarker.getLatLng(), 15);
        foundMarker.openPopup();
    } else {
        alert('Local não encontrado!');
    }
}

// Substituir o fetch do arquivo XLSX por:
/*fetch('https://sheetdb.io/api/v1/g6pzaqljw9h87?sheet=lojas-touti')
    .then(response => response.json())
    .then(async (jsonData) => {
        // Mapeia os dados da API para o mesmo formato
        const formattedData = jsonData.map(row => ({
            'NOME FANTASIA': row['NOME FANTASIA'],
            'CEP': formatCEP(row['CEP']),
            'LOGRADOURO': row['LOGRADOURO'],
            'COMPLEMENTO': row['COMPLEMENTO'],
            'BAIRRO': row['BAIRRO'],
            'CIDADE': row['CIDADE'],
            'UF': row['UF']
        }));

        const estados = [...new Set(formattedData.map(item => item.UF))].sort();
        const selectEstado = document.getElementById('estadoFilter');
        estados.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            selectEstado.appendChild(option);
        });

        for (const item of formattedData) {
            const coords = await buscarCoordenadas(item.CEP);
            if (coords) {
                const marker = L.marker([coords.lat, coords.lon], {
                    icon: customIcon
                }).addTo(map);
                
                marker.getData = () => ({
                    nomeFantasia: item['NOME FANTASIA'],
                    cep: item.CEP
                });

                marker.bindPopup(`
                    <b>${item['NOME FANTASIA']}</b><br>
                    ${item.LOGRADOURO}, ${item.COMPLEMENTO}<br>
                    ${item.BAIRRO} - ${item.CIDADE}/${item.UF}<br>
                    CEP: ${item.CEP}
                `);

                markers.push(marker);
            }
        }
    })
    .catch(error => console.error('Erro ao carregar os dados:', error));*/