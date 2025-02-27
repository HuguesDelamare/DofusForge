document.addEventListener("DOMContentLoaded", () => {
    const serverSelect = document.getElementById("server-select");
    const bountiesContainer = document.getElementById("bounties-container");
    const serverName = document.getElementById("server-name");
    const bountiesTableBody = document.getElementById("bounties-table-body");
    const filterButtons = document.querySelectorAll(".filter-btn");

    let currentServerId = null;
    let currentTag = null;
    let bountiesData = {};
    let timers = {};

    // Load servers
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
        .catch(error => console.error("Error loading servers:", error));

    // Load bounties for a selected server
    serverSelect.addEventListener("change", (event) => {
        currentServerId = event.target.value;
        currentTag = null;
        loadBounties();
    });

    // Filter bounties by tag
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
                bountiesData = bounties.reduce((acc, bounty) => {
                    acc[bounty.id] = bounty;
                    return acc;
                }, {});

                bountiesTableBody.innerHTML = "";
                bountiesContainer.classList.remove("d-none");
                serverName.textContent = `Bounties for the selected server:`;

                if (bounties.length === 0) {
                    bountiesTableBody.innerHTML = `
                        <tr>
                            <td colspan="8" class="text-center text-muted">No bounties found for this server.</td>
                        </tr>
                    `;
                } else {
                    bounties.forEach(bounty => {
                        const row = document.createElement("tr");
                        row.classList.add(`tag-${bounty.tag.replace(/\s+/g, '-')}`);

                        const lastKilled = bounty.last_killed_at
                            ? new Date(bounty.last_killed_at).toLocaleString("fr-FR")
                            : "Unknown";

                        row.innerHTML = `
                            <td><img src="${bounty.image_url}" alt="${bounty.name}" style="width: 50px; height: 50px;"></td>
                            <td>${bounty.name}</td>
                            <td class="window-status" title="Window Closed. Last kill: ${lastKilled}">Since 0h 0m 0s</td>
                            <td>
                                <div class="progress position-relative">
                                    <div class="progress-bar bg-danger progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="9">
                                        0h 0m 0s
                                    </div>
                                    <div class="progress-section progress-section-3h position-absolute" style="left: 33.33%; height: 100%; width: 2px; background-color: #fff;"></div>
                                    <div class="progress-section progress-section-9h position-absolute" style="left: 66.66%; height: 100%; width: 2px; background-color: #fff;"></div>
                                </div>
                            </td>
                            <td class="max-respawn">In 0m 0s</td>
                            <td>${bounty.location_map_name}</td>
                            <td><button class="btn btn-primary report-btn" data-bounty-id="${bounty.id}">Report</button></td>
                            <td><input type="checkbox" class="track-checkbox" data-bounty-id="${bounty.id}" ${bounty.is_hunted ? 'checked' : ''}></td>
                        `;

                        // Apply gradient background color based on tag
                        const tagColorMap = {
                            "tag-1": "linear-gradient(to right, #ff7e5f, #feb47b)",
                            "tag-2": "linear-gradient(to right, #6a11cb, #2575fc)",
                            "tag-3": "linear-gradient(to right, #43cea2, #185a9d)",
                            // Add more tag-color mappings as needed
                        };
                        const tagClass = `tag-${bounty.tag.replace(/\s+/g, '-')}`;
                        if (tagColorMap[tagClass]) {
                            row.style.background = tagColorMap[tagClass];
                        }

                        bountiesTableBody.appendChild(row);

                        const detailsRow = document.createElement("tr");
                        detailsRow.classList.add("details-container");
                        detailsRow.style.display = "none"; // Hide by default
                        detailsRow.innerHTML = `
                            <td colspan="8">
                                <div class="details-content" style="display: flex; align-items: center; justify-content: center;">
                                    <img src="${bounty.location_image}" alt="Location Image" style="max-width: 300px; height: auto; margin-right: 20px;">
                                    <div class="info-row">
                                        <p><strong>Name:</strong> ${bounty.name}</p>
                                        <p><strong>Reward:</strong> ${bounty.reward_amount} <img src="/static/images/illustrations/${bounty.reward_type.toLowerCase()}.png" alt="${bounty.reward_type}" style="width: 20px; height: 20px;"></p>
                                        <p><strong>Zone:</strong> ${bounty.location_map_name}</p>
                                        <p><strong>Starting Quest:</strong> ${bounty.starting_quest}</p>
                                        <p><strong>Return Quest:</strong> ${bounty.return_quest}</p>
                                        <a href="${bounty.links}" class="btn btn-info mt-2" target="_blank">View on Dofus pour les Noobs</a>
                                    </div>
                                </div>
                            </td>
                        `;
                        bountiesTableBody.appendChild(detailsRow);

                        const updateTimer = () => {
                            const now = new Date();
                            const lastKilledDate = new Date(bounty.last_killed_at);
                            const timeSinceLastKilled = now - lastKilledDate;
                            const hoursSinceLastKilled = Math.floor(timeSinceLastKilled / 3600000);
                            const minutesSinceLastKilled = Math.floor((timeSinceLastKilled % 3600000) / 60000);
                            const secondsSinceLastKilled = Math.floor((timeSinceLastKilled % 60000) / 1000);
                            const totalMinutesSinceLastKilled = Math.floor(timeSinceLastKilled / 60000);
                            const minutesUntilMaxRespawn = Math.max(0, Math.floor((9 * 60) - totalMinutesSinceLastKilled));
                            const secondsUntilMaxRespawn = Math.max(0, Math.floor((9 * 60 * 60 - timeSinceLastKilled) / 1000));

                            let progressBarColor = "bg-danger";
                            if (hoursSinceLastKilled >= 3 && hoursSinceLastKilled < 9) {
                                progressBarColor = "bg-success";
                            } else if (hoursSinceLastKilled >= 9) {
                                progressBarColor = "bg-primary";
                            }

                            const windowStatus = hoursSinceLastKilled >= 3 ? "Open" : "Closed";

                            row.querySelector(".window-status").innerHTML = `Since ${hoursSinceLastKilled}h ${minutesSinceLastKilled}m ${secondsSinceLastKilled}s`;
                            row.querySelector(".window-status").setAttribute("title", `Window ${windowStatus}. Last kill: ${lastKilled}`);
                            row.querySelector(".progress-bar").style.width = `${Math.min(totalMinutesSinceLastKilled / (9 * 60) * 100, 100)}%`;
                            row.querySelector(".progress-bar").className = `progress-bar progress-bar-striped progress-bar-animated ${progressBarColor}`;
                            row.querySelector(".progress-bar").innerHTML = `${hoursSinceLastKilled}h ${minutesSinceLastKilled}m ${secondsSinceLastKilled}s`;
                            row.querySelector(".max-respawn").innerHTML = `In ${Math.floor(secondsUntilMaxRespawn / 60)}m ${secondsUntilMaxRespawn % 60}s`;

                            // Change the progress bar color at the 3-hour section
                            if (hoursSinceLastKilled >= 3 && hoursSinceLastKilled < 9) {
                                row.querySelector(".progress-bar").classList.remove("bg-danger");
                                row.querySelector(".progress-bar").classList.add("bg-success");
                            } else if (hoursSinceLastKilled >= 9) {
                                row.querySelector(".progress-bar").classList.remove("bg-success");
                                row.querySelector(".progress-bar").classList.add("bg-primary");
                            }
                        };

                        if (timers[currentServerId]) {
                            clearInterval(timers[currentServerId]);
                        }
                        timers[currentServerId] = setInterval(updateTimer, 1000); // Update every second
                        updateTimer(); // Update immediately

                        row.addEventListener("click", (event) => {
                            if (event.target.classList.contains("track-checkbox")) {
                                return; // Prevent expanding details-container when checkbox is clicked
                            }
                            detailsRow.style.display = detailsRow.style.display === "none" ? "table-row" : "none";
                        });

                        row.querySelector(`.report-btn[data-bounty-id="${bounty.id}"]`).addEventListener("click", (event) => {
                            event.stopPropagation(); // Prevent the row click event
                            const bountyId = event.target.getAttribute("data-bounty-id");
                            fetch(`/bounties/report/${bountyId}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ reported_at: new Date().toISOString(), server_id: currentServerId })
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log("Report successful:", data);
                                // Reset the timer
                                bountiesData[bountyId].last_killed_at = new Date().toISOString();
                                bounty.last_killed_at = bountiesData[bountyId].last_killed_at; // Update the local bounty data
                                updateTimer();
                            })
                            .catch(error => console.error("Error reporting bounty:", error));
                        });

                        row.querySelector(`.track-checkbox[data-bounty-id="${bounty.id}"]`).addEventListener("change", (event) => {
                            event.stopPropagation(); // Prevent the row click event
                            const bountyId = event.target.getAttribute("data-bounty-id");
                            const isHunted = event.target.checked;
                            fetch(`/bounties/track/${bountyId}`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ is_hunted: isHunted, server_id: currentServerId })
                            })
                            .then(response => response.json())
                            .then(data => {
                                console.log("Tracking status updated:", data);
                            })
                            .catch(error => console.error("Error tracking bounty:", error));
                        });
                    });
                }
            })
            .catch(error => console.error("Error loading bounties:", error));
    }
});
