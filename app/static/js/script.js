document.addEventListener('DOMContentLoaded', function () {
    // Récupération des éléments HTML principaux
    const searchInput = document.getElementById('search-input');
    const resultDiv = document.getElementById('result');
    const ingredientTableBody = document.getElementById('ingredient-table-body');
    const resetButton = document.getElementById('reset-button');
    const hdvPriceInput = document.getElementById('hdv-price');
    const craftTotalSpan = document.getElementById('craft-total');
    const profitTtcSpan = document.getElementById('profit-ttc');
    const ajouterButton = document.getElementById('ajouter-recette');
    const hiddenItemIdInput = document.getElementById('selected-item-id');
    const historiqueTableBody = document.getElementById('historique-table-body');

    // Constantes globales
    const TAX_RATE = 0.02; // Taux de taxe pour le calcul des profits
    let autoCompleteTimeout;
    let currentRecipeData = null;
    const cache = new Map();

    // -------------------------------------------
    //  UTILITAIRES
    // -------------------------------------------

    function normalizeSearchTerm(searchTerm) {
        return encodeURIComponent(
            searchTerm.toLowerCase()
                .normalize("NFD")
                .replace(/[̀-ͯ]/g, "")
        );
    }

    function formatNumber(number) {
        return number.toLocaleString('fr-FR');
    }

    function clearResults() {
        resultDiv.textContent = '';
        ingredientTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center fst-italic text-muted">
                    Veuillez rechercher un objet.
                </td>
            </tr>
        `;
        hiddenItemIdInput.value = "";
        craftTotalSpan.textContent = "0";
        profitTtcSpan.textContent = "0";
        hdvPriceInput.value = "";
        historiqueTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center fst-italic text-muted">
                    Aucun historique disponible.
                </td>
            </tr>
        `;
    }

    // Mettre à jour le profit lorsqu'on change le prix HDV
    hdvPriceInput.addEventListener("input", function () {
        updateCraftTotal();
    });


    function updateCraftTotal() {
        let craftTotal = 0;
    
        // Additionne tous les totaux des lignes
        const totalCells = ingredientTableBody.querySelectorAll('td:nth-child(5)');
        totalCells.forEach(cell => {
            const cellValue = parseInt(cell.textContent.replace(/\s/g, '')) || 0;
            craftTotal += cellValue;
        });
    
        craftTotalSpan.textContent = formatNumber(craftTotal);
    
        // Calcul du profit TTC
        const hdvPrice = parseInt(hdvPriceInput.value) || 0;
        const profitAvantTaxe = hdvPrice - craftTotal;
        const profitTtc = profitAvantTaxe * (1 - TAX_RATE);
    
        profitTtcSpan.textContent = (profitAvantTaxe > 0 ? "+" : "") + formatNumber(Math.round(profitTtc));
        profitTtcSpan.className = profitAvantTaxe > 0 ? "profit" : "loss";
    }
      

    // -------------------------------------------
    //  RÉCUPÉRER LES OBJETS CRAFTÉS RÉCEMMENT
    // -------------------------------------------
    
    function fetchRecentCrafts(itemId) {
        if (!itemId) {
            console.error("fetchRecentCrafts : Aucun itemId fourni !");
            historiqueTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center fst-italic text-muted">
                        Aucun historique disponible.
                    </td>
                </tr>
            `;
            return;
        }
    
        console.log("fetchRecentCrafts : Appel avec itemId :", itemId);
    
        fetch(`/api/last_recipes/${itemId}`)
            .then(response => {
                console.log("Statut de la réponse API :", response.status);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Données reçues pour les anciens crafts :", data);
    
                if (!data || data.length === 0) {
                    historiqueTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center fst-italic text-muted">
                                Aucun historique disponible.
                            </td>
                        </tr>
                    `;
                    return;
                }
    
                historiqueTableBody.innerHTML = data.map(recipe => `
                    <tr>
                        <td>${recipe.item_name}</td>
                        <td>${formatNumber(recipe.item_craft_price)} kamas</td>
                        <td>${formatNumber(recipe.item_price)} kamas</td>
                        <td>${recipe.added_by || "Inconnu"}</td>
                        <td>${new Date(recipe.date_recorded).toLocaleString('fr-FR')}</td>
                    </tr>
                `).join('');
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des anciens crafts :", error);
            });
    }

    
    ingredientTableBody.addEventListener("click", function (event) {
    const button = event.target.closest(".track-btn");
    if (!button) return;

    const componentId = button.dataset.id;
    if (!componentId) {
        console.error("Aucun ID de composant trouvé sur le bouton.");
        return;
    }

    const isTracked = button.dataset.tracked === "true";
    const url = isTracked ? "/untrack_component" : `/track/${componentId}`;
    const method = isTracked ? "POST" : "POST";
    const body = isTracked ? JSON.stringify({ component_id: componentId }) : null;

    fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: body,
    })
        .then(response => response.json())
        .then(data => {
            alert(data.message);

            // Mise à jour des attributs et de l'icône du bouton
            button.dataset.tracked = isTracked ? "false" : "true";
            button.innerHTML = isTracked 
                ? `<i class="bi bi-bookmark"></i>` 
                : `<i class="bi bi-bookmark-fill"></i>`;
        })
        .catch(error => {
            console.error(`Erreur lors de la ${isTracked ? "désactivation" : "activation"} du suivi :`, error);
        });
    });


    function fetchRecentCrafts(itemId) {
        if (!itemId) {
            historiqueTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center fst-italic text-muted">
                        Aucun historique disponible.
                    </td>
                </tr>
            `;
            console.error("fetchRecentCrafts : Aucun itemId fourni !");
            return;
        }
    
        console.log("fetchRecentCrafts : Appel avec itemId :", itemId);
    
        fetch(`/api/last_recipes/${itemId}`)
            .then(response => {
                console.log("Statut de la réponse API :", response.status);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Données reçues pour les anciens crafts :", data);
    
                if (!data || data.length === 0) {
                    historiqueTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center fst-italic text-muted">
                                Aucun historique disponible.
                            </td>
                        </tr>
                    `;
                    return;
                }
    
                historiqueTableBody.innerHTML = data.map(recipe => `
                    <tr>
                        <td>${recipe.item_name}</td>
                        <td>${formatNumber(recipe.item_craft_price)} kamas</td>
                        <td>${formatNumber(recipe.item_price)} kamas</td>
                        <td>${recipe.added_by || "Inconnu"}</td>
                        <td>${new Date(recipe.date_recorded).toLocaleString('fr-FR')}</td>
                    </tr>
                `).join('');
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des anciens crafts :", error);
            });
    }
    

    function fetchComponentPrices(itemId) {
        fetch(`/get_component_prices/${itemId}`)
            .then(response => response.json())
            .then(data => {
                data.forEach(component => {
                    const row = ingredientTableBody.querySelector(`[data-id="${component.component_id}"]`);
                    if (!row) return;
    
                    const priceInput = row.querySelector(".price-input");
                    priceInput.value = component.last_price || 0;
    
                    // Mettre à jour l'ancien prix
                    row.dataset.oldPrice = component.last_price || 0;
    
                    // Mettre à jour l'icone de suivi
                    const trackButton = row.querySelector(".track-btn");
                    if (trackButton) {
                        if (component.is_tracked) {
                            trackButton.dataset.tracked = "true";
                            trackButton.innerHTML = '<i class="bi bi-bookmark-fill"></i>';
                        } else {
                            trackButton.dataset.tracked = "false";
                            trackButton.innerHTML = '<i class="bi bi-bookmark"></i>';
                        }
                    }

                    // Mettre à jour les totaux
                    updateRowTotal(priceInput, row.querySelector("td:nth-child(3)").textContent, row);
                });
                updateCraftTotal();
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des prix des composants :", error);
            });
    }
    
    
    
    
    // Fonction pour récupérer l'historique en DB
    function getLastRecipesFromDB(itemId) {
        if (!itemId) {
            console.error('ID de l\'objet non fourni.');
            return;
        }

        fetch(`/api/last_recipes/${itemId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const historiqueTableBody = document.getElementById('historique-table-body');
                historiqueTableBody.innerHTML = '';

                if (data.length === 0) {
                    historiqueTableBody.innerHTML = `
                        <tr>
                            <td colspan="5" class="text-center fst-italic text-muted">
                                Aucun historique disponible pour cet objet.
                            </td>
                        </tr>
                    `;
                    return;
                }

                data.forEach(recipe => {
                    const row = document.createElement('tr');
                    const dateLocale = new Date(recipe.date_recorded).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    row.innerHTML = `
                        <td>${recipe.item_name}</td>
                        <td>${formatNumber(recipe.item_craft_price)} kamas</td>
                        <td>${formatNumber(recipe.item_price)} kamas</td>
                        <td>${recipe.added_by || "Inconnu"}</td>
                        <td>${dateLocale}</td>
                    `;
                    historiqueTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Erreur lors de la récupération de l\'historique :', error);
            });
    }

    // Appelez fetchComponentPrices après avoir sélectionné un item
    resultDiv.addEventListener("click", function (event) {
        const item = event.target.closest(".autocomplete-item");
        if (!item) return;
    
        searchInput.value = item.textContent.trim();
        hiddenItemIdInput.value = item.dataset.id;
        resultDiv.innerHTML = "";
    
        fetchRecentCrafts(item.dataset.id);
        fetchComponentPrices(item.dataset.id); // Pré-remplir les prix des composants
    });
    

    // -------------------------------------------
    //  RECHERCHE ET AUTOCOMPLÉTION
    // -------------------------------------------

    // Mise à jour de l'autocomplétion
    function fetchAutocomplete(term) {
        console.log("Recherche d'autocomplétion pour le terme :", term);
    
        fetch(`/api/autocomplete_items?term=${term}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    resultDiv.innerHTML = "<div class='text-muted p-2'>Aucun résultat trouvé.</div>";
                    return;
                }
    
                // Met à jour les suggestions avec `data-id` et `data-slug`
                resultDiv.innerHTML = data.map(item => `
                    <div class="autocomplete-item" data-id="${item.id}" data-slug="${item.slug}">
                        ${item.name} (Niveau ${item.level})
                    </div>
                `).join("");
            })
            .catch(error => {
                console.error("Erreur lors de l'autocomplétion :", error);
                resultDiv.innerHTML = "<div class='text-danger p-2'>Erreur lors de l'autocomplétion.</div>";
            });
    }
    

    searchInput.addEventListener("input", function (event) {
        clearTimeout(autoCompleteTimeout);
        const searchTerm = event.target.value.trim();
        if (searchTerm.length < 3) {
            resultDiv.innerHTML = ""; // Vide les suggestions si la saisie est trop courte
            return;
        }

        autoCompleteTimeout = setTimeout(() => {
            const normalizedTerm = normalizeSearchTerm(searchInput.value.trim());
            fetchAutocomplete(normalizedTerm);
        }, 300);        
    });

    // Gestion des clics dans la liste des suggestions
    resultDiv.addEventListener("click", function (event) {
        const item = event.target.closest(".autocomplete-item");
        if (!item) return;

        const itemId = item.dataset.id; // Récupère l'ID de l'élément sélectionné
        if (!itemId) {
            console.error("Aucun ID trouvé pour l'élément sélectionné.");
            return;
        }

        searchInput.value = item.textContent.trim();
        hiddenItemIdInput.value = itemId; // Met à jour avec l'ID
        resultDiv.innerHTML = ""; // Efface les suggestions

        console.log("ID sélectionné :", itemId);
        handleItemSlug(item.dataset.slug); // Utilise le slug pour récupérer les détails
        fetchRecentCrafts(itemId); // Passe l'ID à fetchRecentCrafts
    });

    


    function handleItemSlug(slug) {
        if (!slug) {
            console.error("Le slug est manquant ou invalide.");
            return;
        }
    
        fetch(`/get_craft_data/${slug}`)
        .then(response => response.json())
        .then(data => {
            console.log("Données reçues pour l'objet :", data);
            if (data.error) {
                ingredientTableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger">${data.error}</td>
                    </tr>
                `;
                return;
            }

            ingredientTableBody.innerHTML = "";

            data.components.forEach(component => {
                console.log("Composant traité :", component);
                createIngredientRow(
                    component,
                    component.quantity,
                    component.component_id,
                    component.last_price || 0
                );
            });
        })
        .catch(error => {
            console.error("Erreur lors de la récupération de l'objet :", error);
        });
    }
    

    // -------------------------------------------
    //  CHARGEMENT DES DONNÉES D'UN OBJET
    // -------------------------------------------

    function fillIngredientTable(components) {
        console.log("Remplissage de la table des ingrédients avec :", components);
        ingredientTableBody.innerHTML = "";
        if (components.length === 0) {
            ingredientTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center fst-italic text-muted">
                        Aucun composant trouvé pour cette recette.
                    </td>
                </tr>
            `;
            return;
        }

        components.forEach(component => {
            createIngredientRow(component);
        });
    }

    function createIngredientRow(component, quantity, componentId, lastPrice) {
        const row = ingredientTableBody.insertRow();
        row.setAttribute('data-id', componentId); // ID du composant
        row.setAttribute('data-old-price', lastPrice || 0); // Dernier prix enregistré
    
        row.innerHTML = `
            <td><img src="${component.image_url || ''}" alt="${component.component_name || 'Inconnu'}" style="width:32px;"></td>
            <td>${component.component_name || 'Nom non disponible'}</td>
            <td>${quantity}</td>
            <td><input type="number" class="form-control price-input" value="${lastPrice || 0}" min="0"></td>
            <td>0</td>
            <td><span class="text-muted">N/A</span></td>
            <td>
                <button class="btn btn-sm track-btn" data-id="${componentId}" data-name="${component.component_name || ''}">
                    <i class="bi bi-bookmark"></i>
                </button>
            </td>
        `;
    
        const priceInput = row.querySelector('.price-input');
        priceInput.addEventListener('input', function () {
            updateRowTotal(priceInput, quantity, row);
        });
    
        // Mise à jour initiale du total et de l'évolution
        updateRowTotal(priceInput, quantity, row);
    }

    function getLastRecipesFromDB(itemId) {
    fetch(`/api/last_recipes/${itemId}`)
        .then(response => response.json())
        .then(data => {
            historiqueTableBody.innerHTML = "";

            if (!data || data.length === 0) {
                historiqueTableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center fst-italic text-muted">
                            Aucun historique disponible.
                        </td>
                    </tr>
                `;
                return;
            }

            data.forEach(recipe => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${recipe.item_name}</td>
                    <td>${formatNumber(recipe.item_craft_price)} kamas</td>
                    <td>${formatNumber(recipe.item_price)} kamas</td>
                    <td>${recipe.added_by || "Inconnu"}</td>
                    <td>${new Date(recipe.date_recorded).toLocaleDateString('fr-FR')}</td>
                `;
                historiqueTableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error("Erreur lors de la récupération des objets craftés récents :", error);
        });
    }

    function updateRowTotal(priceInput, quantity, row) {
        const oldPrice = parseFloat(row.dataset.oldPrice) || 0;
        const newPrice = parseFloat(priceInput.value) || 0;
        const totalCell = row.cells[4];
        const evoCell = row.cells[5];
    
        // Mise à jour du total
        const total = newPrice * quantity;
        totalCell.textContent = formatNumber(total);
    
        // Mise à jour de l'évolution
        if (oldPrice > 0) {
            const diff = newPrice - oldPrice;
            const percentChange = ((diff / oldPrice) * 100).toFixed(1);
    
            if (diff > 0) {
                evoCell.innerHTML = `<span style="color:red;">↑ +${percentChange}%</span>`;
            } else if (diff < 0) {
                evoCell.innerHTML = `<span style="color:green;">↓ ${percentChange}%</span>`;
            } else {
                evoCell.innerHTML = `<span style="color:gray;">0%</span>`;
            }
        } else {
            evoCell.innerHTML = `<span style="color:gray;">N/A</span>`;
        }
    
        // Met à jour le total général du craft
        updateCraftTotal();
    }
    
    
    

    function handleTrackButton(button) {
        const componentId = button.dataset.id;
        const isTracked = button.dataset.tracked === 'true';

        fetch(isTracked ? `/untrack/${componentId}` : `/track/${componentId}`, {
            method: isTracked ? 'DELETE' : 'POST',
        })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                button.dataset.tracked = isTracked ? 'false' : 'true';
                button.querySelector('i').className = isTracked ? 'bi bi-bookmark' : 'bi bi-bookmark-fill';
            })
            .catch(error => {
                console.error('Erreur lors de la gestion du suivi :', error);
            });
    }

    // -------------------------------------------
    //  GESTION DES BOUTONS
    // -------------------------------------------

    resetButton.addEventListener('click', function() {
        searchInput.value = "";
        hdvPriceInput.value = "";
        craftTotalSpan.textContent = "0";
        profitTtcSpan.textContent = "0";
        clearResults();
    });


    ajouterButton.addEventListener("click", function () {
        console.log("Bouton Enregistrer cliqué"); // Debug
    
        // Récupération des données du formulaire
        const hdvPrice = parseInt(hdvPriceInput.value);
        if (isNaN(hdvPrice) || hdvPrice <= 0) {
            alert("Veuillez entrer un prix HDV valide avant d'enregistrer.");
            return;
        }
    
        // Collecte des composants
        const components = [];
        ingredientTableBody.querySelectorAll('tr').forEach(row => {
            const componentId = row.querySelector('.track-btn')?.dataset.id;
            const price = parseInt(row.querySelector('.price-input')?.value) || 0;
    
            if (componentId && price) {
                components.push({ componentId, price });
            }
        });
    
        // Vérification : s'assurer que des composants ont été ajoutés
        if (components.length === 0) {
            alert("Aucun composant sélectionné ou prix de composant manquant.");
            return;
        }
    
        // Préparer les données pour l'envoi
        const data = {
            item_id: hiddenItemIdInput.value, // Vérifiez que cette valeur est bien définie dans votre HTML
            item_name: searchInput.value.trim(),
            item_price: hdvPrice,
            item_craft_price: parseInt(craftTotalSpan.textContent.replace(/\s/g, '')) || 0,
            components,
        };
    
        console.log("Données envoyées pour l'enregistrement :", data); // Debug
    
        // Envoi des données au serveur
        fetch('/ingredient_prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(`Erreur : ${data.error}`);
                    console.error(data.error); // Debug
                } else {
                    alert(data.message);
                    resetButton.click(); // Réinitialise le formulaire après un succès
                }
            })
            .catch(error => {
                console.error("Erreur lors de l'enregistrement :", error);
                alert("Une erreur est survenue lors de l'enregistrement.");
            });
    });
    

    function updateTrackingGraph(componentId) {
        fetch(`/get_resource_data/${componentId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error("Erreur lors de la récupération des données :", data.error);
                    return;
                }
    
                const ctx = document.getElementById('tracking-graph').getContext('2d');
    
                // Détruire le graphique existant avant d'en créer un nouveau
                if (window.trackingChart) {
                    window.trackingChart.destroy();
                }
    
                window.trackingChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.prices.map(p => new Date(p.date).toLocaleDateString('fr-FR')),
                        datasets: [{
                            label: `Prix de ${data.component.name}`,
                            data: data.prices.map(p => p.price),
                            borderColor: 'blue',
                            borderWidth: 2,
                            tension: 0.2
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: `Historique des prix pour ${data.component.name}` }
                        }
                    }
                });
            })
            .catch(error => {
                console.error("Erreur lors de la mise à jour du graphique :", error);
            });
    }
    
    // Gestion du clic sur un composant dans la liste des suivis
    trackingTableBody.addEventListener("click", function (event) {
        const button = event.target.closest(".track-btn");
        if (!button) return;
    
        const componentId = button.dataset.id;
        if (componentId) {
            updateTrackingGraph(componentId);
        }
    });    
});
