// coding: utf-8 (sans BOM)
// ==UserScript==
// @name        Blood Wars Analyse RC
// @author      Ecilam
// @version     2022.12.10
// @namespace   BWARC
// @description Ce script analyse les combats sur Blood Wars.
// @copyright   2012-2022, Ecilam
// @license     GPL version 3 ou suivantes; http://www.gnu.org/copyleft/gpl.html
// @homepageURL https://github.com/Ecilam/BloodWarsAnalyseRC
// @supportURL  https://github.com/Ecilam/BloodWarsAnalyseRC/issues
// @match       https://r1.bloodwars.net/*
// @match       https://r2.bloodwars.net/*
// @match       https://r3.bloodwars.net/*
// @match       https://r4.bloodwars.net/*
// @match       https://r1.fr.bloodwars.net/*
// @match       https://r1.fr.bloodwars.net/*
// @match       https://r2.fr.bloodwars.net/*
// @match       https://r3.fr.bloodwars.net/*
// @match       https://r4.fr.bloodwars.net/*
// @match       https://r7.fr.bloodwars.net/*
// @match       https://r8.fr.bloodwars.net/*
// @match       https://r1.bloodwars.interia.pl/*
// @match       https://r2.bloodwars.interia.pl/*
// @match       https://r3.bloodwars.interia.pl/*
// @match       https://r7.bloodwars.interia.pl/*
// @match       https://r8.bloodwars.interia.pl/*
// @match       https://r14.bloodwars.interia.pl/*
// @match       https://r17.bloodwars.interia.pl/*
// @match       https://r20.bloodwars.interia.pl/*
// @match       https://r21.bloodwars.interia.pl/*
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

// Include remplacé par Match suite préconisation
// @include     /^https:\/\/r[0-9]*\.fr\.bloodwars\.net\/.*$/
// @include     /^https:\/\/r[0-9]*\.bloodwars\.net\/.*$/
// @include     /^https:\/\/r[0-9]*\.bloodwars\.interia\.pl\/.*$/
// @include     /^https:\/\/beta[0-9]*\.bloodwars\.net\/.*$/
(function ()
{
  "use strict";
  var debugTime = Date.now(); // @type {Date} permet de mesurer le temps d'execution du script.
  var debug = false; // @type {Boolean} Active l'affichage des messages sur la console de débogages.
  /**
   * @method exist
   * Test l'existence d'une valeur
   * @param {*} v la valeur à tester
   * @return {Boolean} faux si 'undefined'
   */
  function exist(v)
  {
    return (v !== undefined && typeof v !== 'undefined');
  }
  /**
   * @method isNull
   * Test si une valeur est Null
   * @param {*} v la valeur à tester
   * @return {Boolean} vrai si Null
   */
  function isNull(v)
  {
    return (v === null && typeof v === 'object');
  }
  /**
   * @method clone
   * Créé une copie de l'objet
   * @param {Object} obj
   * @return {Object} newObjet
   */
  function clone(obj)
  {
    if (typeof obj !== 'object' || obj === null)
    {
      return obj;
    }
    var newObjet = obj.constructor();
    for (var i in obj)
    {
      newObjet[i] = clone(obj[i]);
    }
    return newObjet;
  }
  /******************************************************
   * OBJET Jsons - JSON
   * Stringification des données
   ******************************************************/
  var Jsons = (function ()
  {
    function reviver(key, v)
    {
      if (typeof v === 'string')
      {
        var a = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(v);
        if (!isNull(a)) return new Date(Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]), Number(a[
          4]), Number(a[5]), Number(a[6])));
      }
      return v;
    }
    return {
      /**
       * @method init
       * Fonction d'initialisation.
       * Vérifie si le service JSON est bien disponible.
       * @return {Objet}
       */
      init: function ()
      {
        if (!JSON) throw new Error("Erreur : le service JSON n\'est pas disponible.");
        else return this;
      },
      /**
       * @method decode
       * Désérialise une chaîne JSON.
       * @param {JSON} v - chaîne JSON à décoder.
       * @return {?*} r la valeur décodée sinon null.
       */
      decode: function (v)
      {
        var r = null;
        try
        {
          r = JSON.parse(v, reviver);
        }
        catch (e)
        {
          console.error('Jsons.decode error :', v, e);
        }
        return r;
      },
      /**
       * @method encode
       * Sérialise un objet au format JSON.
       * @param {*} v - la valeur à encoder.
       * @return {JSON} une chaîne au format JSON.
       */
      encode: function (v)
      {
        return JSON.stringify(v);
      }
    };
  })().init();
  /******************************************************
   * OBJET GM - GreaseMonkey Datas Storage
   ******************************************************/
  var GM = (function ()
  {
    return {
      /**
       * @method get
       * Retourne la valeur de key ou sinon la valeur par défaut.
       * @param {String} key - la clé recherchée.
       * @param {*} defVal - valeur par défaut.
       * @return {*} val|defVal
       */
      get: function (key, defVal)
      {
        var v = GM_getValue(key, null);
        return (!isNull(v) ? Jsons.decode(v) : defVal);
      },
      /**
       * @method set
       * Ajoute/remplace la valeur de la clé concernée.
       * @param {String} key - la clé.
       * @param {*} val
       * @return {*} val
       */
      set: function (key, val)
      {
        GM_setValue(key, Jsons.encode(val));
        return val;
      }
    };
  })();
  /******************************************************
   * OBJET DOM - Fonctions DOM & QueryString
   * - fonctions d'accès aux noeuds basées sur Xpath
   * - fonctions de création de noeuds et event
   * - queryString : accès aux arguments de l'URL
   ******************************************************/
  var DOM = (function ()
  {
    return {
      /**
       * @method getNodes
       * Cherche un ensemble de noeuds correspondant à la recherche.
       * Accès à chaque noeud par la méthode snapshotItem(itemNumber)
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {?XPathResult=null} ensemble statique de noeuds (vide si aucun résultat)
       */
      getNodes: function (path, root)
      {
        return document.evaluate(path, (exist(root) ? root : document), null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      },
      /**
       * @method getFirstNode
       * Retourne le 1er noeud correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {?Element=null} noeud ou null si aucun résultat
       */
      getFirstNode: function (path, root)
      {
        var r = this.getNodes(path, root);
        return (r.snapshotLength > 0 ? r.snapshotItem(0) : null);
      },
      /**
       * @method getLastNode
       * Retourne le dernier noeud correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {?Element=null} noeud ou null si aucun résultat
       */
      getLastNode: function (path, root)
      {
        var r = this.getNodes(path, root);
        return (r.snapshotLength > 0 ? r.snapshotItem(r.snapshotLength - 1) : null);
      },
      /**
       * @method getFirstNodeTextContent
       * Retourne le textContent du 1er noeud correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {String} defVal - valeur par défaut
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {textContent=defVal}
       */
      getFirstNodeTextContent: function (path, defVal, root)
      {
        var r = this.getFirstNode(path, root);
        return (!isNull(r) && !isNull(r.textContent) ? r.textContent : defVal);
      },
      /**
       * @method getLastNodeInnerHTML
       * Retourne le InnerHTML du dernier noeud correspondant à la recherche
       * @param {xpathExpression} path - chemin au format Xpath
       * @param {String} defVal - valeur par défaut
       * @param {contextNode} [root=document] - noeud servant de base à la recherche
       * @return {textContent=defVal}
       */
      getLastNodeInnerHTML: function (path, defVal, root)
      {
        var r = this.getLastNode(path, root);
        return (!isNull(r) && !isNull(r.innerHTML) ? r.innerHTML : defVal);
      },
      /**
       * @method addEvent
       * Assigne un gestionnaire d'évènement à un noeud
       * @example call
       * DOM.addEvent(result,'click',fn,'2');
       * @example listener 
       * // this = node, e = event
       * function fn(e,par) {alert('Event : ' + this.value + e.type + par);}
       * @param {contextNode} node - noeud utilisé
       * @param {String} type - type d'évènement à enregistrer
       * @param {Function} fn - fonction recevant la notification
       * @param {*} par - paramètres à passer
       */
      addEvent: function (node, type, fn, par)
      {
        var funcName = function (e)
        {
          return fn.call(node, e, par);
        };
        node.addEventListener(type, funcName, false);
        if (!node.BWARCListeners) { node.BWARCListeners = {}; }
        if (!node.BWARCListeners[type]) node.BWARCListeners[type] = {};
        node.BWARCListeners[type][fn.name] = funcName;
      },
      /**
       * @method removeEvent
       * Supprime un gestionnaire d'évènement à un noeud
       * @example call
       * DOM.removeEvent(node,'click',fn);
       * @param {contextNode} node - noeud utilisé
       * @param {String} type - type d'évènement à enregistrer
       * @param {Function} fn - fonction recevant la notification
       * @param {*} par - paramètres à passer
       */
      removeEvent: function (node, type, fn)
      {
        if (node.BWARCListeners[type] && node.BWARCListeners[type][fn.name])
        {
          node.removeEventListener(type, node.BWARCListeners[type][fn.name], false);
          delete node.BWARCListeners[type][fn.name];
        }
      },
      /**
       * @method newNode
       * Créé un noeud à partir d'une description
       * @example
       * DOM.newNode('input', { 'type': 'checkbox', 'checked': true }, ['texte'],
                    {'click': [funcname, param]}, parentNode);
       * @param {String} type - balise html
       * @param {{...Objet}} attributes - liste des attributs
       * @param {String[]} content - texte
       * @param {{...[funcname, param]}} events - événements attachés à ce noeud
       * @param {Node} parent - noeud parent
       * @return {Node} node
       */
      newNode: function (type, attributes, content, events, parent)
      {
        var node = document.createElement(type);
        for (var key in attributes)
        {
          if (attributes.hasOwnProperty(key))
          {
            if (typeof attributes[key] !== 'boolean') node.setAttribute(key, attributes[key]);
            else if (attributes[key] === true) node.setAttribute(key, key.toString());
          }
        }
        for (key in events)
        {
          if (events.hasOwnProperty(key))
          {
            this.addEvent(node, key, events[key][0], events[key][1]);
          }
        }
        for (var i = 0; i < content.length; i++)
        {
          node.textContent += content[i];
        }
        if (!isNull(parent)) parent.appendChild(node);
        return node;
      },
      /**
       * @method newNodes
       * Créé en ensemble de noeuds à partir d'une liste descriptive
       * @param {[...Array]} list - décrit un ensemble de noeuds (cf newNode)
       * @param {{...Objet}} [base] - précédent ensemble
       * @return {{...Objet}} nodes - liste des noeuds
       */
      newNodes: function (list, base)
      {
        var nodes = exist(base) ? base : {};
        for (var i = 0; i < list.length; i++)
        {
          var node = exist(nodes[list[i][5]]) ? nodes[list[i][5]] : list[i][5];
          nodes[list[i][0]] = this.newNode(list[i][1], list[i][2],
            list[i][3], list[i][4], node);
        }
        return nodes;
      },
      /**
       * @method queryString
       * retourne la valeur de la clé "key" trouvé dans l'url
       * null: n'existe pas, true: clé existe mais sans valeur, autres: valeur
       * @param {String} key
       * @return {String} offset
       */
      queryString: function (key)
      {
        var url = window.location.search,
          reg = new RegExp('[?&]' + key + '(=([^&$]+)|)(&|$)', 'i'),
          offset = reg.exec(url);
        if (!isNull(offset))
        {
          offset = exist(offset[2]) ? offset[2] : true;
        }
        return offset;
      }
    };
  })();
  /******************************************************
   * OBJET L - localisation des chaînes de caractères (STRING) et expressions régulières (RegExp)
   ******************************************************/
  var L = (function ()
  {
    var locStr = { // key:[français,anglais,polonais]
      //DATAS
      "sDeconnecte": ["Vous avez été déconnecté en raison d’une longue inactivité.",
			"You have been logged out because of inactivity.",
			"Nastąpiło wylogowanie z powodu zbyt długiej bezczynności."],
      "sCourtePause": ["Une courte pause est en court en raison de l’actualisation du classement général",
			"Please wait a moment while the rankings are being updated.",
			"Trwa przerwa związana z aktualizacją rankingu gry."],
      //INIT
      "sUnknowID": ["BloodWarsAnalyseRC - Erreur :\n\nLe nom de ce vampire doit être lié à son ID. Merci de consulter la Salle du Trône pour rendre le script opérationnel.\nCe message est normal si vous utilisez ce script pour la première fois ou si vous avez changé le nom du vampire.",
			"BloodWarsAnalyseRC - Error :\n\nThe name of this vampire must be linked to her ID. Please consult the Throne Room to make the script running.\nThis message is normal if you use this script for the first time or if you changed the name of the vampire.",
			"BloodWarsAnalyseRC - Błąd :\n\nNazwa tego wampira musi być związana z jej ID. Proszę zapoznać się z sali tronowej, aby skrypt uruchomiony.\nTo wiadomość jest normalne, jeśli użyć tego skryptu po raz pierwszy lub jeśli zmienił nazwę wampira."],
      // tri
      "sTriUp": ["▲"],
      "sTriDown": ["▼"],
      "sTriNb1": ["^([0-9]+(?:\\.[0-9]*)?)$"],
      "sTriNb2": ["^([0-9]+)\\/([0-9]+)$"],
      "sTriNb3": ["^\\(([0-9]+)\\%\\)$"],
      //RC
      "sRCname": ["^([^\\(]+)(?: \\(\\*\\))?(?: \\(@\\))?$"],
      "sRCsum1": ["(.+)<br>(.+)"],
      "sRCsum2": ["([0-9]+) \\/ ([0-9]+)<br>([0-9]+) \\/ ([0-9]+)"],
      "sRCTest": ["^([^,]+), ([^,]+)$"],
      "sRCLeft": ["^<b[^<>]*>([^<>]+)<\\/b>.+$"],
      "sRCLeft2": ["^<b[^<>]*>([^<>]+) contre attaque et effectue <\\/b>.+$"],
      "sRCDead": ["^<b[^<>]*>([^<>]+)<\\/b> (?:finit|fini) sa (?:non-|)vie sur le champ de bataille\\.$",
				"^<b[^<>]*>([^<>]+)<\\/b> is slain on the battlefield\\.$",
				"^<b[^<>]*>([^<>]+)<\\/b> kończy swoje nie-życie na polu walki\\.$"],
      "sRCRight1": ["^<b[^<>]*>([^<>]+)<\\/b> obtient des dommages de <b[^<>]*>(\\d+)<\\/b> PTS DE VIE\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> takes <b[^<>]*>(\\d+)<\\/b> damage\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> zostaje (?:zraniony|zraniona) za <b[^<>]*>(\\d+)<\\/b> PKT ŻYCIA\\.$"],
      "sRCRight2": ["^<b[^<>]*>([^<>]+)<\\/b> (?:évite le coup|n’a pas été touché(?:e|))\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> (?:dodges the strike|is not hit)\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> (?:unika ciosu|nie zostaje trafion(?:y|a))\\.$"],
      "sRCRight3": ["^<b[^<>]*>([^<>]+)<\\/b> (?:effectue une série d’esquives et évite la frappe|prend <b>la Forme Astrale<\\/b> et évite les dégâts)\\.$", // Zulchequon prend la Forme Astrale et évite les dégâts.
					"^<b[^<>]*>([^<>]+)<\\/b> performs a series of feints and dodges the strike\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> wykonuje serię zwodów i unika trafienia\\.$"],
      "sRCRight4": ["^attaque touche l’(Illusion d’Hallucinateur)$",
					"^attaque touche l’(Illusion d’Hallucinateur)$", // à traduire
					"^attaque touche l’(Illusion d’Hallucinateur)$"],
      "sRCCrit": ["un coup critique", "strikes critically", "cios krytyczny"],
      "sRCHeal": ["^(?:Une force miraculeuse fait que |)<b[^<>]*>([^<>]+)<\\/b> regagne <b[^<>]*>(\\d+)<\\/b> PTS DE VIE\\.$",
					"^(?:A miraculous power makes |)<b[^<>]*>([^<>]+)<\\/b> regenerate[s]? <b[^<>]*>(\\d+)<\\/b> HP\\.$",
					"^(?:Cudowna siła sprawia, że |)<b[^<>]*>([^<>]+)<\\/b> odzyskuje <b[^<>]*>(\\d+)<\\/b> PKT ŻYCIA\\.$"],
      "sRCLeach": ["^<b[^<>]*>([^<>]+)<\\/b> perd <b[^<>]*>(\\d+)<\\/b> PTS DE VIE\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> loses <b[^<>]*>(\\d+)<\\/b> HP\\.$",
					"^<b[^<>]*>([^<>]+)<\\/b> traci <b[^<>]*>(\\d+)<\\/b> PKT KRWI\\.$"],
      "sOverStick": [" (clic pour fixer)",],
      "sOpt": ["Options", , "Opcje"],
      "sOpt1": ["Grouper les tableaux par combats : ", "Grouping Fighting Tables : ", "Grupowanie obrazy walk : "],
      "sYes": ["Oui", "Yes", "tak"],
      "sNo": ["Non", "No", "Nie"],
      "sOpt2": ["Tableaux : ", "Tables : ", "tabele : "],
      "sRCAna": ["Analyse", "Analysis", "Analiza"],
      "sRCInit": ["Initiative", "Initiative", "Inicjatywa"],
      "sRCTFight": ["Combat $1", "Fight $1", "Walka $1"],
      "sRCround": ["Manche", "Round", "Runda"],
      "sRCTAtt": ["Attaque", "Attack", "Atak"],
      "sRCTDmg": ["Dégâts", "Damage", "Szkód"],
      "sRCTDef": ["Défense", "Defence", "Obrona"],
      "sRCTPV": ["PV", "HP", "PŻ"],
      "sRCTDead": ["Mort", "Dead", "Martwy"],
      "sRCTName": ["Nom", "Name", "Imię"],
      "sRCTNb": ["Nb", "Nb", "Nm"],
      "sRCTHit": ["Hit", "Hit", "Hit"],
      "sRCTCC": ["CC", "SC", "CK"],
      "sRCTFail": ["Raté", "Miss", "Unik"],
      "sRCTEsq": ["Esq", "Fei", "Zwo"],
      "sRCTtotal": ["Total", "Total", "łączny"],
      "sRCTMin": ["Min", "Min", "Min"],
      "sRCTMax": ["Max", "Max", "Mak"],
      "sRCTMoy": ["Moy", "Ave", "Śre"],
      "sRCTLose": ["-"],
      "sRCTWin": ["+"],
      "sRCTRd": ["Rnd", "Rnd", "Rnd"],
      "sRCperc": ["\(\%\)"],
    };
    var langue; // 0 = français par défaut, 1 = anglais, 2 = polonais
    if (/^https\:\/\/r[0-9]*\.fr\.bloodwars\.net/.test(location.href)) langue = 0;
    else if (/^https\:\/\/r[0-9]*\.bloodwars\.net/.test(location.href)) langue = 1;
    else if (/^https\:\/\/r[0-9]*\.bloodwars\.interia\.pl/.test(location.href) || /^https\:\/\/beta[0-9]*\.bloodwars\.net/.test(location.href)) langue = 2;
    else langue = 0;
    return {
      /**
       * @method get
       * Retourne la chaine ou l'expression traduite
       * Remplace les éléments $1,$2... par les arguments transmis en complément.
       * Le caractère d'échappement '\' doit être doublé pour être pris en compte dans une expression régulière
       * @example "test": ["<b>$2<\/b> a tué $1 avec $3.",]
       * L.get('test','Dr Moutarde','Mlle Rose','le chandelier');
       * => "<b>Mlle Rose<\/b> a tué le Dr Moutarde avec le chandelier."
       * @param {String} key
       * @param {...String} [arguments]
       * @return {String} offset
       */
      get: function (key)
      {
        var r = locStr[key];
        if (!exist(r)) throw new Error("L::Error:: la clé n'existe pas : " + key);
        if (exist(r[langue])) r = r[langue];
        else r = r[0];
        for (var i = arguments.length - 1; i >= 1; i--)
        {
          var reg = new RegExp("\\$" + i, "g");
          r = r.replace(reg, arguments[i]);
        }
        return r;
      }
    };
  })();
  /******************************************************
   * OBJET G - Fonctions d'accès aux données de la page
   * Chaque fonction retourne 'null' en cas d'échec
   ******************************************************/
  var G = (function ()
  {
    return {
      /**
       * @method playerName
       * retourne le nom du joueur
       * @return {String|null}
       */
      playerName: function ()
      {
        return DOM.getFirstNodeTextContent("//div[@class='stats-player']/a[@class='me']", null);
      },
      /**
       * @method royaume
       * retourne le nom du serveur
       * @return {String|null}
       */
      royaume: function ()
      {
        return DOM.getFirstNodeTextContent("//div[@class='gameStats']/div[1]/b", null);
      },
      /**
       * @method page
       * Identifie la page et retourne son id
       * @return {String|null} p
       */
      page: function ()
      {
        var p = 'null';
        //  ce n'est pas un message Serveur
        if (isNull(DOM.getFirstNode("//div[@class='komunikat']")))
        {
          var qsA = DOM.queryString('a');
          var qsDo = DOM.queryString('do');
          var qsMid = DOM.queryString('mid');
          var path = window.location.pathname;
          // page extérieur
          if (path != '/')
          {
            if (path === '/showmsg.php' && ((qsA === null && qsMid !== null) || (qsA === 'cevent' && qsMid === null))) p = 'pShowMsg';
          }
          // Salle du Trône
          else if (qsA === null || qsA === 'main') p = 'pMain';
          // Page des messages
          else if (qsA === 'msg')
          {
            var qsType = DOM.queryString("type");
            if (qsDo === "view" && qsMid !== null)
            {
              if (qsType === null || qsType === '1') p = "pMsg";
              else if (qsType === '2') p = "pMsgSave";
            }
          }
        }
        return p;
      }
    };
  })();
  /******************************************************
   * OBJET U - fonctions d'accès aux données utilisateur.
   *
   ******************************************************/
  var U = (function ()
  {
    var defPref = { 'show': true, 'shO': true, 'mode': '1', 'tab1': true, 'tab2': true, 'tab3': true, 'tr1': [1, 0], 'tr2': [1, 0], 'tr3': [1, 0] };
    var pref = {};
    var ids = GM.get('BWARC:IDS', {});
    var lastID = GM.get('BWARC:LASTID', null);
    var id = null;
if (debug) console.debug('BWARC U ids :', ids);
if (debug) console.debug('BWARC U lastID :', lastID);
    return {
      /**
       * @method init
       * Fonction d'initialisation de l'objet U.
       * Identifie l'utilisateur et ses paramètres (name, id, pref).
       * @return {Objet}
       */
      init: function ()
      {
        var player = G.playerName();
        var realm = G.royaume();
        var page = G.page();
if (debug) console.debug('BWARC U init => player, realm, page :', player, realm, page);
        if (!isNull(player) && !isNull(realm) && page === 'pMain')
        {
          var refLink = DOM.getFirstNodeTextContent(
            "//div[@id='content-mid']/div[@id='reflink']/span[@class='reflink']", null);
          if (!isNull(refLink))
          {
            var ref = /r\.php\?r=([0-9]+)/.exec(refLink);
            if (!isNull(ref))
            {
              for (var i in ids)
              {
                if (ids[i] === ref[1]) delete ids[i]; // en cas de changement de nom
              }
              ids[realm + ':' + player] = ref[1];
              GM.set('BWARC:IDS', ids);
              lastID = GM.set('BWARC:LASTID', realm + ':' + ref[1]);
            }
          }
        }
        if (!isNull(player) && !isNull(realm) && exist(ids[realm + ':' + player]))
        {
          id = realm + ':' + ids[realm + ':' + player];
        }
        else if (!isNull(lastID))
        {
          id = lastID;
        }
        if (!isNull(id))
        {
          var prefTmp = GM.get('BWARC:O:' + id, {});
          for (var i in defPref)
          {
            pref[i] = exist(prefTmp[i]) ? prefTmp[i] : clone(defPref[i]);
          }
        }
if (debug) console.debug('BWARC U end => id, lastID, ids :', id, lastID, ids);
        return this;
      },
      /**
       * @method id
       * Retourne l'id de l'utilisateur.
       * @return {integer|null} 
       */
      id: function ()
      {
        return id;
      },
      /**
       * @method getP
       * Retourne la valeur d'une préférence utilisateur.
       * @param {String} key
       * @return {*} val
       */
      getP: function (key)
      {
        if (exist(pref[key]))
        {
          return clone(pref[key]);
        }
        else
        {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method getDefP
       * Retourne la valeur par défaut d'une préférence utilisateur.
       * @param {String} key
       * @return {*} val
       */
      getDefP: function (key)
      {
        if (exist(defPref[key]))
        {
          return clone(defPref[key]);
        }
        else
        {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method setP
       * Sauvegarde la valeur d'une préférence utilisateur.
       * @param {String} key
       * @param {*} val
       * @return {*} val
       */
      setP: function (key, val)
      {
        if (exist(pref[key]))
        {
          pref[key] = clone(val);
          GM.set('BWARC:O:' + id, pref);
          return val;
        }
        else
        {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method razP
       * Reset la valeur d'une préférence utilisateur.
       * @param {String} key
       * @return {*} val
       */
      razP: function (key)
      {
        if (exist(pref[key]))
        {
          pref[key] = defPref[key];
          GM.set('BWARC:O:' + id, pref);
          return clone(pref[key]);
        }
        else
        {
          throw new Error("Erreur : clé de préférence inconnue.");
        }
      },
      /**
       * @method razAllP
       * Reset des préférences utilisateur.
       * @return {*} val
       */
      razAllP: function ()
      {
        pref = defPref;
        GM.set('BWARC:O:' + id, pref);
      },
      /**
       * @method getD
       * Retourne les données liées à l'utilisateur.
       * @param {String} key
       * @param {*} defVal - valeur par défaut
       * @return {*} val|defVal
       */
      getD: function (key, defVal)
      {
        return GM.get('BWARC:' + key + ':' + id, defVal);
      },
      /**
       * @method setD
       * Sauvegarde des données liées à l'utilisateur.
       * @param {String} key
       * @param {*} val
       * @return {*} val
       */
      setD: function (key, val)
      {
        return GM.set('BWARC:' + key + ':' + id, val);
      }
    };
  })().init();
  /******************************************************
   * CSS - Initialisation des styles propre à ce script.
   * Note : la commande init est appelée automatiquement.
   ******************************************************/
  var CSS = (function ()
  {
    function getCssRules(selector, css)
    {
      var sheets = exist(css) ? [css] : document.styleSheets;
      for (var i = 0; i < sheets.length; i++)
      {
        var sheet = sheets[i];
        try
        {
          if (!sheet.cssRules) return null;
        }
        catch (e)
        {
          if (e.name !== 'SecurityError') throw e;
          return null;
        }
        for (var j = 0; j < sheet.cssRules.length; j++)
        {
          var rule = sheet.cssRules[j];
          if (rule.selectorText && rule.selectorText.split(',').indexOf(selector) !== -1) return rule.style;
        }
      }
      return null;
    }
    var css = [
      ".BWARCleft{text-align: left;}",
      ".BWARCmid{text-align: center;}",
      ".BWARCtri{color:lime;}",
      ".BWARCspan{font-weight:700;}",
      ".BWARCT{width: 100%;}",
      ".BWARCT tr{text-align: right;}",
      ".BWARCT th, .BWARCT td{border:thin dotted black;padding:1px;white-space:nowrap;}",
      ".BWARCbold{font-weight:700;}",
      ".BWARCtitle th, .BWARCspan{cursor: pointer;}"
      ];
    return {
      /**
       * @method init
       * Fonction d'initialisation du CSS.
       */
      init: function ()
      {
        var head = DOM.getFirstNode("//head");
        if (head !== null)
        {
          var even = getCssRules('.even');
          var selectedItem = getCssRules('.selectedItem');
          if (even !== null && selectedItem !== null) css.push('.BWARCeven{' + even.cssText + '}',
            '.BWARCtr:hover{' + selectedItem.cssText + '}');
          DOM.newNode('style', { 'type': 'text/css' }, [css.join('')], {}, head);
        }
      }
    };
  })().init();
  /******************************************************
   * FUNCTIONS
   ******************************************************/
  function NbFormat(num) {
    const formater = new Intl.NumberFormat(undefined, {notation: "compact", compactDisplay: "short"});
    return formater.format(num).replace(/\s/g,'');
  }
  
  function AnalyseRC()
  {
    function CreateOverlib(e, i)
    { // i[combat, key, round (0 pour Total)] list[i[0]][i[1]][i[2]]
      var d = list[i[0]][i[1]][i[2]];
      var nb = d.hit + d.fail + d.esq;
      var nb2 = d.hit + d.fail;
      var nb3 = d.dnb - d.desq;
      var overIU = DOM.newNodes([
        ['root', 'div', { 'align': 'center', 'style': msgContent.getAttribute('style') }, [], {}, null],
        ['table', 'table', { 'class': 'BWARCT' }, [], {}, 'root'],
        ['thead', 'thead', {}, [], {}, 'table'],
        ['tr1', 'tr', { 'class': 'tblheader' }, [], {}, 'thead'],
        ['th1_1', 'th', { 'class': 'BWARCmid', 'colspan': '7' }, [L.get('sRCTAtt')], {}, 'tr1'],
        ['th1_2', 'th', { 'class': 'BWARCmid', 'colspan': '3' }, [L.get('sRCTDmg')], {}, 'tr1'],
        ['th1_3', 'th', { 'class': 'BWARCmid', 'colspan': '5' }, [L.get('sRCTDef')], {}, 'tr1'],
        ['th1_4', 'th', { 'class': 'BWARCmid', 'colspan': '2' }, [L.get('sRCTPV')], {}, 'tr1'],
        ['tr2', 'tr', { 'class': 'tblheader' }, [], {}, 'thead'],
        ['th2_1', 'th', { 'style': 'width:5%' }, [L.get('sRCTNb')], {}, 'tr2'],
        ['th2_2', 'th', { 'style': 'width:5%' }, [L.get('sRCTEsq')], {}, 'tr2'],
        ['th2_3', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], {}, 'tr2'],
        ['th2_4', 'th', { 'style': 'width:5%' }, [L.get('sRCTHit')], {}, 'tr2'],
        ['th2_5', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], {}, 'tr2'],
        ['th2_6', 'th', { 'style': 'width:5%' }, [L.get('sRCTCC')], {}, 'tr2'],
        ['th2_7', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], {}, 'tr2'],
        ['th2_8', 'th', { 'style': 'width:7%' }, [L.get('sRCTMin')], {}, 'tr2'],
        ['th2_9', 'th', { 'style': 'width:7%' }, [L.get('sRCTMax')], {}, 'tr2'],
        ['th2_10', 'th', { 'style': 'width:7%' }, [L.get('sRCTMoy')], {}, 'tr2'],
        ['th2_11', 'th', { 'style': 'width:5%' }, [L.get('sRCTNb')], {}, 'tr2'],
        ['th2_12', 'th', { 'style': 'width:5%' }, [L.get('sRCTEsq')], {}, 'tr2'],
        ['th2_13', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], {}, 'tr2'],
        ['th2_14', 'th', { 'style': 'width:5%' }, [L.get('sRCTFail')], {}, 'tr2'],
        ['th2_15', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], {}, 'tr2'],
        ['th2_16', 'th', { 'style': 'width:7%' }, [L.get('sRCTLose')], {}, 'tr2'],
        ['th2_17', 'th', { 'style': 'width:7%' }, [L.get('sRCTWin')], {}, 'tr2'],
        ['tbody', 'tbody', {}, [], {}, 'table'],
        ['tr3', 'tr', { 'class': 'tblheader' }, [], {}, 'tbody'],
        ['td3_1', 'td', { 'class': 'atkHit' }, [nb], {}, 'tr3'],
        ['td3_2', 'td', { 'class': 'atkHit' }, [d.esq], {}, 'tr3'],
        ['td3_3', 'td', { 'class': 'atkHit BWARCleft' }, ['(' + (nb > 0 ? Math.round(d.esq / nb * 100) : 0) + '%)'], {}, 'tr3'],
        ['td3_4', 'td', { 'class': 'atkHit' }, [d.hit + '/' + nb2], {}, 'tr3'],
        ['td3_5', 'td', { 'class': 'atkHit BWARCleft' }, [' (' + (nb2 > 0 ? Math.round(d.hit / nb2 * 100) : 0) + '%)'], {}, 'tr3'],
        ['td3_6', 'td', { 'class': 'atkHit' }, [d.cc + '/' + d.hit], {}, 'tr3'],
        ['td3_7', 'td', { 'class': 'atkHit BWARCleft' }, [' (' + (d.hit > 0 ? Math.round(d.cc / d.hit * 100) : 0) + '%)'], {}, 'tr3'],
        ['td3_8', 'td', {}, [(d.hit > 0 ? d.dmin : '-')], {}, 'tr3'],
        ['td3_9', 'td', {}, [(d.hit > 0 ? d.dmax : '-')], {}, 'tr3'],
        ['td3_10', 'td', {}, [(d.hit > 0 ? Math.round(d.dmg / d.hit) : '-')], {}, 'tr3'],
        ['td3_11', 'td', { 'class': 'defHit' }, [d.dnb], {}, 'tr3'],
        ['td3_12', 'td', { 'class': 'defHit' }, [d.desq + '/' + d.dnb], {}, 'tr3'],
        ['td3_13', 'td', { 'class': 'defHit BWARCleft' }, [' (' + (d.dnb > 0 ? Math.round(d.desq / d.dnb * 100) : 0) + '%)'], {}, 'tr3'],
        ['td3_14', 'td', { 'class': 'defHit' }, [d.dfail + '/'+ nb3], {}, 'tr3'],
        ['td3_15', 'td', { 'class': 'defHit BWARCleft' }, [' (' + (nb3 > 0 ? Math.round(d.dfail / nb3 * 100) : 0) + '%)'], {}, 'tr3'],
        ['td3_16', 'td', { 'class': 'atkHit' }, [d.pvlost], {}, 'tr3'],
        ['td3_17', 'td', { 'class': 'heal' }, [d.pvwin], {}, 'tr3'],
      ]);
      var titre = i[1] + ' - ' + L.get('sRCTFight', i[0] + 1) + ' - ' + (i[2] === 0 ? L.get('sRCTtotal') : L.get('sRCround') + ' ' + i[2]); 
      DOM.removeEvent(e.target, 'mouseover', CreateOverlib);
      e.target.setAttribute('onmouseover', "return overlib('" + overIU['root'].innerHTML + "',CAPTION,'" +
        titre + L.get('sOverStick') + "',CAPTIONFONTCLASS,'action-caption',WRAP);");
      e.target.setAttribute('onclick', "return overlib('" + overIU['root'].innerHTML + "', STICKY, CAPTION,'" +
        titre + "',CAPTIONFONTCLASS,'action-caption',WRAP);");
      e.target.setAttribute('onmouseout', "return nd();");
      e.target.onmouseover();
    }
    function CreateOverlib2(e, i)
    { // i[combat, key]
      var d = list[i[0]][i[1]][0];
      var nb = d.hit + d.fail + d.esq;
      var nb2 = d.hit + d.fail;
      var nb3 = d.dnb - d.desq;
      var overIU = DOM.newNodes([
        ['root', 'div', { 'align': 'center', 'style': msgContent.getAttribute('style') }, [], {}, null],
        ['table', 'table', { 'class': 'BWARCT' }, [], {}, 'root'],
        ['thead', 'thead', {}, [], {}, 'table'],
 /*       ['tr1', 'tr', { 'class': 'tblheader' }, [], {}, 'thead'],
        ['th1_1', 'th', { 'class': 'BWARCmid', 'colspan': '3' }, [L.get('sRCTDmg')], {}, 'tr1'],*/
        ['tr2', 'tr', { 'class': 'tblheader' }, [], {}, 'thead'],
        ['th2_1', 'th', { 'class': 'BWARCmid' }, [L.get('sRCTMin')], {}, 'tr2'],
        ['th2_2', 'th', { 'class': 'BWARCmid' }, [L.get('sRCTMax')], {}, 'tr2'],
        ['th2_3', 'th', { 'class': 'BWARCmid' }, [L.get('sRCTMoy')], {}, 'tr2'],
        ['tbody', 'tbody', {}, [], {}, 'table'],
        ['tr3', 'tr', { 'class': 'tblheader' }, [], {}, 'tbody'],
        ['td3_1', 'td', { 'class': 'BWARCmid' }, [(d.hit > 0 ? d.dmin : '-')], {}, 'tr3'],
        ['td3_2', 'td', { 'class': 'BWARCmid' }, [(d.hit > 0 ? d.dmax : '-')], {}, 'tr3'],
        ['td3_3', 'td', { 'class': 'BWARCmid' }, [(d.hit > 0 ? Math.round(d.dmg / d.hit) : '-')], {}, 'tr3'],

      ]);
      var titre = i[1]; 
      DOM.removeEvent(e.target, 'mouseover', CreateOverlib);
      e.target.setAttribute('onmouseover', "return overlib('" + overIU['root'].innerHTML + "',CAPTION,'" +
        titre + L.get('sOverStick') + "',CAPTIONFONTCLASS,'action-caption',WRAP);");
      e.target.setAttribute('onclick', "return overlib('" + overIU['root'].innerHTML + "', STICKY, CAPTION,'" +
        titre + "',CAPTIONFONTCLASS,'action-caption',WRAP);");
      e.target.setAttribute('onmouseout', "return nd();");
      e.target.onmouseover();
    }
    function clicTitle(e)
    {
      U.setP('show', !U.getP('show'));
      rootIU['head_1'].className = 'BWARCspan ' + (U.getP('show') ? 'enabled' : 'disabled');
      rootIU['main'].setAttribute('style', 'display: '+ (U.getP('show') ? 'block;' : 'none;'));
    }
    function clicOptions(e)
    {
      U.setP('shO', !U.getP('shO'));
      rootIU['head_5'].className = 'BWARCspan ' + (U.getP('shO') ? 'enabled' : 'disabled');
      rootIU['options'].setAttribute('style', 'display: '+ (U.getP('shO') ? 'block;' : 'none;'));
    }
    function clicType(e, i)
    {
      U.setP('mode', i);
      upTab();
    }
    function clicRC(e, i)
    {
      U.setP('tab' + i, e.target.checked);
      upTab();
    }
    function upTab()
    {
      if (U.getP('mode') === '1')
      {
        for (var j = 0; j < list.length; j++)
        {
          for (var k = 1, idx = k + '_' + j + '_'; k < 4; k++, idx = k + '_' + j + '_')
          {
            if (U.getP('tab' + k))
            {
              rootIU['tabs'].appendChild(rootIU[idx + 'table']);
            }
            else
            {
              if (!isNull(rootIU[idx + 'table'].parentNode))
              {
                rootIU[idx + 'table'].parentNode.removeChild(rootIU[idx + 'table']);
              }
            }
          }
        }
      }
      else
      {
        for (var j = 1; j < 4; j++)
        {
          for (var k = 0, idx = j + '_' + k + '_'; k < list.length; k++, idx = j + '_' + k + '_')
          {
            if (U.getP('tab' + j))
            {
              rootIU['tabs'].appendChild(rootIU[idx + 'table']);
            }
            else
            {
              if (!isNull(rootIU[idx + 'table'].parentNode))
              {
                rootIU[idx + 'table'].parentNode.removeChild(rootIU[idx + 'table']);
              }
            }
          }
        }
      }
    }
    function clickCol(e, i)
    { // i[0]= n°RC, i[1]= col
      var tri = U.getP('tr' + i[0]);
      if (i[1] !== 0)
      {
        tri[1] = i[1] === tri[0] && tri[1] === 1 ? 0 : 1;
        tri[0] = i[1];
        U.setP('tr' + i[0], tri);
      }
      if (!exist(rootIU[i[0] + '_0_th2_' + tri[0]]))
      {
        tri = [1, 0];
        U.setP('tr' + i[0], tri);
      }
      for (var k = 0, idx = i[0] + '_' + k + '_'; rootIU[idx + 'tbody']; k++, idx = i[0] + '_' + k + '_')
      {
        rootIU[idx + 'tri'].textContent = (tri[1] === 1 ? L.get('sTriUp') : L.get('sTriDown'));
        rootIU[idx + 'th2_' + tri[0]].appendChild(rootIU[idx + 'tri']);
        var index = [];
        for (var j = 3; rootIU[idx + 'tr' + j]; j++)
        {
          var v = rootIU[idx + 'td' + j + '_' + tri[0]].textContent.trim().toLowerCase();
          var v2 = rootIU[idx + 'td' + j + '_1'].textContent.trim().toLowerCase();
          if (tri[0] !== 1)
          {
            if (exist(rootIU[idx + 'td' + j + '_' + tri[0]].dataset.nb))
            {
              v = Number(rootIU[idx + 'td' + j + '_' + tri[0]].dataset.nb);
            }
            else
            {
              var r1 = new RegExp(L.get('sTriNb1')).exec(v);
              var r2 = new RegExp(L.get('sTriNb2')).exec(v);
              var r3 = new RegExp(L.get('sTriNb3')).exec(v);
              v = r1 !== null ? parseFloat(r1[1]) : r2 !== null ? r2[2] !== 0 ? Math.round(r2[1] / r2[2] * 100): 0 : r3 !== null ? Math.round(r3[1]) : Number.POSITIVE_INFINITY;
            }
          }
          index.push([v, v2, idx + 'tr' + j]);
        }
        // tri utilisant en 2ème critère le nom du joueur
        index.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] === b[0] ? a[1] < b[1] ? -1 : a[1] === b[1] ? 0 : 1 : 1; });
        if (tri[1] === 0) index.reverse();
        for (var l = 0; l < index.length; l++)
        {
          if (l % 2 === 0) rootIU[index[l][2]].classList.remove('BWARCeven');
          else rootIU[index[l][2]].classList.add('BWARCeven');
          rootIU[idx + 'tbody'].appendChild(rootIU[index[l][2]]);
        }
      }
    }
    function realName(i)
    {
      var r = new RegExp(L.get('sRCname')).exec(i);
      return (isNull(r) ? i : r[1]);
    }
    function fillRd(n)
    {
       return Array.apply(null, Array(n)).map(function () { return { 'nb': 1, 'hit': 0, 'cc': 0, 'fail': 0, 'esq': 0, 'dmin': Infinity, 'dmax': 0, 'dmg': 0, 'dnb': 0, 'dfail': 0, 'desq': 0, 'pvlost': 0, 'pvwin': 0, 'dead': 0 }; }); //, 'init': 0, 'dead': 0 
    }
    var msgContent = DOM.getFirstNode("//div[(@class='msg-content' or @class='msg-content msg-quest')]");
    if (!isNull(msgContent))
    {
      var versus = DOM.getNodes(".//table[@class='fight']/tbody/tr[@class='versus']", msgContent);
      var RCs = DOM.getNodes(".//div[(@class='rlc fight' or @class='rlc')]", msgContent);
      var summary = DOM.getNodes(".//div[@class='ambsummary']", msgContent);
      // versus et RCs sont obligatoires, summary uniquement à plusieurs
      if (versus.snapshotLength > 0 && RCs.snapshotLength > 0)
      {
        var rootIU = DOM.newNodes([
          ['root', 'div', {}, [], {}, null],
     //     ['hr1', 'div', { 'class': 'hr620' }, [], {}, 'root'],
          ['hr1', 'br', {}, [], {}, 'root'],
          ['head', 'div', { 'align': 'center', 'style': msgContent.getAttribute('style') }, [], {}, 'root'],
          ['head_1', 'span', { 'class': 'BWARCspan ' + (U.getP('show') ? 'enabled' : 'disabled')}, [((typeof (GM_info) === 'object') ? GM_info.script.name : '?')], { 'click': [clicTitle] }, 'head'],
          ['head_2', 'span', { 'class': 'BWARCspan' }, [' : '], {}, 'head'],
          ['head_3', 'span', { 'class': 'BWARCspan' }, [], {}, 'head'],
          ['head_3a', 'a', { 'href': 'https://github.com/Ecilam/BloodWarsAnalyseRC', 'TARGET': '_blank' }, [((typeof (GM_info) === 'object') ? GM_info.script.version : '?')], {}, 'head_3'],
          ['head_4', 'span', { 'class': 'BWARCspan' }, [' ('], {}, 'head'],
          ['head_5', 'span', { 'class': 'BWARCspan ' + (U.getP('shO') ? 'enabled' : 'disabled') }, [L.get('sOpt')], { 'click': [clicOptions] }, 'head'],
          ['head_6', 'span', { 'class': 'BWARCspan' }, [')'], {}, 'head'],
          ['main', 'div', { 'style': 'display:' + (U.getP('show') ? 'block;' : 'none;') }, [], {}, 'root'],
          ['options', 'div', { 'align': 'center', 'style': msgContent.getAttribute('style'), 'style': 'display:' + (U.getP('shO') ? 'block;' : 'none;') }, [], {}, 'main'],
          ['opt1', 'div', {}, [L.get('sOpt1')], {}, 'options'],
          ['check11', 'input', { 'class': 'box', 'id': 'BWARCtypes', 'type': 'radio', 'name': 'BWARCradio', 'checked': U.getP('mode') === '1' }, [], { 'click': [clicType, '1'] }, 'opt1'],
          ['label11', 'label', { 'for': 'BWARCtypes' }, [L.get('sYes')], {}, 'opt1'],
          ['check12', 'input', { 'class': 'box', 'id': 'BWARCfight', 'type': 'radio', 'name': 'BWARCradio', 'checked': U.getP('mode') === '2' }, [], { 'click': [clicType, '2'] }, 'opt1'],
          ['label12', 'label', { 'for': 'BWARCfight' }, [L.get('sNo')], {}, 'opt1'],
          ['opt2', 'div', {}, [L.get('sOpt2')], {}, 'options'],
          ['label21', 'label', { 'for': 'BWARCtab1' }, [L.get('sRCAna')], [], 'opt2'],
          ['check21', 'input', { 'type': 'checkbox', 'id': 'BWARCtab1', 'checked': U.getP('tab1') }, [], { 'change': [clicRC, '1'] }, 'opt2'],
          ['label22', 'label', { 'for': 'BWARCtab2' }, [', ' + L.get('sRCTDmg')], {}, 'opt2'],
          ['check22', 'input', { 'type': 'checkbox', 'id': 'BWARCtab2', 'checked': U.getP('tab2') }, [], { 'change': [clicRC, '2'] }, 'opt2'],
          ['label23', 'label', { 'for': 'BWARCtab3' }, [', ' + L.get('sRCInit')], {}, 'opt2'],
          ['check23', 'input', { 'type': 'checkbox', 'id': 'BWARCtab3', 'checked': U.getP('tab3') }, [], { 'change': [clicRC, '3'] }, 'opt2'],
          ['hr2', 'br', {}, [], {}, 'main'],
          ['tabs', 'div', { 'align': 'center', 'style': msgContent.getAttribute('style') }, [], {}, 'main']
          ]);
        msgContent.parentNode.insertBefore(rootIU.root, msgContent.nextSibling);
        // arène 3v3 avec plusieurs combats
        var list = [];
        for (var k = 0; k < versus.snapshotLength; k++)
        {
          list[k] = {};
          var RC = RCs.snapshotItem(k);
          if (!isNull(RC))
          {
            var rounds = DOM.getNodes("./ul[@class='round']", RC);
            if (rounds.snapshotLength > 0)
            {
              var sum1 = DOM.getLastNodeInnerHTML("./ul[@class='round']/li/div[@class='sum1']", null, RC);
              var sum2 = DOM.getLastNodeInnerHTML("./ul[@class='round']/li/div[@class='sum2']", null, RC);
              // ambu + arène solo
              if (!isNull(sum1) && !isNull(sum2))
              {
                var r1 = new RegExp(L.get('sRCsum1')).exec(sum1);
                var r2 = new RegExp(L.get('sRCsum2')).exec(sum2);
                if (!isNull(r1) && !isNull(r2))
                {
                  var name1 = realName(r1[1]);
                  var name2 = realName(r1[2]);
                  list[k][name1] = fillRd(rounds.snapshotLength + 1);
                  list[k][name1][0].cl = 'atkHit';
                  list[k][name1][0].init = 0;
                  list[k][name1][0].dead = Infinity;
                  list[k][name2] = fillRd(rounds.snapshotLength + 1);
                  list[k][name2][0].cl = 'defHit';
                  list[k][name2][0].init = 0;
                  list[k][name2][0].dead = Infinity;
                }
              }
              // arène multi, rdc, expé
              else if (!isNull(summary.snapshotItem(k)))
              {
                var prAtt = DOM.getNodes("./table/tbody/tr/td[@class='atkHit']/b", summary.snapshotItem(k));
                var prDef = DOM.getNodes("./table/tbody/tr/td[@class='defHit']/b", summary.snapshotItem(k));
                for (var i = 0; i < prAtt.snapshotLength; i++)
                {
                  var temp = realName(prAtt.snapshotItem(i).textContent);
                  if (exist(list[k][temp])) list[k][temp][0].nb++;
                  else 
                  {
                    list[k][temp] = fillRd(rounds.snapshotLength + 1);
                    list[k][temp][0].cl = 'atkHit';
                    list[k][temp][0].init = 0;
                    list[k][temp][0].dead = Infinity;
                  }
                }
                for (var i = 0; i < prDef.snapshotLength; i++)
                {
                  var temp = realName(prDef.snapshotItem(i).textContent);
                  if (exist(list[k][temp])) list[k][temp][0].nb++;
                  else
                  {
                    list[k][temp] = fillRd(rounds.snapshotLength + 1);
                    list[k][temp][0].cl = 'defHit';
                    list[k][temp][0].init = 0;
                    list[k][temp][0].dead = Infinity;
                  }
                }
              }
              // Analyse le RC
              for (var i = 0; i < rounds.snapshotLength; i++)
              {
                var round = rounds.snapshotItem(i);
                var lignes = DOM.getNodes("./li", round);
                var init = 0;
                for (var j = 0; j < lignes.snapshotLength; j++)
                {
                  var ligne = lignes.snapshotItem(j);
                  var ligCla = ligne.getAttribute('class');
                  if (ligCla === 'playerDeath')
                  {
                    var dead = new RegExp(L.get('sRCDead')).exec(ligne.innerHTML);
                    if (!isNull(dead))
                    {
                      var name = realName(dead[1]);
                      list[k][name][i+1].dead = exist(list[k][name][i+1].dead) ? list[k][name][i+1].dead + 1 : 1;
                      list[k][name][0].dead = i+1;
                    }
                  }
                  else if (ligCla === 'atkHit' || ligCla === 'defHit')
                  {
                    var r = new RegExp(L.get('sRCTest')).exec(ligne.innerHTML);
                    if (r !== null)
                    {
                      var left = new RegExp(L.get('sRCLeft')).exec(r[1]);
                      // cas particulier du talisman Furie bestiale - la balise b est male formatée lors de la contre attaque
                      // correction serveur FR uniquement
                      var left2 = new RegExp(L.get('sRCLeft2')).exec(r[1]);
                      left = left2 !== null ? left2 : left;
                      if (left !== null && exist(list[k][realName(left[1])]))
                      {
                        var nameL = realName(left[1]);
                        var tempAtt = list[k][nameL];
                        if (!exist(tempAtt[i+1].init))
                        {
                          init++;
                          tempAtt[i+1].init = init;
                          tempAtt[0].init++;
                        }
                        var right1 = new RegExp(L.get('sRCRight1')).exec(r[2]);
                        var right2 = new RegExp(L.get('sRCRight2')).exec(r[2]);
                        var right3 = new RegExp(L.get('sRCRight3')).exec(r[2]);
                        var right4 = new RegExp(L.get('sRCRight4')).exec(r[2]); // Illusion d’Hallucinateur
                        if (right1 !== null || right2 !== null || right3 !== null || right4 !== null)
                        {
                          if (right4 !== null && !exist(list[k][right4[1]]))
                          {
                            list[k][right4[1]] = fillRd(rounds.snapshotLength + 1);
                            list[k][right4[1]][0].cl = 'defHit';
                            list[k][right4[1]][0].init = 0;
                            list[k][right4[1]][0].dead = Infinity;
                          }
                          var right = right1 !== null ? right1 : (right2 !== null ? right2 : (right3 !== null ? right3 : right4));
                          var nameR = realName(right[1]);
                          var tempDef = list[k][nameR];
                          tempDef[i+1].dnb++;
                          tempDef[0].dnb++;
                          if (right1 !== null)
                          {
                            tempAtt[i+1].dmg += Number(right[2]);
                            tempAtt[0].dmg += Number(right[2]);
                            tempDef[i+1].pvlost += Number(right[2]);
                            tempDef[0].pvlost += Number(right[2]);
                            tempAtt[i+1].hit++;
                            tempAtt[0].hit++;
                            tempAtt[i+1].dmin = Math.min(tempAtt[i+1].dmin, Number(right[2]));
                            tempAtt[0].dmin = Math.min(tempAtt[0].dmin, Number(right[2]));
                            tempAtt[i+1].dmax = Math.max(tempAtt[i+1].dmax, Number(right[2]));
                            tempAtt[0].dmax = Math.max(tempAtt[0].dmax, Number(right[2]));
                            if (new RegExp(L.get('sRCCrit')).exec(r[1]) !== null)
                            {
                              tempAtt[i+1].cc++;
                              tempAtt[0].cc++;
                            }
                          }
                          else if (right2 !== null)
                          {
                            tempAtt[i+1].fail++;
                            tempAtt[0].fail++;
                            tempDef[i+1].dfail++;
                            tempDef[0].dfail++;
                          }
                          else if (right3 !== null)
                          {
                            tempAtt[i+1].esq++;
                            tempAtt[0].esq++;
                            tempDef[i+1].desq++;
                            tempDef[0].desq++;
                          }
                          else // right4
                          {
                            tempAtt[i+1].hit++;
                            tempAtt[0].hit++;
                          }
                          if (ligCla === 'atkHit')
                          {
                            list[k][nameL] = tempAtt;
                            list[k][nameR] = tempDef;
                          }
                          else
                          {
                            list[k][nameR] = tempDef;
                            list[k][nameL] = tempAtt;
                          }
                        }
                      }
                    }
                  }
                  else if (ligCla === 'heal')
                  {
                    var heal = new RegExp(L.get('sRCHeal')).exec(ligne.innerHTML);
                    if (heal !== null)
                    {
                      list[k][realName(heal[1])][i+1].pvwin += Number(heal[2]);
                      list[k][realName(heal[1])][0].pvwin += Number(heal[2]);
                    }
                    var leach = new RegExp(L.get('sRCLeach')).exec(ligne.innerHTML);
                    if (leach !== null)
                    {
                      list[k][realName(leach[1])][i+1].pvlost += Number(leach[2]);
                      list[k][realName(leach[1])][0].pvlost += Number(leach[2]);
                    }
                  }
                }
              }
              //"Dommages" total des deux camps (Arènes multis, expés, RDC ou sièges)
              if (!isNull(summary.snapshotItem(k)))
              {
                var sum = DOM.getFirstNode("./table[@class='fight']/tbody", summary.snapshotItem(k));
                if (!isNull(sum))
                {
                  var totalA = 0;
                  var totalD = 0;
                  var deadA = 0;
                  var deadD = 0;
                  for (var key in list[k])
                  {
                    if (list[k].hasOwnProperty(key))
                    {
                      var data = list[k][key][0];
                       if (data.cl === 'atkHit')
                      {
                        totalA += data.dmg;
                        deadD += list[k][key].reduce((a, b, c) => c > 0 ? a + b.dead : 0, 0);
                      }
                      else
                      {
                        totalD += data.dmg;
                        deadA += list[k][key].reduce((a, b, c) => c > 0 ? a + b.dead : 0, 0);
                      }
                    }
                  }
                  DOM.newNodes([
                    [k + '_totaltr', 'tr', {}, [], {}, sum],
                    [k + '_totaltd1', 'td', { 'class': 'BWARCbold' }, [L.get('sRCTtotal')], {}, k + '_totaltr'],
                    [k + '_totaltd2', 'td', { 'class': 'BWARCbold' }, [totalA + ' / ' + deadA], {}, k + '_totaltr'],
                    [k + '_totaltd3', 'td', { 'colspan': '2' }, [], {}, k + '_totaltr'],
                    [k + '_totaltd4', 'td', { 'class': 'BWARCbold' }, [L.get('sRCTtotal')], {}, k + '_totaltr'],
                    [k + '_totaltd5', 'td', { 'class': 'BWARCbold' }, [totalD + ' / ' + deadD], {}, k + '_totaltr'],
                    [k + '_totaltd6', 'td', { 'colspan': '2' }, [], {}, k + '_totaltr']
                  ], rootIU);
                }
              }
              // tableau n°1 Analyse du combat
              var idx = '1_' + k + '_';
              DOM.newNodes([
                [idx + 'table', 'table', { 'class': 'BWARCT' }, [], {}, null],
                [idx + 'thead', 'thead', {}, [], {}, idx + 'table'],
                [idx + 'tr1', 'tr', { 'class': 'tblheader' }, [], {}, idx + 'thead'],
                [idx + 'th1_1', 'th', { 'class': 'BWARCleft'}, [L.get('sRCAna') + ' - ' + L.get('sRCTFight', k+1)], {}, idx + 'tr1'],
                [idx + 'th1_2', 'th', { 'class': 'BWARCmid', 'colspan': '7' }, [L.get('sRCTAtt')], {}, idx + 'tr1'],
                [idx + 'th1_2', 'th', { 'class': 'BWARCmid' }, [L.get('sRCTDmg')], {}, idx + 'tr1'],
                [idx + 'th1_3', 'th', { 'class': 'BWARCmid', 'colspan': '5' }, [L.get('sRCTDef')], {}, idx + 'tr1'],
                [idx + 'th1_4', 'th', { 'class': 'BWARCmid', 'colspan': '2' }, [L.get('sRCTPV')], {}, idx + 'tr1'],
                [idx + 'th1_5', 'th', { 'colspan': '1' }, [L.get('sRCTDead')], {}, idx + 'tr1'],
                [idx + 'tr2', 'tr', { 'class': 'tblheader BWARCtitle' }, [], {}, idx + 'thead'],
                [idx + 'th2_1', 'th', { 'style': 'width:16%', 'class': 'BWARCleft'}, [L.get('sRCTName')], { 'click': [clickCol, [1, 1]] }, idx + 'tr2'],
                [idx + 'th2_2', 'th', { 'style': 'width:2%' }, [L.get('sRCTNb')], { 'click': [clickCol, [1, 2]] }, idx + 'tr2'],
                [idx + 'th2_3', 'th', { 'style': 'width:5%' }, [L.get('sRCTEsq')], { 'click': [clickCol, [1, 3]] }, idx + 'tr2'],
                [idx + 'th2_4', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], { 'click': [clickCol, [1, 4]] }, idx + 'tr2'],
                [idx + 'th2_5', 'th', { 'style': 'width:5%' }, [L.get('sRCTHit')], { 'click': [clickCol, [1, 5]] }, idx + 'tr2'],
                [idx + 'th2_6', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], { 'click': [clickCol, [1, 6]] }, idx + 'tr2'],
                [idx + 'th2_7', 'th', { 'style': 'width:5%' }, [L.get('sRCTCC')], { 'click': [clickCol, [1, 7]] }, idx + 'tr2'],
                [idx + 'th2_8', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], { 'click': [clickCol, [1, 8]] }, idx + 'tr2'],
                [idx + 'th2_9', 'th', { 'style': 'width:5%' }, [L.get('sRCTtotal')], { 'click': [clickCol, [1, 9]] }, idx + 'tr2'],
                [idx + 'th2_10', 'th', { 'style': 'width:2%' }, [L.get('sRCTNb')], { 'click': [clickCol, [1, 10]] }, idx + 'tr2'],
                [idx + 'th2_11', 'th', { 'style': 'width:5%' }, [L.get('sRCTEsq')], { 'click': [clickCol, [1, 11]] }, idx + 'tr2'],
                [idx + 'th2_12', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], { 'click': [clickCol, [1, 12]] }, idx + 'tr2'],
                [idx + 'th2_13', 'th', { 'style': 'width:5%' }, [L.get('sRCTFail')], { 'click': [clickCol, [1, 13]] }, idx + 'tr2'],
                [idx + 'th2_14', 'th', { 'style': 'width:5%', 'class': 'BWARCleft' }, [L.get('sRCperc')], { 'click': [clickCol, [1, 14]] }, idx + 'tr2'],
                [idx + 'th2_15', 'th', { 'style': 'width:5%' }, [L.get('sRCTLose')], { 'click': [clickCol, [1, 15]] }, idx + 'tr2'],
                [idx + 'th2_16', 'th', { 'style': 'width:5%' }, [L.get('sRCTWin')], { 'click': [clickCol, [1, 16]] }, idx + 'tr2'],
                [idx + 'th2_17', 'th', { 'style': 'width:5%' }, [L.get('sRCTRd')], { 'click': [clickCol, [1, 17]] }, idx + 'tr2'],
                [idx + 'tbody', 'tbody', {}, [], {}, idx + 'table'],
                [idx + 'br', 'br', {}, [], {}, idx + 'table'],
                [idx + 'tri', 'span', { 'class': 'BWARCtri' }, [], {}, null]
              ], rootIU);
              var i = 3;
              for (var key in list[k])
              {
                if (list[k].hasOwnProperty(key))
                {
                  var data = list[k][key][0];
                  var nb = data.hit + data.fail + data.esq;
                  var nb2 = (data.hit + data.fail);
                  var nb3 = data.dnb - data.desq;
                  DOM.newNodes([
                    [idx + 'tr' + i, 'tr', { 'class': 'BWARCtr' }, [], {}, rootIU[idx + 'tbody']],
                    [idx + 'td' + i + '_1', 'td', { 'class': (data.cl === 'atkHit' ? 'atkHit' : 'defHit') + ' BWARCleft BWARCbold' }, [key + (data.nb > 1 ? ' x' + data.nb : '')], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_2', 'td', { 'class': 'atkHit' }, [nb], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_3', 'td', { 'class': 'atkHit' }, [data.esq], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_4', 'td', { 'class': 'atkHit BWARCleft' }, ['(' + (nb > 0 ? Math.round(data.esq / nb * 100) : 0) + '%)'], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_5', 'td', { 'class': 'atkHit' }, [data.hit + '/' + nb2], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_6', 'td', { 'class': 'atkHit BWARCleft' }, [' (' + (nb2 > 0 ? Math.round(data.hit / nb2 * 100) : 0) + '%)'], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_7', 'td', { 'class': 'atkHit' }, [data.cc + '/' + data.hit], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_8', 'td', { 'class': 'atkHit BWARCleft' }, [' (' + (data.hit > 0 ? Math.round(data.cc / data.hit * 100) : 0) + '%)'], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_9', 'td', { 'data-nb': data.dmg }, [NbFormat(data.dmg)], { 'mouseover': [CreateOverlib2, [k, key]] }, idx + 'tr' + i],
                    [idx + 'td' + i + '_10', 'td', { 'class': 'defHit' }, [data.dnb], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_11', 'td', { 'class': 'defHit' }, [data.desq + '/' + data.dnb], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_12', 'td', { 'class': 'defHit BWARCleft' }, [' (' + (data.dnb > 0 ? Math.round(data.desq / data.dnb * 100) : 0) + '%)'], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_13', 'td', { 'class': 'defHit' }, [data.dfail + '/'+ nb3], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_14', 'td', { 'class': 'defHit BWARCleft' }, [' (' + (nb3 > 0 ? Math.round(data.dfail / nb3 * 100) : 0) + '%)'], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_15', 'td', { 'class': 'atkHit', 'data-nb': data.pvlost }, [NbFormat(data.pvlost)], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_16', 'td', { 'class': 'heal', 'data-nb': data.pvwin }, [NbFormat(data.pvwin)], {}, idx + 'tr' + i],
                    [idx + 'td' + i + '_17', 'td', { 'class': 'playerDeath' }, [list[k][key].map((a, b) => b > 0 && a.dead > 0 ? b + (a.dead > 1 ? 'x' + a.dead : '') : '').reduce((a, b) => a + (a !== '' ? b !== '' ? ',' : '' : '') + b, '')], {}, idx + 'tr' + i]
                  ], rootIU);
                  i++;
                }
              }
              // tableau n°2 Dommages / manche
              idx = '2_' + k + '_';
              DOM.newNodes([
                [idx + 'table', 'table', { 'class': 'BWARCT' }, [], {}, null],
                [idx + 'thead', 'thead', {}, [], {}, idx + 'table'],
                [idx + 'tr1', 'tr', { 'class': 'tblheader' }, [], {}, idx + 'thead'],
                [idx + 'th1_1', 'th', { 'class': 'BWARCleft'}, [L.get('sRCTDmg') + ' - ' + L.get('sRCTFight', k+1)], {}, idx + 'tr1'],
                [idx + 'th1_2', 'th', { 'class': 'BWARCmid', 'colspan': '10' }, [L.get('sRCround')], {}, idx + 'tr1'],
                [idx + 'th1_3', 'th', { 'class': 'BWARCmid'}, [], {}, idx + 'tr1'],
                [idx + 'tr2', 'tr', { 'class': 'tblheader BWARCtitle' }, [], {}, idx + 'thead'],
                [idx + 'th2_1', 'th', { 'style': 'width:20%', 'class': 'BWARCleft'}, [L.get('sRCTName')], { 'click': [clickCol, [2, 1]] }, idx + 'tr2'],
                [idx + 'tbody', 'tbody', {}, [], {}, idx + 'table'],
                [idx + 'br', 'br', {}, [], {}, idx + 'table'],
                [idx + 'tri', 'span', { 'class': 'BWARCtri' }, [], {}, null]
              ], rootIU);
              for (var i = 2; i < 12; i++)
              {
                DOM.newNodes([[idx + 'th2_' + i, 'th', { 'style': 'width:7%' }, [i-1], { 'click': [clickCol, [2, i]] }, idx + 'tr2']], rootIU);
              }
              DOM.newNodes([[idx + 'th2_12', 'th', { 'style': 'width:10%' }, [L.get('sRCTtotal')], { 'click': [clickCol, [2, 12]] }, idx + 'tr2']], rootIU);
              var i = 3;
              for (var key in list[k])
              {
                if (list[k].hasOwnProperty(key))
                {
                  var data = list[k][key][0];
                  DOM.newNodes([
                    [idx + 'tr' + i, 'tr', { 'class': 'BWARCtr' }, [], {}, rootIU[idx + 'tbody']],
                    [idx + 'td' + i + '_1', 'td', { 'class': (data.cl === 'atkHit' ? 'atkHit' : 'defHit') + ' BWARCleft BWARCbold' }, [key + (data.nb > 1 ? ' x' + data.nb : '')], {}, idx + 'tr' + i]
                  ], rootIU);
                  for (var j = 2; j < 12; j++)
                  {
                    if (exist(list[k][key][j-1]) && j-2 < data.dead)
                    {
                      DOM.newNodes([[idx + 'td' + i + '_' + j, 'th', {}, [list[k][key][j-1].dmg], { 'mouseover': [CreateOverlib, [k, key, j-1]] }, idx + 'tr' + i]], rootIU);
                    }
                    else
                    {
                      DOM.newNodes([[idx + 'td' + i + '_' + j, 'th', {}, [], {}, idx + 'tr' + i]], rootIU);
                    }
                  }
                  DOM.newNodes([[idx + 'td' + i + '_12', 'th', {}, [data.dmg], { 'mouseover': [CreateOverlib, [k, key, 0]] }, idx + 'tr' + i]], rootIU);
                  i++;
                }
              }
              // tableau Initiative / manche
              idx = '3_' + k + '_';
              DOM.newNodes([
                [idx + 'table', 'table', { 'class': 'BWARCT' }, [], {}, null],
                [idx + 'thead', 'thead', {}, [], {}, idx + 'table'],
                [idx + 'tr1', 'tr', { 'class': 'tblheader' }, [], {}, idx + 'thead'],
                [idx + 'th1_1', 'th', { 'class': 'BWARCleft'}, [L.get('sRCInit') + ' - ' + L.get('sRCTFight', k+1)], {}, idx + 'tr1'],
                [idx + 'th1_2', 'th', { 'class': 'BWARCmid', 'colspan': '10' }, [L.get('sRCround')], {}, idx + 'tr1'],
                [idx + 'th1_3', 'th', { 'class': 'BWARCmid'}, [], {}, idx + 'tr1'],
                [idx + 'tr2', 'tr', { 'class': 'tblheader BWARCtitle' }, [], {}, idx + 'thead'],
                [idx + 'th2_1', 'th', { 'style': 'width:20%', 'class': 'BWARCleft'}, [L.get('sRCTName')], { 'click': [clickCol, [3, 1]] }, idx + 'tr2'],
                [idx + 'tbody', 'tbody', {}, [], {}, idx + 'table'],
                [idx + 'br', 'br', {}, [], {}, idx + 'table'],
                [idx + 'tri', 'span', { 'class': 'BWARCtri' }, [], {}, null]
              ], rootIU);
              for (var i = 2; i < 12; i++)
              {
                DOM.newNodes([[idx + 'th2_' + i, 'th', { 'style': 'width:7%' }, [i-1], { 'click': [clickCol, [3, i]] }, idx + 'tr2']], rootIU);
              }
              DOM.newNodes([[idx + 'th2_12', 'th', { 'style': 'width:10%' }, [L.get('sRCTMoy')], { 'click': [clickCol, [3, 12]] }, idx + 'tr2']], rootIU);
              var i = 3;
              for (var key in list[k])
              {
                if (list[k].hasOwnProperty(key))
                {
                  var data = list[k][key][0];
                  DOM.newNodes([
                    [idx + 'tr' + i, 'tr', { 'class': 'BWARCtr' }, [], {}, rootIU[idx + 'tbody']],
                    [idx + 'td' + i + '_1', 'td', { 'class': (data.cl === 'atkHit' ? 'atkHit' : 'defHit') + ' BWARCleft BWARCbold' }, [key + (data.nb > 1 ? ' x' + data.nb : '')], {}, idx + 'tr' + i]
                  ], rootIU);
                  var init = 0;
                  for (var j = 2; j < 12; j++)
                  {
                    if (exist(list[k][key][j-1]) && exist(list[k][key][j-1].init))
                    {
                      init += list[k][key][j-1].init;
                    }
                    DOM.newNodes([[idx + 'td' + i + '_' + j, 'th', {}, [j-2 < data.dead && exist(list[k][key][j-1]) ? exist(list[k][key][j-1].init) ? list[k][key][j-1].init : '∞' : ''], {}, idx + 'tr' + i]], rootIU);
                  }
                  DOM.newNodes([[idx + 'td' + i + '_12', 'th', {}, [data.init > 0 ? (init / data.init).toFixed(1) : '∞'], {}, idx + 'tr' + i]], rootIU);
                  i++;
                }
              }
            }
          }
        }
        clickCol(null, [1, 0]);
        clickCol(null, [2, 0]);
        clickCol(null, [3, 0]);
        upTab();
      }
    }
  }
  /******************************************************
   * START
   ******************************************************/
  var page = G.page();
if (debug) console.debug('BWARCstart :', page, U.id());
  // Pages gérées par le script
  if (page === 'pShowMsg' || page === 'pMsg' || page === 'pMsgSave')
  {
    if (!isNull(U.id()))
    {
      AnalyseRC();
    }
    else
    {
      alert(L.get("sUnknowID"));
    }
  }
if (debug) console.debug('BWARCEnd - time %oms', Date.now() - debugTime);
})();
