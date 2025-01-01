document.addEventListener('DOMContentLoaded', function() {
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
    const itemImageContainer = document.getElementById('item-image-container');

    const TAX_RATE = 0.02;
    let currentRecipeData = null;
    let autoCompleteTimeout;
    const cache = new Map();

    // -------------------------------------------
    //  FONCTIONS UTILITAIRES
    // -------------------------------------------

    function normalizeSearchTerm(searchTerm) {
        return encodeURIComponent(
            searchTerm.toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
        );
    }

    function formatNumber(number) {
        return number.toLocaleString('fr-FR');
    }

    function clearResults() {
        resultDiv.textContent = '';
        ingredientTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center fst-italic text-muted">
                    Veuillez rechercher un objet.
                </td>
            </tr>
        `;
        ajouterButton.style.display = "none";
        currentRecipeData = null;
        hiddenItemIdInput.value = "";

        // On vide l'image de l'objet
        itemImageContainer.innerHTML = "";

        // On vide également le tableau d'historique
        historiqueTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center fst-italic text-muted">
                    Aucun historique disponible.
                </td>
            </tr>
        `;
    }

    // Mise en cache (si besoin) pour l'autocomplete
    function fetchWithCache(url) {
        if (cache.has(url)) {
            return Promise.resolve(cache.get(url));
        }
        return fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                cache.set(url, data);
                return data;
            });
    }

    // Récupère l’historique en DB
    function getLastRecipesFromDB(itemId) {
        fetch(`/api/last_recipes/${itemId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                historiqueTableBody.innerHTML = '';

                if (data.length === 0) {
                    historiqueTableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="text-center fst-italic text-muted">
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
                        <td>${recipe.username}</td>
                        <td>${dateLocale}</td>
                    `;
                    historiqueTableBody.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Erreur lors de la récupération de l\'historique :', error);
            });
    }

    // -------------------------------------------
    //  EVENEMENTS DE RECHERCHE
    // -------------------------------------------

    searchInput.addEventListener('input', function(event) {
        clearTimeout(autoCompleteTimeout);
        const searchTerm = event.target.value.trim();

        if (searchTerm.length < 3) {
            clearResults();
            return;
        }

        autoCompleteTimeout = setTimeout(() => {
            const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
            const searchUrl = `https://api.beta.dofusdb.fr/items?slug.fr=${normalizedSearchTerm}`;

            fetchWithCache(searchUrl)
                .then(itemsData => {
                    showAutocompleteSuggestions(itemsData);
                })
                .catch(error => console.error("Erreur lors de l'autocomplétion : ", error));
        }, 300);
    });

    function showAutocompleteSuggestions(itemsData) {
        resultDiv.innerHTML = '';

        if (itemsData && itemsData.data && itemsData.data.length > 0) {
            itemsData.data.forEach(item => {
                const suggestion = document.createElement('div');
                suggestion.textContent = item.name.fr;
                suggestion.classList.add('autocomplete-item');
                suggestion.addEventListener('click', () => {
                    searchInput.value = item.name.fr;
                    hiddenItemIdInput.value = item.id;
                    handleItemId(item.id);
                    resultDiv.innerHTML = '';
                });
                resultDiv.appendChild(suggestion);
            });
        } else {
            resultDiv.textContent = "Aucun résultat.";
        }
    }

    // Récupère la recette de l’objet (API dofusdb) + l’historique en DB
    function handleItemId(itemId) {
        fetch(`https://api.dofusdb.fr/recipes/${itemId}?lang=fr`)
            .then(response => {
                if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
                return response.json();
            })
            .then(recipeData => displayRecipe(recipeData, itemId))
            .catch(error => {
                console.error("Erreur lors de la récupération de la recette :", error);
                resultDiv.textContent = "Erreur lors de la récupération de la recette.";
            });

        // Récupération de l’historique en base
        getLastRecipesFromDB(itemId);
    }

    function displayRecipe(recipeData, itemId) {
        ingredientTableBody.innerHTML = "";

        if (recipeData.img) {
            itemImageContainer.innerHTML = `
                <img 
                    src="${recipeData.img}" 
                    alt="Image de l'objet" 
                    style="width:64px; height:auto;"
                >
            `;
        } else {
            itemImageContainer.innerHTML = "";
        }

        if (recipeData && recipeData.ingredients && recipeData.quantities) {
            if (recipeData.ingredients.length === 0) {
                resultDiv.innerHTML = `ID de l'objet : ${itemId} - OK<br>Cet objet n'a pas de recette.`;
                ingredientTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">Cet objet n'a pas de recette.</td>
                    </tr>
                `;
                ajouterButton.style.display = "none";
                currentRecipeData = null;
                return;
            }

            const ingredientPromises = recipeData.ingredients.map((ingredient, index) => {
                return fetch(`https://api.dofusdb.fr/items/${ingredient.id}?lang=fr`)
                    .then(itemResponse => {
                        if (!itemResponse.ok) throw new Error(`Erreur HTTP ${itemResponse.status}`);
                        return itemResponse.json();
                    })
                    .then(itemData => {
                        // Récupération du dernier prix en DB
                        return fetch(`/api/last_component_price/${ingredient.id}`)
                            .then(dbRes => {
                                if (!dbRes.ok) throw new Error(`Erreur HTTP DB ${dbRes.status}`);
                                return dbRes.json();
                            })
                            .then(dbData => {
                                itemData.oldPrice = dbData.last_price || 0;
                                createIngredientRow(itemData, recipeData.quantities[index], ingredient.id);
                            });
                    })
                    .catch(error => {
                        console.error("Erreur lors de la récupération d'un ingrédient / prix DB :", error);
                    });
            });

            Promise.all(ingredientPromises).then(() => {
                resultDiv.innerHTML = `ID de l'objet : ${itemId} - OK`;
                ajouterButton.style.display = "block";
                currentRecipeData = recipeData;
            });
        } else {
            resultDiv.innerHTML = `ID de l'objet : ${itemId} - OK<br>Recette non trouvée ou données incorrectes.`;
            ingredientTableBody.innerHTML = `
                <tr>
                    <td colspan='6' class='text-center'>Recette non trouvée ou données incorrectes.</td>
                </tr>
            `;
            ajouterButton.style.display = "none";
            currentRecipeData = null;
        }
    }

    // Création d’une ligne d’ingrédient dans le tableau
    function createIngredientRow(itemData, quantity, ingredientId) {
        const row = ingredientTableBody.insertRow();
        row.dataset.ingredientId = ingredientId;

        row.dataset.oldPrice = itemData.oldPrice || 0;  // dernier prix en DB

        // 6 cellules
        const imageCell = row.insertCell();
        const ingredientCell = row.insertCell();
        const quantityCell = row.insertCell();
        const priceCell = row.insertCell();
        const totalCell = row.insertCell();
        const evoCell   = row.insertCell();

        // IMAGE
        if (itemData.img) {
            imageCell.innerHTML = `
                <img 
                    src="${itemData.img}" 
                    alt="${itemData.name.fr}" 
                    style="width:32px; height:auto;"
                >
            `;
        } else {
            imageCell.textContent = "Pas d'image";
        }

        // NOM
        ingredientCell.textContent = itemData.name.fr;

        // QUANTITÉ
        quantityCell.textContent = quantity || "Quantité non définie";

        // INPUT PRIX/unité
        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'form-control form-control-sm no-spinners price-input';
        priceCell.appendChild(priceInput);

        // TOTAL
        totalCell.textContent = "0";

        // ÉVOLUTION
        evoCell.innerHTML = `<span style="color: gray;">N/A</span>`;

        priceInput.addEventListener('input', updateRowTotal);
    }

    // Recalcule total de la ligne + flèche
    function updateRowTotal(event) {
        const row = event.target.parentNode.parentNode;
        const quantity = parseInt(row.cells[2].textContent) || 0;
        let price = parseInt(event.target.value) || 0;
        const oldPrice = parseFloat(row.dataset.oldPrice) || 0;
        const totalCellIndex = 4;
        const evoCellIndex   = 5;

        if (isNaN(price)) {
            price = 0;
        }
        const total = quantity * price;
        row.cells[totalCellIndex].textContent = formatNumber(total);

        // Comparaison
        const evoCell = row.cells[evoCellIndex];
        if (oldPrice > 0) {
            const diff = price - oldPrice;
            const percent = (diff / oldPrice) * 100;
            const roundedPercent = Math.round(percent * 10) / 10;

            if (diff > 0) {
                evoCell.innerHTML = `
                    <span style="color:red;">
                        Ancien prix: ${oldPrice} | ↑ +${roundedPercent}%
                    </span>
                `;
            } else if (diff < 0) {
                evoCell.innerHTML = `
                    <span style="color:green;">
                        Ancien prix: ${oldPrice} | ↓ ${roundedPercent}%
                    </span>
                `;
            } else {
                evoCell.innerHTML = `
                    <span style="color:gray;">
                        Ancien prix: ${oldPrice} | = 0%
                    </span>
                `;
            }
        } else {
            evoCell.innerHTML = `<span style="color:gray;">N/A</span>`;
        }

        updateCraftTotal();
    }

    function updateCraftTotal() {
        let craftTotal = 0;
        const totalCells = ingredientTableBody.querySelectorAll('td:nth-child(5)');
        totalCells.forEach(cell => {
            const cellValue = parseInt(cell.textContent.replace(/\s/g, '')) || 0;
            if (!isNaN(cellValue)) {
                craftTotal += cellValue;
            }
        });

        craftTotalSpan.textContent = formatNumber(craftTotal);

        const hdvPrice = parseInt(hdvPriceInput.value) || 0;
        let profitAvantTaxe = hdvPrice - craftTotal;
        let profitTtc = profitAvantTaxe * (1 - TAX_RATE);

        if (profitAvantTaxe > 0) {
            profitTtcSpan.textContent = "+" + formatNumber(Math.round(profitTtc));
            profitTtcSpan.classList.remove('loss');
            profitTtcSpan.classList.add('profit');
        } else {
            profitTtcSpan.textContent = formatNumber(Math.round(profitTtc));
            profitTtcSpan.classList.add('loss');
            profitTtcSpan.classList.remove('profit');
        }
    }

    // -------------------------------------------------
    //  BOUTONS
    // -------------------------------------------------

    resetButton.addEventListener('click', function() {
        searchInput.value = "";
        hdvPriceInput.value = "";
        craftTotalSpan.textContent = "0";
        profitTtcSpan.textContent = "0";
        clearResults();
    });

    hdvPriceInput.addEventListener('input', updateCraftTotal);

    ajouterButton.addEventListener('click', function() {
        const storedItemId = hiddenItemIdInput.value;
        if (!storedItemId) {
            alert("Veuillez d'abord rechercher un objet.");
            return;
        }

        const hdvPriceValue = hdvPriceInput.value.trim();
        const hdvPriceNumber = parseInt(hdvPriceValue);
        if (!hdvPriceValue || isNaN(hdvPriceNumber) || hdvPriceNumber <= 0) {
            alert("Veuillez saisir un prix HDV valide (supérieur à 0).");
            return;
        }

        const ingredientRows = ingredientTableBody.querySelectorAll('tr');
        for (const row of ingredientRows) {
            const priceInput = row.querySelector('.price-input');
            if (!priceInput) {
                continue;
            }
            const priceValue = priceInput.value.trim();
            const priceNumber = parseInt(priceValue);
            if (!priceValue || isNaN(priceNumber) || priceNumber <= 0) {
                alert("Veuillez renseigner un prix > 0 pour chaque ingrédient.");
                return;
            }
        }

        const itemName = searchInput.value.trim();
        const itemPrice = hdvPriceNumber;
        const ingredientPrices = getIngredientPricesFromTable();

        // Récupérer la valeur du craft total
        let craftTotalValue = 0;
        if (craftTotalSpan) {
            craftTotalValue = parseInt(craftTotalSpan.textContent.replace(/\s/g, '')) || 0;
        }

        // Construire le payload
        const payload = {
            item_id: parseInt(storedItemId, 10),
            item_name: itemName,
            item_price: itemPrice,             // Prix HDV
            item_craft_price: craftTotalValue, // Prix du craft
            components: ingredientPrices
        };

        fetch('/ingredient_prices', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (response.ok) {
                alert('Recette enregistrée avec succès !');
                getLastRecipesFromDB(parseInt(storedItemId, 10));
            } else {
                response.json().then(data => {
                    alert('Erreur lors de l\'enregistrement de la recette : ' + data.error);
                }).catch(error => alert('Erreur lors de l\'enregistrement. Vérifiez la console.'));
            }
        })
        .catch(error => {
            console.error('Erreur lors de l\'envoi des données :', error);
            alert('Une erreur est survenue lors de l\'enregistrement.');
        });
    });

    function getIngredientPricesFromTable() {
        const ingredientRows = ingredientTableBody.querySelectorAll('tr');
        const ingredientPrices = [];

        ingredientRows.forEach(row => {
            const ingredientId = row.dataset.ingredientId;
            const priceInput = row.querySelector('.price-input');
            if (!ingredientId || !priceInput) {
                return;
            }
            const price = parseFloat(priceInput.value) || 0;
            ingredientPrices.push({
                componentId: parseInt(ingredientId, 10),
                price: price
            });
        });
        return ingredientPrices;
    }
});
