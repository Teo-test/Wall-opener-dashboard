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

// ===== FONCTIONS UTILITAIRES =====
/**
 * Trie les cotations par difficulté (4a < 5b < 6c+ < 7a, etc.)
 */
function sortGrades(grades) {
    const gradeOrder = [
        "4a", "4b", "4c",
        "5a", "5b", "5c",
        "6a", "6a+", "6b", "6b+", "6c", "6c+",
        "7a", "7a+", "7b", "7b+", "7c", "7c+",
        "8a", "8a+", "8b", "8b+", "8c", "8c+"
    ];
    return grades.sort((a, b) => {
        const indexA = gradeOrder.indexOf(a.toLowerCase());
        const indexB = gradeOrder.indexOf(b.toLowerCase());
        return indexA - indexB;
    });
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
        "Violet": "#B19CD9"
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

        // Parser et filtrer les données
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
            .filter(route => {
                // Garder seulement les lignes valides
                return route.line > 0 &&
                       route.grade &&
                       !["inconnu", "false", ""].includes(route.grade.toLowerCase());
            });

        filteredRoutes = [...routes];
        updateDashboard();
    } catch (error) {
        console.error("Erreur de chargement :", error);
        alert("Erreur de chargement des données. Vérifie la console.");
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
 * Met à jour les indicateurs clés (KPI)completed
 */
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

/**
 * Met à jour le tableau des voies
 */
function updateRoutesTable() {
    const tableBody = document.getElementById('routesTableBody');
    tableBody.innerHTML = filteredRoutes.map(route => `
        <tr>
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
            <td>${translateStatus(route.status)}</td>
            <td>${route.notes}</td>
            <td>
                <button onclick="editRoute(${route.line})"><i class="fas fa-edit"></i></button>
            </td>
        </tr>
    `).join('');
}

/**
 * Filtre les voies selon les critères sélectionnés
 */
function filterRoutes() {
    const zoneFilter = document.getElementById('zoneFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredRoutes = routes.filter(route => {
        return (!zoneFilter || route.zone === parseInt(zoneFilter)) &&
               (!statusFilter || route.status === statusFilter);
    });

    updateDashboard();
}

// ===== GESTION DES GRAPHIQUES =====
/**
 * Initialise tous les graphiques
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
        new Chart(gradeCtx, {
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

    const zoneCtx = document.getElementById('zoneChart');
    if (zoneCtx) {
        // Zones fixes de 1 à 6
        const uniqueZones = [1, 2, 3, 4, 5, 6];
        const statuses = ['Terminé', 'En cours', 'À ouvrir']; // Statuts en français
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

        // Créer le graphique avec barres groupées
        new Chart(zoneCtx, {
            type: 'bar',
            data: {
                labels: uniqueZones.map(z => `Zone ${z}`),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
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
                        formatter: (value) => value > 0 ? value : '',
                        color: '#333',
                        font: { weight: 'bold' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        stacked: false // Désactive l'empilement
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { stepSize: 1 }
                    }
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

        new Chart(colorCtx, {
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

// ===== GESTION DE LA MODALE =====
/**
 * Ouvre la modale pour ajouter/éditer une voie
 */
function addRoute() {
    document.getElementById('modalTitle').textContent = "Ajouter une voie";
    document.getElementById('routeForm').reset();
    document.getElementById('routeHolds').value = 27;
    document.getElementById('routeOpener').value = "Me";
    document.getElementById('routeModal').style.display = 'block';
}

/**
 * Ferme la modale
 */
function closeModal() {
    document.getElementById('routeModal').style.display = 'none';
}

/**
 * Sauvegarde une voie (via Apps Script)
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
        alert("Erreur lors de la sauvegarde. Vérifie la console.");
    }
}

// ===== INITIALISATION =====
// Bouton "Retour en haut"
document.getElementById('backToTop').addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Chargement initial des données
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});