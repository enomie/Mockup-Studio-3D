# Principles of Coding — General (Das Tischler-Fundament)

Dieses Dokument definiert die Denkweise, das Handwerk und den Lebenszyklus jeder Aufgabe. Es enthält keine einzige Zeile konkreten Code.

## Phase A: Das Briefing & die Statik (Bevor gesägt wird)

* **Problem vor Lösung:** Welches Problem wird gelöst? Welcher Zustand soll erreicht werden? Wenn die Anforderung unklar ist, wird kein Code geschrieben.
* **Invarianten & Randbedingungen:** Was darf unter keinen Umständen passieren? (z. B. Ein Stuhl darf nicht unter 120 kg brechen; ein System darf niemals inkonsistente Zustände speichern).
* **Datenfluss & Single Source of Truth:** Wo existiert die Realität? Daten fließen in eine Richtung. Zustände werden nicht synchronisiert, sondern abgeleitet.

## Phase B: Die Konstruktion (Design & Modularität)

* **KISS & YAGNI:** Kein Schnitzwerk an den Stuhlbeinen, solange der Stuhl noch wackelt. Baue nur, was jetzt getragen werden muss.
* **Entkopplung & Schnittstellen:** Zapfen und Zapfenloch. Teile müssen tauschbar sein, ohne die restliche Konstruktion zu beschädigen (Dependency Inversion, lose Kopplung).
* **Idempotenz & Vorhersehbarkeit:** Gleicher Input, gleicher Output. Keine versteckten Seiteneffekte hinter dem Rücken des Aufrufers.

## Phase C: Die Ausführung & Fehlerkultur

* **Fail Fast:** Wenn ein Teil nicht passt, wird es nicht mit Gewalt reingeprügelt. Fehler müssen sofort, laut und nachvollziehbar knallen, anstatt still weiterzulaufen.
* **Wartbarkeit vor Cleverness:** Schreibe Code für den Menschen, der ihn in 2 Jahren bei Nacht warten muss. Lesbarkeit schlägt clevere Einzeiler.
* **Aufräumen (Lifecycle):** Was geöffnet wird, wird geschlossen. Was allokiert wird, wird freigegeben (Memory, Listener, File Handles).
