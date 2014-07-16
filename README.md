###DESCRIPTION
Ensemble de Userscripts améliorant le jeu [Blood Wars](http://www.fr.bloodwars.net) où vous incarnez un vampire dans un monde post-apocalyptique :
* [BloodWarsEnchanced](https://github.com/Ecilam/BloodWarsEnhanced)
* [BloodWarsAnalyseRC](https://github.com/Ecilam/BloodWarsAnalyseRC) (celui-ci)
* [BloodWarsSpyData](https://github.com/Ecilam/BloodWarsSpyData)
* [BloodWarsToolBox](https://github.com/Ecilam/BloodWarsToolBox)

Ce script est compatible avec les serveurs Anglais/Français/Polonais 1.5.5 et les navigateurs Firefox, Chrome et Opera (à confirmer pour les 2 derniers).
Testé principalement avec Firefox 30.0 sur serveur R3FR.

Pour tout contact passer par mon [topic](http://forum.fr.bloodwars.net/index.php?page=Thread&threadID=204323/) sur le forum BloodWars.
Pour les bugs, GitHub propose une section [Issues](https://github.com/Ecilam/BloodWarsEnhanced/issues).

###INSTALLATION
* Firefox (tests v30.0) : installer préalablement le module [Greasemonkey](https://addons.mozilla.org/fr/firefox/addon/greasemonkey/) ou [Scriptish](https://addons.mozilla.org/en-US/firefox/addon/scriptish/).
* Google Chrome (tests v35) : installer l'extension [Tampermonkey](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo).
* Opera (tests v22.0) : installer [Chrome extension](https://addons.opera.com/fr/extensions/details/download-chrome-extension-9/?display=en) puis [Tampermonkey](https://chrome.google.com/webstore/detail/dhdgffkkebhmkfjojejmpbldmpobfkfo).
* Ensuite afficher la version [RAW](https://raw.githubusercontent.com/Ecilam/BloodWarsAnalyseRC/master/BloodWarsAnalyseRC@bwarc.user.js) du script pour que le module (ou l'extension) vous propose de l'installer.

###FONCTIONS
* Analyse les combats (embuscades, expéditions, sièges...) et délivre 3 tableaux :
	- ANALYSE DU COMBAT (diverses statitiques)
	- DOMMAGES / MANCHE
	- INITIATIVE / MANCHE
* Afficher/masquer le tableau en cliquant sur le titre.
* Ajoute un total des "dommages/tués" dans la partie "RESULTAT DU DUEL".

###INFORMATIONS
* **1ère utilisation:** un message vous rappellera de consulter la Salle du Trône pour que le script puisse récupérer l'IUD du personnage afin de pouvoir fonctionner.
* **Données:** les préférences sont stockées avec LOCALSTORAGE.
* **[FrenchUnMod](https://greasyfork.org/scripts/2158-frenchunmod)** : compatible.
