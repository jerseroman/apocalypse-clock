# Podatkovna revizija 1.8.0

Končna datoteka: [data_v1_8_0_evidence_revision.json](../data_v1_8_0_evidence_revision.json). Presečni datum raziskave: 9. september 2026.

Vsebuje 23 groženj × 8 parametrov = 184 zapisov in 58 različnih odprtih virov. Prednost imajo primarne raziskave ter uradna znanstvena in institucionalna poročila; starejše raziskave so ohranjene, kadar bolje podpirajo relevantni mehanizem. Datum objave ni nujno leto meritev. To je ciljni medpodročni pregled, ne izčrpen sistematični pregled literature.

## Kaj pomenijo ocene

Vseh 184 zapisov je označenih `anchored_judgment`: številke so analitične modelne ocene, oprte na navedene vire. Viri praviloma ne objavijo neposredno ocen za lestvice te aplikacije. `lo` in `hi` sta meji presojenega verjetnega razpona, ne empirična intervala zaupanja. Pragovi ostajajo modelna sidra; iz njih ni mogoče neposredno sklepati na leto dejanskega globalnega zloma.

Pri rasti je 10 osrednjih vhodov zasidranih v poročanih kazalnikih, 12 je izrecno presojenih nadomestnih kazalnikov pritiska, eden pa sprememba objavljenih ocen jedrskih zalog. Slednja vključuje ponovno ocenjevanje in zato ni identificirana fizična rast zalog. Pri vesoljskih objektih je začetni datum približen. Pri razseljevanju je upad priznan; pozitivna spodnja meja je omejitev obstoječega modela, ne dokaz slabšanja.

Surovi vhod, izpeljava, razpon in omejitve so navedeni v `_meta.growth_inputs`. Pretvorba je `max(0.0005, min(log1p(raw) * multiplier, cap))`. Množilniki in omejitve so ohranjene modelne konvencije, ne na novo empirično ocenjeni koeficienti. Shranjenih `mu/lo/hi` se ne pretvarja ponovno.

Glede na uporabnikovo datoteko 1.7.1 je spremenjenih 183 trojic `lo/mu/hi`, od tega 168 osrednjih vrednosti. Noben izhodni letnik ni bil ciljan ali uporabljen za prilagajanje ocen.

## Preverjanje in učinek na obstoječo aplikacijo

Strukturni pregled in dejanski uvoz v obstoječo aplikacijo sta uspešna: ohranjenih je vseh 552 številčnih vrednosti in 23 pravil pretvorbe/omejitve rasti. Ponovitev z istim semenom je identična. Dodatni semeni sta omejen preizkus numerične stabilnosti, ne dokaz konvergence.

Osnovni scenarij, profil Expert, časovni izvor 2026, seme `AC-1.2.6-2026`, 3000 simulacij; prikazan je modelni izhod Dynamic Cascade:

| Podatki | P10 | P50 | P90 | Brez doseženega praga do 2100 |
| --- | ---: | ---: | ---: | ---: |
| Vgrajena različica 1.7.1 | 2037 | 2041 | 2046 | 0 % |
| Nova različica 1.8.0 | 2051 | 2069 | >2100 | približno 17 % |

Pri dveh dodatnih semenih s po 1000 simulacijami je P50 2068 oziroma 2069, P90 pa obakrat >2100. To so modelno pogojeni rezultati, ne preverjene napovedi. Interna vrednost 2101 označuje desno cenzuriranje, ne izračunanega dogodka v letu 2101. Primerjava uporablja nespremenjeni lokalni računski mehanizem; med revizijami niso spremenjeni scenariji, uteži ali časovni izvor.

Obstoječa podatkovna datoteka, oba HTML-vložka in numerično jedro niso prepisani. Nova datoteka ni objavljena ali nastavljena kot privzeta. Uporabi se z obstoječim uvozom JSON.

## Sledljivost

- `validation.json`: struktura, štetje, spremembe in SHA-256 končne datoteke.
- `runtime_validation.json`: dejanski uvoz, semena, rezultati in kontrolne vsote nespremenjenih aplikacijskih datotek.
- `assemble.py`: ponovljiva sestava, skupne metodološke dopolnitve in preverjanje formul.
- Trije področni JSON-i: raziskovalni vhodni fragmenti. Za uporabo je merodajna sestavljena končna datoteka; ta vključuje naknadna preverjanja in popravke razlag.
- `runtime_probe.cjs`: ponovljiv preizkus z obstoječim brskalniškim mehanizmom.

Raziskovalne naloge so bile izvedene s tremi agenti `gpt-6-astra`, stopnja razmišljanja `ultra`. Tehnični uspeh preverjanj ne pomeni empirične kalibracije ali potrjene napovedne veljavnosti.
