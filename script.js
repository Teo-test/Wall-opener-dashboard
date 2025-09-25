// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 DOM chargé, initialisation du dashboard...");

    // ID de ton Google Sheet (corrigé : pas besoin de "/e/" dans l'URL CSV)
    const SHEET_ID = "2PACX-1vRyPCJvodwRZ0GAzeNCAbCkJW04rH9ryjag-CtStFTVmBPm-7uP1Da29l5qqBs30FnwCmJySUWaScwC";
    const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?output=csv`;

    // URL de l'API Apps Script (à remplacer par la tienne)
    const API_URL = "https://script.google.com/macros/s/AKfycbz7zoIOMCPMcSB2hhYJoGs2W_KzdrS5rH-nP07aMy2YVpTLCvqx5KaUubrXEt5_TGvE-w/exec";
    const SECRET_KEY = "1E2zrHhnUxgYL0PHaHq_4yzfrGQ_fbaiaSWY5SD9q8qm-ptPLw5pPBK7v"; // Doit correspondre à celle dans Apps Script

    // Données globales
    let routes = [];

    // Charger les données depuis le Google Sheet (CSV)
    async function loadData() {
        try {
            const response = await fetch(SHEET_URL);
            const csvText = await response.text();
            const rows = csvText.split('\n').slice(1); // Ignorer l'en-tête

            routes = rows.map(row => {
                // Gestion des virgules dans les valeurs (ex: "Nom, Prénom")
                const values = row.split(/,(?=(?:(?:[^"]*"[^"]*")*[^"]*$))/);
                return {
                    line: parseInt(values[0] || 0),
                    zone: parseInt(values[1] || 0),
                    grade: values[2]?.replace(/"/g, '') || "Inconnu",
                    holds: parseInt(values[3] || 0),
                    type: values[4]?.replace(/"/g, '') || "Inconnu",
                    opener: values[5]?.replace(/"/g, '') || "Inconnu",
                    status: values[6]?.replace(/"/g, '').trim() || "to_open",
                    color: values[7]?.replace(/"/g, '') || `#${Math.floor(Math.random() * 16777215).toString(16)}`
                };
            });

            updateDashboard();
        } catch (error) {
            console.error("Erreur de chargement :", error);
            alert("Erreur de chargement des données. Vérifie l'URL du Sheet ou la publication CSV.");
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
        const totalRoutes = routes.length;
        const completedRoutes = routes.filter(r => r.status === 'completed').length;
        const inProgressRoutes = routes.filter(r => r.status === 'in_progress').length;
        const toOpenRoutes = routes.filter(r => r.status === 'to_open').length;

        document.getElementById('totalRoutes').textContent = totalRoutes;
        document.getElementById('completedRoutes').textContent = completedRoutes;
        document.getElementById('inProgressRoutes').textContent = inProgressRoutes;
        document.getElementById('toOpenRoutes').textContent = toOpenRoutes;
    }

    // Mettre à jour le tableau des voies
    function updateRoutesTable() {
        const tableBody = document.getElementById('routesTableBody');
        if (!tableBody) {
            console.error("Élément routesTableBody introuvable !");
            return;
        }
        tableBody.innerHTML = routes.map(route => `
            <tr>
                <td>${route.line}</td>
                <td>Zone ${route.zone}</td>
                <td>${route.grade}</td>
                <td><div style="background-color: ${route.color}; width: 20px; height: 20px; border-radius: 50%;"></div></td>
                <td>${route.holds}</td>
                <td>${route.type}</td>
                <td>${route.opener}</td>
                <td>${translateStatus(route.status)}</td>
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

    // Initialiser les graphiques
    function initCharts() {
        const grades = [...new Set(routes.map(r => r.grade))];
        const gradeCounts = grades.map(grade =>
            routes.filter(r => r.grade === grade).length
        );

        const ctx = document.getElementById('gradeChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: grades,
                    datasets: [{
                        label: 'Nombre de voies',
                        data: gradeCounts,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    }]
                }
            });
        }
    }

    // Ouvrir la modale pour ajouter/éditer une voie
    function addRoute() {
        document.getElementById('modalTitle').textContent = "Ajouter une voie";
        document.getElementById('routeForm').reset();
        document.getElementById('routeModal').style.display = 'block';
    }

    // Fermer la modale
    function closeModal() {
        document.getElementById('routeModal').style.display = 'none';
    }

    // Sauvegarder une voie (via Apps Script)
    async function saveRoute(event) {
        event.preventDefault();

        const newRoute = {
            line: parseInt(document.getElementById('routeLine').value),
            zone: parseInt(document.getElementById('routeZone').value),
            grade: document.getElementById('routeGrade').value,
            holds: parseInt(document.getElementById('routeHolds').value),
            type: document.getElementById('routeType').value,
            opener: document.getElementById('routeOpener').value,
            status: document.getElementById('routeStatus').value,
            secret: SECRET_KEY
        };

        try {
            await fetch(API_URL, {
                method: "POST",
                mode: "no-cors", // Contourne les erreurs CORS en local
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRoute)
            });

            // Rafraîchir les données après 1 seconde (pour laisser le temps à Apps Script de traiter)
            setTimeout(loadData, 1000);
            closeModal();
        } catch (error) {
            console.error("Erreur lors de la sauvegarde :", error);
            alert("Erreur lors de la sauvegarde. Vérifie la console ou l'URL de l'API.");
        }
    }

    // Charger les données au démarrage
    loadData();
});
