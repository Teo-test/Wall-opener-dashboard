// ===== CONFIGURATION SUPABASE =====
const supabaseUrl = 'https://cmdincdnmnemjjzkbmns.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtZGluY2RubW5lbWpqemtibW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI5NjYxOCwiZXhwIjoyMDc0ODcyNjE4fQ.EHBkNIEUUp5YZkyoFRyFWyu6Vgm87OTX1dJJ5I2Aqjc';


// ===== CONSTANTES =====
const GRADE_ORDER = [
    "4a", "4b", "4c",
    "5a", "5a+", "5b", "5b+", "5c", "5c+",
    "6a", "6a+", "6b", "6b+", "6c", "6c+",
    "7a", "7a+", "7b", "7b+", "7c", "7c+",
    "8a", "8a+", "8b", "8b+", "8c", "8c+"
];

const COLOR_MAP = {
    "Jaune": "#FFD700",
    "Rouge": "#FF6B6B",
    "Blanc": "#f0f0f0",
    "Orange": "#FFA500",
    "Bleu": "#1E90FF",
    "Vert": "#6BCB77",
    "Violet": "#B19CD9",
    "Rose": "#FF9FF3",
    "Noir": "#333333",
    "Marron": "#A0522D"
};

const STATUS_MAP = {
    'to_open': 'À ouvrir',
    'in_progress': 'En cours',
    'completed': 'Terminé'
};

const ZONE_COORDS = {
    1: { x: 50, y: 50 },
    2: { x: 250, y: 50 },
    3: { x: 450, y: 50 },
    4: { x: 650, y: 50 },
    5: { x: 850, y: 50 }
};

const LINE_COORDS = {
    1: { x: 35, y: 400 },
    2: { x: 75, y: 400 },
    3: { x: 115, y: 400 },
    4: { x: 155, y: 400 },
    5: { x: 195, y: 400 },
    6: { x: 235, y: 400 },
    7: { x: 275, y: 400 },
    8: { x: 315, y: 400 },
    9: { x: 355, y: 400 },
    10: { x: 395, y: 400 },
    11: { x: 435, y: 400 },
    12: { x: 475, y: 400 },
    13: { x: 515, y: 400 },
    14: { x: 555, y: 400 },
    15: { x: 595, y: 400 },
    16: { x: 635, y: 400 },
    17: { x: 675, y: 400 },
    18: { x: 715, y: 400 },
    19: { x: 755, y: 400 },
    20: { x: 795, y: 400 },
    21: { x: 835, y: 400 },
    22: { x: 875, y: 400 },
    23: { x: 915, y: 400 },
    24: { x: 950, y: 400 }
};

// ===== DONNÉES GLOBALES =====
let routes = [];
let reviews = [];
let gradeChart, zoneChart, colorChart;
let filteredRoutes = [];
let currentPage = 1;
const rowsPerPage = 10;
let sortColumn = null;
let sortDirection = 1;
let currentEditingLine = null;

// ===== FONCTIONS UTILITAIRES =====
function sortGrades(grades) {
    return grades.sort((a, b) => GRADE_ORDER.indexOf(a.toLowerCase()) - GRADE_ORDER.indexOf(b.toLowerCase()));
}

function getColorCode(color) {
    return COLOR_MAP[color] || "#CCCCCC";
}

function translateStatus(status) {
    return STATUS_MAP[status] || status;
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadData() {
    try {
        const { data: routesData, error: routesError } = await supabaseClient
            .from('voies').select('*');

        if (routesError) throw routesError;

        routes = routesData.map(route => ({
            line: route.nom,
            zone: route.zone,
            grade: route.grade,
            color: route.color,
            holds: route.nb_prises,
            type: route.type,
            opener: route.ouvreur,
            status: route.statut,
            notes: route.commentaire || ""
        }));

        filteredRoutes = [...routes];
        updateDashboard();
    } catch (error) {
        console.error("Erreur de chargement :", error);
        alert("Erreur de chargement des données.");
    }

    try {
        const { data: reviewsData, error: reviewsError } = await supabaseClient
            .from('avis').select('*');

        if (reviewsError) throw reviewsError;

        reviews = reviewsData.map(review => ({
            id: review.id,
            voie_id: review.voie_id,
            utilisateur: review.utilisateur,
            commentaire: review.commentaire || "",
            note: review.note,
            date: review.date
        }));
    } catch (error) {
        console.error("Erreur de chargement des avis :", error);
        alert("Erreur de chargement des avis.");
    }
}

// ===== MISE À JOUR DU DASHBOARD =====
function updateDashboard() {
    updateKPIs();
    updateRoutesTable();
    initCharts();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('fr-FR');
}

function updateKPIs() {
    const totalRoutes = filteredRoutes.length;
    const completedRoutes = filteredRoutes.filter(r => r.status === 'Terminé').length;
    const inProgressRoutes = filteredRoutes.filter(r => r.status === 'En cours').length;
    const toOpenRoutes = filteredRoutes.filter(r => r.status === 'À ouvrir').length;

    document.getElementById('totalRoutes').textContent = totalRoutes;
    document.getElementById('completedRoutes').textContent = completedRoutes;
    document.getElementById('inProgressRoutes').textContent = inProgressRoutes;
    document.getElementById('toOpenRoutes').textContent = toOpenRoutes;
}

// ===== GESTION DU TABLEAU DES VOIES =====
function updateRoutesTable() {
    let sortedRoutes = sortColumn !== null
        ? [...filteredRoutes].sort((a, b) => {
            const keys = Object.keys(a);
            let valA = a[keys[sortColumn]];
            let valB = b[keys[sortColumn]];

            if (sortColumn === 7) {
                const statusOrder = { 'À ouvrir': 1, 'En cours': 2, 'Terminé': 3 };
                return (statusOrder[valA] - statusOrder[valB]) * sortDirection;
            }
            return typeof valA === 'string'
                ? valA.localeCompare(valB) * sortDirection
                : (valA - valB) * sortDirection;
        })
        : [...filteredRoutes];

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedRoutes = sortedRoutes.slice(startIndex, startIndex + rowsPerPage);

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

// ===== GESTION DES MODALES =====
function openEditModal(line) {
    const route = routes.find(r => r.line === line);
    if (!route) return;

    currentEditingLine = line;

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

    document.getElementById('editRouteModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editRouteModal').style.display = 'none';
    currentEditingLine = null;
}

async function saveEditedRoute(event) {
    event.preventDefault();

    const line = currentEditingLine;
    const routeIndex = routes.findIndex(r => r.line === line);
    if (routeIndex === -1) return;

    const updatedRoute = {
        Line: parseInt(document.getElementById('editLine').value),
        Zone: parseInt(document.getElementById('editZone').value),
        Grade: document.getElementById('editGrade').value,
        Color: document.getElementById('editColor').value,
        Holds: parseInt(document.getElementById('editHolds').value),
        Type: document.getElementById('editType').value,
        Opener: document.getElementById('editOpener').value,
        Status: document.getElementById('editStatus').value,
        Notes: document.getElementById('editNotes').value
    };

    try {
        const { error } = await supabase
            .from('voies')
            .update(updatedRoute)
            .eq('Line', line);

        if (error) throw error;

        await loadData();
        closeEditModal();
    } catch (error) {
        console.error("Erreur lors de la mise à jour :", error);
        alert("Erreur lors de la mise à jour. Vérifie la console.");
    }
}

// ===== GESTION DE LA PAGINATION =====
function updatePagination() {
    const totalPages = Math.ceil(filteredRoutes.length / rowsPerPage);
    document.getElementById('pageInfo').textContent = `Page ${currentPage}/${totalPages}`;

    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateRoutesTable();
    }
}

// ===== GESTION DE LA PAGINATION =====
function nextPage() {
    const totalPages = Math.ceil(filteredRoutes.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateRoutesTable();
    }
}

// ===== TRI ET FILTRE =====
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

function searchRoutes() {
    currentPage = 1;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    filteredRoutes = searchTerm === ''
        ? [...routes]
        : routes.filter(route =>
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

    updateRoutesTable();
}

// ===== GESTION DES GRAPHIQUES =====
function initCharts() {
    // Destroy existing charts if they exist
    if (gradeChart) gradeChart.destroy();
    if (zoneChart) zoneChart.destroy();
    if (colorChart) colorChart.destroy();

    // Graphique par cotation
    const grades = [...new Set(filteredRoutes.map(r => r.grade))]
        .filter(grade => grade && !["inconnu", "false", ""].includes(grade.toLowerCase()));
    const sortedGrades = sortGrades(grades);
    const gradeCounts = sortedGrades.map(grade =>
        filteredRoutes.filter(r => r.grade.toLowerCase() === grade.toLowerCase()).length
    );

    console.log("sortedGrades:", sortedGrades);
    console.log("gradeCounts:", gradeCounts);
    if (!sortedGrades || !gradeCounts || sortedGrades.length === 0) {
        console.error("Données manquantes pour le graphique :", { sortedGrades, gradeCounts });
        return;
    }

    const gradeCtx = document.getElementById('gradeChart');
    if (gradeCtx) {
        gradeChart = new Chart(gradeCtx, {
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
                        font: { weight: 'bold' },
                        offset: -5
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

    // Graphique par zone
    const zoneCtx = document.getElementById('zoneChart');
    if (zoneCtx) {
        const uniqueZones = [...new Set(filteredRoutes.map(r => r.zone))].sort((a, b) => a - b);
        const statuses = ['À ouvrir', 'En cours', 'Terminé'];
        const statusColors = {
            'Terminé': '#28a745',
            'En cours': '#ffc107',
            'À ouvrir': '#6c757d'
        };

        const datasets = statuses.map(status => ({
            label: status,
            data: uniqueZones.map(zone =>
                filteredRoutes.filter(r => r.zone === zone && r.status === status).length
            ),
            backgroundColor: statusColors[status],
            borderColor: '#ffffff',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.7
        }));

        zoneChart = new Chart(zoneCtx, {
            type: 'bar',
            data: {
                labels: uniqueZones.map(zone => `Zone ${zone}`),
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
                    x: {
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.5)'
                        }
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

        colorChart = new Chart(colorCtx, {
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
                        labels: {
                            boxWidth: 12,
                            padding: 20,
                            usePointStyle: true
                        }
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
function initWallSchema() {
    const svgOverlay = document.querySelector('.wall-overlay');
    if (!svgOverlay) return;

    const zones = [
        {
            id: 1,
            name: "Zone 1",
            color: "#FFD700",
            path: "M35,400 L250,400 L250,80 L220,35 L35,70 Z"
        },
        {
            id: 2,
            name: "Zone 2",
            color: "#FF6B6B",
            path: "M250,400 L250,80 L280,140 L290,135 L340,70 L340,400 Z"
        },
        {
            id: 3,
            name: "Zone 3",
            color: "#1E90FF",
            path: "M340,400 L340,70 L400,0 L530,-110 L660,20 L660,400 Z"
        },
        {
            id: 4,
            name: "Zone 4",
            color: "#6BCB77",
            path: "M660,400 L660,20 L770,140 L820,70 L820,400 Z"
        },
        {
            id: 5,
            name: "Zone 5",
            color: "#B19CD9",
            path: "M820,400 L820,70 L840,15 L880,50 L960,60 L950,150 L950,400 Z"
        }
    ];

    zones.forEach(zone => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', zone.path);
        path.setAttribute('class', `zone-overlay zone-${zone.id}`);
        path.setAttribute('data-zone-id', zone.id);
        path.setAttribute('data-zone-name', zone.name);
        path.setAttribute('data-zone-color', zone.color);
        path.setAttribute('fill', `${zone.color}26`);
        path.setAttribute('stroke', `${zone.color}4D`);
        path.setAttribute('stroke-width', '1');

        path.addEventListener('click', (e) => {
            e.stopPropagation();
            showZoneRoutes(zone.id);
        });

        path.addEventListener('mouseover', function() {
            this.setAttribute('fill', `${zone.color}33`);
        });

        path.addEventListener('mouseout', function() {
            if (!this.classList.contains('active')) {
                this.setAttribute('fill', `${zone.color}26`);
            }
        });

        svgOverlay.appendChild(path);
    });

    showAllRoutes();
}

function showZoneRoutes(zoneId) {
    document.querySelectorAll('.route-path, .hold').forEach(el => el.remove());

    const zoneRoutes = filteredRoutes.filter(route => route.zone == zoneId);

    document.querySelectorAll('.zone-overlay').forEach(zone => {
        zone.classList.remove('active');
        if (parseInt(zone.getAttribute('data-zone-id')) === zoneId) {
            zone.classList.add('active');
        }
    });

    const zone = document.querySelector(`.zone-overlay[data-zone-id="${zoneId}"]`);
    if (zone) {
        document.getElementById('routeInfoTitle').textContent =
            `Voies de la ${zone.getAttribute('data-zone-name')}`;
        document.getElementById('routeInfoContent').innerHTML =
            zoneRoutes.length > 0
                ? `<ul>${zoneRoutes.map(route =>
                    `<li>
                        <strong>Ligne ${route.line}:</strong> ${route.grade} (${translateStatus(route.status)})
                        <div class="color-box" style="background-color: ${getColorCode(route.color)};"></div>
                    </li>`
                ).join('')}</ul>`
                : `<p>Aucune voie dans cette zone</p>`;
    }

    drawRoutesOnSchema(zoneRoutes);
}

function drawRoutesOnSchema(routes) {
    const svgOverlay = document.querySelector('.wall-overlay');
    if (!svgOverlay) return;

    document.querySelectorAll('.route-path, .hold').forEach(el => el.remove());

    routes.forEach(route => {
        const startZone = ZONE_COORDS[route.zone];
        if (!startZone) return;

        // Dessiner le chemin de la voie
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('class', 'route-path');
        path.setAttribute('d', `
            M${LINE_COORDS[route.line].x},${LINE_COORDS[route.line].y}
            L${LINE_COORDS[route.line].x},${LINE_COORDS[route.line].y - 50}
            L${LINE_COORDS[route.line].x},${LINE_COORDS[route.line].y - 100}
            L${LINE_COORDS[route.line].x},${LINE_COORDS[route.line].y - 150}
        `);
        path.setAttribute('stroke', getColorCode(route.color));
        path.setAttribute('stroke-width', '2');
        svgOverlay.appendChild(path);

        // Ajouter des prises
        for (let i = 0; i < 3; i++) {
            const hold = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hold.setAttribute('class', 'hold');
            hold.setAttribute('cx', startZone.x + 30*i);
            hold.setAttribute('cy', startZone.y + 50*i);
            hold.setAttribute('r', '4');
            hold.setAttribute('fill', getColorCode(route.color));
            svgOverlay.appendChild(hold);
        }
    });
}

function showAllRoutes() {
    document.getElementById('routeInfoTitle').textContent = "Toutes les voies";
    document.getElementById('routeInfoContent').innerHTML =
        filteredRoutes.length > 0
            ? `<ul>${filteredRoutes.map(route =>
                `<li>
                    <strong>Ligne ${route.line} (Zone ${route.zone}):</strong> ${route.grade}
                    <div class="color-box" style="background-color: ${getColorCode(route.color)};"></div>
                </li>`
            ).join('')}</ul>`
            : `<p>Aucune voie disponible</p>`;

    drawRoutesOnSchema(filteredRoutes);
}

function hideAllRoutes() {
    document.querySelectorAll('.route-path, .hold').forEach(el => el.remove());
    document.getElementById('routeInfoTitle').textContent = "Aucune voie affichée";
    document.getElementById('routeInfoContent').innerHTML = "<p>Toutes les voies sont masquées</p>";
}

// ===== ÉVÉNEMENTS =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser Supabase
    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

    // Initialiser le schéma du mur
    initWallSchema();

    // Boutons de contrôle
    document.getElementById('showAllRoutes').addEventListener('click', showAllRoutes);
    document.getElementById('hideAllRoutes').addEventListener('click', hideAllRoutes);

    // Bouton "Retour en haut"
    document.getElementById('backToTop').addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Chargement initial des données
    loadData();

    // Initialiser les graphiques après le chargement des données
    // initCharts();
});