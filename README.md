## Urban Mosaic

Proiectul *Urban Mosaic* reprezintă o explorare interactivă a vieților surprinse prin ferestrele unei clădiri de locuințe. Proiectul a fost inspirat din ideea că un spațiu comun adăpostește atâtea vieți diferite, iar utilizatorul își asumă rolul de observator al lor, având ocazia de a le analiza pe fiecare printr-o fereastră. Inițial, utilizatorul este poziționat în fața clădirii, iar printr-un `click stânga` pe orice fereastră dorită, camera respectivă este adusă în prim-plan, iar observatorul poate observa lumea din interior. Cadrul poate fi observat și din alte unghiuri prin accesarea `click dreapta + drag` și poate fi apropiat/depărtat prin accesarea `click dreapta + scroll`.

### Tehnologii și limbaje folosite

- HTML5: utilizat pentru crearea structurii de bază a aplicației
- CSS3: folosit pentru eliminarea marginilor implicite ale browser-ului (`margin: 0`), ascunderea scrollbar-ului (`overflow: hidden`) și asigurarea acoperirii integrale a ecranului a elementului Canvas (`100vw/vh`)
- JavaScript: utilizat pentru gestionarea logicii matematice și crearea animaților
- Node.js: rularea serverului local

### API-uri și librării

- Three.js: biblioteca principală bazată pe API-ul WebGL, utilizată penru randarea geometriei 3D, gestionarea camerelor, luminilor și a materialelor din scenă
- GLTFLoader (Three.js Extension): API dedicat încărcării și parsării asincrone a modelelor 3D (fișiere `.glb`)
- PureData: mediu de programare vizuală pentru generarea sunetelor, adaptate interacțiunii utilizatorului
- WebSockets API (Modulul `ws`): protocol de comunicare bidirecțională utilizat pentru transmiterea instantanee a comenzilor din browser (`START_BACKGROUND`, `ENTER_ROOM`, `EXIT_ROOM`) către serverul audio local
- WebXR (Modulul `webxr.js`): interfață integrată pentru a asigura extensibilitatea aplicației 

### Features
- Atmosferă nocturnă
  - Cer nocturn creat cu Custom Shaders, generat nativ prin cod programat in GLSL ce creează un gradient din 4 nuanțe distincte (`topColor`, `middleColor`, `horizonColor`, `bottomColor`) cu proprietatea `mix`
  - Sistem statificat de stele creat prin randare optimzată a 6200 de stele cu ajutorul `THREE.Points`; pentru realism stelele au fost împărțite in 2 straturi ce crează o senzație naturală de adâncime, folosind tehnica *additive blending*
- Iluminare tridimensională: scena folosește o combinație de lumină ambientală nocturnă (`THREE.AmbientLight`), lumină direcțională (`THREE.DirectionalLight`) și o lumină de contur (`THREE.PointLight`)
- Animații în timp real
  - Mișcarea stelelor și efectul de strălucire accentuează senzația de adâncime a spațiului cosmic, prin mișcarea individuală a celor 2 straturi distince de stele (modificarea rotației pe axa Y cu viteze diferite în funcție de timpul de randare) și prin modificarea opacității materialelor
  - Simulare a vântului ce are efect asupra copacilor, aceștia au o mișcare neregulată creată prin formule trigonometrice (`Math.sin` și `Math.cos`) aplicate pe 3 niveluri independente, fiecare având viteze, amplitudini și faze desincronizare (`windData.phase`)
- Interactivitate
- Schimbare perspectivă
- Starea ambianței sonore

---

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
