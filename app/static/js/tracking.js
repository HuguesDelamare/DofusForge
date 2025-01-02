document.addEventListener('DOMContentLoaded', function () {
    const trackButtons = document.querySelectorAll('.track-btn');

    // Fonction pour charger les IDs suivis
    function loadTrackedIds() {
        fetch('/api/tracked_ids')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(trackedIds => {
                trackButtons.forEach(button => {
                    const resourceId = button.dataset.id;
                    const icon = button.querySelector('i');

                    if (trackedIds.includes(parseInt(resourceId))) {
                        button.setAttribute('data-tracked', 'true');
                        icon.className = 'bi bi-bookmark-check-fill';
                        button.setAttribute('title', 'Suivi activé');
                    } else {
                        button.setAttribute('data-tracked', 'false');
                        icon.className = 'bi bi-bookmark';
                        button.setAttribute('title', 'Ajouter au suivi');
                    }
                });
            })
            .catch(error => {
                console.error('Erreur lors du chargement des ressources suivies :', error);
            });
    }

    // Gestion des clics sur les boutons de suivi
    trackButtons.forEach(button => {
        button.addEventListener('click', function () {
            const isTracked = this.getAttribute('data-tracked') === 'true';
            const resourceId = this.dataset.id;
            const resourceName = this.dataset.name;
            const icon = this.querySelector('i');

            if (isTracked) {
                // Supprimer le suivi
                fetch('/untrack_resource', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resource_id: resourceId })
                })
                    .then(response => {
                        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
                        this.setAttribute('data-tracked', 'false');
                        icon.className = 'bi bi-bookmark';
                        this.setAttribute('title', 'Ajouter au suivi');
                    })
                    .catch(error => console.error('Erreur lors de la suppression du suivi :', error));
            } else {
                // Ajouter au suivi
                fetch('/track_resource', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ resource_id: resourceId, resource_name: resourceName })
                })
                    .then(response => {
                        if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
                        this.setAttribute('data-tracked', 'true');
                        icon.className = 'bi bi-bookmark-check-fill';
                        this.setAttribute('title', 'Suivi activé');
                    })
                    .catch(error => console.error('Erreur lors de l\'ajout au suivi :', error));
            }
        });
    });

    // Charger les IDs suivis au chargement de la page
    loadTrackedIds();
});
