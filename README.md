# LAST CALL — Trust Nobody

Mobilbarát, 2–8 fős valós idejű social deduction party game. Nincs alkalmazástelepítés, bejelentkezés vagy pontozás. A host beállítja a körök számát, a nyelvet és a chaos eventeket; a játékosok szobakóddal vagy meghívólinkkel csatlakoznak.

**Technológia:** egyetlen `index.html` (HTML/CSS/vanilla JS), Firebase Realtime Database + Anonymous Auth, Netlify Functions (Node.js, Firebase Admin SDK), GitHub → Netlify.

## Egyszeri telepítés (Firebase + Netlify)

A projekthez **nem kell saját szervert futtatnod**. A telepítéshez viszont szükség van egy Firebase projektre és egy Netlify site-ra; ezeket az alkalmazás biztonsága miatt nem lehet kihagyni.

### 1. Firebase (egyszer)

1. Hozz létre egy Firebase projektet: https://console.firebase.google.com/ .
2. **Build → Authentication → Sign-in method → Anonymous → Enable.**
3. **Build → Realtime Database → Create Database**. Másold ki az adatbázis teljes HTTPS URL-jét (például `https://my-project-default-rtdb.europe-west1.firebasedatabase.app`). **Ne nyiss publikus hozzáférést!**
4. A Realtime Database **Rules** fülére másold be a repository `database.rules.json` fájljának teljes tartalmát, majd **Publish**. Ez elengedhetetlen a titkos szavak védelméhez.
5. **Project settings → General → Your apps → Web app**: regisztrálj egy webalkalmazást (nem kell Firebase Hosting). A `firebaseConfig` objektumban keresd meg az `apiKey` értéket.
6. **Project settings → Service accounts → Generate new private key**. A letöltött JSON tartalmát tartsd titokban: **ne töltsd fel GitHubra**.

### 2. GitHub + Netlify (egyszer)

1. Töltsd fel a projekt fájljait egy GitHub-repository gyökerébe. **A letöltött Firebase kulcsfájlt ne töltsd fel!**
2. A https://app.netlify.com/ oldalon válaszd az **Add new project → Import an existing project → GitHub** lehetőséget, majd a repositoryt.
3. Build command: **hagyd üresen**; publish directory: `.` (pont). A `netlify.toml` beállítja a Functions mappát. A Netlify telepítéskor telepíti a `package.json` csomagját.
4. A Netlify Site configuration → **Environment variables** résznél add meg a **három** változót:

   | Változó | Érték |
   |---|---|
   | `FIREBASE_DATABASE_URL` | A Realtime Database teljes HTTPS URL-je |
   | `FIREBASE_WEB_API_KEY` | A Firebase web app `firebaseConfig.apiKey` értéke |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | A letöltött Firebase service account JSON **teljes tartalma**, egyetlen környezeti változóként |

   Az utóbbi Netlify változó legyen **secret/sensitive** és elérhető a **Functions** környezetben. Ha a JSON-t bemásolod, ne alakítsd át az idézőjeleket vagy a kulcsértékeket.
5. Indíts deploymentet a Netlify-on (a környezeti változók mentése után szükség lehet új deploymentre).
6. Nyisd meg a létrehozott `*.netlify.app` címet iPhone-on vagy számítógépen. A host létrehozza a szobát, a többiek a linkkel vagy a 6 karakteres kóddal belépnek.

**Később:** a GitHub `main` branch változtatásait a Netlify automatikusan újradeployolja. A Netlify felülete telefonról is használható; az eredeti Firebase beállításokat nem kell újra elvégezni.

### 3. Használat

- A host maga is játékos; minimum 2, maximum 8 fő.
- 3–8 főnél: egy imposztor másik szót kap, a többiek közöset. Clue-kat **szóban** mondtok; a kezdő játékost a telefon mutatja. Bármikor, nyilvánosan szavazhattok, és a szavazat módosítható. Az első abszolút többség azonnal lezárja a kört. Ártatlan kiszavazásakor az imposztor nyer; különben az ártatlanok.
- 2 főnél: **Same or Different**. Mindkét fél titokban tippel, hogy azonos-e a szó. Ha csak egyikük helyes, a másik veszít; egyébként új szópárt kaptok ugyanabban a körben.
- Három másodperces eredmény után automatikusan új kör indul. A titkos szó kattintásra látható; nem kell várni a megtekintésére.
- A kiszavazott/vesztes kapja a körszámnak megfelelő **opcionális** ivási kihívást. A Down Your Drink ezt felülírja; minden ivás helyettesíthető alkoholmentes vagy nem ivós alternatívával.
- A host a lobbyban beállítja a körszámot (1–20), a szónyelvet (HU/EN), az eventek globális engedélyezését, a körönkénti véletlen event esélyét (alap 30%), az egyes eventek kapcsolóit, a saját eventeket (legfeljebb 20), és hogy a Rule Maker szabályokat telefonon is rögzítik-e.
- A Rule Maker és Drinking Buddy a **teljes játékra** érvényes; a többi alapesemény csak az aktuális körben. A Benched néző nem lehet imposztor, és nem szavazhat / nem lehet rá szavazni.
- Ha valaki offline kerül, a játék szünetel; a host szükség esetén eltávolíthatja, ami az aktuális kört büntetés nélkül újraindítja. A kiesett host szerepét tíz másodperc offline állapot után átveheti más.

## Fájlok

- `index.html` — teljes mobile-first frontend és Firebase Web SDK-integráció.
- `netlify/functions/api.mjs` — védett játékmotor, Firebase ID token ellenőrzése, tranzakciók, titkos szerepek.
- `netlify/functions/cleanup.mjs` — óránkénti inaktívszoba-takarítás.
- `database.rules.json` — csak szobatagok olvashatják a publikus adatokat; mindenki csak a saját titkos adatát.
- `package.json`, `netlify.toml`, `.gitignore` — minimális telepítési konfiguráció.

## Üzemeltetés és korlátok

- A lokálisan megnyitott `index.html` (`file://`) **nem futtatja a Netlify Functionöket**. A tényleges multiplayer teszthez telepíts Netlify-ra, vagy használd a Netlify CLI-t (`npm install`, `npx netlify dev`) a három környezeti változó beállításával.
- A netlify-s oldal HTTPS alatt fut. Ne tedd publikus helyre a service account JSON-t. A Firebase webes `apiKey` **nem titok**, de a szerveroldali private key igen.
- A Firebase Security Rules publikus szülőútvonalon véletlenül se legyenek `".read": true` értékre állítva, mert akkor minden szerep hozzáférhetővé válna.
- A Netlify és Firebase ingyenes szintjei kvótásak. Alacsony forgalomnál ingyenes használat várható, de a csomagok feltételeit ellenőrizd, mielőtt élesben használod.
- A játék szóban történik: a felület **nem** hallgatja, tárolja vagy elemzi a játékosok beszédét.
- Az inaktív szobák 12 óra, a befejezett szobák 24 óra után törölhetők az óránként futó takarítással; a Netlify ütemezett funkciója csak a deploy után fut.

## Biztonsági megjegyzés

A szavazatokat, a szerepkiosztást, a körlezárást és az új kör indítását a backend kezeli. Ez védi a játék alapintegritását, de a szóbeli szabályok tiszteletben tartása továbbra is a játékosokon múlik. Az anonimizált belépés és a szobakód nem jelent visszaélésbiztos fiókrendszert; nyilvános, nagy forgalmú használathoz további rate limiting és abuse-védelem szükséges.
