# Dashboard Mur Mandela 🧗‍♂️

Un tableau de bord interactif pour suivre et gérer les voies d'escalade du mur Mandela. Visualisez facilement la répartition des voies par cotation, zone et couleur.

## 🌐 Demo

Voir la démo en direct : [Wall Opener Dashboard](https://teo-test.github.io/Wall-opener-dashboard/)

## ✨ Fonctionnalités

- **Vue d'ensemble rapide** : KPIs en temps réel (total des voies, voies terminées, en cours, à ouvrir)
- **Visualisations graphiques** :
  - Distribution des cotations
  - Répartition par zone
  - Distribution des couleurs
- **Gestion des voies** :
  - Ajout de nouvelles voies
  - Modification des voies existantes
  - Suivi du statut d'avancement
- **Filtrage** par zone et statut
- **Interface responsive** adaptée à tous les écrans

## 🛠️ Technologies utilisées

- HTML5
- CSS3 (avec Flexbox et Grid)
- JavaScript (Vanilla)
- Chart.js pour les visualisations
- Google Sheets (base de données)
- Google Apps Script (API)

## 📊 Structure des données

Chaque voie contient les informations suivantes :
- Numéro de ligne
- Zone (1-5)
- Cotation (4a-8c+)
- Couleur
- Nombre de prises
- Type (Technique/Physique/Résistance)
- Ouvreur
- Statut (À ouvrir/En cours/Terminé)
- Notes
- Date de dernière mise à jour

## 🔧 Installation locale

1. Clonez le repository
```bash
git clone https://github.com/teo-code/Wall-opener-dashboard.git
```

2. Ouvrez `index.html` dans votre navigateur

## 📝 Configuration

Pour utiliser votre propre Google Sheet :

1. Créez une copie du Google Sheet
2. Publiez le en tant que CSV
3. Remplacez `SHEET_ID` dans `script.js`
4. Configurez votre propre Apps Script et mettez à jour `API_URL`

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push sur la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📫 Contact

Pour toute question ou suggestion, n'hésitez pas à ouvrir une issue.

## 📜 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.
