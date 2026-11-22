// Lernfelder per trade and their mapping to topic modules.
// Lernfeld titles are copied from the KMK Rahmenlehrpläne in the version of 23.02.2018
// (kmk.org download list, read on 2026-11-22). Note: the Handwerk trade "Elektroniker/-in"
// (2020) has different titles; do not mix the two plans.
// MECH LF 4: the KMK PDF prints the title without "pneumatischen" although the content of the
// Lernfeld covers pneumatics. TODO(verify): owner to confirm against the school's plan.

export type L10n = { de: string; en: string };
export type TradeId = 'EAT' | 'MECH' | 'IM';

export const trades: { id: TradeId; name: L10n; short: string }[] = [
  { id: 'EAT', short: 'EAT', name: { de: 'Elektroniker/-in für Automatisierungstechnik', en: 'Electronics technician for automation technology' } },
  { id: 'MECH', short: 'MECH', name: { de: 'Mechatroniker/-in', en: 'Mechatronics technician' } },
  { id: 'IM', short: 'IM', name: { de: 'Industriemechaniker/-in', en: 'Industrial mechanic' } },
];

export const modules: Record<string, L10n> = {
  M01: { de: 'Elektrotechnische Grundlagen', en: 'Electrical fundamentals' },
  M02: { de: 'Messen und Prüfen', en: 'Measuring and testing' },
  M03: { de: 'Elektroinstallation und Schutzmaßnahmen', en: 'Electrical installation and protection' },
  M04: { de: 'Elektrische Sicherheit prüfen', en: 'Testing electrical safety' },
  M05: { de: 'Steuerungstechnik und Schützschaltungen', en: 'Control basics and contactor circuits' },
  M06: { de: 'Digitaltechnik und Kleinsteuerungen', en: 'Digital logic and small controllers' },
  M07: { de: 'SPS-Programmierung', en: 'PLC programming' },
  M08: { de: 'Sensoren und Aktoren', en: 'Sensors and actuators' },
  M09: { de: 'Pneumatik und Hydraulik', en: 'Pneumatics and hydraulics' },
  M10: { de: 'Antriebstechnik', en: 'Drive technology' },
  M11: { de: 'IT und industrielle Kommunikation', en: 'IT and industrial communication' },
  M12: { de: 'Regelungstechnik', en: 'Closed-loop control' },
  M13: { de: 'Inbetriebnahme, Instandhaltung und Fehlersuche', en: 'Commissioning, maintenance and fault-finding' },
  M14: { de: 'Mechanische Grundlagen', en: 'Mechanical fundamentals' },
  M15: { de: 'Fertigungstechnik', en: 'Manufacturing' },
  M16: { de: 'Technische Mathematik und Physik', en: 'Technical mathematics and physics' },
};

export interface Lernfeld {
  year: number;
  lf: number;
  title: string;
  modules: string[];
}
const lf = (year: number, n: number, title: string, ...m: string[]): Lernfeld => ({ year, lf: n, title, modules: m });

export const lernfelder: Record<TradeId, Lernfeld[]> = {
  EAT: [
    lf(1, 1, 'Elektrotechnische Systeme analysieren und Funktionen prüfen', 'M01', 'M02', 'M16'),
    lf(1, 2, 'Elektrische Installationen planen und ausführen', 'M03', 'M04'),
    lf(1, 3, 'Steuerungen analysieren und anpassen', 'M05', 'M06'),
    lf(1, 4, 'Informationstechnische Systeme bereitstellen', 'M11'),
    lf(2, 5, 'Elektroenergieversorgung und Sicherheit von Betriebsmitteln gewährleisten', 'M03', 'M04'),
    lf(2, 6, 'Anlagen analysieren und deren Sicherheit prüfen', 'M04', 'M08', 'M13'),
    lf(2, 7, 'Steuerungen für Anlagen programmieren und realisieren', 'M07', 'M08'),
    lf(2, 8, 'Antriebssysteme auswählen und integrieren', 'M10'),
    lf(3, 9, 'Steuerungssysteme und Kommunikationssysteme integrieren', 'M07', 'M11'),
    lf(3, 10, 'Automatisierungssysteme in Betrieb nehmen und übergeben', 'M12', 'M13'),
    lf(3, 11, 'Automatisierungssysteme in Stand halten und optimieren', 'M12', 'M13'),
    lf(4, 12, 'Automatisierungssysteme planen', 'M13'),
    lf(4, 13, 'Automatisierungssysteme realisieren', 'M13'),
  ],
  MECH: [
    lf(1, 1, 'Analysieren von Funktionszusammenhängen in mechatronischen Systemen', 'M14', 'M16'),
    lf(1, 2, 'Herstellen mechanischer Teilsysteme', 'M14', 'M15'),
    lf(1, 3, 'Installieren elektrischer Betriebsmittel unter Beachtung sicherheitstechnischer Aspekte', 'M01', 'M02', 'M03', 'M04'),
    lf(1, 4, 'Untersuchen der Energie- und Informationsflüsse in elektrischen und hydraulischen Baugruppen', 'M05', 'M09'),
    lf(1, 5, 'Kommunizieren mit Hilfe von Datenverarbeitungssystemen', 'M11'),
    lf(2, 6, 'Planen und Organisieren von Arbeitsabläufen', 'M13'),
    lf(2, 7, 'Realisieren mechatronischer Teilsysteme', 'M06', 'M07', 'M08', 'M09'),
    lf(2, 8, 'Design und Erstellen mechatronischer Systeme', 'M07', 'M09', 'M10'),
    lf(3, 9, 'Untersuchen des Informationsflusses in komplexen mechatronischen Systemen', 'M07', 'M11'),
    lf(3, 10, 'Planen der Montage und Demontage', 'M14'),
    lf(3, 11, 'Inbetriebnahme, Fehlersuche und Instandsetzung', 'M12', 'M13'),
    lf(4, 12, 'Vorbeugende Instandhaltung', 'M13'),
    lf(4, 13, 'Übergabe von mechatronischen Systemen an Kunden', 'M13'),
  ],
  IM: [
    lf(1, 1, 'Fertigen von Bauelementen mit handgeführten Werkzeugen', 'M14', 'M15', 'M16'),
    lf(1, 2, 'Fertigen von Bauelementen mit Maschinen', 'M15'),
    lf(1, 3, 'Herstellen von einfachen Baugruppen', 'M14'),
    lf(1, 4, 'Warten technischer Systeme', 'M13', 'M01'),
    lf(2, 5, 'Fertigen von Einzelteilen mit Werkzeugmaschinen', 'M15'),
    lf(2, 6, 'Installieren und Inbetriebnehmen steuerungstechnischer Systeme', 'M05', 'M09'),
    lf(2, 7, 'Montieren von technischen Teilsystemen', 'M14'),
    lf(2, 8, 'Fertigen auf numerisch gesteuerten Werkzeugmaschinen', 'M15'),
    lf(2, 9, 'Instandsetzen von technischen Systemen', 'M13'),
    lf(3, 10, 'Herstellen und Inbetriebnehmen von technischen Systemen', 'M09', 'M13'),
    lf(3, 11, 'Überwachen der Produkt- und Prozessqualität', 'M14'),
    lf(3, 12, 'Instandhalten von technischen Systemen', 'M13'),
    lf(3, 13, 'Sicherstellen der Betriebsfähigkeit automatisierter Systeme', 'M07', 'M09', 'M12'),
    lf(4, 14, 'Planen und Realisieren technischer Systeme'),
    lf(4, 15, 'Optimieren von technischen Systemen'),
  ],
};
