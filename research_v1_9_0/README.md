# Funkcionalna kaskada: model 1.2.8 in podatki 1.9.0

Lokalna revizija, označena kot izdaja 1.2.8 dne 12. septembra 2026. Ni objavljena na spletnih straneh projekta.

## Bistveni sklep

Izguba ekosistemske funkcije ni isto kot izginotje vseh organizmov. Nova različica zato opredeli funkcionalno odpoved in omogoča usmerjeno širjenje iz enega začetnega dogodka. Ne zahteva, da bi pred sprožitvijo odpovedale vse tri administrativne domene.

To je izboljšava izrecnosti in notranje logike scenarijskega modela, ne dokaz pravilnega datuma globalnega kolapsa. Literatura podpira mehanizme, ne določa vseh uporabljenih ocen, uteži in časovnih preslikav. P90 je kvantil časa do opredeljenega modelnega dogodka, ne fizikalni prag.

Opredelitev ekosistemskega kolapsa preko značilne strukture in procesov, ne izumrtja vseh vrst, podpira [Keith in sod., 2013, PLOS ONE](https://doi.org/10.1371/journal.pone.0062111). Podnebne vplive in trofično ojačanje sprememb morske biomase obravnavajo [Lotze in sod., 2019, PNAS](https://doi.org/10.1073/pnas.1900194116). Iz teh raziskav ne sledi določen globalni datum zloma; prav tako ne potrjujeta numeričnih koeficientov te ure. Novejši institucionalni in primarni viri so sledljivi v registru JSON, z mehanizmi in omejitvami posameznih ocen.

## Datoteke in uporaba

- [Novi JSON](../data_v1_9_0_functional.json): 23 groženj, osem osnovnih metrik, 184 vnosov, 23 funkcionalnih profilov in 61 različnih virov. Funkcionalni koeficienti so dodatni modelni parametri, ne vključeni v število 184.
- [Ura](../index.html): nova različica podatkov je že vgrajena; dodatni uvoz ni potreben. Potrebna je celotna mapa z `src` in `vendor`, ne le samostojni HTML.
- [Jedro kaskade](../src/cascade-model.js), [aplikacijska integracija](../src/app.js), [celotna metodologija](../docs/METHODOLOGY.md), [omejitve](../docs/LIMITATIONS.md).
- Varnostna kopija prejšnje aplikacije: `backups/pre-functional-cascade-2026-09-09`. Izvirna JSON 1.7.1 in 1.8.0 sta ohranjena, ne prepisana.

Za lokalni predogled iz korena mape: `python -m http.server 8766 --bind 127.0.0.1`, nato `http://127.0.0.1:8766/index.html`. Za ponovitev raziskovalnega preverjanja: `node research_v1_9_0/verify.cjs`. Običajna regresija: `npm test`.

## Kaj je dejansko spremenjeno

1. Funkcionalne definicije: morski sistem lahko izgubi trofične, obnovitvene in prehranske funkcije ob preostali biomasi. Zabeležen je prvi prehod praga, ne trajanje, dokončno uničenje ali nezmožnost obnove.
2. Usmerjena odvisnost: ob odpovedi vira se po deklariranem zamiku zmanjša podporna zmogljivost cilja. Cilj se sproži, ko lastni pritisk skupaj z izgubo podpore doseže njegov prag. Oznaka `>2100` pri samostojnem dogodku ne izključi sprožitve po drugi poti.
3. Ločene uteži: MCDA prioriteta, vhodna ranljivost in funkcionalna kritičnost niso več ista količina. Kritičnost uporablja fiksne stopnje 1/2/3; odvisnosti imajo enake deleže med navedenimi starši. To je pregledna, groba presoja, ne empirično optimiziran nabor uteži.
4. Nezamenljive funkcije: globalni delež ali delež v katerikoli košarici bistvenih funkcij lahko doseže sprožilni prag. Dobra ocena ene funkcije zato ne izniči izgube druge. Oceani in biodiverziteta se v skupini `ecosystem_integrity` ne seštevajo dvakrat.
5. Rast: opuščena je neposredna preslikava rasti izbranih kazalnikov v rast sistemskega tveganja. Štirje eksplicitni razredi opisujejo predpostavljeno rast latentnega funkcionalnega pritiska. Pozitivna rast in njena negotovost ostajata scenarijski predpostavki.
6. Posebni začetni dogodki: generična izguba podporne zmogljivosti sama ne ustvari jedrske vojne, sprostitve inženirskega patogena, pandemije ali uporabe avtonomnega orožja. Ti štirje vozli niso odstranjeni: ohranijo spontane procese, agregiranje in vpliv na druge po aktivaciji. Posebni mehanizmi spreminjanja njihove verjetnosti niso empirično modelirani.
7. Sledljivost: izvoz vsebuje ločene samostojne in propagirane horizonte, uporabljene uteži, zamike, definicije in vzročno sled. Obstoječi ključi ostanejo, nove informacije so dodane.

## Izračun in občutljivost

Osnovna konfiguracija: Baseline, Expert, seme `AC-1.2.6-2026`, 3000 simulacij. Prejšnji model je bil ponovno zagnan iz varnostne kopije; ne gre le za prepis stare številke.

| Model / podatki | P10 | P50 | P90 |
| --- | ---: | ---: | ---: |
| Arhivirani 1.2.7 / 1.7.1 | 2037 | 2041 | 2046 |
| Novi 1.2.8 / 1.9.0 | 2033 | 2036 | 2043 |

Nov rezultat je prag funkcionalnih motenj po propagaciji, ne dokončan globalni zlom. Dva zaporedna celotna Monte Carlo rezultata z istim semenom sta bila enaka. Pri obeh referencah ni bilo cenzuriranih agregatnih prehodov do 2100; posamezne grožnje lahko ostanejo cenzurirane.

Strukturna občutljivost, 1000 simulacij na nastavitev, isto seme in iste naključne vhodne realizacije za primerljive posege:

| Nastavitev | P50 | P90 |
| --- | ---: | ---: |
| Referenčna funkcionalna pravila | 2037 | 2043 |
| Brez dodatnega prenosa odpovedi | 2037 | 2044 |
| Ničletni zamik | 2036 | 2043 |
| Petletni zamik | 2037 | 2044 |
| Enake kritičnostne uteži | 2037 | 2043 |
| Samo globalni delež, brez sprožilca posamezne funkcije | 2047 | 2060 |
| Sprožilni delež 0,35 | 2036 | 2043 |
| Sprožilni delež 0,65 | 2038 | 2046 |

Pravilo ključnih funkcij ima tukaj večji vpliv na glavni datum kot dodatna propagacija. Ekološka košarica vsebuje dve skupini z utežjo 3: podnebje ter ekosistemsko integriteto. Že ena doseže privzeti delež 0,50. Zato zgodnjega naslova ni pošteno razlagati kot dokaz, da je model napovedal večstopenjski globalni kolaps. Gre za močno in razkrito agregacijsko predpostavko.

Dve alternativni semeni pri 1000 simulacijah dasta P50 2036 in P90 2042 oziroma 2043. Ta omejena preveritev stabilnosti ni dokaz konvergence vseh repov ali znanstvene kalibracije. Razlika med 1000 in 3000 simulacijami ni fizikalna sprememba.

Samostojni in propagirani P50 pri osnovnih 3000 simulacijah:

| Funkcija/grožnja | Samostojno | S prenosom |
| --- | ---: | ---: |
| Oceani | 2057 | 2038 |
| Biodiverziteta | 2050 | 2044 |
| AMR | 2059 | 2048 |
| Oskrba | 2052 | 2041 |

Ti datumi pokažejo odziv modela na predpostavke, ne literature-reported napovedi. Pri stresnem primeru, kjer je samo morski začetek umetno postavljen v 2030 in so drugi samostojni dogodki postavljeni izven horizonta, se aktivirajo tudi kopenski oskrbni in družbeni vozli. Časi v tej prisiljeni vzročni sledi so demonstracija pravil, ne nova napoved.

## Preverjanje in odprte omejitve

- Stroga validacija: vseh 184 intervalov, 23 profilov, dovoljeni izvori povezav, normalizacija uteži, celoštevilski zamiki, neposredna rast in bajtno enaki JSON-bloki obeh HTML po izločitvi zunanjih presledkov.
- 16 čistih kaskadnih testov: en začetni dogodek, cenzurirani cilji, usmerjenost, cikli, neodvisnost od vrstnega reda, monotonost, meje, zamiki, prekrivanje in posebni začetni dogodki.
- Brskalniška integracija: vsi scenariji in profili, dejanski uvoz, starejši podatki, skladnost razlage z izračunom ter JSON/CSV prenosi. Kontrolni panel mora biti pred klikom odprt; začetni test je to preskočil. Preverjeno je, da navaden klik po odprtju deluje tako v arhivirani kot novi aplikaciji.
- Celotni prvi regresijski zagon: 38/40; dva časovna izteka ob petih sočasnih brskalnikih. Odstranjeno je nepotrebno ponovno računanje nespremenjenih agregatnih deležev; testna sočasnost je omejena na dva procesa. Rezultati in pragovi zaradi tega niso spremenjeni. Končni status je v `final-validation.json`.
- Živi pregled 89 URL je zabeležen v `live-link-validation.json`: 11 odgovorov HTTP 403 in dva HTTP 404 pri korenskih naslovih za predhodno povezovanje s pisavami. To ni PASS dostopnosti vseh virov; HTTP 403 sam ne dokazuje napačne vsebine vira. Oblika vseh URL je veljavna.
- Vizualno pregledana namizna in mobilna zgornja stran. To ni popolna dostopnostna ali večbrskalniška revizija.

Samostojne časovne/hazardne enačbe in začetna odvisnost `depFactor` so ohranjene, ne na novo empirično umerjene. Pozitivni trendi, fiksni pragovi, grobe funkcionalne skupine, enaki koeficienti, preostalo prekrivanje kategorij ter odsotnost trajanja in obnove omejujejo interpretacijo. Ni dokazano, da je kateri nabor uteži edinstveno najboljši. Nobeno število uspešnih testov ne nadomesti te manjkajoče znanstvene identifikacije.

## Sledljivost preverjanja

[runtime-validation.json](runtime-validation.json) ohranja prvi celotni primerjalni zagon in njegov začetni SHA-256. Po njem je bila popravljena samo opisna merska enota v metapodatkih JSON, zato končni celotni SHA-256 ni enak; številčne vrednosti, funkcionalni profili in enačbe se s tem niso spremenili. Končni SHA-256 in status preverjanj sta v `final-validation.json` in [validation.json](validation.json). Raziskovalne fragmente, sestavljalnik in prvotna podatka je mogoče neodvisno pregledati.
