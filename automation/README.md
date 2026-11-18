# WANTED Automatik: News-Bot und Pinterest-Bot

Hier liegen zwei Helfer, die rund um die Uhr auf GitHub laufen. Dein PC muss dafür nicht an sein.

1. **News-Bot**: schaut alle 20 Minuten nach neuen GTA-Meldungen, schreibt daraus mit Claude eigene deutsche News und legt sie auf die Seite (oder fragt dich vorher).
2. **Pinterest-Bot**: macht aus Guides, Cheats und News schöne Pins im WANTED-Look und postet sie stündlich auf Pinterest (oder baut dir eine CSV für den Import).

Alles liegt im Ordner `automation/`. Die Seite selbst (Ordner `src/`) wird davon nur beschrieben, nicht verändert.

---

## 1. Der News-Bot

### Was er macht, Schritt für Schritt

1. **Lesen**: Er holt die Schlagzeilen aus 29 Quellen (Liste: `news-bot/sources.json`). Darunter offizielle Quellen (Rockstar über Google News, PlayStation Blog, Xbox Wire, Take-Two), große Fachmedien (IGN, GameStar, Eurogamer, PC Gamer, VGC und mehr), kleinere Seiten und als Gerüchte-Quellen Reddit und Insider Gaming.
2. **Filtern**: Nur Meldungen der letzten 48 Stunden mit GTA-Bezug. Deals, Quiz und Werbung fliegen raus.
3. **Gedächtnis**: Was schon da war, wird nicht noch einmal verarbeitet (`data/news-seen.json`, wird nach 14 Tagen aufgeräumt).
4. **Storys bilden**: Meldungen verschiedener Medien über dasselbe Ereignis werden zu einer "Story" zusammengefasst. Zusätzlich prüft das günstige Modell Claude Haiku, ob es echte News sind und ob deutsche und englische Schlagzeilen dasselbe meinen.
5. **Ampel** (siehe unten).
6. **Schreiben**: Claude Sonnet schreibt einen eigenen Artikel auf Deutsch, in Du-Form, ohne fremde Sätze zu kopieren, mit klarer Trennung "bestätigt" und "unbestätigt" und immer mit einem Abschnitt "Was das für dich heißt".
7. **Ablegen**: Grüne Artikel gehen direkt online, gelbe kommen als Freigabe-Anfrage zu dir.

Andere Medien dienen nur als **Trend-Radar**: Der Bot übernimmt keine Texte und keine Bilder, er nennt die Quellen unter dem Artikel.

### Die Ampel

| Farbe | Wann | Was passiert |
|---|---|---|
| **Grün** | Offizielle Quelle (Rockstar, Take-Two, Sony, Microsoft) **oder** mindestens 2 unabhängige große Medien berichten | Artikel geht automatisch online |
| **Gelb** | Nur ein großes Medium oder nur kleinere Seiten, **oder** es geht um einen Leak/ein Gerücht, **oder** Claude stuft den Kern als unbestätigt ein, **oder** der Text ähnelt einer Quelle zu stark | Entwurf als **Pull Request**: du gibst ihn in der GitHub-App frei |
| **Rot** | Nur Reddit, Leaker, Insider | Wird nicht geschrieben, nur im Protokoll vermerkt |

Gelbe Storys warten erst **40 Minuten**: Oft berichtet in der Zeit ein zweites großes Medium, dann wird die Story grün und braucht dich nicht.

### So gibst du gelbe News frei (am Handy)

1. GitHub-App öffnen, Benachrichtigung "News-Freigabe: ..." antippen (oder Discord-Nachricht, wenn eingerichtet).
2. Reiter **Files changed**: Text lesen.
3. Passt: **Merge pull request**. Cloudflare baut die Seite neu, nach 1 bis 3 Minuten ist der Artikel online.
4. Passt nicht: **Close pull request**. Fertig, nichts geht online.

Tipp: Im Repo oben auf **Watch → All Activity** stellen und in der GitHub-App Push-Benachrichtigungen erlauben.

### Grenzen (einstellbar)

| Einstellung | Standard | Bedeutung |
|---|---|---|
| `MAX_ARTICLES` | 3 | Artikel pro Lauf |
| `DAILY_CAP` | 25 | Artikel pro Tag (grün und gelb zusammen) |
| `DAILY_DRAFT_CAP` | 12 | Gelbe Entwürfe pro Tag (damit du nicht überrollt wirst) |
| `FRESH_HOURS` | 12 | Ältere Storys werden nicht mehr geschrieben |
| `YELLOW_HOLD_MINUTES` | 40 | Wartezeit für gelbe Storys |

Ändern: GitHub → Settings → Secrets and variables → Actions → Reiter **Variables** → neue Variable mit diesem Namen.

### Zusatz-Funktionen (nur wenn eingerichtet)

* **Discord**: Pro veröffentlichtem Artikel und pro Freigabe-Anfrage eine Nachricht in deinen eigenen Kanal. Der Bot schreibt nirgends bei fremden Leuten und gibt sich nicht als Mensch aus.
* **IndexNow**: Neue Adressen werden ca. 2,5 Minuten nach dem Hochladen an Bing und Co. gemeldet (Google nutzt IndexNow nicht und findet neue Seiten über die Sitemap; den alten Google-Sitemap-Ping gibt es nicht mehr).

### Rockstar Newswire

Rockstar bietet für den Newswire **keinen Feed und keine offene Schnittstelle** an (die Seite lädt ihre Daten über eine interne Schnittstelle, die wir bewusst nicht anzapfen). Ersatz: eine Google-News-Suche nach `site:rockstargames.com`. Die ist offiziell und stabil, aber Google nimmt neue Rockstar-Beiträge manchmal erst mit Verzögerung auf. PlayStation Blog, Xbox Wire und Take-Two kommen direkt.

### Hinweis KI-Kennzeichnung

Artikel vom Bot haben im Kopf `bot: true` und den Autor "WANTED Newsdesk". Die Seite zeigt dafür einen kleinen Hinweis "automatisch erstellt" an (EU AI Act, Artikel 50: KI-Texte ohne menschliche Prüfung müssen gekennzeichnet sein; gelbe Artikel prüfst du selbst).

---

## 2. Der Pinterest-Bot

### Was er macht

* Baut aus allen Guides, Cheats (jeder Cheat ein eigener Pin), frischen News (bis 3 Tage alt, keine Gerüchte) und 8 eigenen Wallpapern eine **Warteschlange** (`data/pin-queue.json`).
* Zeichnet jeden Pin als Bild (1000 x 1500 Pixel) im WANTED-Look: dunkler Hintergrund, Sonnenuntergangs-Verlauf, fünf Fahndungssterne, große Schrift, Wortmarke und Domain unten. **Keine Rockstar- oder GTA-Logos, keine offiziellen Bilder.** Jeder Pin trägt den Hinweis "Fan-Seite, nicht offiziell von Rockstar". Beispiele: `pinterest/samples/`.
* Postet stündlich zwischen ca. 06 und 23 Uhr, Ziel **20 Pins pro Tag**.
* Merkt sich alles Gepostete in `data/pins-posted.json`.

### Regeln (aus deinem Pinterest-Projekt übernommen)

* Höchstens **3 Pins pro Ziel-Adresse und Tag**, höchstens **25 Pins pro Tag** (Standard 20).
* Jeder Link ist eindeutig (`utm_content` mit der Pin-ID), damit der Pinterest-Bulk-Import keine Zeilen verwirft.
* Keine langen Gedankenstriche in Titeln, Beschreibungen und Alt-Texten.
* Typen wechseln sich ab (Guide, Cheat, Tipps, Wallpaper), Cheats gemischt nach Spiel.
* Titel bis 100 Zeichen, Beschreibung bis 500 Zeichen mit 2 bis 4 Hashtags, Alt-Text für jedes Bild.

### Zwei Wege zum Posten: API oder CSV

**Weg A: Pinterest-API (voll automatisch)**
Der Workflow postet selbst. Dafür brauchst du einen Pinterest-Business-Account und eine Developer-App (siehe Abschnitt 4). Solange kein Token hinterlegt ist, läuft der Bot nur als Probelauf.

**Weg B: CSV für den Pinterest-Bulk-Import (wie bei Viking Feast Recipes)**
1. GitHub → Actions → **Pinterest-Bot** → **Run workflow** → Modus `csv` (Tag leer lassen = morgen).
2. Der Workflow baut die CSV (gleiche Spalten wie deine bisherigen: Title, Media URL, Pinterest board, Thumbnail, Description, Link, Publish date, Keywords) und legt die Bilder öffentlich auf den Branch `pin-media` (nur bei **öffentlichem** Repo erreichbar).
3. Im fertigen Lauf unten unter **Artifacts** die CSV herunterladen und in Pinterest importieren (Erstellen → Pins in großer Menge erstellen).
4. Achtung: Pinterest erlaubt höchstens **100 geplante Pins gleichzeitig**. Immer nur einen Tag importieren.
5. Pins aus der CSV gelten als verplant und kommen nicht nochmal dran. Rückgängig: `node pinterest/export-csv.mjs --undo 2026-11-18`.

Die Board-Namen für die CSV und die Board-IDs für die API stehen in `pinterest/boards.json`. Boards vorher in Pinterest anlegen.

### Spam-Vorsicht

Pinterest sperrt Konten, die zu viel vom Gleichen auf dieselbe Adresse posten. Deshalb: nicht mehr als 20 bis 25 Pins am Tag, die 3-pro-Adresse-Regel nicht abschalten, keine Pins doppelt posten, und nicht gleichzeitig per API **und** per CSV dieselben Tage befüllen.

---

## 3. GitHub einrichten (einmalig)

### Repo öffentlich machen (empfohlen)

GitHub Actions ist für **öffentliche** Repos kostenlos und ohne Minuten-Grenze. Bei einem **privaten** Repo gibt es 2.000 Minuten im Monat gratis. Rechnung: Der News-Bot läuft alle 20 Minuten, also 3 x 24 = 72 Läufe pro Tag, rund 2.190 Läufe im Monat. Jeder Lauf zählt mindestens 1 Minute, dazu kommen 18 Pinterest-Läufe pro Tag (rund 550 im Monat). Das sind über 2.700 Minuten und damit zu viel für privat. Privat ginge nur mit weniger Läufen (News alle 40 Minuten und weniger Pinterest-Läufe).

Die Inhalte sind ohnehin öffentlich auf der Seite. Schlüssel und Passwörter stehen **nie** im Repo, sondern in den GitHub-Secrets.

### Rechte für den Bot

GitHub → Settings → Actions → General → ganz unten **Workflow permissions**:
* **Read and write permissions** auswählen
* Haken bei **Allow GitHub Actions to create and approve pull requests** (sonst kann der Bot keine Freigabe-Anfragen anlegen)

### Secrets und Variablen

GitHub → Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Pflicht? | Woher |
|---|---|---|
| `ANTHROPIC_API_KEY` | Ja, für den News-Bot | [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key. Dort unter Billing Guthaben aufladen und ein **Ausgabenlimit** setzen (z. B. 40 USD im Monat). |
| `SITE_URL` | Nein (Standard `https://wanted-hq.de`) | Deine echte Domain, ohne Schrägstrich am Ende. Besser als **Variable** (Reiter Variables) anlegen. |
| `DISCORD_WEBHOOK_URL` | Nein | Discord → dein Kanal → Kanal bearbeiten → Integrationen → Webhooks → Neuer Webhook → Webhook-URL kopieren |
| `INDEXNOW_KEY` | Nein | Beliebiger Schlüssel aus 32 Zeichen (0-9, a-f), z. B. auf [bing.com/indexnow](https://www.bing.com/indexnow) erzeugen. **Wichtig:** Auf der Seite muss die Datei `public/<SCHLÜSSEL>.txt` liegen, die genau diesen Schlüssel enthält. |
| `PINTEREST_ACCESS_TOKEN` | Für Weg A | Pinterest Developer-App (siehe unten) |
| `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `PINTEREST_REFRESH_TOKEN` | Empfohlen für Weg A | Damit der Bot das Token selbst erneuert |
| `GH_SECRETS_TOKEN` | Nein | Nur nötig, damit erneuerte Pinterest-Tokens automatisch gespeichert werden: GitHub → Settings (dein Profil) → Developer settings → Fine-grained tokens → nur dieses Repo → Recht **Secrets: Read and write** |

Ohne `ANTHROPIC_API_KEY` läuft der News-Bot nur als Probelauf (liest und bewertet, schreibt nichts).

---

## 4. Pinterest-API: was du brauchst

1. **Business-Konto**: Pinterest-Konto in ein (kostenloses) Unternehmenskonto umwandeln.
2. **Developer-App**: Auf [developers.pinterest.com](https://developers.pinterest.com) → My apps → Connect app. Angaben zur App ausfüllen (Zweck: eigene Inhalte der eigenen Seite automatisch pinnen).
3. **Trial Access**: Nach der Prüfung bekommt die App zuerst "Trial"-Zugang. Damit erstellte Pins sind nur für dich sichtbar (Testbetrieb). Zum Testen in GitHub die Variable `PINTEREST_API_BASE` auf `https://api-sandbox.pinterest.com/v5` setzen.
4. **Standard Access**: Für echte, öffentliche Pins in der App "Upgrade" beantragen. Dafür will Pinterest ein kurzes Video, das den Ablauf zeigt. Die Prüfung dauert laut Entwickler-Forum oft 2 bis 4 Wochen. Bis dahin: **Weg B (CSV)** nutzen.
5. **Token**: Rechte (Scopes) `boards:read`, `pins:read`, `pins:write`. Das Zugangstoken gilt 30 Tage, das Refresh-Token 60 Tage (wird bei Nutzung verlängert). Mit App-ID, App-Secret und Refresh-Token erneuert der Bot das Zugangstoken selbst. Ohne `GH_SECRETS_TOKEN` musst du die Secrets spätestens alle 50 Tage von Hand erneuern.
6. **Board-IDs**: Lokal mit Token `node pinterest/post.mjs --list-boards` ausführen und die IDs in `pinterest/boards.json` eintragen.

---

## 5. Kosten

### Claude (News-Bot)

Preise laut Anthropic (Stand November 2026, pro 1 Million Tokens; 1 Token ist ungefähr ein Wortteil):
* Claude Sonnet 5.5 (schreibt): 2 USD Eingabe, 10 USD Ausgabe
* Claude Haiku 5.5 (sortiert vor): 0,10 USD Eingabe, 0,50 USD Ausgabe

**Pro Artikel** (geschätzt):
* Eingabe: Anleitung plus Quellen ca. 2.500 Tokens x 2 USD / 1.000.000 = **0,005 USD**
* Ausgabe: Artikel (ca. 400 Wörter), Felder und Nachdenken ca. 2.500 bis 3.000 Tokens x 10 USD / 1.000.000 = **0,025 bis 0,03 USD**
* Zusammen: **ca. 0,03 USD pro Artikel** (3 Cent)

**Pro Monat:**
* 15 Artikel pro Tag: 15 x 30 x 0,03 = **ca. 13,50 USD**
* 25 Artikel pro Tag: 25 x 30 x 0,03 = **ca. 22,50 USD**
* Vorfilter Haiku: pro Lauf weniger als 0,002 USD, im Monat **ca. 1 bis 3 USD**
* Gesamt realistisch: **15 bis 30 USD im Monat**. Setz in der Anthropic-Konsole ein Limit, dann kann nichts ausufern.

Sparen: Variable `WRITER_EFFORT` auf `low` setzen (weniger Nachdenken, etwas günstiger) oder `DAILY_CAP` senken.

### Sonst

* GitHub Actions: kostenlos bei öffentlichem Repo.
* Pinterest-API: kostenlos.
* Cloudflare Pages: kostenlos im Gratis-Tarif.

---

## 6. Für Technik-Neugierige: Befehle

Einmalig im Ordner `automation`: `npm ci`

| Befehl | Was |
|---|---|
| `npm run news:dry` | News-Bot Probelauf: zeigt Storys und Ampel, schreibt nichts |
| `node news-bot/run.mjs --dry-run --verbose` | Dasselbe mit allen Meldungen pro Story |
| `npm run pins:generate` | Pin-Warteschlange neu bauen |
| `npm run pins:samples` | Je Pin-Typ ein Beispielbild nach `pinterest/samples/` |
| `node pinterest/generate.mjs --render --fixtures` | Alle Pins aus den Testdaten zeichnen (`pinterest/out/`) |
| `node pinterest/post.mjs --dry-run --ignore-hours` | Zeigt, was als Nächstes gepostet würde |
| `npm run pins:csv -- --date 2026-11-18` | CSV für einen Tag bauen |
| `npm test` | Selbsttests (ohne Internet, ohne API-Kosten) |

Zum lokalen Testen können Schlüssel in `automation/.env` stehen (wird nie hochgeladen).

### Dateien

* `news-bot/`: News-Bot (`run.mjs` Hauptablauf, `sources.json` Quellen, `writer.mjs` Claude, `open-prs.mjs` Freigabe-Anfragen, `indexnow.mjs`, `notify.mjs` Discord)
* `pinterest/`: Pinterest-Bot (`generate.mjs`, `render.mjs` Design, `wallpaper.mjs` eigene Wallpaper-Kunst, `post.mjs` API, `export-csv.mjs` CSV, `boards.json`)
* `data/`: Gedächtnis und Protokolle der Bots (werden vom Workflow gespeichert)
* `fixtures/`: Testdaten für die Pins
* `../.github/workflows/`: `news-bot.yml` (alle 20 Minuten), `pinterest.yml` (stündlich), `indexnow.yml` (wenn du etwas mergst)

### Gut zu wissen

* GitHub startet zeitgesteuerte Läufe manchmal 5 bis 15 Minuten später als geplant, zu Stoßzeiten fällt selten einer aus. Der Pinterest-Bot holt verpasste Pins im nächsten Lauf nach.
* GitHub pausiert Zeitpläne in öffentlichen Repos nach 60 Tagen ohne Aktivität. Da die Bots selbst regelmäßig speichern, passiert das im Normalbetrieb nicht.
* Einen Lauf von Hand starten: GitHub → Actions → Workflow auswählen → **Run workflow**.

---

## Guide-Radar

*(Nachtrag 17.11.2026)*

### Was er macht

Nach dem Release von GTA 6 entdecken Spieler jeden Tag neue Geld-Methoden, versteckte Orte, Glitches, Easter Eggs, Sammelobjekte und Tipps. Der Guide-Radar findet solche Entdeckungen schnell und schreibt daraus **Guide-Entwürfe auf Deutsch mit Quellen**. Er läuft alle 2 Stunden auf GitHub (Workflow `guide-radar.yml`).

1. **Lesen**: 25 Quellen (Liste: `guide-radar/sources.json`). Fachmedien mit vielen Guides (IGN, GamesRadar+, GameStar, Eurogamer, PC Games, GameSpot, RockstarINTEL, GTABOOM, Dexerto, TheGamer, Game Rant, Push Square, Mein-MMO, netzwelt), zwei Google-News-Suchen nach Guide-Wörtern, Rockstar (Newswire und YouTube), die Top-Beiträge des Tages aus r/GTA6, r/gtaonline, r/GTA und r/GTAV sowie die YouTube-Kanäle GTA Series Videos, MrBossFTW, TGG, Broughy1322 und GhillieMaster.
2. **Filtern**: Nur Meldungen der letzten 72 Stunden mit GTA-Bezug und echter **Guide-Absicht** (Wörter wie "how to", "where to find", "Fundort", "so bekommst du", "money", "Geld verdienen", "glitch", "easter egg", "secret", "versteckt", "Sammelobjekte", "Trophäe", "freischalten", "Tipps", "Cheats"). Reine News (Trailer, Verkaufszahlen, Termine, Preise, Wochenboni) und Deals fliegen raus, die macht der News-Bot.
3. **Gedächtnis**: `data/radar-seen.json` merkt sich, was schon ein Entwurf war oder abgelehnt wurde (30 Tage). Themen, zu denen es auf der Seite schon einen Guide gibt, werden erkannt und übersprungen.
4. **Themen bilden und bewerten**: Meldungen zur selben Entdeckung werden zusammengefasst. Punkte gibt es für unabhängige Quellen, Reddit und YouTube, die Stärke der Guide-Absicht und Aktualität.
5. **Entwurf oder beobachten**:
   * **Entwurf** nur, wenn mindestens **2 unabhängige Quellen** berichten **oder** eine offizielle Quelle bzw. ein großes Fachmedium mit klarer Anleitung. Mindestens eine Quelle muss echten Text liefern (nicht nur eine Schlagzeile).
   * **Beobachten**: Themen nur von Reddit (alle Subreddits zählen zusammen als eine Quelle), nur eine kleinere Quelle oder nur Schlagzeilen. Sie stehen im Lauf-Protokoll und werden zum Entwurf, sobald eine zweite Quelle auftaucht.
6. **Prüfen und schreiben**: Claude Haiku prüft billig vor, ob das Thema wirklich eine konkrete, nachspielbare Info enthält, und schlägt das deutsche Suchwort vor. Dann schreibt Claude Sonnet den Guide. Für Fachmedien lädt der Radar den Artikeltext nach, damit Claude genug Fakten hat.
7. **Freigabe**: Jeder Entwurf wird ein eigener **Pull Request** (Label `guide-radar`), dazu eine Nachricht in den privaten Discord-Team-Kanal (Secret `DISCORD_WEBHOOK_STAFF`).

### Warum jeder Radar-Guide deine Freigabe braucht

Die KI kennt GTA 6 nicht. Sie weiß nicht, wo etwas liegt, was eine Mission bringt oder wie ein Ort heißt. Deshalb darf sie **nur Fakten aus den Quellen** verwenden: keine erfundenen Orte, Zahlen, Koordinaten oder Schritte. Trotzdem können Quellen falsch sein oder Claude kann etwas missverstehen. Guides bleiben lange online und werden oft gefunden, ein falscher Fundort schadet dem Ruf der Seite. Darum geht **kein** Radar-Guide automatisch online, egal wie viele Quellen es gibt.

Dazu kommen feste Schutzregeln:
* Zu jeder konkreten Aussage liefert Claude eine **Belege-Liste** mit Quellen-Nummer. Die steht im Pull Request.
* Beruht etwas nur auf einer Quelle oder auf Reddit/YouTube, steht "Laut Community-Berichten" im Text. Bei dünner Quellenlage gibt es den Abschnitt "Was noch unklar ist".
* **Glitches in GTA Online** (Geld, Autos oder Gegenstände erschleichen oder vervielfältigen): nur Erklärung und Ban- bzw. Reset-Risiko, **keine Anleitung**. Findet der Bot trotzdem nummerierte Schritte, steht oben im Pull Request eine Warnung.
* Kopierschutz: Stellen mit 8 oder mehr gleichen Wörtern wie in einer Quelle werden gemeldet.
* Keine Gedankenstriche, Beschreibung 120 bis 160 Zeichen, nur interne Links, die es auf der Seite gibt.

### So gibst du einen Guide am Handy frei

1. GitHub-App öffnen, Benachrichtigung "Guide-Freigabe: ..." antippen (oder die Discord-Nachricht im Team-Kanal).
2. Oben steht, **warum** der Radar das Thema gewählt hat, dazu Spiel, Kategorie, Suchwort und Hinweise vom Bot.
3. **Belege** mit den verlinkten **Quellen** vergleichen: Steht das wirklich so in der Quelle?
4. Reiter **Files changed**: Guide lesen.
5. Checkliste abhaken (Fakten verglichen, keine Exploit-Anleitung, nichts erfunden, Titel passt).
6. Passt: **Merge pull request**. Cloudflare baut die Seite neu, nach 1 bis 3 Minuten ist der Guide online.
7. Passt nicht: **Close pull request**. Der Radar schlägt das Thema 30 Tage lang nicht noch einmal vor.
8. Kleine Fehler: Datei öffnen, Stift-Symbol, korrigieren, speichern, dann Merge.

### Grenzen (einstellbar)

| Einstellung | Standard | Bedeutung |
|---|---|---|
| `MAX_GUIDES` | 2 | Guide-Entwürfe pro Lauf |
| `GUIDE_DAILY_CAP` | 6 | Guide-Entwürfe pro Tag (jeder muss gelesen werden) |
| `RADAR_MAX_AGE_HOURS` | 72 | Ältere Meldungen werden ignoriert |
| `GUIDE_WRITER_EFFORT` | medium | Wie gründlich Claude nachdenkt (`low`, `medium`, `high`) |

Ändern: GitHub → Settings → Secrets and variables → Actions → Reiter **Variables**.

### Kosten

Preise laut Anthropic (Stand November 2026, pro 1 Million Tokens): Claude Sonnet 5.5 kostet 2 USD Eingabe und 10 USD Ausgabe, Claude Haiku 5.5 kostet 0,10 USD Eingabe und 0,50 USD Ausgabe.

**Pro Guide** (geschätzt):
* Vorprüfung Haiku: ca. 1.500 Tokens rein, 300 raus = **unter 0,001 USD**
* Sonnet Eingabe: Anleitung plus Quelltexte ca. 7.000 bis 10.000 Tokens x 2 USD / 1.000.000 = **0,014 bis 0,02 USD**
* Sonnet Ausgabe: Guide (500 bis 800 Wörter), Belege und Nachdenken ca. 3.000 bis 5.000 Tokens x 10 USD / 1.000.000 = **0,03 bis 0,05 USD**
* Zusammen: **ca. 0,05 bis 0,07 USD pro Guide** (5 bis 7 Cent)

**Pro Monat:** Höchstens 6 Guides pro Tag x 30 Tage x 0,07 USD = **höchstens ca. 13 USD**. Realistisch deutlich weniger, weil an vielen Tagen keine 6 guten Themen auftauchen. Abgelehnte Themen kosten nur die Haiku-Vorprüfung, Läufe ohne Kandidaten kosten nichts. Der Radar nutzt denselben `ANTHROPIC_API_KEY` wie der News-Bot, das Ausgabenlimit in der Anthropic-Konsole gilt für beide.

GitHub Actions: 12 Läufe pro Tag, je ca. 1 bis 2 Minuten, bei öffentlichem Repo kostenlos.

### Quellen ergänzen

Alles steht in `guide-radar/sources.json`.

**Neuer Subreddit**: Reddit erlaubt ohne Anmeldung nur etwa einen Abruf pro Minute. Deshalb stecken alle Subreddits in **einem** Feed. Den Namen mit `+` an die Reddit-Adresse hängen, zum Beispiel `https://www.reddit.com/r/GTA6+gtaonline+GTA+GTAV+gtaglitches/top/.rss?t=day&limit=100`, und unter `subredditGames` eintragen, zu welchem Spiel er gehört (zum Beispiel `"gtaglitches": "gta-online"`, oder `null`, wenn gemischt).

**Neuer YouTube-Kanal**:
1. Kanal im Browser öffnen, Seitenquelltext anzeigen und nach `channel/UC` suchen. Die Kanal-ID beginnt mit `UC` und hat 24 Zeichen.
2. Testen: `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>` im Browser öffnen. Es muss eine Liste mit den neuesten Videos kommen.
3. In `sources.json` eine Zeile nach dem Muster der anderen YouTube-Kanäle ergänzen: `type` `youtube`, `tier` `B`, `outletName` `YouTube: <Name>` und `gtaOnly: true`, wenn der Kanal nur GTA macht.

**Neue Website**: Zeile mit `type` `outlet` ergänzen. Bekannte Seiten bekommen unter `outletTiers` ihre Stufe (A = großes Fachmedium, B = kleinere Seite). Unbekannte Seiten aus Google News zählen nur als Bestätigung, nie allein. Shops und Goldverkäufer stehen unter `blockedDomains`.

### Befehle

| Befehl | Was |
|---|---|
| `npm run radar:dry` | Probelauf: zeigt Themen (Entwurf oder beobachten), ruft keine KI auf, schreibt nichts |
| `node guide-radar/run.mjs --dry-run --verbose` | Dasselbe mit allen Meldungen pro Thema |
| `npm run radar` | Echter Lauf (nur mit `ANTHROPIC_API_KEY`), Entwürfe landen in `drafts/guides/` |
| `npm run radar:prs` | Entwürfe als Pull Requests (nur in GitHub Actions) |

Dateien: `guide-radar/run.mjs` (Ablauf), `fetch.mjs` (Feeds und Artikeltext), `intent.mjs` (Guide-Absicht), `topics.mjs` (Themen, Bewertung, vorhandene Guides), `state.mjs` (Gedächtnis), `writer.mjs` (Claude), `output.mjs` (Prüfen und Frontmatter), `pr.mjs` und `open-prs.mjs` (Freigabe).

---

## Zweisprachig (DE/EN)

*(Nachtrag 17.11.2026)*

### Was sich geändert hat

* **Ein Claude-Aufruf, zwei Sprachen.** News-Bot und Guide-Radar lassen Claude jeden Artikel und jeden Guide in **einem** Aufruf auf Deutsch und auf Englisch schreiben (Felder `de` und `en`, dazu gemeinsame Felder wie Spiel, Gerücht, Hype, Breaking bzw. Kategorie, Schwierigkeit, Belege). Die englische Fassung hat dieselben Fakten, ist aber eigenständig für englische Suchanfragen geschrieben (eigener Titel, Slug, Beschreibung und Tags), keine wörtliche Übersetzung.
* **Gleiche Prüfungen für beide Sprachen:** keine Gedankenstriche, Beschreibung 120 bis 160 Zeichen (notfalls automatisch aufgefüllt), Kopierschutz (8 gleiche Wörter am Stück wie in einer Quelle). Weil die Quellen meist englisch sind, wird die englische Fassung besonders geprüft: Ein Treffer macht eine grüne News gelb.
* **Dateien:**
  * Deutsch wie bisher: `src/content/news/<Datum>-<slug>.md` und `src/content/guides/<slug>.md`.
  * Englisch: `src/content/en/news/<Datum>-<englischer-slug>.md` und `src/content/en/guides/<englischer-slug>.md`. Gleiches Frontmatter wie Deutsch, dazu `translationOf: "<ID der deutschen Datei>"`. Kategorie und Schwierigkeit behalten die deutschen Werte (`geld`, `leicht` usw.).
  * Zuordnung Deutsch zu Englisch: `src/data/en-slugs.json` (`news` und `guides`). Der Bot ergänzt nur, er löscht nie etwas. Der Eintrag entsteht schon beim Entwurf, die Seite nutzt nur Einträge, deren Dateien es gibt.
* **Grüne News:** beide Dateien direkt online. **Gelbe News und alle Radar-Guides:** beide Fassungen kommen in **denselben** Pull Request. Merge bringt beide online, Close verwirft beide. Im Pull Request steht "Zweisprachig" und die englische Adresse, bei Guides gibt es einen zusätzlichen Haken "Englische Fassung überflogen".
* **Interne Links im englischen Text** zeigen auf `/en/...` (`/en/guides/`, `/en/games/<spiel>/`, `/en/cheats/<spiel>/`, englische Guides nur, wenn es sie wirklich gibt). Links ohne englische Seite werden zu normalem Text.
* **Discord:** weiter **ein** Post pro Artikel (deutsch), mit dem Zusatzfeld "English version" und dem englischen Link.
* **IndexNow:** meldet die deutsche und die englische Adresse. Der IndexNow-Workflow meldet beim Mergen auch `src/content/en/news` und `src/content/en/guides`.
* **Fehlt die englische Fassung** (leere Antwort), erscheint die deutsche trotzdem, mit dem Hinweis "Englische Fassung fehlt" im Log bzw. im Pull Request.

### Kosten (Preise laut Anthropic, Stand November 2026)

Claude Sonnet 5.5: 2 USD Eingabe, 10 USD Ausgabe, 0,10 USD für Eingabe aus dem Cache (pro 1 Million Tokens). Die längere Anleitung (ca. 500 Tokens mehr) liegt meist im Cache und kostet praktisch nichts. Teurer wird nur die **Ausgabe**:

| | vorher | zusätzlich für Englisch | neu |
|---|---|---|---|
| News, Ausgabe-Tokens | 2.500 bis 3.000 | ca. 900 bis 1.300 | ca. 3.400 bis 4.300 |
| News, Kosten pro Artikel | ca. 0,03 USD | ca. 0,01 USD | **ca. 0,04 USD** |
| Guide, Ausgabe-Tokens | 3.000 bis 5.000 | ca. 1.000 bis 1.800 (Text, FAQ, Felder) | ca. 4.000 bis 6.800 |
| Guide, Kosten pro Guide | 0,05 bis 0,07 USD | 0,01 bis 0,02 USD | **ca. 0,06 bis 0,09 USD** |

**Pro Monat:** News bei 15 Artikeln pro Tag ca. 18 USD (vorher 13,50), bei 25 pro Tag ca. 30 USD (vorher 22,50). Guides höchstens ca. 16 USD (vorher 13). Englisch kostet also rund ein Drittel mehr, deutlich weniger als ein zweiter Aufruf (der würde die Quellen ein zweites Mal als Eingabe bezahlen). Das Limit in der Anthropic-Konsole gilt weiter für alles.

Technik: Der News-Bot wartet jetzt bis zu 4 Minuten auf eine Antwort (vorher 2), der Radar bis zu 5 Minuten, `max_tokens` für Guides ist von 16.000 auf 20.000 gestiegen.

---

## Dauerbetrieb (Nachtrag 18.11.2026)

Die Werte weiter oben (alle 20 Minuten, 3 Artikel pro Lauf, 25 pro Tag, 29 Quellen) gelten nicht mehr. Neu:

### Was sich geändert hat

* **Alle 15 Minuten** statt alle 20 (Minute 4, 19, 34 und 49 jeder Stunde, absichtlich nicht zur vollen Stunde, weil GitHub dann am häufigsten Läufe verschiebt oder streicht).
* **Mehr Volumen, gleiche Regeln:** bis zu **5 Artikel pro Lauf** (vorher 3) und **40 pro Tag** (vorher 25). Gelbe Entwürfe bleiben bei höchstens 2 pro Lauf und 12 pro Tag. Die Ampel ist nicht lockerer geworden: Grün heißt weiter offizielle Quelle oder 2 unabhängige große Medien.
* **38 Quellen** statt 29: neu GameSpot, Polygon, The Verge, GamePro, IGN Deutschland (große Medien), GamingBolt, Pure Xbox, PC Games Hardware. Die Google-News-Suchen sind aufgeteilt (eine Suche liefert höchstens 100 Treffer, zur Release-Woche fehlten sonst frische Meldungen) und finden jetzt auch "Grand Theft Auto". Große Nachrichtenmedien wie BBC, Guardian, AP, ESPN, Tagesschau, Spiegel oder FAZ zählen als großes Medium.
* **Gemeinsame Redaktionen zählen einmal:** GameStar und GamePro (bzw. PC Games und PC Games Hardware) teilen sich oft Artikel. Für die Ampel sind sie jetzt **ein** Medium (`newsrooms` in `news-bot/sources.json`). Das macht Grün etwas strenger, nicht lockerer.
* **Mehr Grün durch bessere Zuordnung:** Der Vorfilter (Claude Haiku) sieht neue Meldungen jetzt zusammen mit den noch offenen Storys der letzten Stunden. Eine deutsche Meldung findet so zur englischen Story von vorhin, und zwei große Medien in zwei Sprachen machen die Story grün.
* **Echte Fakten statt nur Schlagzeilen:** Vor dem Schreiben lädt der Bot den Text von bis zu 2 Originalartikeln (offizielle Quellen und große Medien zuerst, nie Reddit oder Google-Links). Claude nutzt ihn nur als Faktenquelle, der Kopierschutz prüft ihn mit. Reine Namens- und Plattform-Folgen ("for PlayStation 5 and Xbox Series X|S") gelten dabei nicht als Kopie.
* **Weniger Doppelte:** Der Bot kennt jetzt die letzten 40 eigenen Titel (vorher 15) und zusätzlich alle **von Hand geschriebenen News** der letzten 3 Tage aus `src/content/news/`.
* **Alte Meldungen:** Google News datiert manchmal alte Rockstar-Seiten neu (Beispiel am 18.11.: "Los Santos Tuners erscheint am 20. Juli" von 2021). Vorfilter und Schreiber sortieren solche Beiträge aus.
* **Release-Datum im Prompt:** Claude leitet aus dem aktuellen Datum ab, ob GTA 6 schon erschienen ist (vorher stand fest "erscheint am 19. November").
* **Deploy nur bei Neuem:** Nach einem Bot-Lauf baut und lädt der Workflow "Deploy" die Seite nur hoch, wenn in den letzten 40 Minuten etwas an der Seite committet wurde. Sonst wären es fast 100 Builds am Tag ohne Änderung. Auch nach einem Bot-Lauf mit Fehler wird deployt, falls grüne News schon im Repo sind.
* **Reddit aus:** Reddit sperrt RSS-Abrufe von GitHub-Servern (HTTP 404/429). Gerüchte-Quellen werden ohnehin nie geschrieben. GameStar sperrt GitHub ebenfalls (HTTP 403), seine Meldungen kommen aber über Google News trotzdem an.

### Einstellungen (GitHub → Settings → Secrets and variables → Actions → Reiter Variables)

| Variable | Standard | Bedeutung |
|---|---|---|
| `WRITER_MODEL` | `claude-sonnet-5-5` | Modell für Artikel und Guides. Beste Qualität für mehr Geld: `claude-opus-5-5` (ca. doppelte Kosten) |
| `FILTER_MODEL` | `claude-haiku-5-5` | Modell für den Vorfilter |
| `WRITER_EFFORT` | `medium` | Wie gründlich Claude nachdenkt. `high` = gründlicher, ca. 1 bis 2 Cent mehr pro Artikel |
| `MAX_ARTICLES` | 5 | Artikel pro Lauf |
| `DAILY_CAP` | 40 | Artikel pro Tag (grün und gelb zusammen) |
| `DAILY_DRAFT_CAP` | 12 | Gelbe Entwürfe pro Tag |
| `ARTICLE_TEXT_PAGES` | 2 | Originalartikel pro Story nachladen (0 = aus) |

### Kosten (Preise laut Anthropic, Stand November 2026)

Claude Sonnet 5.5: 2 USD Eingabe, 10 USD Ausgabe pro 1 Million Tokens. Claude Haiku 5.5: 0,10 / 0,50 USD.

* **Pro Artikel (DE + EN):** Eingabe ca. 5.500 Tokens (Anleitung, Quellen, 2 Artikeltexte) = ca. 0,01 USD, Ausgabe ca. 2.300 bis 3.800 Tokens (zwei Texte, Felder, Nachdenken) = 0,023 bis 0,038 USD. Zusammen **ca. 0,035 bis 0,05 USD**. Übersprungene Storys kosten ca. 0,02 USD.
* **Vorfilter:** ca. 0,001 bis 0,003 USD pro Lauf mit neuen Meldungen, höchstens ca. 0,15 USD am Tag.
* **Pro Tag:** ruhiger Tag (ca. 10 grüne, 8 gelbe) **ca. 1 USD**. Volle Grenze (40 Artikel, z. B. Release-Tag) **ca. 2,20 USD**. Dazu Guide-Radar höchstens 0,55 USD.
* **Pro Monat:** realistisch **30 bis 40 USD**, Obergrenze bei voller Auslastung jeden Tag ca. 80 USD. In der Anthropic-Konsole ein Monatslimit setzen (Vorschlag: 60 USD), dann kann nichts ausufern.
* GitHub Actions bleibt kostenlos (öffentliches Repo).

### Wenn GitHub Läufe auslässt

Geplante Läufe sind bei GitHub "best effort". Am 17./18.11. hat GitHub in den ersten 9 Stunden nach dem Anlegen des Repos nur 4 geplante Läufe gestartet (alle Bots zusammen). Prüfen: GitHub → Actions → News-Bot. Laufen dort über Stunden keine Läufe mit "schedule", hilft:
1. Workflow-Datei einmal neu committen (registriert den Zeitplan neu).
2. Externer Wecker: kostenloser Dienst wie cron-job.org ruft alle 15 Minuten `POST https://api.github.com/repos/n0w8/palmbandits/actions/workflows/news-bot.yml/dispatches` mit `{"ref":"main"}` auf. Braucht ein Fine-grained Token nur für dieses Repo mit dem Recht **Actions: Read and write**.
3. Erst wenn das alles nicht reicht: kleiner VPS (siehe unten).

### Braucht es einen VPS?

Nein, solange GitHub Actions die Läufe zuverlässig startet. Ein VPS (oder ein Raspberry Pi zu Hause) lohnt sich erst, wenn
* GitHub dauerhaft viele geplante Läufe auslässt und der externe Wecker nicht reicht,
* News im Minutentakt statt alle 15 Minuten kommen sollen,
* Quellen GitHub-Server sperren, die man unbedingt braucht (heute: Reddit, GameStar),
* oder das Repo privat werden soll (dann wären die Actions-Minuten zu knapp, siehe Abschnitt 3).
