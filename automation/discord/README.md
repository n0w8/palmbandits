# Discord-Server: Einrichtung per Bauplan

Der komplette Server (Rollen, Badges, Kanäle, Foren mit Tags, Regeln, Willkommens-Nachrichten, Onboarding-Fragen,
Spam- und Scam-Schutz, Webhooks für den News-Bot, Einladungslinks pro Quelle) steht in `blueprint.mjs`.
Ein Befehl richtet alles ein. Änderungen: Bauplan anpassen, Befehl erneut ausführen. Nichts wird doppelt angelegt.

## Einmalig (ca. 5 Minuten, nur du kannst das)

1. **Leeren Server erstellen:** Discord → links „+“ → „Eigenen erstellen“ → „Für mich und meine Freunde“. Name egal, den setzt das Skript.
2. **Bot anlegen:** https://discord.com/developers/applications → „New Application“ (z. B. „WANTED Bot“).
   - Links „Bot“ → „Reset Token“ → Token kopieren.
   - Datei `automation/.env` öffnen oder anlegen und eintragen: `DISCORD_BOT_TOKEN=dein-token`
     (Den Token nie in den Chat kopieren. Claude liest diese Datei nicht.)
   - Auf derselben Seite **„Server Members Intent“ einschalten** (für die automatischen Badges OG und Day One).
3. **Bot einladen:** Links „OAuth2“ → „URL Generator“ → Haken bei `bot` → darunter `Administrator` → Link unten öffnen → deinen Server wählen → „Autorisieren“.
4. **Einrichten:** im Ordner `automation`:
   ```
   npm run discord:check     (Probelauf, zeigt den Bauplan)
   npm run discord:setup     (richtet alles ein)
   ```
5. Falls das Skript meldet, dass die Rollen-Reihenfolge nicht passt: in Discord unter Servereinstellungen → Rollen die Rolle des Bots ganz nach oben ziehen und Schritt 4 wiederholen.

## Danach

- **Sterne nach Aktivität (Fahndungslevel):** einen Level-Bot einladen, z. B. Arcane (arcane.bot). Dort Rollen-Belohnungen setzen:
  Level 1 ★ Taschendieb · 5 ★★ Autoknacker · 10 ★★★ Gangster · 20 ★★★★ Heist-Profi · 35 ★★★★★ Staatsfeind · 50 ★★★★★★ Legende.
  Ob Rollen-Belohnungen in der Gratis-Version enthalten sind, beim Einrichten prüfen.
- **Secrets nach GitHub** (sobald das Repo existiert): `npm run discord:secrets <besitzer/repo>`.
  Überträgt Bot-Token, Webhooks, Server-ID und Ping-Rollen, ohne sie anzuzeigen. Dann laufen News-Posts, Cheat des Tages und Badges automatisch.
- **Website-Link:** Das Setup trägt den Einladungslink automatisch in `src/config.ts` ein. Ab 100 Mitgliedern zeigt die Website die Live-Zahl.

## Was automatisch passiert

| Was | Wann | Wo |
|---|---|---|
| Bestätigte News mit Button zur Website | sofort, alle 20 Min. geprüft | #gta6-news, #online-news, #gta-news |
| Ping @News-Alarm | nur bei Breaking News | wer die Rolle gewählt hat |
| Gelbe News zur Freigabe | sofort | privat in #freigaben |
| Cheat des Tages mit Link zur Cheat-Seite | täglich 18 Uhr | #cheats-und-tricks |
| Badge ⭐ OG (erste 1.000) und 🌴 Day One | stündlich | automatisch |
| Spam-, Scam- und Einladungs-Schutz | immer | Discord AutoMod, Meldungen in #mod-log |

## Wachstums-Hebel, die schon eingebaut sind

- **Folgbare News-Kanäle:** Andere Server können #gta6-news „folgen“. Unsere News (mit Link zur Website) erscheinen dann dort.
- **Einladung pro Quelle** (Website, Pinterest, YouTube, TikTok, Instagram, Partner): In Servereinstellungen → Einladungen siehst du, welche Quelle wie viele Leute bringt. Codes stehen in `discord/state.json`.
- **OG-Knappheit:** Website zeigt „Noch X von 1.000 OG-Plätzen frei“.
- **Website ↔ Discord-Schleife:** Hilfe-Forum-Lösungen und Screenshot der Woche landen mit Credit auf der Website und auf Pinterest. Das bringt Inhalte und Besucher zurück.
- **Discovery:** Ab 1.000 Mitgliedern (und ein paar Wochen Alter) kann der Server in Discords eigener Server-Suche erscheinen (Servereinstellungen → Discovery).
- **Server-Tag:** Mit 3 Boosts bekommen Mitglieder ein Server-Abzeichen neben ihrem Namen, auch in anderen Servern. Das ist Gratis-Werbung.

## Nachtrag 17.11.2026, abends: Sterne und Guide-Helfer automatisch

Ersetzt den Hinweis oben zum Level-Bot (Arcane). Kein fremder Level-Bot nötig, alles läuft im stündlichen Job (`node discord/daily.mjs badges`, Code in `discord/levels.mjs`).

| Was | Wann | Wo |
|---|---|---|
| Sterne ★ bis ★★★★★★ nach Aktivität | stündlich | automatisch, Aufstiege ab ★★ in #bot-befehle |
| 🧭 Guide-Helfer (Name im Artikel unter `helpers`) | stündlich | automatisch |

- **Sterne:** Gezählt wird höchstens 1 Nachricht pro Minute und Mitglied (Text-Kanäle, Ankündigungen, aktive Threads und Forum-Beiträge). Schwellen stehen in `blueprint.mjs` (Feld `xp`): 1 ★ Taschendieb · 25 ★★ Autoknacker · 100 ★★★ Gangster · 250 ★★★★ Heist-Profi · 600 ★★★★★ Staatsfeind · 1500 ★★★★★★ Legende. Jedes Mitglied trägt nur den höchsten Stern, es gibt keinen Abstieg (auch nicht bei von Hand vergebenen Sternen).
- **Punktestand:** liegt als Datei `aktivitaet.json` im privaten Team-Kanal #bot-daten, nicht im öffentlichen Repo. Der Bot behält die neueste Datei und zwei ältere als Sicherung. Diese Nachrichten nicht löschen. Ist die Datei da, aber nicht lesbar, bricht der Job ab, statt mit null Punkten neu anzufangen.
- **Guide-Helfer:** Im Frontmatter des Artikels eintragen, dann gibt es die Rolle automatisch und unter dem Artikel steht „Danke an die Crew“:
  ```yaml
  helpers:
    - name: "Anzeigename"
      discord: "nutzername"   # Discord-Nutzername oder ID
  ```
- **Script-Kunde:** später über Tebex (Shop für RP-Scripts), das die Discord-Rolle beim Kauf selbst vergibt.
- **Prüfen:** `node discord/daily.mjs badges --dry-run` zeigt, was der Job tun würde, ohne etwas zu ändern. `node discord/roles.mjs` zeigt die Rollen-Reihenfolge.
