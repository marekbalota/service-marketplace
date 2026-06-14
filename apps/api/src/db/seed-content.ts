/**
 * Trilingual content library for the seed (EN / CS / SK).
 *
 * Everything here is hand-written, meaningful copy — no lorem-ipsum (Latin).
 * Benign content is provided in all three languages so a post, its author, its
 * messages and its reviews can all stay in one consistent language. Harmful
 * content (used to drive the reports queue) is English-only and is always
 * attached to English authors/posts so language stays consistent there too.
 */

export type Lang = 'en' | 'cs' | 'sk'
export const LANGS: Lang[] = ['en', 'cs', 'sk']

// ── Service post templates ───────────────────────────────────────────────────

export interface ServiceTemplate {
  /** Must match an English category name in seed.ts `categoryDefs`. */
  category: string
  offerTitle: string
  offerBody: string
  requestTitle: string
  requestBody: string
}

export const serviceTemplates: Record<Lang, ServiceTemplate[]> = {
  en: [
    {
      category: 'Tutoring',
      offerTitle: 'Maths & Physics Tutoring for High School and University',
      offerBody:
        'Patient, experienced tutor covering algebra, calculus and mechanics. Lessons online or in person, tailored to your pace and exam goals.',
      requestTitle: 'Looking for a Maths Tutor for My Teenager',
      requestBody:
        'My son is struggling with algebra ahead of his exams and needs weekly sessions after school. Patience and clear explanations are a must.',
    },
    {
      category: 'Plumbing',
      offerTitle: 'Reliable Plumber — Repairs, Installations and Emergencies',
      offerBody:
        'Leaking taps, blocked drains, boiler servicing and full bathroom fittings. Fast call-outs, fair pricing and clean, tidy work every time.',
      requestTitle: 'Need a Plumber to Fix a Leaking Kitchen Sink',
      requestBody:
        'The pipe under my sink has been dripping for days and the cupboard is getting damaged. Looking for someone who can come this week.',
    },
    {
      category: 'Cleaning',
      offerTitle: 'Professional Home and Office Cleaning',
      offerBody:
        'Regular or one-off cleaning with my own eco-friendly products. Reliable, thorough and fully insured, with references available on request.',
      requestTitle: 'Looking for a Trustworthy Weekly Cleaner',
      requestBody:
        'We need someone dependable for about three hours a week in our flat. Must be careful around pets and bring their own supplies.',
    },
    {
      category: 'Design',
      offerTitle: 'Logo and Brand Identity Design for Small Businesses',
      offerBody:
        'I craft clean, memorable logos and full brand guidelines. The package includes several concepts, revisions and print-ready files.',
      requestTitle: 'Seeking a Designer for a New Café Brand',
      requestBody:
        'Opening a small café and need a logo, menu layout and signage that feel warm and modern. A portfolio of similar work is appreciated.',
    },
    {
      category: 'Home Repair',
      offerTitle: 'Handyman Services — No Job Too Small',
      offerBody:
        'Furniture assembly, shelving, door repairs, mounting and general fixes around the house. Friendly, punctual and well equipped.',
      requestTitle: 'Need Help Mounting a TV and Hanging Shelves',
      requestBody:
        'Just moved in and need a 55-inch TV mounted plus four shelves and curtain rails put up. Should take a couple of hours.',
    },
    {
      category: 'Tech Support',
      offerTitle: 'IT Support and Computer Repair',
      offerBody:
        'Slow laptops, virus removal, Wi-Fi setup and data recovery. On-site or remote help explained in plain language, no jargon.',
      requestTitle: 'My Laptop Won’t Boot After an Update',
      requestBody:
        'After the latest Windows update my laptop is stuck on a black screen. I have important files on it and need someone who can recover them.',
    },
    {
      category: 'Gardening & Landscaping',
      offerTitle: 'Garden Maintenance and Landscaping',
      offerBody:
        'Lawn mowing, hedge trimming, planting and seasonal clean-ups. I leave every garden neat, tidy and ready to enjoy.',
      requestTitle: 'Overgrown Garden Needs a Big Tidy-Up',
      requestBody:
        'Our back garden has got out of hand — hedges, weeds and an old flower bed. Looking for someone for a day or two of work.',
    },
    {
      category: 'Painting & Decorating',
      offerTitle: 'Interior and Exterior Painting',
      offerBody:
        'Neat, precise painting and decorating with full preparation and clean-up. I supply quality materials or happily work with yours.',
      requestTitle: 'Looking for a Painter for Two Bedrooms',
      requestBody:
        'Two bedrooms need repainting in light, neutral tones. The walls are in good shape. Hoping to have it done within the next two weeks.',
    },
    {
      category: 'Photography & Video',
      offerTitle: 'Event and Portrait Photography',
      offerBody:
        'Weddings, family portraits and small business shoots. A natural, relaxed style with carefully edited photos delivered within a week.',
      requestTitle: 'Need a Photographer for a Birthday Party',
      requestBody:
        'Looking for a relaxed photographer to capture a small 40th birthday gathering. A couple of hours of coverage and edited photos after.',
    },
    {
      category: 'Pet Services',
      offerTitle: 'Dog Walking and Pet Sitting',
      offerBody:
        'Daily walks, feeding and lots of attention while you’re away. Insured, reliable and genuinely fond of animals of all sizes.',
      requestTitle: 'Need a Dog Walker for Weekday Afternoons',
      requestBody:
        'Our energetic labrador needs a midday walk on weekdays while we’re at work. Must be comfortable around big, friendly dogs.',
    },
  ],
  cs: [
    {
      category: 'Tutoring',
      offerTitle: 'Doučování matematiky a fyziky pro střední a vysoké školy',
      offerBody:
        'Trpělivé a srozumitelné vysvětlení — algebra, analýza i mechanika. Lekce online nebo osobně, přizpůsobené vašemu tempu a přípravě na zkoušky.',
      requestTitle: 'Hledám doučování matematiky pro syna',
      requestBody:
        'Syn má potíže s algebrou před zkouškami a potřebuje pravidelné lekce po škole. Důležitá je trpělivost a jasný výklad.',
    },
    {
      category: 'Plumbing',
      offerTitle: 'Spolehlivý instalatér — opravy, montáže i havárie',
      offerBody:
        'Kapající kohoutky, ucpané odpady, servis kotlů i kompletní koupelny. Rychlý příjezd, férové ceny a po sobě vždy uklidím.',
      requestTitle: 'Potřebuji instalatéra na opravu kapajícího dřezu',
      requestBody:
        'Potrubí pod dřezem už několik dní kape a skříňka se mi ničí. Hledám někoho, kdo by mohl přijet ještě tento týden.',
    },
    {
      category: 'Cleaning',
      offerTitle: 'Profesionální úklid domácností i kanceláří',
      offerBody:
        'Pravidelný i jednorázový úklid s vlastní ekologickou drogerií. Spolehlivě, důkladně a s referencemi na vyžádání.',
      requestTitle: 'Hledám spolehlivou paní na týdenní úklid',
      requestBody:
        'Potřebujeme někoho spolehlivého zhruba na tři hodiny týdně do bytu. Podmínkou je ohleduplnost k mazlíčkům a vlastní pomůcky.',
    },
    {
      category: 'Design',
      offerTitle: 'Návrh loga a firemní identity pro malé firmy',
      offerBody:
        'Vytvořím čisté a zapamatovatelné logo i kompletní grafický manuál. Balíček zahrnuje několik návrhů, úpravy a podklady pro tisk.',
      requestTitle: 'Hledám grafika na značku nové kavárny',
      requestBody:
        'Otevíráme malou kavárnu a potřebujeme logo, návrh menu a cedule v přívětivém a moderním stylu. Portfolio podobné práce vítáno.',
    },
    {
      category: 'Home Repair',
      offerTitle: 'Hodinový manžel — žádná práce není malá',
      offerBody:
        'Montáž nábytku, police, opravy dveří, věšení a běžné opravy po domě. Přátelsky, dochvilně a s vlastním nářadím.',
      requestTitle: 'Potřebuji pověsit televizi a police',
      requestBody:
        'Nově jsme se nastěhovali a potřebujeme pověsit 55" televizi, čtyři police a garnýže. Mělo by to být na pár hodin práce.',
    },
    {
      category: 'Tech Support',
      offerTitle: 'IT podpora a opravy počítačů',
      offerBody:
        'Pomalé notebooky, odstranění virů, nastavení Wi-Fi i záchrana dat. Pomoc na místě i na dálku, vše vysvětlím srozumitelně.',
      requestTitle: 'Notebook po aktualizaci nenaběhne',
      requestBody:
        'Po poslední aktualizaci Windows mi notebook zůstává na černé obrazovce. Mám na něm důležité soubory a potřebuji je zachránit.',
    },
    {
      category: 'Gardening & Landscaping',
      offerTitle: 'Údržba zahrad a úpravy okolí',
      offerBody:
        'Sekání trávy, stříhání živých plotů, výsadba i sezónní úklid. Po mně zůstane zahrada čistá, upravená a připravená k užívání.',
      requestTitle: 'Zarostlá zahrada potřebuje pořádný úklid',
      requestBody:
        'Naše zahrada za domem nám přerostla přes hlavu — plot, plevel i starý záhon. Hledám někoho na den či dva práce.',
    },
    {
      category: 'Painting & Decorating',
      offerTitle: 'Malování interiérů i fasád',
      offerBody:
        'Čisté a precizní malování s kompletní přípravou a úklidem. Dodám kvalitní materiál, nebo rád pracuji s vaším.',
      requestTitle: 'Hledám malíře na dva pokoje',
      requestBody:
        'Dva pokoje potřebují vymalovat ve světlých neutrálních tónech. Stěny jsou v dobrém stavu. Rádi bychom to měli hotové do dvou týdnů.',
    },
    {
      category: 'Photography & Video',
      offerTitle: 'Fotografování událostí a portrétů',
      offerBody:
        'Svatby, rodinné portréty i focení pro malé firmy. Přirozený a uvolněný styl, pečlivě upravené fotky do týdne.',
      requestTitle: 'Potřebuji fotografa na oslavu narozenin',
      requestBody:
        'Hledám pohodového fotografa na menší oslavu čtyřicátin. Pár hodin focení a poté upravené fotografie.',
    },
    {
      category: 'Pet Services',
      offerTitle: 'Venčení psů a hlídání mazlíčků',
      offerBody:
        'Každodenní procházky, krmení a spousta pozornosti, když jste pryč. Pojištěno, spolehlivě a se srdcem pro zvířata všech velikostí.',
      requestTitle: 'Hledám venčitele psa na všední odpoledne',
      requestBody:
        'Náš energický labrador potřebuje polední procházku ve všední dny, když jsme v práci. Nutná zkušenost s velkými přátelskými psy.',
    },
  ],
  sk: [
    {
      category: 'Tutoring',
      offerTitle: 'Doučovanie matematiky a fyziky pre stredné a vysoké školy',
      offerBody:
        'Trpezlivé a zrozumiteľné vysvetlenie — algebra, analýza aj mechanika. Lekcie online alebo osobne, prispôsobené vášmu tempu a príprave na skúšky.',
      requestTitle: 'Hľadám doučovanie matematiky pre syna',
      requestBody:
        'Syn má problémy s algebrou pred skúškami a potrebuje pravidelné lekcie po škole. Dôležitá je trpezlivosť a jasný výklad.',
    },
    {
      category: 'Plumbing',
      offerTitle: 'Spoľahlivý inštalatér — opravy, montáže aj havárie',
      offerBody:
        'Kvapkajúce kohútiky, upchaté odpady, servis kotlov aj kompletné kúpeľne. Rýchly príchod, férové ceny a po sebe vždy upracem.',
      requestTitle: 'Potrebujem inštalatéra na opravu kvapkajúceho drezu',
      requestBody:
        'Potrubie pod drezom už niekoľko dní kvapká a skrinka sa mi ničí. Hľadám niekoho, kto by mohol prísť ešte tento týždeň.',
    },
    {
      category: 'Cleaning',
      offerTitle: 'Profesionálne upratovanie domácností aj kancelárií',
      offerBody:
        'Pravidelné aj jednorazové upratovanie s vlastnou ekologickou drogériou. Spoľahlivo, dôkladne a s referenciami na vyžiadanie.',
      requestTitle: 'Hľadám spoľahlivú pani na týždenné upratovanie',
      requestBody:
        'Potrebujeme niekoho spoľahlivého zhruba na tri hodiny týždenne do bytu. Podmienkou je ohľaduplnosť k miláčikom a vlastné pomôcky.',
    },
    {
      category: 'Design',
      offerTitle: 'Návrh loga a firemnej identity pre malé firmy',
      offerBody:
        'Vytvorím čisté a zapamätateľné logo aj kompletný grafický manuál. Balík zahŕňa niekoľko návrhov, úpravy a podklady pre tlač.',
      requestTitle: 'Hľadám grafika na značku novej kaviarne',
      requestBody:
        'Otvárame malú kaviareň a potrebujeme logo, návrh menu a tabule v príjemnom a modernom štýle. Portfólio podobnej práce vítané.',
    },
    {
      category: 'Home Repair',
      offerTitle: 'Údržbár — žiadna práca nie je malá',
      offerBody:
        'Montáž nábytku, police, opravy dverí, vešanie aj bežné opravy po dome. Priateľsky, dochvíľne a s vlastným náradím.',
      requestTitle: 'Potrebujem zavesiť televízor a police',
      requestBody:
        'Práve sme sa nasťahovali a potrebujeme zavesiť 55" televízor, štyri police a garniže. Malo by to byť na pár hodín práce.',
    },
    {
      category: 'Tech Support',
      offerTitle: 'IT podpora a opravy počítačov',
      offerBody:
        'Pomalé notebooky, odstránenie vírusov, nastavenie Wi-Fi aj záchrana dát. Pomoc na mieste aj na diaľku, všetko vysvetlím zrozumiteľne.',
      requestTitle: 'Notebook po aktualizácii nenabehne',
      requestBody:
        'Po poslednej aktualizácii Windows mi notebook zostáva na čiernej obrazovke. Mám na ňom dôležité súbory a potrebujem ich zachrániť.',
    },
    {
      category: 'Gardening & Landscaping',
      offerTitle: 'Údržba záhrad a úprava okolia',
      offerBody:
        'Kosenie trávy, strihanie živých plotov, výsadba aj sezónne upratovanie. Po mne zostane záhrada čistá, upravená a pripravená na užívanie.',
      requestTitle: 'Zarastená záhrada potrebuje poriadne upratanie',
      requestBody:
        'Naša záhrada za domom nám prerástla cez hlavu — plot, burina aj starý záhon. Hľadám niekoho na deň či dva práce.',
    },
    {
      category: 'Painting & Decorating',
      offerTitle: 'Maľovanie interiérov aj fasád',
      offerBody:
        'Čisté a precízne maľovanie s kompletnou prípravou a upratovaním. Dodám kvalitný materiál, alebo rád pracujem s vaším.',
      requestTitle: 'Hľadám maliara na dve izby',
      requestBody:
        'Dve izby potrebujú vymaľovať vo svetlých neutrálnych tónoch. Steny sú v dobrom stave. Radi by sme to mali hotové do dvoch týždňov.',
    },
    {
      category: 'Photography & Video',
      offerTitle: 'Fotografovanie udalostí a portrétov',
      offerBody:
        'Svadby, rodinné portréty aj fotenie pre malé firmy. Prirodzený a uvoľnený štýl, starostlivo upravené fotky do týždňa.',
      requestTitle: 'Potrebujem fotografa na oslavu narodenín',
      requestBody:
        'Hľadám pohodového fotografa na menšiu oslavu štyridsiatky. Pár hodín fotenia a potom upravené fotografie.',
    },
    {
      category: 'Pet Services',
      offerTitle: 'Venčenie psov a stráženie miláčikov',
      offerBody:
        'Každodenné prechádzky, kŕmenie a veľa pozornosti, keď ste preč. Poistené, spoľahlivo a so srdcom pre zvieratá všetkých veľkostí.',
      requestTitle: 'Hľadám venčiteľa psa na všedné popoludnia',
      requestBody:
        'Náš energický labrador potrebuje obedňajšiu prechádzku cez všedné dni, keď sme v práci. Nutná skúsenosť s veľkými priateľskými psami.',
    },
  ],
}

export const offerExtras: Record<Lang, string[]> = {
  en: [
    'Available evenings and weekends to fit around your schedule.',
    'Free, no-obligation quote after a quick chat.',
    'Fully insured with plenty of happy local clients.',
    'Flexible on timing and always tidy on the job.',
    'Get in touch and I’ll get back to you the same day.',
  ],
  cs: [
    'K dispozici večer i o víkendech, přizpůsobím se vám.',
    'Nezávazná kalkulace zdarma po krátké domluvě.',
    'Plně pojištěno a spousta spokojených místních klientů.',
    'Flexibilní termíny a po práci vždy uklizeno.',
    'Ozvěte se a ještě tentýž den se vám vrátím.',
  ],
  sk: [
    'K dispozícii večer aj cez víkendy, prispôsobím sa vám.',
    'Nezáväzná kalkulácia zdarma po krátkej dohode.',
    'Plne poistené a množstvo spokojných miestnych klientov.',
    'Flexibilné termíny a po práci vždy upratané.',
    'Ozvite sa a ešte v ten istý deň sa vám ozvem.',
  ],
}

export const requestExtras: Record<Lang, string[]> = {
  en: [
    'Please message me with your availability and rates.',
    'Budget is flexible for the right person.',
    'Local references would be a big plus.',
    'Hoping to sort this out in the next week or two.',
    'Happy to discuss the details over a call.',
  ],
  cs: [
    'Napište mi prosím své možnosti a ceny.',
    'Rozpočet je u správného člověka flexibilní.',
    'Místní reference budou velkou výhodou.',
    'Rád bych to vyřešil v příštím týdnu či dvou.',
    'Detaily rád proberu po telefonu.',
  ],
  sk: [
    'Napíšte mi prosím svoje možnosti a ceny.',
    'Rozpočet je u správneho človeka flexibilný.',
    'Miestne referencie budú veľkou výhodou.',
    'Rád by som to vyriešil v najbližšom týždni či dvoch.',
    'Detaily rád preberiem po telefóne.',
  ],
}

// ── Reviews ──────────────────────────────────────────────────────────────────

export const reviewTexts: Record<Lang, { positive: string[]; mixed: string[]; negative: string[] }> =
  {
    en: {
      positive: [
        'Excellent work from start to finish — punctual, friendly and left everything spotless. I’d hire again without hesitation.',
        'Really knew their craft and explained everything clearly. Fair price and the result exceeded my expectations.',
        'Turned up on time, worked carefully and finished ahead of schedule. Communication was great throughout.',
        'Professional, tidy and great value. Couldn’t have asked for a smoother experience.',
        'Friendly, reliable and clearly very experienced. Highly recommended to anyone nearby.',
      ],
      mixed: [
        'Good work overall, though it ran a little over the time we’d agreed. Still happy with the result.',
        'The job was done well but communication beforehand could have been clearer about pricing.',
        'Solid service and a fair outcome, just arrived a bit later than planned.',
        'Decent quality for the price, though I had to follow up a couple of times to get a date.',
      ],
      negative: [
        'Disappointing — the work felt rushed and a few things were left unfinished. Had to call someone else to put it right.',
        'Poor communication and missed the agreed date twice. Wouldn’t recommend, sadly.',
        'Overcharged for fairly sloppy work. Expected much better given the quote.',
      ],
    },
    cs: {
      positive: [
        'Skvělá práce od začátku do konce — dochvilné, příjemné a po sobě vše uklizeno. Kdykoli znovu, bez váhání.',
        'Vyloženě řemeslník na svém místě, vše srozumitelně vysvětlil. Férová cena a výsledek předčil očekávání.',
        'Přijel včas, pracoval pečlivě a skončil dřív, než jsme čekali. Komunikace byla po celou dobu výborná.',
        'Profesionální, čisté a za skvělou cenu. Lepší průběh jsem si nemohl přát.',
        'Příjemný, spolehlivý a očividně zkušený. Vřele doporučuji všem v okolí.',
      ],
      mixed: [
        'Celkově dobrá práce, jen to trochu přesáhlo domluvený čas. S výsledkem jsem ale spokojený.',
        'Práce odvedená dobře, ale domluva ohledně ceny mohla být jasnější.',
        'Solidní služba a férový výsledek, jen příjezd byl o něco později, než bylo domluveno.',
        'Slušná kvalita za tu cenu, i když jsem musel párkrát urgovat termín.',
      ],
      negative: [
        'Zklamání — práce působila odbytě a pár věcí zůstalo nedodělaných. Musel jsem zavolat někoho jiného.',
        'Špatná komunikace a dvakrát nedodržený termín. Bohužel nemůžu doporučit.',
        'Předražené za dost nedbalou práci. Po té nabídce jsem čekal mnohem víc.',
      ],
    },
    sk: {
      positive: [
        'Skvelá práca od začiatku do konca — dochvíľne, príjemné a po sebe všetko upratané. Kedykoľvek znova, bez váhania.',
        'Vyslovene remeselník na svojom mieste, všetko zrozumiteľne vysvetlil. Férová cena a výsledok predčil očakávania.',
        'Prišiel včas, pracoval starostlivo a skončil skôr, než sme čakali. Komunikácia bola po celý čas výborná.',
        'Profesionálne, čisté a za skvelú cenu. Lepší priebeh som si nemohol priať.',
        'Príjemný, spoľahlivý a očividne skúsený. Vrelo odporúčam všetkým v okolí.',
      ],
      mixed: [
        'Celkovo dobrá práca, len to trochu presiahlo dohodnutý čas. S výsledkom som však spokojný.',
        'Práca odvedená dobre, ale dohoda ohľadom ceny mohla byť jasnejšia.',
        'Solídna služba a férový výsledok, len príchod bol o niečo neskôr, než bolo dohodnuté.',
        'Slušná kvalita za tú cenu, aj keď som musel párkrát urgovať termín.',
      ],
      negative: [
        'Sklamanie — práca pôsobila odbyto a pár vecí zostalo nedokončených. Musel som zavolať niekoho iného.',
        'Zlá komunikácia a dvakrát nedodržaný termín. Bohužiaľ nemôžem odporučiť.',
        'Predražené za dosť nedbalú prácu. Po tej ponuke som čakal oveľa viac.',
      ],
    },
  }

// ── Conversations (each script alternates initiator, author, initiator, …) ───

export const conversationScripts: Record<Lang, string[][]> = {
  en: [
    [
      'Hi, is this still available? I’d love to know your rates.',
      'Hello! Yes, still available. My rate is as listed — when were you thinking?',
      'Could you do sometime next week, ideally Tuesday or Wednesday afternoon?',
      'Wednesday at 3pm works well for me. Whereabouts are you based?',
      'Perfect, I’ll send the address now. Thanks, looking forward to it!',
    ],
    [
      'Hi there, could you give me a rough quote for the work?',
      'Of course — could you share a few photos and the rough size of the space?',
      'Just sent them over. It’s the smaller of our two rooms.',
      'Thanks, that helps. I’d estimate around the figure in the listing. Shall we set a date?',
    ],
    [
      'Hello, are you taking on new clients at the moment?',
      'Hi! Yes, I have a couple of slots free this month.',
      'Great — would a regular weekly booking be possible?',
      'Absolutely, weekly works best for me. Mornings or afternoons?',
      'Mornings would be ideal. Thank you!',
    ],
    [
      'Hi, do you cover my area? I’m near the city centre.',
      'Yes, the centre is no problem at all. What exactly do you need done?',
      'Mainly the basics to start, then maybe more regularly if it goes well.',
      'Sounds good — let’s start with one session and take it from there.',
    ],
    [
      'Hi, what’s your earliest availability?',
      'I could fit you in this Friday morning if that suits?',
      'Friday morning is perfect, thanks so much!',
    ],
    [
      'Hello, is there any flexibility on the price for a regular booking?',
      'For a regular weekly slot I can offer a small discount, yes.',
      'That’s really kind, thank you. Let’s go ahead then.',
    ],
  ],
  cs: [
    [
      'Dobrý den, je nabídka ještě aktuální? Rád bych znal vaše ceny.',
      'Dobrý den! Ano, stále platí. Cena je dle inzerátu — kdy byste měl čas?',
      'Šlo by někdy příští týden, ideálně úterý nebo středa odpoledne?',
      'Středa v 15:00 mi vyhovuje. Kde to máte?',
      'Skvělé, hned posílám adresu. Děkuji a těším se!',
    ],
    [
      'Dobrý den, mohl byste mi dát orientační cenu za tu práci?',
      'Jistě — můžete poslat pár fotek a přibližnou velikost prostoru?',
      'Právě jsem je poslal. Je to ten menší z našich dvou pokojů.',
      'Děkuji, to pomáhá. Odhaduji zhruba částku z inzerátu. Domluvíme termín?',
    ],
    [
      'Dobrý den, berete teď nové klienty?',
      'Dobrý den! Ano, tento měsíc mám pár volných termínů.',
      'Výborně — bylo by možné pravidelné týdenní hlídání?',
      'Určitě, týdně mi vyhovuje nejlíp. Ráno, nebo odpoledne?',
      'Ráno by bylo ideální. Děkuji!',
    ],
    [
      'Dobrý den, jezdíte i k nám? Jsme blízko centra.',
      'Ano, centrum není vůbec problém. Co přesně potřebujete udělat?',
      'Zatím hlavně to základní, a pokud to půjde, tak pak pravidelně.',
      'Zní to dobře — začneme jednou návštěvou a uvidíme dál.',
    ],
    [
      'Dobrý den, kdy máte nejbližší volno?',
      'Mohl bych vás vzít tento pátek dopoledne, hodilo by se to?',
      'Páteční dopoledne je perfektní, moc děkuji!',
    ],
    [
      'Dobrý den, je u pravidelné objednávky možná sleva z ceny?',
      'U pravidelného týdenního termínu mohu nabídnout menší slevu, ano.',
      'To je od vás milé, děkuji. Tak do toho pojďme.',
    ],
  ],
  sk: [
    [
      'Dobrý deň, je ponuka ešte aktuálna? Rád by som poznal vaše ceny.',
      'Dobrý deň! Áno, stále platí. Cena je podľa inzerátu — kedy by ste mali čas?',
      'Šlo by niekedy budúci týždeň, ideálne utorok alebo streda popoludní?',
      'Streda o 15:00 mi vyhovuje. Kde to máte?',
      'Skvelé, hneď posielam adresu. Ďakujem a teším sa!',
    ],
    [
      'Dobrý deň, mohli by ste mi dať orientačnú cenu za tú prácu?',
      'Iste — môžete poslať pár fotiek a približnú veľkosť priestoru?',
      'Práve som ich poslal. Je to tá menšia z našich dvoch izieb.',
      'Ďakujem, to pomáha. Odhadujem zhruba sumu z inzerátu. Dohodneme termín?',
    ],
    [
      'Dobrý deň, beriete teraz nových klientov?',
      'Dobrý deň! Áno, tento mesiac mám pár voľných termínov.',
      'Výborne — bolo by možné pravidelné týždenné stráženie?',
      'Určite, týždenne mi vyhovuje najlepšie. Ráno, alebo popoludní?',
      'Ráno by bolo ideálne. Ďakujem!',
    ],
    [
      'Dobrý deň, chodíte aj k nám? Sme blízko centra.',
      'Áno, centrum nie je vôbec problém. Čo presne potrebujete spraviť?',
      'Zatiaľ hlavne to základné, a ak to pôjde, tak potom pravidelne.',
      'Znie to dobre — začneme jednou návštevou a uvidíme ďalej.',
    ],
    [
      'Dobrý deň, kedy máte najbližšie voľno?',
      'Mohol by som vás vziať tento piatok doobeda, hodilo by sa to?',
      'Piatkové doobedie je perfektné, veľmi ďakujem!',
    ],
    [
      'Dobrý deň, je pri pravidelnej objednávke možná zľava z ceny?',
      'Pri pravidelnom týždennom termíne môžem ponúknuť menšiu zľavu, áno.',
      'To je od vás milé, ďakujem. Tak poďme do toho.',
    ],
  ],
}

// ── Bios & job titles ────────────────────────────────────────────────────────

export const bioTemplates: Record<Lang, string[]> = {
  en: [
    'Hi, I’m {name} — a {job} based in {city} with over {years} years of experience. I take pride in honest, careful work and happy clients.',
    '{job} from {city} with {years} years in the trade. I believe in fair prices and doing the job right the first time.',
    'Friendly and reliable {job} serving {city} and the surrounding area. Get in touch any time for a free, no-obligation quote.',
    'Professional {job} offering dependable service across {city}. Fully insured, with references happily provided on request.',
    'I’m {name}, a {job} who went freelance after {years} years to give clients a more personal, attentive service.',
  ],
  cs: [
    'Dobrý den, jsem {name} — {job} z města {city} s více než {years} lety praxe. Zakládám si na poctivé, pečlivé práci a spokojených klientech.',
    '{job} z města {city}, {years} let v oboru. Věřím ve férové ceny a v to udělat práci hned napoprvé pořádně.',
    'Příjemný a spolehlivý {job} pro {city} a okolí. Ozvěte se kdykoli, nezávazná kalkulace zdarma.',
    'Profesionální {job} se spolehlivými službami po celém městě {city}. Plně pojištěn, reference rád doložím.',
    'Jsem {name}, {job}. Po {years} letech jsem se osamostatnil, abych klientům mohl nabídnout osobnější přístup.',
  ],
  sk: [
    'Dobrý deň, som {name} — {job} z mesta {city} s viac než {years} rokmi praxe. Zakladám si na poctivej, starostlivej práci a spokojných klientoch.',
    '{job} z mesta {city}, {years} rokov v odbore. Verím vo férové ceny a v to spraviť prácu hneď na prvý raz poriadne.',
    'Príjemný a spoľahlivý {job} pre {city} a okolie. Ozvite sa kedykoľvek, nezáväzná kalkulácia zdarma.',
    'Profesionálny {job} so spoľahlivými službami po celom meste {city}. Plne poistený, referencie rád doložím.',
    'Som {name}, {job}. Po {years} rokoch som sa osamostatnil, aby som klientom mohol ponúknuť osobnejší prístup.',
  ],
}

export const jobTitles: Record<Lang, string[]> = {
  en: [
    'plumber', 'electrician', 'tutor', 'designer', 'cleaner', 'handyman', 'photographer',
    'gardener', 'painter', 'web developer', 'personal trainer', 'dog walker', 'carpenter',
    'IT technician', 'decorator',
  ],
  cs: [
    'instalatér', 'elektrikář', 'doučovatel', 'grafik', 'uklízeč', 'údržbář', 'fotograf',
    'zahradník', 'malíř', 'vývojář webů', 'osobní trenér', 'venčitel psů', 'truhlář',
    'IT technik', 'dekoratér',
  ],
  sk: [
    'inštalatér', 'elektrikár', 'doučovateľ', 'grafik', 'upratovač', 'údržbár', 'fotograf',
    'záhradník', 'maliar', 'vývojár webov', 'osobný tréner', 'venčiteľ psov', 'stolár',
    'IT technik', 'dekoratér',
  ],
}

// ── Bans (admin-facing English text, specific & meaningful) ──────────────────

export const banReasons: string[] = [
  'Repeatedly posting spam and advertising external sites after warnings',
  'Soliciting upfront payments via gift cards — confirmed scam pattern',
  'Harassment and abusive language towards other members',
  'Posting prohibited adult content disguised as legitimate services',
  'Multiple fraudulent listings and a ring of fake reviews',
  'Hate speech and discriminatory remarks in public posts',
]

// ── Harmful content for the reports queue (English-only, real behaviour) ─────

export interface HarmfulPost {
  /** POST report category value (see migration 0011). */
  category: 'spam' | 'scam' | 'misleading' | 'inappropriate-content' | 'harmful-language' | 'other'
  title: string
  body: string
  report: string
}

export const harmfulPosts: HarmfulPost[] = [
  {
    category: 'spam',
    title: 'CHEAP SERVICES!!! CLICK NOW!!!',
    body: 'Visit best-deals-online.example for the cheapest services in town!!! Limited offer — message me on WhatsApp to claim your discount before it’s gone!!! Share with everyone!!!',
    report:
      'Pure advertising spam linking to an external site and pushing people off-platform. The same post has been reposted across several categories.',
  },
  {
    category: 'scam',
    title: 'Premium Renovation — Pay a Deposit to Reserve Your Slot',
    body: 'Top-quality renovation at half the usual price. To secure your slot, send a 50% deposit by bank transfer or gift card today. Spaces are filling fast, so act now.',
    report:
      'Asked for a large upfront deposit by gift card and then went silent. Classic advance-fee scam — nothing was ever delivered.',
  },
  {
    category: 'misleading',
    title: 'Free Boiler Installation — No Catch!',
    body: 'Completely free boiler installation for everyone, no conditions whatsoever. Just cover the small “admin fee”, plus parts and labour once we visit.',
    report:
      'Advertised as completely free but then demanded an “admin fee” and extra charges on site. The description is deliberately misleading.',
  },
  {
    category: 'inappropriate-content',
    title: 'Private Massage — Adults Only ;)',
    body: 'Private massage sessions with “extras”. Discreet visits to your hotel or home, no questions asked. Message me for the full menu.',
    report:
      'This listing is clearly advertising adult services disguised as massage, which is not allowed on the platform.',
  },
  {
    category: 'harmful-language',
    title: 'Cleaning Jobs — “Our Kind” Only',
    body: 'Hiring cleaners, but only proper locals need apply. I won’t have certain foreigners in my home and I’ll happily say exactly what I think of them. You know the type.',
    report:
      'The description contains openly xenophobic and discriminatory language targeting foreigners. Hateful and against the rules.',
  },
  {
    category: 'other',
    title: 'Re-selling Sold-Out Tickets at 5x Face Value',
    body: 'Got tickets to the sold-out show, selling at five times face value. First come first served, cash only, absolutely no refunds.',
    report:
      'This isn’t a service at all — it’s ticket touting at extortionate prices and doesn’t belong on the marketplace.',
  },
]

export interface HarmfulThreadMessage {
  from: 'initiator' | 'author'
  text: string
}

export interface HarmfulThread {
  /** MESSAGE report category value. */
  category: 'spam' | 'harassment' | 'harmful-language' | 'inappropriate' | 'scam' | 'other'
  messages: HarmfulThreadMessage[]
  /** Index into `messages` of the message that gets reported. */
  reportIndex: number
  report: string
}

export const harmfulThreads: HarmfulThread[] = [
  {
    category: 'spam',
    messages: [
      { from: 'author', text: 'Hi! Yes, still available — when works for you?' },
      {
        from: 'initiator',
        text: 'Honestly, forget this listing. Everyone should just use cheap-tutors.example, same thing for half the price. Passing it around to everyone!',
      },
    ],
    reportIndex: 1,
    report: 'Used a private chat purely to advertise an external website and lure people off the platform.',
  },
  {
    category: 'harassment',
    messages: [
      { from: 'author', text: 'Hello! Thanks for your interest — what do you need cleaned?' },
      {
        from: 'initiator',
        text: 'Nothing, I just think you’re a joke and a fraud. People like you shouldn’t be allowed online. I’ll make sure everyone hears about it.',
      },
    ],
    reportIndex: 1,
    report: 'Abusive, threatening message with personal insults and no relation to any real booking. I felt harassed.',
  },
  {
    category: 'harmful-language',
    messages: [
      { from: 'initiator', text: 'Hi, could you help with a small repair next week?' },
      {
        from: 'author',
        text: 'I don’t deal with your sort. Go back where you came from and stop taking our jobs.',
      },
    ],
    reportIndex: 1,
    report: 'Hateful, xenophobic reply telling me to “go back where I came from”. Deeply offensive.',
  },
  {
    category: 'inappropriate',
    messages: [
      { from: 'initiator', text: 'Hello, are you free for a photo shoot next week?' },
      {
        from: 'author',
        text: 'Only if you send me some personal pictures first so I can “see what I’m working with”. Don’t be shy.',
      },
    ],
    reportIndex: 1,
    report: 'Replied with inappropriate, sexually suggestive demands instead of discussing the actual booking.',
  },
  {
    category: 'scam',
    messages: [
      { from: 'initiator', text: 'Hi, could I get a quote for a full bathroom renovation?' },
      {
        from: 'author',
        text: 'Sure! First send a €100 gift card to secure your slot — new policy for all clients. Once I have the code we’ll book you in.',
      },
    ],
    reportIndex: 1,
    report: 'Demanded a gift-card payment upfront before doing any work. Obvious scam.',
  },
  {
    category: 'other',
    messages: [
      { from: 'initiator', text: 'Hi, I saw your handyman listing.' },
      {
        from: 'author',
        text: 'Not interested in that job, but I can sell you cheap power tools that “fell off a lorry”, no questions asked. Interested?',
      },
    ],
    reportIndex: 1,
    report: 'Tried to use the chat to sell what are clearly stolen goods.',
  },
]

export interface HarmfulReview {
  /** REVIEW report category value. */
  category: 'spam' | 'misleading' | 'inappropriate' | 'fake-review' | 'other'
  rating: number
  text: string
  report: string
}

export const harmfulReviews: HarmfulReview[] = [
  {
    category: 'fake-review',
    rating: 5,
    text: 'Absolutely amazing, the best in the whole country, hire them right now!!! Ten out of ten, would book a thousand times over!!!',
    report:
      'This person never booked anything with me. The over-the-top review is fabricated — almost certainly a fake account boosting ratings.',
  },
  {
    category: 'spam',
    rating: 5,
    text: 'Great service! By the way, check out my shop at cheap-stuff.example for discounts on absolutely everything!',
    report: 'The “review” is just an advert for the reviewer’s own external shop. Spam, not genuine feedback.',
  },
  {
    category: 'misleading',
    rating: 1,
    text: 'Terrible — they damaged my whole house and stole money straight out of my wallet!',
    report:
      'Wildly false claims; none of this happened and I have records to prove it. The review is misleading and defamatory.',
  },
  {
    category: 'inappropriate',
    rating: 2,
    text: 'Rude and ugly, looked disgusting and smelled even worse. Honestly a repulsive person.',
    report: 'Personal, appearance-based insults with nothing about the actual work. Inappropriate and abusive.',
  },
  {
    category: 'other',
    rating: 1,
    text: 'One star purely because I don’t like the colour of their van. Nothing to do with the work itself.',
    report: 'The review is unrelated to the service and is being used to unfairly drag down the rating.',
  },
]
