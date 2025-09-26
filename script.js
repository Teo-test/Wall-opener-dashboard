// ===== CONFIGURATION =====
// ID de ton Google Sheet (corrigé : pas besoin de "/e/" dans l'URL CSV)
const SHEET_ID = "2PACX-1vRyPCJvodwRZ0GAzeNCAbCkJW04rH9ryjag-CtStFTVmBPm-7uP1Da29l5qqBs30FnwCmJySUWaScwC";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

// URL de l'API Apps Script (à remplacer par la tienne)
const API_URL = "https://script.google.com/macros/s/AKfycbz7zoIOMCPMcSB2hhYJoGs2W_KzdrS5rH-nP07aMy2YVpTLCvqx5KaUubrXEt5_TGvE-w/exec";
const SECRET_KEY = "1E2zrHhnUxgYL0PHaHq_4yzfrGQ_fbaiaSWY5SD9q8qm-ptPLw5pPBK7v"; // Doit correspondre à celle dans Apps Script

// Données globales
let routes = [];
let filteredRoutes = [];
let currentPage = 1;
const rowsPerPage = 10;
let sortColumn = null;
let sortDirection = 1;
let currentEditingLine = null; // Ligne en cours d'édition

// ===== FONCTIONS UTILITAIRES =====
/**
 * Trie les cotations par difficulté
 */
function sortGrades(grades) {
    const gradeOrder = [
        "4a", "4b", "4c",
        "5a", "5a+", "5b", "5b+", "5c", "5c+",
        "6a", "6a+", "6b", "6b+", "6c", "6c+",
        "7a", "7a+", "7b", "7b+", "7c", "7c+",
        "8a", "8a+", "8b", "8b+", "8c", "8c+"
    ];
    return grades.sort((a, b) => gradeOrder.indexOf(a.toLowerCase()) - gradeOrder.indexOf(b.toLowerCase()));
}

/**
 * Convertit un nom de couleur en code hexa
 */
function getColorCode(color) {
    const colorMap = {
        "Jaune": "#FFD700",
        "Rouge": "#FF6B6B",
        "Blanc": "#f0f0f0",
        "Orange": "#FFA500",
        "Bleu": "#4ECDC4",
        "Vert": "#6BCB77",
        "Violet": "#B19CD9",
        "Rose": "#FF9FF3",
        "Noir": "#333333",
        "Marron": "#A0522D"
    };
    return colorMap[color] || "#CCCCCC";
}

/**
 * Traduit un statut en français
 */
function translateStatus(status) {
    const statusMap = {
        'to_open': 'À ouvrir',
        'in_progress': 'En cours',
        'completed': 'Terminé'
    };
    return statusMap[status] || status;
}

// ===== CHARGEMENT DES DONNÉES =====
/**
 * Charge les données depuis le Google Sheet
 */
async function loadData() {
    try {
        const response = await fetch(SHEET_URL);
        const csvText = await response.text();
        const rows = csvText.split('\n').slice(1); // Ignorer l'en-tête

        routes = rows
            .map(row => {
                const values = row.split(/,(?=(?:(?:[^"]*"[^"]*")*[^"]*$))/);
                return {
                    line: parseInt(values[0]?.replace(/"/g, '').trim() || 0),
                    zone: parseInt(values[1]?.replace(/"/g, '').trim() || 0),
                    grade: values[2]?.replace(/"/g, '').trim() || "Inconnu",
                    color: values[3]?.replace(/"/g, '').trim() || "Jaune",
                    holds: parseInt(values[4]?.replace(/"/g, '').trim() || 0),
                    type: values[5]?.replace(/"/g, '').trim() || "Inconnu",
                    opener: values[6]?.replace(/"/g, '').trim() || "Inconnu",
                    status: values[7]?.replace(/"/g, '').trim() || "to_open",
                    notes: values[8]?.replace(/"/g, '').trim() || ""
                };
            })
            .filter(route => route.line > 0 && !["inconnu", "false", ""].includes(route.grade.toLowerCase()));

        filteredRoutes = [...routes];
        updateDashboard();
    } catch (error) {
        console.error("Erreur de chargement :", error);
        alert("Erreur de chargement des données.");
    }
}

// ===== MISE À JOUR DU DASHBOARD =====
/**
 * Met à jour tous les éléments du dashboard
 */
function updateDashboard() {
    updateKPIs();
    updateRoutesTable();
    initCharts();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('fr-FR');
}

/**
 * Met à jour les KPI
 */
function updateKPIs() {
    const totalRoutes = filteredRoutes.length;
    const completedRoutes = filteredRoutes.filter(r => r.status === 'À ouvrir').length;
    const inProgressRoutes = filteredRoutes.filter(r => r.status === 'En cours').length;
    const toOpenRoutes = filteredRoutes.filter(r => r.status === 'À ouvrir').length;

    document.getElementById('totalRoutes').textContent = totalRoutes;
    document.getElementById('completedRoutes').textContent = completedRoutes;
    document.getElementById('inProgressRoutes').textContent = inProgressRoutes;
    document.getElementById('toOpenRoutes').textContent = toOpenRoutes;
}

/**
 * Met à jour le tableau des voies (UNIQUEMENT avec bouton Modifier)
 */
function updateRoutesTable() {
    // Appliquer le tri si une colonne est sélectionnée
    if (sortColumn !== null) {
        sortedRoutes = [...filteredRoutes].sort((a, b) => {
            const keys = Object.keys(a);
            let valA = a[keys[sortColumn]];
            let valB = b[keys[sortColumn]];

            if (sortColumn === 7) { // Statut
                const statusOrder = { 'À ouvrir': 1, 'En cours': 2, 'Complété': 3 };
                return (statusOrder[valA] - statusOrder[valB]) * sortDirection;
            } else if (typeof valA === 'string') {
                return valA.localeCompare(valB) * sortDirection;
            } else {
                return (valA - valB) * sortDirection;
            }
        });
    } else {
        sortedRoutes = [...filteredRoutes];
    }

    // Pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedRoutes = sortedRoutes.slice(startIndex, startIndex + rowsPerPage);

    // Générer le tableau SANS édition directe (UNIQUEMENT bouton Modifier)
    const tableBody = document.getElementById('routesTableBody');
    tableBody.innerHTML = paginatedRoutes.map(route => `
        <tr data-line="${route.line}">
            <td>${route.line}</td>
            <td>Zone ${route.zone}</td>
            <td>${route.grade}</td>
            <td>
                <div class="color-box" style="background-color: ${getColorCode(route.color)};"></div>
                ${route.color}
            </td>
            <td>${route.holds}</td>
            <td>${route.type}</td>
            <td>${route.opener}</td>
            <td class="status-${route.status}">${translateStatus(route.status)}</td>
            <td>${route.notes}</td>
            <td>
                <button onclick="openEditModal(${route.line})" class="edit-btn" title="Modifier cette voie">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');

    updatePagination();
}

/**
 * Ouvre la modale d'édition pour une voie (UNIQUE moyen de modification)
 * @param {number} line - Numéro de ligne de la voie
 */
function openEditModal(line) {
    const route = routes.find(r => r.line === line);
    if (!route) return;

    currentEditingLine = line;

    // Remplir la modale avec les données de la voie
    document.getElementById('editModalTitle').textContent = `Éditer la voie : ${route.grade} ${route.color} (Ligne ${line})`;
    document.getElementById('editLine').value = route.line;
    document.getElementById('editZone').value = route.zone;
    document.getElementById('editGrade').value = route.grade;
    document.getElementById('editColor').value = route.color;
    document.getElementById('editHolds').value = route.holds;
    document.getElementById('editType').value = route.type;
    document.getElementById('editOpener').value = route.opener;
    document.getElementById('editStatus').value = route.status;
    document.getElementById('editNotes').value = route.notes;

    // Afficher la modale
    document.getElementById('editRouteModal').style.display = 'block';
}

/**
 * Ferme la modale d'édition
 */
function closeEditModal() {
    document.getElementById('editRouteModal').style.display = 'none';
    currentEditingLine = null;
}

/**
 * Sauvegarde les modifications de la voie
 */
async function saveEditedRoute(event) {
    event.preventDefault();

    const line = currentEditingLine;
    const routeIndex = routes.findIndex(r => r.line === line);
    if (routeIndex === -1) return;

    // Mettre à jour les données
    routes[routeIndex] = {
        ...routes[routeIndex],
        line: parseInt(document.getElementById('editLine').value),
        zone: parseInt(document.getElementById('editZone').value),
        grade: document.getElementById('editGrade').value,
        color: document.getElementById('editColor').value,
        holds: parseInt(document.getElementById('editHolds').value),
        type: document.getElementById('editType').value,
        opener: document.getElementById('editOpener').value,
        status: document.getElementById('editStatus').value,
        notes: document.getElementById('editNotes').value
    };

    // Mettre à jour le Google Sheet
    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...routes[routeIndex],
                secret: SECRET_KEY
            })
        });

        // Rafraîchir les données
        filterRoutes();
        closeEditModal();
    } catch (error) {
        console.error("Erreur lors de la mise à jour :", error);
        alert("Erreur lors de la mise à jour. Vérifie la console.");
    }
}

/**
 * Met à jour les boutons de pagination
 */
function updatePagination() {
    const totalPages = Math.ceil(sortedRoutes.length / rowsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage}/${totalPages}`;

    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

/**
 * Passe à la page précédente
 */
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateRoutesTable();
    }
}

/**
 * Passe à la page suivante
 */
function nextPage() {
    const totalPages = Math.ceil(sortedRoutes.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateRoutesTable();
    }
}

/**
 * Trie le tableau par colonne
 */
function sortTable(columnIndex) {
    if (sortColumn === columnIndex) {
        sortDirection *= -1;
    } else {
        sortColumn = columnIndex;
        sortDirection = 1;
    }

    document.querySelectorAll('.routes-table th i').forEach((icon, index) => {
        icon.className = 'fas fa-sort';
        if (index === columnIndex) {
            icon.className = sortDirection === 1 ? 'fas fa-sort-up' : 'fas fa-sort-down';
        }
    });

    updateRoutesTable();
}

/**
 * Filtre les voies
 */
function filterRoutes() {
    currentPage = 1;
    const zoneFilter = document.getElementById('zoneFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const gradeFilter = document.getElementById('gradeFilter').value;

    filteredRoutes = routes.filter(route => {
        const zoneMatch = !zoneFilter || route.zone == zoneFilter;
        const statusMatch = !statusFilter || route.status === statusFilter;
        const gradeMatch = !gradeFilter || route.grade.startsWith(gradeFilter);

        return zoneMatch && statusMatch && gradeMatch;
    });

    updateRoutesTable();
}

/**
 * Recherche dans le tableau
 */
function searchRoutes() {
    currentPage = 1;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    if (searchTerm === '') {
        filteredRoutes = [...routes];
    } else {
        filteredRoutes = routes.filter(route =>
            route.line.toString().includes(searchTerm) ||
            `Zone ${route.zone}`.toLowerCase().includes(searchTerm) ||
            route.grade.toLowerCase().includes(searchTerm) ||
            route.color.toLowerCase().includes(searchTerm) ||
            route.holds.toString().includes(searchTerm) ||
            route.type.toLowerCase().includes(searchTerm) ||
            route.opener.toLowerCase().includes(searchTerm) ||
            translateStatus(route.status).toLowerCase().includes(searchTerm) ||
            route.notes.toLowerCase().includes(searchTerm)
        );
    }

    updateRoutesTable();
}

// ===== GESTION DE LA MODALE D'AJOUT =====
/**
 * Ouvre la modale pour ajouter une voie
 */
function addRoute() {
    document.getElementById('modalTitle').textContent = "Ajouter une voie";
    document.getElementById('routeForm').reset();
    document.getElementById('routeHolds').value = 27;
    document.getElementById('routeOpener').value = "Me";
    document.getElementById('routeModal').style.display = 'block';
}

/**
 * Ferme la modale d'ajout
 */
function closeModal() {
    document.getElementById('routeModal').style.display = 'none';
}

/**
 * Sauvegarde une nouvelle voie
 */
async function saveRoute(event) {
    event.preventDefault();

    const newRoute = {
        line: parseInt(document.getElementById('routeLine').value),
        zone: parseInt(document.getElementById('routeZone').value),
        grade: document.getElementById('routeGrade').value,
        color: document.getElementById('routeColor').value,
        holds: parseInt(document.getElementById('routeHolds').value),
        type: document.getElementById('routeType').value,
        opener: document.getElementById('routeOpener').value,
        status: document.getElementById('routeStatus').value,
        notes: document.getElementById('routeNotes').value,
        secret: SECRET_KEY
    };

    try {
        await fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newRoute)
        });

        setTimeout(loadData, 1000);
        closeModal();
    } catch (error) {
        console.error("Erreur :", error);
        alert("Erreur lors de la sauvegarde.");
    }
}

// ===== GESTION DES GRAPHIQUES =====
/**
 * Initialise les graphiques
 */
function initCharts() {
    // Graphique par cotation
    const grades = [...new Set(filteredRoutes.map(r => r.grade))]
        .filter(grade => grade && !["inconnu", "false", ""].includes(grade.toLowerCase()));
    const sortedGrades = sortGrades(grades);
    const gradeCounts = sortedGrades.map(grade =>
        filteredRoutes.filter(r => r.grade.toLowerCase() === grade.toLowerCase()).length
    );

    const gradeCtx = document.getElementById('gradeChart');
    if (gradeCtx) {
        window.gradeChart = new Chart(gradeCtx, {
            type: 'bar',
            plugins: [ChartDataLabels],
            data: {
                labels: sortedGrades,
                datasets: [{
                    label: 'Nombre de voies',
                    data: gradeCounts,
                    backgroundColor: sortedGrades.map(grade => {
                        if (grade.startsWith('4')) return '#4CAF50';
                        if (grade.startsWith('5')) return '#FFC107';
                        if (grade.startsWith('6')) return '#FF9800';
                        if (grade.startsWith('7')) return '#F44336';
                        if (grade.startsWith('8')) return '#9C27B0';
                        return '#9E9E9E';
                    }),
                    borderColor: '#ffffff',
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                    barPercentage: 0.7,
                    categoryPercentage: 0.8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 14 },
                        bodyFont: { size: 12 },
                        padding: 10
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => value > 0 ? value : '',
                        color: '#333',
                        font: { weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)', borderDash: [2, 2] },
                        ticks: { stepSize: 1, padding: 8 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, padding: 5 }
                    }
                }
            }
        });
    }

    // Graphique par zone (barres groupées par statut)
    const zoneCtx = document.getElementById('zoneChart');
    if (zoneCtx) {
        const uniqueZones = [...new Set(filteredRoutes.map(r => r.zone))].sort((a, b) => a - b);
        const statuses = ['À ouvrir', 'En cours', 'Terminé'];
        const statusLabels = {
            'Terminé': 'Terminé',
            'En cours': 'En cours',
            'À ouvrir': 'À ouvrir'
        };
        const statusColors = {
            'Terminé': '#28a745',   // Vert
            'En cours': '#ffc107', // Jaune
            'À ouvrir': '#6c757d'      // Gris
        };

        // Préparer les données pour chaque statut et zone
        const datasets = statuses.map(status => {
            return {
                label: statusLabels[status],
                data: uniqueZones.map(zone => {
                    return filteredRoutes.filter(r =>
                        r.zone === zone && r.status === status
                    ).length;
                }),
                backgroundColor: statusColors[status],
                borderColor: '#ffffff',
                borderWidth: 1,
                borderRadius: 4, // Coins arrondis
                barPercentage: 0.8, // Largeur des barres
                categoryPercentage: 0.7 // Espacement entre les groupes
            };
        });

        window.zoneChart = new Chart(zoneCtx, {
            type: 'bar',
            data: {
                labels: uniqueZones.map(z => `Zone ${z}`),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        offset: -5,
                        formatter: (value) => value > 0 ? value : '',
                        color: '#333',
                        font: { 
                            weight: 'bold',
                            size: 11
                        }
                    }
                },
                scales: {
                    x: { grid: { display: true , color: 'rgba(0, 0, 0, 0.5)' } 
                },
                    y: {
                        beginAtZero: true,
                        grid: { 
                            color: 'rgba(0, 0, 0, 0.15)',
                            drawBorder: true
                        },
                        ticks: { 
                            stepSize: 1,
                            padding: 10,
                            font: { size: 12 },
                            color: '#666'
                        }
                    }
                },
                animation: {
                    duration: 500,
                    easing: 'easeInOutQuart'
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    // Graphique par couleur
    const colorCtx = document.getElementById('colorChart');
    if (colorCtx) {
        const colors = [...new Set(filteredRoutes.map(r => r.color))];
        const colorCounts = colors.map(color =>
            filteredRoutes.filter(r => r.color === color).length
        );
        const colorBackgrounds = colors.map(color => getColorCode(color));

        window.colorChart = new Chart(colorCtx, {
            type: 'doughnut',
            data: {
                labels: colors,
                datasets: [{
                    data: colorCounts,
                    backgroundColor: colorBackgrounds,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    borderRadius: 8,
                    spacing: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, padding: 20, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.raw;
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ===== GESTION DU SCHÉMA DU MUR =====
/**
 * Initialise le schéma du mur avec les zones cliquables
 */
function initWallSchema() {
    const wallImage = document.getElementById('wallImage');
    if (!wallImage) return;

    // Attendre que l'image soit chargée
    wallImage.onload = function() {
        // Définir les zones cliquables (coordonnées approximatives à ajuster)
        const zones = [
            { id: 1, name: "Zone 1", coords: "0,0,200,300", color: "#FFD700" },
            { id: 2, name: "Zone 2", coords: "200,0,400,300", color: "#FF6B6B" },
            { id: 3, name: "Zone 3", coords: "400,0,600,300", color: "#4ECDC4" },
            { id: 4, name: "Zone 4", coords: "600,0,800,300", color: "#6BCB77" },
            { id: 5, name: "Zone 5", coords: "800,0,1000,300", color: "#B19CD9" }
        ];

        const map = document.getElementById('wallmap');

        // Créer les zones cliquables
        zones.forEach(zone => {
            const area = document.createElement('area');
            area.setAttribute('shape', 'rect');
            area.setAttribute('coords', zone.coords);
            area.setAttribute('href', '#');
            area.setAttribute('data-zone-id', zone.id);
            area.setAttribute('data-zone-name', zone.name);
            area.setAttribute('data-zone-color', zone.color);
            area.addEventListener('click', function(e) {
                e.preventDefault();
                showZoneRoutes(zone.id);
            });
            map.appendChild(area);
        });

        // Afficher toutes les voies au chargement
        showAllRoutes();
    };

    // Si l'image est déjà chargée
    if (wallImage.complete) {
        wallImage.onload();
    }
}

/**
 * Affiche les voies d'une zone spécifique
 * @param {number} zoneId - ID de la zone
 */
function showZoneRoutes(zoneId) {
    // Masquer toutes les voies
    document.querySelectorAll('.route-path, .hold').forEach(el => el.remove());

    // Filtrer les voies de la zone sélectionnée
    const zoneRoutes = filteredRoutes.filter(route => route.zone == zoneId);

    // Afficher les informations de la zone
    const zone = document.querySelector(`area[data-zone-id="${zoneId}"]`);
    if (zone) {
        document.getElementById('routeInfoTitle').textContent =
            `Voies de la ${zone.getAttribute('data-zone-name')}`;
        document.getElementById('routeInfoContent').innerHTML =
            zoneRoutes.length > 0 ?
            `<ul>${zoneRoutes.map(route =>
                `<li>
                    <strong>Ligne ${route.line}:</strong> ${route.grade} (${translateStatus(route.status)})
                    <div class="color-box" style="background-color: ${getColorCode(route.color)};"></div>
                </li>`
            ).join('')}</ul>` :
            `<p>Aucune voie dans cette zone</p>`;
    }

    // Mettre en évidence la zone sélectionnée
    document.querySelectorAll('area').forEach(area => {
        area.classList.remove('active');
    });
    if (zone) zone.classList.add('active');

    // Dessiner les voies sur le schéma (simplifié - à adapter avec tes données réelles)
    drawRoutesOnSchema(zoneRoutes);
}

/**
 * Dessine les voies sur le schéma
 * @param {Array} routes - Liste des voies à dessiner
 */
function drawRoutesOnSchema(routes) {
    const schema = document.querySelector('.wall-schema');
    if (!schema) return;

    routes.forEach(route => {
        // Exemple simplifié - à adapter avec tes coordonnées réelles
        // Ici on génère des positions aléatoires pour la démo
        const x1 = Math.random() * 80 + (route.zone - 1) * 150;
        const y1 = Math.random() * 200 + 50;
        const x2 = x1 + Math.random() * 30 - 15;
        const y2 = y1 + Math.random() * 50 + 20;

        // Créer un chemin pour la voie
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('class', 'route-path');
        path.setAttribute('d', `M${x1},${y1} L${x2},${y2}`);
        path.setAttribute('stroke', getColorCode(route.color));
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        schema.appendChild(path);

        // Ajouter des prises (simplifié)
        for (let i = 0; i < 3; i++) {
            const hold = document.createElement('div');
            hold.className = 'hold';
            hold.style.left = `${x1 + (x2 - x1) * (i/2)}px`;
            hold.style.top = `${y1 + (y2 - y1) * (i/2)}px`;
            hold.style.backgroundColor = getColorCode(route.color);
            schema.appendChild(hold);
        }
    });
}

/**
 * Affiche toutes les voies sur le schéma
 */
function showAllRoutes() {
    document.getElementById('routeInfoTitle').textContent = "Toutes les voies";
    document.getElementById('routeInfoContent').innerHTML =
        filteredRoutes.length > 0 ?
        `<ul>${filteredRoutes.map(route =>
            `<li>
                <strong>Ligne ${route.line} (Zone ${route.zone}):</strong> ${route.grade}
                <div class="color-box" style="background-color: ${getColorCode(route.color)};"></div>
            </li>`
        ).join('')}</ul>` :
        `<p>Aucune voie disponible</p>`;

    drawRoutesOnSchema(filteredRoutes);
}

/**
 * Masque toutes les voies sur le schéma
 */
function hideAllRoutes() {
    document.querySelectorAll('.route-path, .hold').forEach(el => el.remove());
    document.getElementById('routeInfoTitle').textContent = "Aucune voie affichée";
    document.getElementById('routeInfoContent').innerHTML = "<p>Toutes les voies sont masquées</p>";
}

// ===== ÉVÉNEMENTS POUR LE SCHÉMA =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le schéma du mur
    initWallSchema();

    // Boutons de contrôle
    document.getElementById('showAllRoutes').addEventListener('click', showAllRoutes);
    document.getElementById('hideAllRoutes').addEventListener('click', hideAllRoutes);
});


// ===== INITIALISATION =====
// Bouton "Retour en haut"
document.getElementById('backToTop').addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Chargement initial des données
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});
