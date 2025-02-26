document.addEventListener("DOMContentLoaded", () => {
    const serverSelect = document.getElementById("server-select");
    const bountiesContainer = document.getElementById("bounties-container");
    const serverName = document.getElementById("server-name");
    const bountiesTableBody = document.getElementById("bounties-table-body");
    const filterButtons = document.querySelectorAll(".filter-btn");

    let currentServerId = null;
    let currentTag = null;

    // Charger les serveurs
    fetch('/bounties/servers')
        .then(response => response.json())
        .then(servers => {
            servers.forEach(server => {
                const option = document.createElement("option");
                option.value = server.id;
                option.textContent = `${server.name} (${server.type} - ${server.language})`;
                serverSelect.appendChild(option);
            });
        })
        .catch(error => console.error("Erreur lors du chargement des serveurs :", error));

    // Charger les recherchés pour un serveur donné
    serverSelect.addEventListener("change", (event) => {
        currentServerId = event.target.value;
        currentTag = null; // Reset the tag filter when changing server
        loadBounties();
    });

    // Filtrer les recherchés par tag
    filterButtons.forEach(button => {
        button.addEventListener("click", (event) => {
            currentTag = event.target.getAttribute("data-tag");
            loadBounties();
        });
    });

    function loadBounties() {
        if (!currentServerId) {
            bountiesContainer.classList.add("d-none");
            return;
        }

        let url = `/bounties/${currentServerId}`;
        if (currentTag) {
            url += `?tag=${currentTag}`;
        }

        fetch(url)
            .then(response => response.json())
            .then(bounties => {
                bountiesTableBody.innerHTML = ""; // Vider le tableau
                bountiesContainer.classList.remove("d-none");
                serverName.textContent = `Recherchés pour le serveur sélectionné :`;

                if (bounties.length === 0) {
                    bountiesTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center text-muted">Aucun recherché trouvé pour ce serveur.</td>
                        </tr>
                    `;
                } else {
                    bounties.forEach(bounty => {
                        const row = document.createElement("tr");

                        const lastKilled = bounty.last_killed_at
                            ? new Date(bounty.last_killed_at).toLocaleString("fr-FR")
                            : "Inconnu";

                        row.innerHTML = `
                            <td><img src="${bounty.image_url}" alt="${bounty.name}" style="width: 50px; height: 50px;"></td>
                            <td>${bounty.name}</td>
                            <td class="window-status" title="Fenêtre Fermé. Dernière mort: ${lastKilled}">Depuis 0h 0m 0s</td>
                            <td>
                                <div class="progress position-relative">
                                    <div class="progress-bar bg-danger progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="9">
                                        0h 0m 0s
                                    </div>
                                    <div class="progress-section progress-section-3h position-absolute" style="left: 33.33%; height: 100%; width: 2px; background-color: #fff;"></div>
                                    <div class="progress-section progress-section-9h position-absolute" style="left: 66.66%; height: 100%; width: 2px; background-color: #fff;"></div>
                                </div>
                            </td>
                            <td class="max-respawn">Dans 0m 0s</td>
                            <td>${bounty.location_map_name}</td>
                            <td><button class="btn btn-primary report-btn" data-bounty-id="${bounty.id}">Report</button></td>
                            <td><input type="checkbox" class="track-checkbox" data-bounty-id="${bounty.id}" ${bounty.is_hunted ? 'checked' : ''}></td>
                        `;

                        bountiesTableBody.appendChild(row);

                        document.querySelector(`.report-btn[data-bounty-id="${bounty.id}"]`).addEventListener("click", (event) => {
                            const bountyId = event.target.getAttribute("data-bounty-id");
                            fetch(`/bounties/report/${bountyId}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ reported_at: new Date().toISOString() })
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log("Report successful:", data);
                                // Réinitialiser le timer
                                bounty.last_killed_at = new Date().toISOString();
                            })
                            .catch(error => console.error("Erreur lors du report du recherché :", error));
                        });

                        document.querySelector(`.track-checkbox[data-bounty-id="${bounty.id}"]`).addEventListener("change", (event) => {
                            const bountyId = event.target.getAttribute("data-bounty-id");
                            const isHunted = event.target.checked;
                            fetch(`/bounties/track/${bountyId}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ is_hunted: isHunted })
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log("Tracking status updated:", data);
                            })
                            .catch(error => console.error("Erreur lors du suivi du recherché :", error));
                        });
                    });
                }
            })
            .catch(error => console.error("Erreur lors du chargement des recherchés :", error));
    }
});
