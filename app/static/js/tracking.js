document.addEventListener('DOMContentLoaded', function() {
    const graphContainer = document.getElementById('graph-container');
    const priceChartCanvas = document.getElementById('price-chart');
    const loadingIndicator = document.getElementById('loading-indicator');

    let priceChart = null;
    const resourceCache = new Map();

    // Fonction pour afficher ou masquer l'indicateur de chargement
    function showLoadingIndicator(show) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }

    // Fonction pour rendre le graphique
    function renderGraph(data, resourceName) {
        const dates = data.map(entry => entry.date_recorded);
        const prices = data.map(entry => entry.price);

        if (priceChart) {
            priceChart.destroy();
        }

        priceChart = new Chart(priceChartCanvas, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: `Évolution des prix: ${resourceName}`,
                    data: prices,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.raw} kamas`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Prix (kamas)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Fonction pour charger les données et afficher le graphique
    function loadGraph(resourceId, resourceName) {
        if (resourceCache.has(resourceId)) {
            const data = resourceCache.get(resourceId);
            renderGraph(data, resourceName);
            return;
        }

        showLoadingIndicator(true);

        fetch(`/api/resource_history/${resourceId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                showLoadingIndicator(false);

                if (!data || data.length === 0) {
                    alert('Aucune donnée disponible pour cette ressource.');
                    return;
                }

                resourceCache.set(resourceId, data);
                renderGraph(data, resourceName);
            })
            .catch(error => {
                showLoadingIndicator(false);
                console.error('Erreur lors du chargement du graphique :', error);
                alert('Impossible de charger les données du graphique.');
            });
    }

    // Gestion des clics sur les boutons "Voir"
    document.querySelectorAll('.view-graph-btn').forEach(button => {
        button.addEventListener('click', function() {
            const resourceId = this.dataset.id;
            const resourceName = this.dataset.name;

            if (!resourceId) {
                alert('ID de ressource invalide.');
                return;
            }

            this.disabled = true; // Désactiver le bouton temporairement
            loadGraph(resourceId, resourceName);
            setTimeout(() => {
                this.disabled = false; // Réactiver après un délai
            }, 1000);
        });
    });
});