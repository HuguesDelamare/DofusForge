document.addEventListener('DOMContentLoaded', async function () {
    const searchInput = document.getElementById('search-input');
    const resultDiv = document.getElementById('result');
    const ingredientTableBody = document.getElementById('ingredient-table-body');
    const ajouterButton = document.getElementById('ajouter-recette');
    const itemImageContainer = document.getElementById('item-image-container');
    let trackedIds = []; // Liste des IDs suivis
    const cache = new Map();

    // -------------------------------------------
    //  FONCTIONS UTILITAIRES
    // -------------------------------------------

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
            trackedIds = await response.json(); // Charger les IDs suivis
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

                // Recharge les IDs suivis pour maintenir la cohérence
                await loadTrackedIds();
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

        // Cellules du tableau
        const imageCell = row.insertCell();
        const ingredientCell = row.insertCell();
        const quantityCell = row.insertCell();
        const actionCell = row.insertCell();

        // Image de l'ingrédient
        if (itemData.img) {
            imageCell.innerHTML = `<img src="${itemData.img}" alt="${itemData.name.fr}" style="width:32px; height:auto;">`;
        } else {
            imageCell.textContent = "Pas d'image";
        }

        // Nom de l'ingrédient
        ingredientCell.textContent = itemData.name.fr;

        // Quantité
        quantityCell.textContent = quantity || "Quantité non définie";

        // Bouton de suivi
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

        // Définir l'état initial du suivi
        const isTracked = trackedIds.includes(parseInt(ingredientId));
        updateTrackIcon(trackButton, isTracked);

        // Gestion des clics sur le bouton
        trackButton.addEventListener('click', function () {
            const isTracked = this.getAttribute('data-tracked') === 'true';
            trackResource(ingredientId, itemData.name.fr, !isTracked, this);
        });
    }

    async function displayRecipe(recipeData) {
        ingredientTableBody.innerHTML = "";

        if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
            ingredientTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center fst-italic text-muted">
                        Aucune recette disponible.
                    </td>
                </tr>
            `;
            return;
        }

        for (let i = 0; i < recipeData.ingredients.length; i++) {
            const ingredient = recipeData.ingredients[i];
            try {
                const itemData = await fetch(`/api/item/${ingredient.id}`).then(res => res.json());
                createIngredientRow(itemData, recipeData.quantities[i], ingredient.id);
            } catch (error) {
                console.error(`Erreur lors du chargement de l'ingrédient ${ingredient.id} :`, error);
            }
        }
    }

    async function handleSearchResult(itemId) {
        try {
            const recipeData = await fetch(`/api/recipe/${itemId}`).then(res => res.json());
            await displayRecipe(recipeData);
        } catch (error) {
            console.error("Erreur lors de la récupération des données :", error);
        }
    }

    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.trim();
        if (searchTerm.length < 3) {
            resultDiv.innerHTML = "Tapez au moins 3 caractères pour rechercher.";
            return;
        }

        // Recherche asynchrone
        fetch(`/api/search?term=${searchTerm}`)
            .then(res => res.json())
            .then(data => {
                resultDiv.innerHTML = "";
                data.forEach(item => {
                    const suggestion = document.createElement('div');
                    suggestion.className = "suggestion-item";
                    suggestion.textContent = item.name;
                    suggestion.addEventListener('click', () => {
                        searchInput.value = item.name;
                        handleSearchResult(item.id);
                    });
                    resultDiv.appendChild(suggestion);
                });
            })
            .catch(error => {
                console.error("Erreur lors de la recherche :", error);
            });
    });

    // Chargez les IDs suivis au démarrage
    await loadTrackedIds();
});
