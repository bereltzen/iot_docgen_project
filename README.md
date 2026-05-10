# 🚀 IoT-DocGen: Automatikus API Dokumentáció Generáló

**Készítette:** Papp Bercel 
**Tantárgy:** Prompt Engineering 

## 📝 A Projekt Célja
Az IoT (Internet of Things) eszközök gyakran hiányos, szétszórt, vagy nem szabványos dokumentációval rendelkeznek. Az **IoT-DocGen** egy olyan automatizált pipeline, amely képes beolvasni egy IoT eszköz nyers, "rendetlen" fájljait (JSON konfigurációk, nyers Python kód részletek, fejlesztői jegyzetek), és egy Nagy Nyelvi Modell (Google Gemini) segítségével automatikusan szintetizál belőlük egy letisztult, ember által olvasható, OpenAPI/Swagger-szabványhoz hasonló Markdown dokumentációt.

## 🧠 Alkalmazott Prompt Engineering Technikák
A projekt megvalósítása során a "vakon promptolás" (Megaprompting) helyett tudatos, strukturált Prompt Engineering technikákat alkalmaztam:

1. **Task Decomposition (Feladatlebontás):** A szoftver fejlesztését és a promptolást 5 elkülönített logikai lépésre bontottam (Tervezés -> Adatgenerálás -> Rendszerprompt írás -> API integráció -> CLI orchestráció). Ezzel sikeresen elkerültem a modell hallucinációját és a minőségromlást.
2. **Role Prompting (Perszóna adása):** A meta-promptban a modell megkapta a *"Senior API Architect"* és *"Expert Technical Writer"* perszonákat, ami drasztikusan javította a generált dokumentáció szakmai szóhasználatát és struktúráját.
3. **Delimiters (Határolók használata):** A nyers adatok beolvasásakor a Python kód explicit `--- BEGIN FILE: [név] ---` határolókkal (delimiters) izolálja a fájlokat, így az LLM kontextusablakában nem folynak össze a különböző típusú adatok (kód vs. text).
4. **Negative Constraints (Negatív korlátok):** A meta-prompt szigorúan megtiltja a modellnek az "üres fecsegést" (*conversational filler*), így a kimenet nyers, programozottan fájlba menthető Markdown formátum lett.
5. **Inference Guidelines (Következtetési irányelvek):** A prompt külön utasítja a modellt a szintézisre (pl. kösse össze a kód részletet a jegyzetben lévő jelszóval), ezáltal a modell nem csak formáz, hanem logikailag is kiegészíti a hiányzó részeket.
6. **Parameter Tuning:** A Gemini API hívásakor a `temperature` paramétert `0.1`-re állítottam a determinisztikus, tényszerű eredmény érdekében, kizárva az AI "kreatív képzelgését".

## 🛠️ Mérnöki Kihívások és Megoldások
A projekt fejlesztése során valós, iparági problémákkal szembesültem, amiket az alábbi módon hidaltam át:

* **SDK Migráció (FutureWarning):** A kezdeti LLM tervezés során a modell az elavulóban lévő `google.generativeai` csomagot javasolta. A hibaüzenetek alapján felismerve az elavulást, a kódot sikeresen refaktoráltam a legújabb, modern `google-genai` SDK-ra.
* **EU-s API Kvótakorlátok (429 Resource Exhausted) - A Hibrid Megoldás:** Az európai adatvédelmi szabályozások miatt a Google Free Tier API kvótája limitált (0 request/perc). Az architektúra fel van készítve az automatikus hálózati API hívásra (`llm_client.py`), de a kvótakorlát miatt az utolsó lépés egy intelligens **Hibrid pipeline-ra** lett átalakítva: a program automatikusan szintetizálja és a terminálba generálja a meta-promptot a nyers fájlokkal, amelyet a hivatalos webes UI-on beküldve kapjuk meg a végső dokumentációt.

## 📂 Projekt Struktúra

```text
📦 iot_docgen_project
 ┣ 📂 mock_data/              # Az IoT eszköz nyers, feldolgozandó fájljai
 ┃ ┣ 📜 device_config.json
 ┃ ┣ 📜 extra_notes.txt
 ┃ ┗ 📜 handler_snippet.py
 ┣ 📂 docs/                   # Ide kerül a generált Markdown fájl
 ┃ ┗ 📜 device_api.md         # A végeredmény
 ┣ 📜 input_reader.py         # 1. Beolvassa és izolálja a nyers fájlokat
 ┣ 📜 prompt_builder.py       # 2. Felépíti a meta-promptot a határolókkal
 ┣ 📜 llm_client.py           # 3. Gemini API hálózati kliens (google-genai)
 ┣ 📜 output_writer.py        # 4. Fájl mentéséért felelős modul
 ┣ 📜 main.py                 # CLI Orchestrator, ami összefogja a pipeline-t
 ┣ 📜 requirements.txt
 ┗ 📜 README.md
