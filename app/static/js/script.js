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
    let isFetching = false;

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

    function updateCraftTotal() {
        let craftTotal = 0;
        const totalCells = ingredientTableBody.querySelectorAll('td:nth-child(5)');
        totalCells.forEach(cell => {
            const cellValue = parseInt(cell.textContent.replace(/\s/g, '')) || 0;
            craftTotal += cellValue;
        });
        craftTotalSpan.textContent = formatNumber(craftTotal);

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

        fetch(`/api/last_recipes/${itemId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
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
                    row.dataset.oldPrice = component.last_price || 0;

                    const trackButton = row.querySelector(".track-btn");
                    if (trackButton) {
                        trackButton.dataset.tracked = component.is_tracked ? "true" : "false";
                        trackButton.innerHTML = component.is_tracked ? '<i class="bi bi-bookmark-fill"></i>' : '<i class="bi bi-bookmark"></i>';
                    }

                    updateRowTotal(priceInput, row.querySelector("td:nth-child(3)").textContent, row);
                });
                updateCraftTotal();
            })
            .catch(error => {
                console.error("Erreur lors de la récupération des prix des composants :", error);
            });
    }

    function updateRowTotal(priceInput, quantity, row) {
        const oldPrice = parseFloat(row.dataset.oldPrice) || 0;
        const newPrice = parseFloat(priceInput.value) || 0;
        const totalCell = row.cells[4];
        const evoCell = row.cells[5];

        const total = newPrice * quantity;
        totalCell.textContent = formatNumber(total);

        if (oldPrice > 0) {
            const diff = newPrice - oldPrice;
            const percentChange = ((diff / oldPrice) * 100).toFixed(1);
            evoCell.innerHTML = diff > 0 ? `<span style="color:red;">↑ +${percentChange}%</span>` : diff < 0 ? `<span style="color:green;">↓ ${percentChange}%</span>` : `<span style="color:gray;">0%</span>`;
        } else {
            evoCell.innerHTML = `<span style="color:gray;">N/A</span>`;
        }

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

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show`;
        notification.role = 'alert';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.remove('show');
            notification.classList.add('hide');
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    ajouterButton.addEventListener("click", function () {
        const hdvPrice = parseInt(hdvPriceInput.value);
        if (isNaN(hdvPrice) || hdvPrice <= 0) {
            alert("Veuillez entrer un prix HDV valide avant d'enregistrer.");
            return;
        }

        const components = [];
        ingredientTableBody.querySelectorAll('tr').forEach(row => {
            const componentId = row.querySelector('.track-btn')?.dataset.id;
            const price = parseInt(row.querySelector('.price-input')?.value) || 0;
            if (componentId && price) {
                components.push({ componentId, price });
            }
        });

        if (components.length === 0) {
            alert("Aucun composant sélectionné ou prix de composant manquant.");
            return;
        }

        const data = {
            item_id: hiddenItemIdInput.value,
            item_name: searchInput.value.trim(),
            item_price: hdvPrice,
            item_craft_price: parseInt(craftTotalSpan.textContent.replace(/\s/g, '')) || 0,
            components,
        };

        fetch('/ingredient_prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    showNotification(`Erreur : ${data.error}`, 'danger');
                } else {
                    showNotification(data.message, 'success');
                    resetButton.click();
                }
            })
            .catch(error => {
                console.error("Erreur lors de l'enregistrement :", error);
                showNotification("Une erreur est survenue lors de l'enregistrement.", 'danger');
            });
    });

    function fetchAutocomplete(term) {
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
            resultDiv.innerHTML = "";
            return;
        }

        autoCompleteTimeout = setTimeout(() => {
            const normalizedTerm = normalizeSearchTerm(searchTerm);
            fetchAutocomplete(normalizedTerm);

            fetch(`/api/autocomplete_items?term=${searchTerm}`)
                .then(response => response.json())
                .then(data => {
                    if (data.length === 1 && data[0].name.toLowerCase() === searchTerm.toLowerCase()) {
                        hiddenItemIdInput.value = data[0].id;
                        fetchRecentCrafts(data[0].id);
                        fetchComponentPrices(data[0].id);
                    }
                })
                .catch(error => {
                    console.error("Erreur lors de la recherche :", error);
                });
        }, 300);
    });

    resultDiv.addEventListener("click", function (event) {
        const item = event.target.closest(".autocomplete-item");
        if (!item) return;

        const itemId = item.dataset.id;
        const slug = item.dataset.slug;

        if (!itemId) {
            console.error("Aucun ID trouvé pour l'élément sélectionné.");
            return;
        }

        searchInput.value = item.textContent.trim();
        hiddenItemIdInput.value = itemId;
        resultDiv.innerHTML = "";

        fetchRecentCrafts(itemId);
        fetchComponentPrices(itemId);
        handleItemSlug(slug);
    });

    function normalizeSlug(slug) {
        slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return slug.toLowerCase();
    }

    function handleItemSlug(slug) {
        if (isFetching) return;
        isFetching = true;

        const normalizedSlug = normalizeSlug(slug);
        const encodedSlug = encodeURIComponent(normalizedSlug);

        fetch(`/get_craft_data/${encodedSlug}`)
            .then(response => response.json())
            .then(data => {
                isFetching = false;

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
                    createIngredientRow(
                        component,
                        component.quantity,
                        component.component_id,
                        component.last_price || 0
                    );
                });
            })
            .catch(error => {
                isFetching = false;
                console.error("Erreur lors de la récupération de l'objet :", error);
            });
    }

    function createIngredientRow(component, quantity, componentId, lastPrice) {
        const row = ingredientTableBody.insertRow();
        row.setAttribute('data-id', componentId);
        row.setAttribute('data-old-price', lastPrice || 0);

        row.innerHTML = `
            <td><img src="${component.image_url || ''}" alt="${component.component_name || 'Inconnu'}" style="width:32px;"></td>
            <td>${component.component_name || 'Nom non disponible'}</td>
            <td>${quantity}</td>
            <td><input type="number" class="form-control  w-75 text-center price-input" value="${lastPrice || 0}" min="0"></td>
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

        updateRowTotal(priceInput, quantity, row);
    }
});
