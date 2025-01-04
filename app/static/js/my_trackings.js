document.addEventListener("DOMContentLoaded", function () {
    const trackingTableBody = document.getElementById("tracking-table-body");
    const resourceInfoDiv = document.getElementById("resource-info");
    const resourceTitle = document.getElementById("resource-title");
    const resourceChartContainer = document.getElementById("resource-chart-container");
    let resourceChart = null;

    // Charger les suivis au démarrage
    function loadTrackings() {
        fetch("/my_trackings", { headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then((response) => {
                if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
                return response.json();
            })
            .then((data) => {
                trackingTableBody.innerHTML = "";
                if (data.length === 0) {
                    trackingTableBody.innerHTML = `
                        <tr>
                            <td colspan="2" class="text-center text-muted">Aucun composant suivi pour le moment.</td>
                        </tr>
                    `;
                    return;
                }
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
            .catch((error) => {
                console.error("Erreur lors du chargement des suivis :", error);
                alert("Erreur lors du chargement des suivis.");
            });
    }

    // Charger les données d'une ressource
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

                // Afficher les détails de la ressource
                resourceInfoDiv.style.display = "block";
                resourceTitle.textContent = `Ressource : ${data.component_name}`;

                // Préparer les données pour le graphique
                const labels = data.prices.map((p) => {
                    const date = new Date(p.date);
                    return date.toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
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
                                backgroundColor: "rgba(0, 123, 255, 0.2)",
                                tension: 0.2,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false, // Permet au graphique de s'adapter à la hauteur
                        plugins: {
                            legend: { display: true },
                        },
                        scales: {
                            x: { title: { display: true, text: "Date et heure" } },
                            y: { title: { display: true, text: "Prix (kamas)" } },
                        },
                    },
                });
                
            })
            .catch((error) => {
                console.error("Erreur lors de la récupération des données :", error);
                alert("Erreur lors de la récupération des données.");
            });
    }

    // Supprimer un suivi
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
                alert("Erreur lors de la suppression du suivi.");
            });
    }

    // Charger les 10 derniers crafts de l'utlisateur
    function loadUserLastCrafts() {
        fetch("/api/user_last_recipes")
            .then((response) => {
                if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
                return response.json();
            })
            .then((data) => {
                const lastCraftsContainer = document.getElementById("last-crafts-container");
                lastCraftsContainer.innerHTML = ""; // Vider l'existant
    
                if (data.length === 0) {
                    lastCraftsContainer.innerHTML = `
                        <div class="col text-center text-muted">
                            Aucun craft récent trouvé.
                        </div>
                    `;
                    return;
                }
    
                data.forEach((craft) => {
                    const date = new Date(craft.date_recorded).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
    
                    const card = document.createElement("div");
                    card.className = "col";
    
                    card.innerHTML = `
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title">${craft.item_name}</h5>
                                <p class="card-text">
                                    <strong>Prix du Craft :</strong> ${craft.item_craft_price.toLocaleString("fr-FR")} kamas<br>
                                    <strong>Prix HDV :</strong> ${craft.item_price.toLocaleString("fr-FR")} kamas
                                </p>
                            </div>
                            <div class="card-footer">
                                <small class="text-muted">Crafté le : ${date}</small>
                            </div>
                        </div>
                    `;
    
                    lastCraftsContainer.appendChild(card);
                });
            })
            .catch((error) => {
                console.error("Erreur lors du chargement des derniers crafts :", error);
                const lastCraftsContainer = document.getElementById("last-crafts-container");
                lastCraftsContainer.innerHTML = `
                    <div class="col text-center text-muted">
                        Une erreur s'est produite lors du chargement des crafts.
                    </div>
                `;
            });
    }
    
    
    // Gestion des clics sur la table des suivis
    trackingTableBody.addEventListener("click", function (event) {
        const target = event.target;

        // Si clic sur le bouton "Supprimer"
        if (target.classList.contains("untrack-btn")) {
            event.stopPropagation(); // Empêcher la propagation vers la ligne
            const componentId = target.dataset.id;
            untrackResource(componentId);
            return;
        }

        // Si clic sur une ligne
        const row = target.closest("tr");
        if (row) {
            const componentId = row.dataset.componentId;
            loadResourceData(componentId);
        }
    });

    // Charger les suivis au démarrage
    loadTrackings();
    loadUserLastCrafts();
});
