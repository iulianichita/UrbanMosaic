## Urban Mosaic

Proiectul *Urban Mosaic* reprezintă o explorare interactivă a vieților surprinse prin ferestrele unei clădiri de locuințe. Proiectul a fost inspirat din ideea că un spațiu comun adăpostește atâtea vieți diferite, iar utilizatorul își asumă rolul de observator al lor, având ocazia de a le analiza pe fiecare printr-o fereastră. Inițial, utilizatorul este poziționat în fața clădirii, iar printr-un `click stânga` pe orice fereastră dorită, camera respectivă este adusă în prim-plan, iar observatorul poate observa lumea din interior. Cadrul poate fi observat și din alte unghiuri prin accesarea `click dreapta + drag` și poate fi apropiat/depărtat prin accesarea `click dreapta + scroll`.

### Tehnologii și limbaje folosite

- HTML5: utilizat pentru crearea structurii de bază a aplicației
- CSS3: folosit pentru eliminarea marginilor implicite ale browser-ului (`margin: 0`), ascunderea scrollbar-ului (`overflow: hidden`) și asigurarea acoperirii integrale a ecranului a elementului Canvas (`100vw/vh`)
- JavaScript: utilizat pentru gestionarea logicii matematice și crearea animaților
- Node.js: rularea serverului local
- Pure Data Visual Programming: utilizat pentru generarea procedurală a sunetului ambiental

### API-uri și librării

- Three.js: biblioteca principală bazată pe API-ul WebGL, utilizată penru randarea geometriei 3D, gestionarea camerelor, luminilor și a materialelor din scenă
- GLTFLoader (Three.js Extension): API dedicat încărcării și parsării asincrone a modelelor 3D (fișiere `.glb`)
- PureData: mediu de programare vizuală pentru generarea sunetelor, adaptate interacțiunii utilizatorului
- WebSockets API (Modulul `ws`): protocol de comunicare bidirecțională utilizat pentru transmiterea instantanee a comenzilor din browser (`START_BACKGROUND`, `ENTER_ROOM`, `EXIT_ROOM`) către serverul audio local
- WebXR (Modulul `webxr.js`): activează suportul WebXR pentru randare în VR și adaugă un sistem de control al camerei de tip mouse look pentru desktop

### Features
- Atmosferă nocturnă
  - Cer nocturn creat cu Custom Shaders, generat nativ prin cod programat in GLSL ce creează un gradient din 4 nuanțe distincte (`topColor`, `middleColor`, `horizonColor`, `bottomColor`) cu proprietatea `mix`
  - Sistem statificat de stele creat prin randare optimzată a 6200 de stele cu ajutorul `THREE.Points`; pentru realism stelele au fost împărțite in 2 straturi ce crează o senzație naturală de adâncime, folosind tehnica *additive blending*
- Iluminare tridimensională: scena folosește o combinație de lumină ambientală nocturnă (`THREE.AmbientLight`), lumină direcțională (`THREE.DirectionalLight`) și o lumină de contur (`THREE.PointLight`)
- Animații în timp real
  - Mișcarea stelelor și efectul de strălucire accentuează senzația de adâncime a spațiului cosmic, prin mișcarea individuală a celor 2 straturi distince de stele (modificarea rotației pe axa Y cu viteze diferite în funcție de timpul de randare) și prin modificarea opacității materialelor
  - Simulare a vântului ce are efect asupra copacilor, aceștia au o mișcare neregulată creată prin formule trigonometrice (`Math.sin` și `Math.cos`) aplicate pe 3 niveluri independente, fiecare având viteze, amplitudini și faze desincronizare (`windData.phase`)
- Interactivitate & Perspective
   - Realizată folosind `THREE.Raycaster` pentru a detecta click-urile pe geamurile de la apartamentele din fațadă și o structură `apartamente[]` care leagă fiecare geam de un grup interior. La selectarea unui geam se declanșează un mod de focus în care poziția camerei, direcția de privire și FOV-ul sunt interpolate spre fereastra aleasă, iar interiorul camerei devine vizibil cu iluminare și audio activate. Experiența este completată cu navigare prin săgeți sus/jos/stânga/dreapta între camere/etaje, gestionând automat trecerea înapoi la vizualizarea externă atunci când nu mai există o cameră validă.
   - Grupul de apartamente este gestionat prin array-ul `apartamente[]`, unde fiecare element reprezintă un obiect ce asociază o fereastră interactivă cu toate componentele sale: etajul, coloana, geamMesh, ramaMesh, pervazMesh și roomGroup. În timpul generării fiecărui etaj, este creată atât fereastra exterioară, cât și, în cazul ferestrelor interactive, un grup interior al camerei (roomGroup), menținut inițial invizibil până la activarea modului de focus. În acest mod, `apartamente[]` funcționează ca structura centrală a interactivității: selectarea unui geamMesh identifică apartamentul corespunzător, face vizibil interiorul asociat din roomGroup, ascunde geamul selectat și actualizează poziția camerei pentru afișarea detaliată a interiorului.
   - Camerele sunt construite ca grupuri separate prin funcțiile `creeazaCamera1() … creeazaCamera12()`, fiecare dintre acestea având propria structură formată din podea, pereți și o configurație personalizată de mobilier. Pentru amenajarea interioară au fost utilizate atât modele încărcate în format GLTF, cât și obiecte generate programatic, precum canapea, birou, masă, scaun, dulap, pat, noptieră, lampă, covor, ceas și plante decorative. Fiecare interior este adăugat în scena 3D sub forma unui roomGroup, iar în momentul activării focusului pe un apartament devine vizibil doar grupul asociat camerei selectate, celelalte rămânând ascunse.
- Starea ambianței sonore
  - Generare procedurală a sunetului ambiental în Pure Data; sunetele sunt create în timp real prin oscilatoare, filtre, noise și efecte de delay
  - Ambient exterior realizat în `fundal.pd`, folosit pentru atmosfera nocturnă generală a scenei; muzică ambientală de interior realizată în `camera2.pd`, activată atunci când utilizatorul intră într-un apartament
  - Tranziție dinamică între ambientul exterior și sunetul camerei: la intrarea în apartament se oprește fundalul și pornește patch-ul camerei, iar la ieșire se revine la ambianța nocturnă
  - Comunicare în timp real între aplicația Three.js și serverul audio local prin WebSocket, folosind comenzile `START_BACKGROUND`, `ENTER_ROOM` și `EXIT_ROOM`
- Navigare și controlul camerei
  - Prin menținerea click-ului dreapta apăsat și deplasarea mouse-ului, se poate roti camera pe axele de privire
  - Scroll-ul permite deplasarea camerei înainte sau înapoi, pentru a expora scena 3D
  - Funcționalitatea poate fi extinsă ulterior cu suport WebXR pentru utilizarea unui headset VR și a altor mecanisme de navigare imersivă, având deja pregătită structura necesară, prin activarea `renderer.xr.enabled` și definirea evenimentelor `sessionstart` și `sessionend`
---

### Demo

https://drive.google.com/file/d/1MXJnDmj3r14nAeoMA21zuFYS23VuISKa/view?usp=sharing

### Pași de instalare/pornire a aplicației

Este necesară instalarea PureData.

Este necesară înlocuirea valorii variabilei PD_PATH din fișierul ./PD/server.js cu valoarea corespunzătoare, ce se poate determina rulând comenzile de mai jos.

Comandă pentru determinarea căii absolute a programului PureData, pentru sistemul de operare Windows:

```bash
dir /s /b "C:\Program Files\pd.exe" "C:\Program Files (x86)\pd.exe" 2>nul
```

Comandă pentru determinarea căii absolute a programului PureData, pentru sistemul de operare MacOS:

```bash
find /Applications -name pd -type f 2>/dev/null
```

Este necesară înlocuirea valorilor din variabilele FUNDAL_PATCH și CAMERA2_PATCH din fișierul ./PD/server.js cu valoarile corespunzătoare, aceasta reprezintă calea absolută a fișierelor fundal.pd, respectiv camera2.pd din folderul ./PD.

Instalarea dependențelor:

```bash
npm install
```

***Pornirea aplicației:***

```bash
cd PD
node server.js
```

```bash
npm run dev # in root
```

Aplicația poate fi accesată în browser la *http://localhost:5173/*.
