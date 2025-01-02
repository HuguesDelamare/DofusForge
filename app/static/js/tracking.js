document.querySelectorAll('.track-btn').forEach(button => {
    const resourceId = button.dataset.id;
    fetch(`/api/is_tracked/${resourceId}`)
        .then(response => response.json())
        .then(data => {
            const icon = button.querySelector('i');
            if (data.is_tracked) {
                button.dataset.tracked = "true";
                icon.className = "bi bi-bookmark-check-fill";
                button.setAttribute("title", "Suivi activé");
            } else {
                button.dataset.tracked = "false";
                icon.className = "bi bi-bookmark";
                button.setAttribute("title", "Ajouter au suivi");
            }
        })
        .catch(error => console.error("Erreur lors de la vérification du suivi :", error));
});

document.querySelectorAll('.track-btn').forEach(button => {
    button.addEventListener('click', function () {
        const resourceId = this.dataset.id;
        const resourceName = this.dataset.name;
        const isTracked = this.dataset.tracked === "true";
        const action = isTracked ? "remove" : "add";

        fetch('/track_resource', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                resource_id: resourceId,
                resource_name: resourceName,
                action: action
            })
        })
        .then(response => response.json())
        .then(data => {
            const icon = this.querySelector('i');
            if (action === "add") {
                this.dataset.tracked = "true";
                icon.className = "bi bi-bookmark-check-fill";
                this.setAttribute("title", "Suivi activé");
            } else {
                this.dataset.tracked = "false";
                icon.className = "bi bi-bookmark";
                this.setAttribute("title", "Ajouter au suivi");
            }
        })
        .catch(error => console.error("Erreur lors de la mise à jour du suivi :", error));
    });
});
