# Principles of Coding — TypeScript (Die Materialkunde)

TypeScript ist die Festlegung von Materialeigenschaften. Du definierst die Härte und Faserung des Holzes, damit die Konstruktion stabil bleibt.

* **Typen als Domänenmodell:** Typen sind keine Formalität für den Compiler, sondern die mathematische Beschreibung deiner Fachlogik.
* **Make Impossible States Impossible:** Nutze *Discriminated Unions*, damit fehlerhafte Zustände gar nicht erst typisierbar sind (z. B. `{ status: 'success', data: T } | { status: 'error', error: Error }` statt optionaler Flags).
* **Typableitung vor Redundanz:** Lass den Compiler arbeiten (`infer`, `typeof`, Generics), anstatt alles manuell dreifach zu definieren.
* **Strikte Grenzen:** `any` ist verboten; `unknown` zwingt zur Validierung an Systemgrenzen (API-Responses, User-Input). Typensicherheit endet an den Rändern, wenn sie nicht dort explizit erzwungen wird (z. B. via Zod/Valibot).
