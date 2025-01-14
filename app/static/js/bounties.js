document.addEventListener("DOMContentLoaded", () => {
    const serverSelect = document.getElementById("server-select");
    const bountiesContainer = document.getElementById("bounties-container");
    const serverName = document.getElementById("server-name");
    const bountiesTableBody = document.getElementById("bounties-table-body");
    const additionalInfoContainer = document.getElementById("additional-info-container");
    const locationImage = document.getElementById("location-image");

    // Charger les serveurs
    fetch('/bounties/servers')
        .then(response => {
            console.log("Réponse du serveur :", response);
            return response.json();
        })
        .then(servers => {
            console.log("Serveurs récupérés :", servers);
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
        const serverId = event.target.value;
        if (!serverId) {
            bountiesContainer.classList.add("d-none");
            return;
        }

        fetch(`/bounties/${serverId}`)
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

                        const updateTimer = () => {
                            const now = new Date();
                            const lastKilledDate = new Date(bounty.last_killed_at);
                            const timeSinceLastKilled = now - lastKilledDate;
                            const hoursSinceLastKilled = Math.floor(timeSinceLastKilled / 3600000);
                            const minutesSinceLastKilled = Math.floor((timeSinceLastKilled % 3600000) / 60000);
                            const secondsSinceLastKilled = Math.floor((timeSinceLastKilled % 60000) / 1000);
                            const minutesUntilMaxRespawn = Math.max(0, Math.floor((9 - hoursSinceLastKilled) * 60));
                            const secondsUntilMaxRespawn = Math.max(0, Math.floor((9 * 60 * 60 - timeSinceLastKilled) / 1000));

                            let progressBarColor = "bg-danger";
                            if (hoursSinceLastKilled >= 3 && hoursSinceLastKilled < 9) {
                                progressBarColor = "bg-success";
                            } else if (hoursSinceLastKilled >= 9) {
                                progressBarColor = "bg-primary";
                            }

                            const windowStatus = hoursSinceLastKilled >= 3 ? "Ouvert" : "Fermé";

                            row.querySelector(".window-status").innerHTML = `Depuis ${hoursSinceLastKilled}h ${minutesSinceLastKilled}m ${secondsSinceLastKilled}s`;
                            row.querySelector(".window-status").setAttribute("title", `Fenêtre ${windowStatus}. Dernière mort: ${lastKilled}`);
                            row.querySelector(".progress-bar").style.width = `${Math.min(hoursSinceLastKilled / 9 * 100, 100)}%`;
                            row.querySelector(".progress-bar").className = `progress-bar ${progressBarColor}`;
                            row.querySelector(".progress-bar").innerHTML = `${hoursSinceLastKilled}h ${minutesSinceLastKilled}m ${secondsSinceLastKilled}s`;
                            row.querySelector(".max-respawn").innerHTML = `Dans ${Math.floor(secondsUntilMaxRespawn / 60)}m ${secondsUntilMaxRespawn % 60}s`;

                            // Changer la couleur de la barre de progression à la section de 3 heures
                            if (hoursSinceLastKilled >= 3 && hoursSinceLastKilled < 9) {
                                row.querySelector(".progress-bar").classList.remove("bg-danger");
                                row.querySelector(".progress-bar").classList.add("bg-success");
                            }
                        };

                        row.innerHTML = `
                            <td><img src="${bounty.image_url}" alt="${bounty.name}" style="width: 50px; height: 50px;"></td>
                            <td>${bounty.name}</td>
                            <td class="window-status" title="Fenêtre Fermé. Dernière mort: ${lastKilled}">Depuis 0h 0m 0s</td>
                            <td>
                                <div class="progress">
                                    <div class="progress-bar bg-danger" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="9">
                                        0h 0m 0s
                                    </div>
                                    <div class="progress-section progress-section-3h"></div>
                                    <div class="progress-section progress-section-9h"></div>
                                </div>
                            </td>
                            <td class="max-respawn">Dans 0m 0s</td>
                            <td>${bounty.location_map_name}</td>
                            <td><button class="btn btn-primary report-btn" data-bounty-id="${bounty.id}">Report</button></td>
                            <td><input type="checkbox" class="track-checkbox" data-bounty-id="${bounty.id}" ${bounty.is_hunted ? 'checked' : ''}></td>
                        `;

                        const detailsRow = document.createElement("tr");
                        detailsRow.classList.add("details-row", "d-none");
                        detailsRow.innerHTML = `
                            <td colspan="8">
                                <div class="details-container">
                                    <img src="${bounty.location_image}" alt="Location">
                                    <div class="details-info">
                                        <div class="info-row">
                                            <p><strong>Difficulté:</strong> ${bounty.difficulty}</p>
                                            <p><strong>Jetons gagnés:</strong> ${bounty.reward_amount} ${bounty.reward_type}</p>
                                        </div>
                                        <img src="${bounty.infos_image}" alt="Infos" class="infos-image">
                                        <a href="${bounty.links}" target="_blank" class="btn btn-info mt-2">Voir sur DofusPourLesNoobs</a>
                                    </div>
                                </div>
                            </td>
                        `;

                        console.log("infos_image URL:", bounty.infos_image); // Ajouter un log pour vérifier le chemin de l'image

                        row.addEventListener("click", () => {
                            detailsRow.classList.toggle("d-none");
                            if (locationImage) {
                                if (bounty.location_image) {
                                    locationImage.src = bounty.location_image;
                                    locationImage.classList.remove("d-none");
                                } else {
                                    locationImage.classList.add("d-none");
                                }
                                additionalInfoContainer.classList.remove("d-none");
                            }
                            console.log("infos_image URL on click:", bounty.infos_image); // Ajouter un log pour vérifier le chemin de l'image lors du clic
                        });

                        bountiesTableBody.appendChild(row);
                        bountiesTableBody.appendChild(detailsRow);

                        setInterval(updateTimer, 1000); // Mettre à jour toutes les secondes
                        updateTimer(); // Mettre à jour immédiatement

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
                                updateTimer();
                            })
                            .catch(error => console.error("Erreur lors du report du recherché :", error));
                        });
                    });

                    document.querySelectorAll(".track-checkbox").forEach(checkbox => {
                        checkbox.addEventListener("change", (event) => {
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

                    // Initialize tooltips
                    document.querySelectorAll('.window-status').forEach(element => {
                        element.addEventListener('mouseover', (event) => {
                            const tooltip = document.createElement('div');
                            tooltip.className = 'tooltip';
                            tooltip.innerText = event.target.getAttribute('title');
                            document.body.appendChild(tooltip);
                            const rect = event.target.getBoundingClientRect();
                            tooltip.style.left = `${rect.left + window.scrollX}px`;
                            tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight}px`;
                        });

                        element.addEventListener('mouseout', () => {
                            document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
                        });
                    });
                }
            })
            .catch(error => console.error("Erreur lors du chargement des recherchés :", error));
    });
});
