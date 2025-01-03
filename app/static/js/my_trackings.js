document.addEventListener("DOMContentLoaded", function () {
    const trackingTableBody = document.getElementById('tracking-table-body');
    const resourceInfoDiv = document.getElementById('resource-info');
    const resourceTitle = document.getElementById('resource-title');
    const resourceChartCanvas = document.getElementById('resource-chart');
    let resourceChart = null;

    // Charger les suivis au démarrage
    function loadTrackings() {
        fetch('/my_trackings', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(response => response.json())
            .then(data => {
                trackingTableBody.innerHTML = '';
                data.forEach(tracking => {
                    const row = document.createElement('tr');
                    row.dataset.componentId = tracking.component_id;
                    row.innerHTML = `
                        <td>${tracking.component_name}</td>
                        <td>
                            <button class="btn btn-danger btn-sm untrack-btn" data-id="${tracking.component_id}">
                                Supprimer
                            </button>
                        </td>
                    `;
                    trackingTableBody.appendChild(row);
                });
            })
            .catch(error => console.error("Erreur lors du chargement des suivis :", error));
    }

    function loadResourceData(componentId) {
        fetch(`/get_resource_data/${componentId}`)
            .then(response => {
                if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }

                // Afficher les détails de la ressource
                resourceInfoDiv.style.display = "block";
                resourceTitle.textContent = `Ressource : ${data.component_name}`;

                // Préparer les données pour le graphique
                const labels = data.prices.map(p => new Date(p.date).toLocaleDateString('fr-FR'));
                const prices = data.prices.map(p => p.price);

                // Créer ou mettre à jour le graphique
                if (resourceChart) {
                    resourceChart.data.labels = labels;
                    resourceChart.data.datasets[0].data = prices;
                    resourceChart.update();
                } else {
                    resourceChart = new Chart(resourceChartCanvas, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Prix',
                                data: prices,
                                borderColor: 'blue',
                                tension: 0.2
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { display: true }
                            }
                        }
                    });
                }
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des données :", error);
                alert("Erreur lors de la récupération des données.");
            });
    }

    // Gestion des clics sur les ressources suivies
    trackingTableBody.addEventListener('click', function (event) {
        const row = event.target.closest('tr');
        if (row) {
            const componentId = row.dataset.componentId;
            loadResourceData(componentId);
        }
    });

    // Charger les suivis au démarrage
    loadTrackings();
});
