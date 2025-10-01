// ===== GESTION DU SCHÉMA DU MUR =====
/**
 * Initialise le schéma du mur avec les zones cliquables et sous-couches colorées
 */
function initWallSchema() {
    const svgOverlay = document.querySelector('.wall-overlay');
    if (!svgOverlay) return;

    // Zones avec leurs chemins SVG
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

    // Créer les zones cliquables avec sous-couche colorée
    zones.forEach(zone => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', zone.path);
        path.setAttribute('class', `zone-overlay zone-${zone.id}`);
        path.setAttribute('data-zone-id', zone.id);
        path.setAttribute('data-zone-name', zone.name);
        path.setAttribute('data-zone-color', zone.color);
        path.setAttribute('fill', `${zone.color}26`); // Opacité de 15%
        path.setAttribute('stroke', `${zone.color}4D`); // Opacité de 30% pour la bordure
        path.setAttribute('stroke-width', '1');

        path.addEventListener('click', function(e) {
            e.stopPropagation();
            showZoneRoutes(zone.id);
        });

        path.addEventListener('mouseover', function() {
            this.setAttribute('fill', `${zone.color}33`); // Opacité de 20% au survol
        });

        path.addEventListener('mouseout', function() {
            if (!this.classList.contains('active')) {
                this.setAttribute('fill', `${zone.color}26`);
            }
        });

        svgOverlay.appendChild(path);
    });

    // Afficher toutes les voies au chargement
    showAllRoutes();
}

/**
 * Affiche les voies d'une zone spécifique avec mise en évidence
 * @param {number} zoneId - ID de la zone
 */
function showZoneRoutes(zoneId) {
    // Masquer toutes les voies existantes
    document.querySelectorAll('.route-path, .hold').forEach(el => el.remove());

    // Filtrer les voies de la zone sélectionnée
    const zoneRoutes = filteredRoutes.filter(route => route.zone == zoneId);

    // Mettre en évidence la zone sélectionnée
    document.querySelectorAll('.zone-overlay').forEach(zone => {
        zone.classList.remove('active');
        if (parseInt(zone.getAttribute('data-zone-id')) === zoneId) {
            zone.classList.add('active');
            zone.setAttribute('fill', `${zone.getAttribute('data-zone-color')}4D`); // Opacité 30% quand active
        } else {
            zone.setAttribute('fill', `${zone.getAttribute('data-zone-color')}26`);
        }
    });

    // Afficher les informations de la zone
    const zone = document.querySelector(`.zone-overlay[data-zone-id="${zoneId}"]`);
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

    // Dessiner les voies sur le schéma
    drawRoutesOnSchema(zoneRoutes);
}

/**
 * Dessine les voies sur le schéma avec leurs couleurs
 * @param {Array} routes - Liste des voies à dessiner
 */
function drawRoutesOnSchema(routes) {
    const svgOverlay = document.querySelector('.wall-overlay');
    if (!svgOverlay) return;

    // Effacer les voies précédentes
    document.querySelectorAll('.route-path').forEach(el => el.remove());

    // Coordonnées des lignes (basées sur ton image)
    const lineCoordinates = {
        1: { x: 25, y: 400 },   2: { x: 45, y: 400 },   3: { x: 65, y: 400 },
        4: { x: 85, y: 400 },   5: { x: 105, y: 400 },  6: { x: 125, y: 400 },
        7: { x: 145, y: 400 },  8: { x: 165, y: 400 },  9: { x: 185, y: 400 },
        10: { x: 205, y: 400 }, 11: { x: 225, y: 400 }, 12: { x: 245, y: 400 },
        13: { x: 265, y: 400 }, 14: { x: 285, y: 400 }, 15: { x: 305, y: 400 },
        16: { x: 325, y: 400 }, 17: { x: 345, y: 400 }, 18: { x: 365, y: 400 },
        19: { x: 385, y: 400 }, 20: { x: 405, y: 400 }, 21: { x: 425, y: 400 },
        22: { x: 445, y: 400 }, 23: { x: 465, y: 400 }, 24: { x: 485, y: 400 }
    };

    routes.forEach(route => {
        // Vérifier que la ligne existe dans nos coordonnées
        if (!lineCoordinates[route.line]) return;

        const start = lineCoordinates[route.line];
        const zone = zones.find(z => z.id === route.zone);

        if (!zone) return;

        // Créer un chemin SVG pour la voie (trajet vertical simplifié)
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('class', 'route-path');
        path.setAttribute('d', `M${start.x},${start.y} L${start.x},${start.y - 150}`);
        path.setAttribute('stroke', getColorCode(route.color));
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        svgOverlay.appendChild(path);

        // Ajouter des prises (3 points sur le trajet)
        for (let i = 0; i < 3; i++) {
            const hold = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hold.setAttribute('class', 'hold');
            hold.setAttribute('cx', start.x);
            hold.setAttribute('cy', start.y - (50 * (i + 1)));
            hold.setAttribute('r', '4');
            hold.setAttribute('fill', getColorCode(route.color));
            svgOverlay.appendChild(hold);
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

    // Désélectionner toutes les zones
    document.querySelectorAll('.zone-overlay').forEach(zone => {
        zone.classList.remove('active');
        zone.setAttribute('fill', `${zone.getAttribute('data-zone-color')}26`);
    });

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
