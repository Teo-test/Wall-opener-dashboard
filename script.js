// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM chargé, initialisation du dashboard...");

    // ID de ton Google Sheet (corrigé : pas besoin de "/e/" dans l'URL CSV)
    const SHEET_ID = "2PACX-1vRyPCJvodwRZ0GAzeNCAbCkJW04rH9ryjag-CtStFTVmBPm-7uP1Da29l5qqBs30FnwCmJySUWaScwC";
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?output=csv`;

    // URL de l'API Apps Script (à remplacer par la tienne)
    const API_URL = "https://script.google.com/macros/s/AKfycbz7zoIOMCPMcSB2hhYJoGs2W_KzdrS5rH-nP07aMy2YVpTLCvqx5KaUubrXEt5_TGvE-w/exec";
    const SECRET_KEY = "1E2zrHhnUxgYL0PHaHq_4yzfrGQ_fbaiaSWY5SD9q8qm-ptPLw5pPBK7v"; // Doit correspondre à celle dans Apps Script

   // Données globales
   let routes = [];
   let filteredRoutes = [];

   // Charger les données depuis le Google Sheet
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
                       notes: values[8]?.replace(/"/g, '').trim() || "",
                       lastUpdate: values[9]?.replace(/"/g, '').trim() || ""
                   };
               })
               .filter(route => {
                   // Filtrer les lignes actives (Ligne > 0 et Cotation non vide)
                   return route.line > 0 && route.grade && route.grade !== "FALSE";
               });

           filteredRoutes = [...routes];
           updateDashboard();
       } catch (error) {
           console.error("Erreur de chargement :", error);
           alert("Erreur de chargement des données.");
       }
   }

   // Mettre à jour le dashboard
   function updateDashboard() {
       updateKPIs();
       updateRoutesTable();
       initCharts();
       document.getElementById('currentDate').textContent = new Date().toLocaleDateString('fr-FR');
   }

   // Mettre à jour les KPI
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

   // Mettre à jour le tableau des voies
   function updateRoutesTable() {
       const tableBody = document.getElementById('routesTableBody');
       tableBody.innerHTML = filteredRoutes.map(route => `
           <tr>
               <td>${route.line}</td>
               <td>Zone ${route.zone}</td>
               <td>${route.grade}</td>
               <td><div class="color-box" style="background-color: ${getColorCode(route.color)};"></div>${route.color}</td>
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

   // Traduire le statut
   function translateStatus(status) {
       const statusMap = {
           'to_open': 'À ouvrir',
           'in_progress': 'En cours',
           'completed': 'Terminé'
       };
       return statusMap[status] || status;
   }

   // Convertir le nom de couleur en code hexa
   function getColorCode(color) {
    const colorMap = {
        "Jaune": "#FFD700",    // Or
        "Rouge": "#FF6B6B",    // Rouge clair
        "Blanc": "#f0f0f0",    // Gris très clair (car blanc invisible)
        "Orange": "#FFA500",   // Orange vif
        "Bleu": "#4ECDC4",     // Bleu turquoise
        "Vert": "#6BCB77",     // Vert menthe
        "Violet": "#B19CD9",   // Lavande
        "Rose": "#FF9FF3",     // Rose pastel
        "Noir": "#333333",     // Noir (remplacé par gris foncé)
        "Marron": "#A0522D",   // Marron terreux
        "Turquoise": "#48C9B0",
        "Gris": "#7F8C8D"
    };
    return colorMap[color] || "#CCCCCC"; // Gris par défaut
}


   // Fonction pour trier les cotations par difficulté
    function sortGrades(grades) {
        // Ordre personnalisé des cotations (du plus facile au plus difficile)
        const gradeOrder = [
            "4a", "4b", "4c",
            "5a", "5b", "5c",
            "6a", "6a+", "6b", "6b+", "6c", "6c+",
            "7a", "7a+", "7b", "7b+", "7c", "7c+",
            "8a", "8a+", "8b", "8b+", "8c", "8c+"
        ];

        // Trier les cotations selon l'ordre défini
        return grades.sort((a, b) => {
            return gradeOrder.indexOf(a.toLowerCase()) - gradeOrder.indexOf(b.toLowerCase());
        });
    }


   // Initialiser les graphiques
   function initCharts() {

    // 1. Récupérer les cotations et filtrer les inconnues/vides
    const grades = [...new Set(filteredRoutes.map(r => r.grade))]
        .filter(grade => {
            // Exclure les cotations vides, "Inconnu", "FALSE", ou non valides
            const invalidGrades = ["", "inconnu", "false", "unknown"];
            return grade &&
                   !invalidGrades.includes(grade.toLowerCase()) &&
                   /^[4-8][a-c](\+)?$/.test(grade.toLowerCase()); // Format valide (ex: 6a, 7b+)
        });

    const sortedGrades = sortGrades(grades); // Trier les cotations restantes
    const gradeCounts = sortedGrades.map(grade =>
        filteredRoutes.filter(r => r.grade.toLowerCase() === grade.toLowerCase()).length
    );

    
    // Graphique par cotation (version améliorée)
    const gradeCtx = document.getElementById('gradeChart');
    if (gradeCtx) {
        new Chart(gradeCtx, {
            type: 'bar',
            data: {
                labels: sortedGrades,
                datasets: [{
                    label: 'Nombre de voies',
                    data: gradeCounts,
                    backgroundColor: sortedGrades.map(grade => {
                        if (grade.startsWith('4')) return '#4CAF50'; // Vert
                        if (grade.startsWith('5')) return '#FFC107'; // Jaune
                        if (grade.startsWith('6')) return '#FF9800'; // Orange
                        if (grade.startsWith('7')) return '#F44336'; // Rouge
                        if (grade.startsWith('8')) return '#9C27B0'; // Violet
                        return '#9E9E9E'; // Gris
                    }),
                    borderColor: '#ffffff', // Bordures blanches pour un effet net
                    borderWidth: 1,         // Épaisseur des bordures
                    borderRadius: 4,        // Coins légèrement arrondis
                    hoverBackgroundColor: sortedGrades.map(grade => {
                        if (grade.startsWith('4')) return '#388E3C'; // Vert foncé au survol
                        if (grade.startsWith('5')) return '#FFA000'; // Jaune foncé
                        if (grade.startsWith('6')) return '#F57C00'; // Orange foncé
                        if (grade.startsWith('7')) return '#D32F2F'; // Rouge foncé
                        if (grade.startsWith('8')) return '#7B1FA2'; // Violet foncé
                        return '#616161'; // Gris foncé
                    }),
                    borderSkipped: false,   // Bordures sur tous les côtés
                    barPercentage: 0.7,     // Largeur relative des barres (70%)
                    categoryPercentage: 0.8 // Espacement entre les groupes
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false, // Masquer la légende (redondante avec le label)
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 14 },
                        bodyFont: { size: 12 },
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.raw} voie(s)`; // Espace avant le nombre
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)', // Grille très légère
                            borderDash: [2, 2] // Lignes en pointillés pour la grille
                        },
                        ticks: {
                            stepSize: 1, // Incréments de 1 voie
                            padding: 8
                        }
                    },
                    x: {
                        grid: {
                            display: false // Pas de grille verticale
                        },
                        ticks: {
                            autoSkip: false, // Afficher toutes les cotations
                            maxRotation: 0,  // Pas de rotation des labels
                            minRotation: 0,
                            padding: 10
                        }
                    }
                }
            }
        });
    }


    // Graphique par zone (inchangé)
    const zoneCtx = document.getElementById('zoneChart');
    if (zoneCtx) {
        const zones = [1, 2, 3, 4, 5];
        const zoneCounts = zones.map(zone =>
            filteredRoutes.filter(r => r.zone === zone).length
        );

        new Chart(zoneCtx, {
            type: 'doughnut',
            data: {
                labels: zones.map(z => `Zone ${z}`),
                datasets: [{
                    data: zoneCounts,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ]
                }]
            }
        });
    }

    // Graphique par couleur (version optimisée)
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
                borderColor: '#ffffff', // Bordures blanches pour un effet propre
                borderWidth: 2,         // Épaisseur des bordures
                borderRadius: 8,        // Coins arrondis (corrigé : borderRadius au lieu de borderradius)
                spacing: 5,             // Espacement entre les secteurs
                hoverBorderWidth: 3,    // Bordure plus épaisse au survol
                hoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',             // Taille du trou central (70% du rayon)
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 20,
                        usePointStyle: true, // Légende avec des cercles
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.raw;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value} voies (${percentage}%)`;
                        }
                    },
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 },
                    padding: 10,
                    displayColors: false
                },
                centerText: {
                    display: true,
                    text: `Total\n${filteredRoutes.length}\nvoies`,
                    color: '#333',
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

}

   // Filtrer les voies
   function filterRoutes() {
       const zoneFilter = document.getElementById('zoneFilter').value;
       const statusFilter = document.getElementById('statusFilter').value;

       filteredRoutes = routes.filter(route => {
           return (!zoneFilter || route.zone === parseInt(zoneFilter)) &&
                  (!statusFilter || route.status === statusFilter);
       });

       updateDashboard();
   }

   // Ouvrir la modale pour ajouter/éditer une voie
   function addRoute() {
       document.getElementById('modalTitle').textContent = "Ajouter une voie";
       document.getElementById('routeForm').reset();
       document.getElementById('routeHolds').value = 27;
       document.getElementById('routeOpener').value = "Me";
       document.getElementById('routeModal').style.display = 'block';
   }

   // Fermer la modale
   function closeModal() {
       document.getElementById('routeModal').style.display = 'none';
   }

   // Sauvegarder une voie
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

   // Charger les données au démarrage
   loadData();
});