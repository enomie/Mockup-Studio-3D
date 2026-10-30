# Principles of Coding

Der Grund, warum viele KIs hier versagen, ist simpel: Sie sind auf riesigen Mengen isolierter Code-Snippets trainiert. Sie sehen Syntax und Framework-APIs, aber nicht das **Handwerk** dahinter. Sie fangen an zu hobeln, bevor die Maße stimmen, oder leimen Teile zusammen, ohne die Faserrichtung des Holzes zu beachten.

Deine Analogie zum Tischler trifft es exakt: Es gibt universelle Gesetze von Statik, Materialspannung, Vorbereitung und Verbindungstechnik. Das Framework ist am Ende nur die Wahl des Werkzeugs (Stecheisen vs. Fräse) oder des Holzes (Eiche vs. Kiefer).

Hier ist der Blueprint für deine Dokumentenstruktur – vom universellen Handwerk bis in die tiefe Spezialisierung.

---

## Dokumente

1. [`Principles-of-coding-general.md`](Principles-of-coding-general.md) — Das Tischler-Fundament
2. [`Principles-of-coding-typescript.md`](Principles-of-coding-typescript.md) — Die Materialkunde
3. [`Principles-of-coding-react.md`](Principles-of-coding-react.md) — Die Mechanik & Montage
4. [`Principles-of-coding-three-js.md`](Principles-of-coding-three-js.md) — Das Bühnenbild & die Physik des Lichts
5. [`Principles-of-coding-rapier-js-simd.md`](Principles-of-coding-rapier-js-simd.md) — Das mechanische Getriebe / High Performance

---

### Wie du diese Dokumente für KIs nutzbar machst

Damit ein LLM diese Docs tatsächlich versteht und nicht ignoriert:

1. **Formuliere es als Negativ- und Positivregeln:** Schreibe nicht nur *"Nutze klare Typen"*, sondern: *"Wenn Zustand A existiert, darf Feld B nicht optional sein, sondern muss über eine Union ausgeschlossen werden."*
2. **Verknüpfe die Ebenen hierarchisch:** Im React-Doc referenzierst du auf das General-Doc: *"Beachte das Fail-Fast- und Idempotenz-Prinzip aus General.md bei der Hook-Konstruktion."*
3. **Kompakte 'Do / Don't'-Listen:** KIs reagieren extrem gut auf tabellarische Gegenüberstellungen von Anti-Patterns und Best Practices.
