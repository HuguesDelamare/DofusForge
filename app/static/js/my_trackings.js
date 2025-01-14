document.addEventListener("DOMContentLoaded", function () {
    const trackingTableBody = document.getElementById('tracking-table-body');
    const resourceInfoDiv = document.getElementById("resource-info");
    const resourceTitle = document.getElementById("resource-title");
    const resourceChartContainer = document.getElementById("resource-chart-container");
    const lastCraftsContainer = document.getElementById("last-crafts-container");
    let resourceChart = null;
    let trackedComponents = []; // Centralisation des suivis


    if (!trackingTableBody) {
        console.error("L'élément trackingTableBody est introuvable.");
        return;
    }
    // Charger les suivis au démarrage
    function loadTrackings() {
        fetch("/my_trackings", { headers: { "X-Requested-With": "XMLHttpRequest" } })
            .then((response) => {
                if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
                return response.json();
            })
            .then((data) => {
                trackedComponents = data; // Stocker les suivis
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
                showError("Erreur lors du chargement des suivis.");
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
                    showError(data.error);
                    console.log("Données de la ressource :", data);
                    return;
                }

                // Afficher les détails de la ressource
                resourceInfoDiv.style.display = "block";
                resourceTitle.textContent = `Ressource : ${data.component.name}`;

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
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: true },
                            tooltip: {
                                enabled: true,
                                callbacks: {
                                    label: function (context) {
                                        return `Prix : ${context.raw.toLocaleString('fr-FR')} kamas`;
                                    },
                                    title: function (tooltipItems) {
                                        return `Date : ${tooltipItems[0].label}`
                                    }
                                },
                                displayColors: false,
                            },
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
                showError("Erreur lors de la récupération des données.");
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
                showError("Erreur lors de la suppression du suivi.");
            });
    }

    // Charger les 10 derniers crafts de l'utilisateur
    function loadUserLastCrafts() {
        fetch("/api/user_last_recipes")
            .then((response) => {
                if (!response.ok) throw new Error(`Erreur HTTP : ${response.status}`);
                return response.json();
            })
            .then((data) => {
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
                
                    // Calcul du profit TTC
                    const profitTTC = Math.round((craft.item_price - craft.item_craft_price) * 0.98);
                    const profitClass = profitTTC > 0 ? "profit-positive" : "profit-negative";
                    const profitIcon = profitTTC > 0 ? "⬆️" : "⬇️";
                    const profitLabel = profitTTC > 0 ? "Profit TTC" : "Perte TTC";
                
                    // Création de la carte
                    const card = document.createElement("div");
                    card.className = `col`;
                
                    card.innerHTML = `
                        <div class="card h-100 ${profitClass}">
                            <div class="text-center mt-2">
                                ${
                                    craft.image_url
                                        ? `<img src="${craft.image_url}" alt="${craft.item_name}" class="card-img-top-small">`
                                        : `<div class="card-img-placeholder-small">Image indisponible</div>`
                                }
                            </div>
                            <div class="card-body text-center">
                                <h5 class="card-title mb-3">${craft.item_name}</h5>
                                <ul class="list-group">
                                    <li class="list-group-item">
                                        <strong>Prix du Craft :</strong> ${craft.item_craft_price.toLocaleString("fr-FR")} kamas
                                    </li>
                                    <li class="list-group-item">
                                        <strong>Prix HDV :</strong> ${craft.item_price.toLocaleString("fr-FR")} kamas
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        <span><strong>${profitLabel} :</strong></span>
                                        <span class="profit-icon">${profitIcon}</span>
                                        <span>${profitTTC.toLocaleString("fr-FR")} kamas</span>
                                    </li>
                                </ul>
                            </div>
                            <div class="card-footer text-center">
                                <small class="text-muted">Crafté le : ${date}</small>
                            </div>
                        </div>
                    `;
                
                    lastCraftsContainer.appendChild(card);
                });
            })
            .catch((error) => {
                console.error("Erreur lors du chargement des derniers crafts :", error);
                lastCraftsContainer.innerHTML = `
                    <div class="col text-center text-muted">
                        Une erreur s'est produite lors du chargement des crafts.
                    </div>
                `;
            });
    }

    // -------------------------------------------
    //  METTRE À JOUR LE GRAPHIQUE POUR LES COMPOSANTS SUIVIS
    // -------------------------------------------
    function updateTrackingGraph(componentId) {
        fetch(`/api/last_component_price/${componentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error || !data.prices || data.prices.length === 0) {
                    console.warn("Aucune donnée trouvée pour ce composant :", componentId);
                    const ctx = document.getElementById('tracking-graph').getContext('2d');
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    ctx.fillText("Pas de données disponibles", 10, 50); // Message si aucune donnée
                    return;
                }
    
                // Création du graphique avec les données
                const ctx = document.getElementById('tracking-graph').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.prices.map(p => new Date(p.date).toLocaleDateString('fr-FR')), // Dates formatées
                        datasets: [{
                            label: "Prix (kamas)",
                            data: data.prices.map(p => p.price), // Prix associés
                            borderColor: "blue",
                            backgroundColor: "rgba(0,0,255,0.1)",
                            tension: 0.2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: `Ressource : ${data.component_name}` }
                        }
                    }
                });
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des données pour le graphique :", error);
                const ctx = document.getElementById('tracking-graph').getContext('2d');
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.fillText("Erreur lors du chargement des données", 10, 50);
            });
    }    

    // Afficher une erreur utilisateur
    function showError(message) {
        const errorBanner = document.getElementById("error-banner");
        if (errorBanner) {
            errorBanner.textContent = message;
            errorBanner.style.display = "block";
            setTimeout(() => {
                errorBanner.style.display = "none";
            }, 5000); // Masquer après 5 secondes
        } else {
            alert(message); // Fallback si aucune bannière n'est définie
        }
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

    // Charger les suivis et les derniers crafts au démarrage
    loadTrackings();
    loadUserLastCrafts();
});
