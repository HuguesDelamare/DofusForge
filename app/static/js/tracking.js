document.addEventListener('DOMContentLoaded', function () {
    // Autres variables et fonctions existantes
    const trackedTableBody = document.getElementById('tracked-table-body'); // Corps du tableau des suivis

    async function loadTrackedResources() {
        try {
            const response = await fetch('/api/tracked_resources');
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            const data = await response.json();

            trackedTableBody.innerHTML = ""; // Réinitialiser le tableau des suivis

            if (!Array.isArray(data) || data.length === 0) {
                trackedTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center fst-italic text-muted">
                            Aucun objet suivi pour le moment.
                        </td>
                    </tr>`;
                return;
            }

            data.forEach(resource => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${resource.resource_name}</td>
                    <td>${formatNumber(resource.last_price)} kamas</td>
                    <td>${new Date(resource.date_recorded).toLocaleString('fr-FR')}</td>
                    <td>
                        <button 
                            class="btn btn-danger btn-sm remove-track-btn" 
                            data-id="${resource.resource_id}">
                            Retirer
                        </button>
                    </td>
                `;

                const removeButton = row.querySelector('.remove-track-btn');
                removeButton.addEventListener('click', function () {
                    removeTrackedResource(resource.resource_id, resource.resource_name);
                });

                trackedTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Erreur lors du chargement des ressources suivies :', error);
        }
    }

    async function removeTrackedResource(resourceId, resourceName) {
        if (!confirm(`Êtes-vous sûr de vouloir retirer "${resourceName}" du suivi ?`)) {
            return;
        }

        try {
            const response = await fetch('/untrack_resource', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource_id: resourceId })
            });

            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            const data = await response.json();

            if (data.message) {
                alert(data.message);
                // Recharger les suivis après suppression
                loadTrackedResources();
            } else {
                console.error("Erreur lors de la suppression :", data.error);
            }
        } catch (error) {
            console.error('Erreur lors de la suppression du suivi :', error);
        }
    }

    // Charger les ressources suivies au chargement de la page
    loadTrackedResources();

    // Appels à d'autres fonctions existantes comme loadTrackedIds si nécessaire
});
