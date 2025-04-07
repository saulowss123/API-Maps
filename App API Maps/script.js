let map;
let directionsService;
let directionsRenderer;
let placesService;
let autocompleteOrigin;
let autocompleteWaypoints = [];

// Função principal que inicializa o mapa
function initMap() {
    // Verifica se a chave API foi inserida
    const apiKey = document.getElementById('api-key').value;
    if (!apiKey) {
        alert('Por favor, insira sua chave API do Google Maps');
        return;
    }

    // Configura o mapa
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -23.5505, lng: -46.6333 }, // Centro em São Paulo
        zoom: 12
    });

    // Inicializa serviços
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: map,
        panel: document.getElementById('directions-panel')
    });
    placesService = new google.maps.places.PlacesService(map);

    // Configura autocomplete para origem
    autocompleteOrigin = new google.maps.places.Autocomplete(
        document.getElementById('origin')
    );
    autocompleteOrigin.bindTo('bounds', map);

    // Configura autocomplete para waypoints existentes
    document.querySelectorAll('.waypoint-input').forEach((input, index) => {
        setupWaypointAutocomplete(input, index);
    });

    // Configura eventos
    setupEventListeners();
}

// Configura o autocomplete para um waypoint
function setupWaypointAutocomplete(input, index) {
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);
    
    // Se já existir um autocomplete nesse índice, substitui
    if (autocompleteWaypoints[index]) {
        autocompleteWaypoints[index] = autocomplete;
    } else {
        autocompleteWaypoints.push(autocomplete);
    }
}

// Configura os listeners de eventos
function setupEventListeners() {
    // Botão para carregar o mapa
    document.getElementById('load-map').addEventListener('click', () => {
        const apiKey = document.getElementById('api-key').value;
        if (!apiKey) {
            alert('Por favor, insira sua chave API do Google Maps');
            return;
        }
        
        // Atualiza o script da API com a nova chave
        const script = document.querySelector('script[src*="maps.googleapis.com"]');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&libraries=places,directions`;
        
        // Mostra mensagem de carregamento
        alert('Mapa está sendo carregado. Por favor, aguarde...');
    });

    // Botão para adicionar novo ponto de entrega
    document.getElementById('add-waypoint').addEventListener('click', () => {
        const waypointsContainer = document.getElementById('waypoints-container');
        const waypointIndex = waypointsContainer.children.length;
        
        const waypointDiv = document.createElement('div');
        waypointDiv.className = 'waypoint';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'waypoint-input';
        input.placeholder = 'Endereço de entrega';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-waypoint';
        removeBtn.innerHTML = '×';
        
        waypointDiv.appendChild(input);
        waypointDiv.appendChild(removeBtn);
        waypointsContainer.appendChild(waypointDiv);
        
        // Configura autocomplete para o novo input
        setupWaypointAutocomplete(input, waypointIndex);
        
        // Adiciona evento para remover o waypoint
        removeBtn.addEventListener('click', () => {
            waypointsContainer.removeChild(waypointDiv);
            // Atualiza os índices dos autocompletes
            autocompleteWaypoints.splice(waypointIndex, 1);
        });
    });

    // Botão para calcular a rota
    document.getElementById('calculate-route').addEventListener('click', calculateRoute);

    // Botão para limpar a rota
    document.getElementById('clear-route').addEventListener('click', () => {
        directionsRenderer.setDirections({ routes: [] });
        document.getElementById('directions-panel').innerHTML = '';
    });
}

// Função para calcular a rota
function calculateRoute() {
    const origin = document.getElementById('origin').value;
    const travelMode = document.getElementById('travel-mode').value;
    
    if (!origin) {
        alert('Por favor, insira um endereço de origem');
        return;
    }
    
    // Coleta os waypoints
    const waypoints = [];
    document.querySelectorAll('.waypoint-input').forEach(input => {
        if (input.value) {
            waypoints.push({
                location: input.value,
                stopover: true
            });
        }
    });
    
    if (waypoints.length === 0) {
        alert('Por favor, insira pelo menos um ponto de entrega');
        return;
    }
    
    // Configura a requisição de rota
    const request = {
        origin: origin,
        destination: waypoints.length > 0 ? waypoints[waypoints.length - 1].location : origin,
        waypoints: waypoints.slice(0, -1), // O último waypoint vira o destino
        travelMode: google.maps.TravelMode[travelMode],
        optimizeWaypoints: true
    };
    
    // Chama o serviço de rotas
    directionsService.route(request, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            
            // Exibe informações adicionais sobre a rota
            const route = response.routes[0];
            let summaryPanel = document.getElementById('directions-panel');
            summaryPanel.innerHTML = '';
            
            // Mostra o resumo da rota
            const summaryDiv = document.createElement('div');
            summaryDiv.innerHTML = `
                <h3>Resumo da Rota</h3>
                <p><strong>Distância total:</strong> ${route.legs[0].distance.text}</p>
                <p><strong>Tempo estimado:</strong> ${route.legs[0].duration.text}</p>
                <p><strong>Modo de transporte:</strong> ${travelMode}</p>
            `;
            summaryPanel.appendChild(summaryDiv);
            
            // Mostra instruções detalhadas
            const instructionsDiv = document.createElement('div');
            instructionsDiv.innerHTML = '<h3>Instruções Detalhadas</h3>';
            summaryPanel.appendChild(instructionsDiv);
            
            // Para rotas com múltiplos legs (quando há waypoints)
            route.legs.forEach((leg, index) => {
                const legDiv = document.createElement('div');
                legDiv.className = 'route-leg';
                legDiv.innerHTML = `
                    <h4>Trecho ${index + 1}: ${leg.start_address} para ${leg.end_address}</h4>
                    <p>Distância: ${leg.distance.text} | Duração: ${leg.duration.text}</p>
                `;
                
                const stepsList = document.createElement('ol');
                leg.steps.forEach(step => {
                    const stepItem = document.createElement('li');
                    stepItem.innerHTML = step.instructions;
                    stepsList.appendChild(stepItem);
                });
                
                legDiv.appendChild(stepsList);
                instructionsDiv.appendChild(legDiv);
            });
        } else {
            alert('Não foi possível calcular a rota: ' + status);
        }
    });
}

// Inicializa a aplicação quando a página carrega
window.onload = function() {
    // Configura o evento para o botão de carregar mapa
    document.getElementById('load-map').addEventListener('click', initMap);
};