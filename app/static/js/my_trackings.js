document.addEventListener("DOMContentLoaded", function () {
    const trackingTableBody = document.getElementById("tracking-table-body");
    const resourceInfoDiv = document.getElementById("resource-info");
    const resourceTitle = document.getElementById("resource-title");
    const resourceChartContainer = document.getElementById("resource-chart-container");
    let resourceChart = null;

    
    // Charger les suivis au démarrage
    function loadTrackings() {
        fetch("/my_trackings", { headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then((response) => response.json())
            .then((data) => {
                trackingTableBody.innerHTML = "";
                data.forEach((tracking) => {
                    const row = document.createElement("tr");
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
            .catch((error) => console.error("Erreur lors du chargement des suivis :", error));
    }

    
    function loadResourceData(componentId) {
        fetch(`/get_resource_data/${componentId}`)
            .then((response) => {
                if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
                return response.json();
            })
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                console.log(data);
    
                // Afficher les détails de la ressource
                resourceInfoDiv.style.display = "block";
                resourceTitle.textContent = `Ressource : ${data.component_name}`;
    
                // Préparer les données pour le graphique
                const labels = data.prices.map((p) => {
                    const date = new Date(p.date);
                    const options = {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    };
                    return date.toLocaleString("fr-FR", options); // Date et heure
                });
                const prices = data.prices.map((p) => p.price);
    
                // Supprimer l'ancien graphique si existant
                if (resourceChart) {
                    resourceChart.destroy();
                }
    
                // Supprimer le canvas existant et en créer un nouveau
                resourceChartContainer.innerHTML = '<canvas id="resource-chart"></canvas>';
                const newCanvas = document.getElementById("resource-chart");
    
                // Créer un nouveau graphique
                resourceChart = new Chart(newCanvas, {
                    type: "line",
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: "Prix",
                                data: prices,
                                borderColor: "blue",
                                tension: 0.2,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { display: true },
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: "Date et heure",
                                },
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: "Prix (kamas)",
                                },
                            },
                        },
                    },
                });
            })
            .catch((error) => {
                console.error("Erreur lors de la récupération des données :", error);
                alert("Erreur lors de la récupération des données.");
            });
    }
    
    // Fonction pour supprimer un suivi
    function untrackResource(componentId) {
        fetch("/untrack_component", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ component_id: componentId }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP : ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                console.log(data.message);
                // Recharger la liste des suivis
                loadTrackings();
                // Cacher les informations de la ressource si elle est supprimée
                resourceInfoDiv.style.display = "none";
            })
            .catch((error) => {
                console.error("Erreur lors de la suppression du suivi :", error);
            });
    }

    // Gestion des clics sur les ressources suivies
    trackingTableBody.addEventListener("click", function (event) {
        const target = event.target;

        // Si clic sur le bouton "Supprimer"
        if (target.classList.contains("untrack-btn")) {
            event.stopPropagation(); // Empêcher la propagation vers la ligne
            const componentId = target.dataset.id;
            untrackResource(componentId);
            return;
        }

        // Si clic sur une ligne (hors bouton "Supprimer")
        const row = target.closest("tr");
        if (row) {
            const componentId = row.dataset.componentId;
            loadResourceData(componentId);
        }
    });

    // Charger les suivis au démarrage
    loadTrackings();
});
