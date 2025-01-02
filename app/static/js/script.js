document.addEventListener('DOMContentLoaded', function () {
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
    let trackedIds = []; // Liste des IDs suivis

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
        itemImageContainer.innerHTML = "";
        historiqueTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center fst-italic text-muted">
                    Aucun historique disponible.
                </td>
            </tr>
        `;
    }

    async function fetchWithCache(url) {
        if (cache.has(url)) {
            return cache.get(url);
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
        const data = await response.json();
        cache.set(url, data);
        return data;
    }

    async function loadTrackedIds() {
        try {
            const response = await fetch('/api/tracked_ids');
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            trackedIds = await response.json();
        } catch (error) {
            console.error('Erreur lors du chargement des IDs suivis :', error);
        }
    }

    function updateTrackIcon(button, isTracked) {
        const icon = button.querySelector('i');
        if (isTracked) {
            button.setAttribute('data-tracked', 'true');
            icon.className = 'bi bi-bookmark-check-fill';
            button.setAttribute('title', 'Suivi activé');
        } else {
            button.setAttribute('data-tracked', 'false');
            icon.className = 'bi bi-bookmark';
            button.setAttribute('title', 'Ajouter au suivi');
        }
    }

    async function trackResource(resourceId, resourceName, addToTrack, button) {
        try {
            const endpoint = addToTrack ? '/track_resource' : '/untrack_resource';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource_id: resourceId, resource_name: resourceName })
            });

            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            const data = await response.json();

            if (data.message) {
                console.log(data.message);
                updateTrackIcon(button, addToTrack);

                if (addToTrack) {
                    trackedIds.push(parseInt(resourceId));
                } else {
                    trackedIds = trackedIds.filter(id => id !== parseInt(resourceId));
                }
            } else {
                console.error("Erreur : ", data.error);
            }
        } catch (error) {
            console.error('Erreur lors du suivi :', error);
        }
    }

    function createIngredientRow(itemData, quantity, ingredientId) {
        const row = ingredientTableBody.insertRow();
        row.dataset.ingredientId = ingredientId;

        const imageCell = row.insertCell();
        const ingredientCell = row.insertCell();
        const quantityCell = row.insertCell();
        const priceCell = row.insertCell();
        const totalCell = row.insertCell();
        const evoCell = row.insertCell();
        const actionCell = row.insertCell();

        if (itemData.img) {
            imageCell.innerHTML = `<img src="${itemData.img}" alt="${itemData.name.fr}" style="width:32px; height:auto;">`;
        } else {
            imageCell.textContent = "Pas d'image";
        }

        ingredientCell.textContent = itemData.name.fr;
        quantityCell.textContent = quantity || "Quantité non définie";

        const priceInput = document.createElement('input');
        priceInput.type = 'number';
        priceInput.className = 'form-control form-control-sm no-spinners price-input';
        priceCell.appendChild(priceInput);

        totalCell.textContent = "0";
        evoCell.innerHTML = `<span style="color: gray;">N/A</span>`;

        actionCell.innerHTML = `
        <button 
            class="btn btn-sm track-btn" 
            data-id="${ingredientId}" 
            data-name="${itemData.name.fr}" 
            data-tracked="false">
            <i class="bi bi-bookmark"></i>
        </button>
        `;

        const trackButton = actionCell.querySelector('.track-btn');
        const isTracked = trackedIds.includes(parseInt(ingredientId));
        updateTrackIcon(trackButton, isTracked);

        trackButton.addEventListener('click', function () {
            const isTracked = this.getAttribute('data-tracked') === 'true';
            trackResource(ingredientId, itemData.name.fr, !isTracked, this);
        });
    }

    async function displayRecipe(recipeData, itemId) {
        ingredientTableBody.innerHTML = "";
    
        if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
            resultDiv.innerHTML = "Aucune recette disponible pour cet objet.";
            ajouterButton.style.display = "none";
            return;
        }
    
        const ingredientPromises = recipeData.ingredients.map((ingredient, index) => {
            return fetch(`https://api.dofusdb.fr/items/${ingredient.id}?lang=fr`)
                .then(itemResponse => itemResponse.json())
                .then(itemData => {
                    return fetch(`/api/last_component_price/${ingredient.id}`)
                        .then(dbRes => dbRes.json())
                        .then(dbData => {
                            itemData.oldPrice = dbData.last_price || 0;
                            createIngredientRow(itemData, recipeData.quantities[index], ingredient.id);
                        });
                });
        });
    
        try {
            await Promise.all(ingredientPromises);
            ajouterButton.style.display = "block";
        } catch (error) {
            console.error("Erreur lors du rendu des ingrédients :", error);
        }
    }    

    async function handleItemId(itemId) {
        try {
            const recipeData = await fetch(`https://api.dofusdb.fr/recipes/${itemId}?lang=fr`).then(res => res.json());
            await displayRecipe(recipeData, itemId);
        } catch (error) {
            console.error("Erreur lors de la récupération de la recette :", error);
        }
    }

    searchInput.addEventListener('input', function (event) {
        clearTimeout(autoCompleteTimeout);
        const searchTerm = event.target.value.trim();

        if (searchTerm.length < 3) {
            clearResults();
            return;
        }

        autoCompleteTimeout = setTimeout(() => {
            const normalizedSearchTerm = normalizeSearchTerm(searchTerm);
            fetchWithCache(`https://api.beta.dofusdb.fr/items?slug.fr=${normalizedSearchTerm}`)
                .then(itemsData => {
                    resultDiv.innerHTML = '';
                    itemsData.data.forEach(item => {
                        const suggestion = document.createElement('div');
                        suggestion.textContent = item.name.fr;
                        suggestion.classList.add('autocomplete-item');
                        suggestion.addEventListener('click', () => {
                            searchInput.value = item.name.fr;
                            hiddenItemIdInput.value = item.id;
                            handleItemId(item.id);
                        });
                        resultDiv.appendChild(suggestion);
                    });
                })
                .catch(error => console.error("Erreur lors de l'autocomplétion :", error));
        }, 300);
    });

    loadTrackedIds();
});
