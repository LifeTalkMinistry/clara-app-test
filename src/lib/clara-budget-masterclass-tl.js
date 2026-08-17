const SUPPORT = (buttonLabel, userText, eyebrow, text) => ({
  buttonLabel,
  userText,
  eyebrow,
  text,
});

export const TL_BUDGET_MASTERCLASS_TITLE = "Budgeting Masterclass";

export const TL_BUDGET_MASTERCLASS_STEPS = [
  {
    id: "budget-is-a-decision",
    title: "Ano talaga ang budget",
    topic: "Ang budget ay desisyong ginagawa bago gumastos, hindi lang listahan pagkatapos gumastos.",
    text: `Ang budget ay hindi lang listahan ng mga gastos. Isa itong desisyon kung ano ang kailangang gawin ng pera mo bago pa magsimula ang paggastos.\n\nHalimbawa, sumahod ka ng ₱25,000 nang walang budget. Bawat bili ay tinitingnan nang hiwalay: “₱500 lang naman.” “₱300 lang naman.” “₱1,000 lang naman.” Kapag isa-isa, parang kaya naman lahat.\n\nPero hindi hiwa-hiwalay nararanasan ng sahod mo ang mga bili na iyon. Sabay-sabay silang kumukuha mula sa iisang pera. Tinutulungan ka ng budget na makita muna ang buong responsibilidad ng pera mo bago magsimulang mag-agawan ang maliliit na desisyon.`
  },
  {
    id: "balance-is-not-free-money",
    title: "Hindi lahat ng balance ay libreng gastusin",
    topic: "Ang perang nakikita sa account ay maaaring may nakalaan nang responsibilidad.",
    text: `Kapag may nakikita kang pera sa wallet o bank account, hindi ibig sabihin na lahat iyon ay puwede nang gastusin kahit saan.\n\nIsipin mo ang bus na may reserved seats. Mukhang bakante ang upuan ngayon, pero may ticket na pala ang sasakay roon. Ganoon din ang pera mo. May bahagi ng balance na para na sa pagkain, pamasahe, bills, family support, savings, o ibang obligasyon.\n\nTinuturuan ka ng budgeting na huwag lang itanong, “May pera pa ba ako?” Kundi, “Ano na ang responsibilidad ng perang ito?”`
  },
  {
    id: "decide-before-spending",
    title: "Magdesisyon bago bumili",
    topic: "Inililipat ng budgeting ang mahalagang desisyon bago pa dumating ang purchase.",
    text: `Kapag walang budget, kadalasan sa mismong tindahan, app, o sandaling natetempt ka na bumili nangyayari ang desisyon. Mahirap maging objective kapag gusto mo na ang item.\n\nInililipat ng budget ang desisyon sa mas maagang oras. Habang kalmado ka, pinagpapasyahan mo kung gaano kalaking room ang dapat mapunta sa iba't ibang bahagi ng buhay mo. Kapag may purchase na dumating, hindi ka na nagsisimula sa wala. May plano ka nang paghahambingan.\n\nKaya ang budgeting ay hindi lang tungkol sa pagsabi ng “hindi” sa lahat. Mas tungkol ito sa paggawa ng malalaking desisyon bago emosyon ang gumawa ng maliliit na desisyon para sa iyo.`
  },
  {
    id: "give-money-jobs",
    title: "Bigyan ng trabaho ang income mo",
    topic: "Nagiging mas kapaki-pakinabang ang income kapag may nakatalagang responsibilidad at priority.",
    text: `Ang magandang budget ay nagbibigay ng trabaho sa income mo. May perang para sa araw-araw, may para sa obligasyon, may para sa breathing room, may puwedeng i-enjoy, at may para sa savings o goals.\n\nHindi kailangang gumawa ng napakaraming perfect categories. Ang mahalaga ay makita muna ang importanteng trabaho ng pera bago tahimik na mapalitan ng mas mababang priority na gastos.\n\nKung lahat ng piso ay ituturing na equally available, kadalasan ang pinakamalakas at pinaka-urgent na gusto ang mananalo. Binibigyan ng budget ng puwesto ang mas tahimik pero mas mahalagang priorities.`
  },
  {
    id: "essentials-and-flexible",
    title: "Ihiwalay ang fixed needs sa flexible choices",
    topic: "Ang realistic na budget ay naghihiwalay ng mahigpit na obligasyon sa mga gastos na puwedeng gumalaw.",
    text: `Hindi pare-pareho ang kilos ng lahat ng expense. Ang rent, required bills, minimum debt payments, at basic transportation ay maaaring kaunti lang ang room para bawasan. Ang leisure, shopping, deliveries, at ibang lifestyle spending ay kadalasang mas flexible.\n\nKinikilala ng magandang budget ang pagkakaibang iyon. Pinoprotektahan muna ang responsibilities, saka pinagpapasyahan kung gaano kalaking room ang ligtas para sa flexible parts ng buhay.\n\nDahil dito, hindi mo kailangang solusyonan ang bawat money problem sa pamamagitan ng pantay-pantay na pagputol sa lahat. Mas matalino minsan na alamin kung alin ang fixed at alin talaga ang kaya mong i-adjust.`
  },
  {
    id: "planned-and-unplanned",
    title: "Ang planned ay hindi ibig sabihing perfectly predictable",
    topic: "Kayang ihiwalay ng budget ang planned at unexpected spending nang hindi tinatrato ang bawat surprise bilang failure.",
    text: `Hindi susunod nang perpekto ang totoong buhay sa spreadsheet. May mga bagay na lalabas na hindi mo eksaktong naplano. Hindi ibig sabihin noon na bagsak na agad ang buong budget.\n\nAng mahalagang distinction: ang planned spending ay may puwesto na sa plano bago nangyari; ang unplanned spending ay wala. Kapag nakikita mo ang difference, puwede kang matuto rito sa halip na magkunwaring expected lahat ng gastos.\n\nNagiging powerful ang budget kapag tapat nitong ipinapakita ang nangyari, dahil ang katotohanang iyon ang tumutulong gumawa ng mas magandang susunod na cycle.`
  },
  {
    id: "breathing-room",
    title: "Mag-iwan ng breathing room",
    topic: "Ang sustainable na budget ay may makatwirang room para sa ordinaryong surprises at normal na behavior.",
    text: `Ang budget na gumagana lang kapag walang kahit anong unexpected na nangyayari ay marupok na budget. Kailangan ng totoong buhay ng breathing room.\n\nParang maleta na sobrang siksik at halos hindi na maisara ang zipper. Mukhang organized bago bumiyahe, pero kapag may isang maliit na bagay kang kailangang idagdag, nagiging problema ang buong setup.\n\nDapat disciplined ang budget, pero kailangan din nitong kayanin ang reality. Ang reasonable buffer o unplanned-spending allowance ay puwedeng pumigil na isang surprise lang ang sumira sa buong plano.`
  },
  {
    id: "realistic-not-impressive",
    title: "Gawing realistic, hindi impressive",
    topic: "Dapat nakabase ang budget sa totoong behavior at sitwasyon, hindi sa idealized na version ng sarili.",
    text: `Isa sa pinakamabilis na paraan para sumuko sa budgeting ay gumawa ng plano para sa imaginary version ng sarili mo. Kung normal kang gumagastos ng ₱4,000 sa isang necessary category, ang pagsusulat ng ₱1,000 dahil mukhang disciplined ay hindi automatic na discipline. Gumagawa ka lang ng planong malamang mabasag.\n\nPuwede ka pa ring hamunin ng strong budget, pero kailangang believable ang challenge. Magsimula sa tunay na cost ng buhay mo, hanapin kung saan posible ang pagbabago, at unti-unting mag-improve.\n\nHindi goal na magmukhang impressive ang numbers sa day one. Ang goal ay gumawa ng planong kaya mong aktwal na isabuhay.`
  },
  {
    id: "payday-behavior",
    title: "Sa payday nagsisimulang gumana ang budget",
    topic: "Pinakamahalaga ang plano kapag bagong dating ang income at pinakamalaki ang pakiramdam ng spending freedom.",
    text: `Kapag payday, puwedeng magkaroon ng temporary feeling na marami kang pera. Biglang malaki ang balance, kaya ang purchases na mahal kahapon ay parang maliit ngayon.\n\nDito mismo mahalaga ang budget. Bago lumaki ang lifestyle spending kasabay ng bagong balance, ipinapaalala ng plano kung ano ang kailangang dalhin ng income hanggang sa susunod na cycle.\n\nHindi inaalis ng budgeting ang magandang feeling ng payday. Tinutulungan nitong mas tumagal iyon kaysa sa unang ilang araw.`
  },
  {
    id: "sticking-to-the-plan",
    title: "Gamitin ang budget habang gumagastos",
    topic: "Nagbabago lang ang behavior kapag kinokonsulta ang budget habang nangyayari ang spending decisions.",
    text: `Ang paggawa ng budget tapos hindi na ito tinitingnan ay parang gumawa ng mapa pero iniwan sa bahay. Nagiging useful ang plano kapag chine-check mo ito habang nangyayari ang desisyon.\n\nBago ang flexible purchase, tingnan kung ano pa ang natitira at ano pa ang kailangang mangyari bago matapos ang cycle. Ang maliit na pause na iyon ang nagdudugtong sa choice mo ngayon sa natitirang bahagi ng buwan.\n\nKaya mahalaga ang habit ng CLARA na “Ask before you spend.” Ang pag-record pagkatapos gumastos ay history. Ang pag-check bago gumastos ay pagkakataong baguhin ang outcome.`
  },
  {
    id: "overspending-is-information",
    title: "Ang overspending ay impormasyon, hindi katapusan",
    topic: "Kapag lumampas sa category, dapat itong maging signal para mag-review at mag-recover, hindi dahilan para iwan ang budget.",
    text: `Kapag nag-overspend ka, isa sa pinakamasamang response ay, “Nasira na. Next month na lang ulit.” Hindi binubura ng isang pagkakamali ang natitirang plano.\n\nSa halip, itanong kung ano ang ibig sabihin ng overspending. Unrealistic ba ang original amount? May unexpected need ba? Impulse ba ito na iba ang gagawin mo next time? Kailangan bang bawasan ang ibang flexible category?\n\nHindi purpose ng budget na patunayan na hindi ka nagkakamali. Purpose nitong tulungan kang mapansin ang problema habang may oras ka pang gumawa ng adjustment.`
  },
  {
    id: "realign-dont-pretend",
    title: "Mag-realign kapag nagbago ang buhay",
    topic: "Puwedeng baguhin ang budget nang intentional kapag nagbago ang circumstances.",
    text: `Ang pagbabago ng budget ay hindi automatic na cheating. Minsan mali ang unang plan. Minsan nagbago ang buhay. Minsan may bagong responsibilidad.\n\nAng mahalagang difference ay kung intentional kang nagre-realign o nire-rewrite mo lang ang plano pagkatapos ng bawat impulse para walang mukhang unplanned.\n\nAng useful budget ay sapat na firm para gabayan ka at sapat na flexible para manatiling connected sa reality. Kapag may meaningful na pagbabago, i-update ang plano nang conscious at alam mo kung bakit.`
  },
  {
    id: "close-and-learn",
    title: "Tapusin ang cycle at matuto rito",
    topic: "Ang pag-close ng budget cycle ay nagbibigay ng feedback para sa susunod.",
    text: `Sa dulo ng budget cycle, huwag husgahan ang success base lang sa kung perfect ang bawat category. Tingnan ang pattern. Saan ka consistent? Saan ka nag-underestimate? Anong unplanned expenses ang paulit-ulit? Anong decisions ang nakatulong?\n\nGinagawang impormasyon ng review ang isang buwan para sa susunod. Mas maganda ang second budget kaysa first dahil may evidence ka na. Mas maganda pa ang third.\n\nNagiging mas madali ang budgeting kapag bawat cycle ay nagtuturo sa susunod.`
  },
  {
    id: "consistency-creates-control",
    title: "Ang tunay na goal ay financial control",
    topic: "Ang budgeting ay paulit-ulit na decision system na gumagawa ng clarity at control over time.",
    text: `Ang tunay na achievement ay hindi magandang spreadsheet. Ito ay ang punto na naiintindihan mo kung ano ang kailangang gawin ng pera mo, napapansin mo kapag lumilihis ang spending, at nakakagawa ka ng adjustment bago lumaki ang maliliit na problema.\n\nAng control na iyon ay nagbibigay ng breathing room. Mas intentional kang nakaka-save, nakakapaghanda sa emergencies, nakakapunta sa goals, at nakaka-enjoy ng pera nang mas kaunti ang uncertainty dahil visible ang priorities mo.\n\nKaya ang budget ay hindi punishment. Isa itong paulit-ulit na system para masundan ng pera ang decisions mo sa halip na lagi kang mag-react kapag nawawala na ito.`
  },
];

export const TL_BUDGET_MASTERCLASS_SUPPORT_SEQUENCE = {
  "budget-is-a-decision": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang sahod mo na parang birthday cake na kailangang pagsaluhan ng maraming tao. Kapag naghiwa ka agad nang hindi muna iniisip kung ilan ang kakain, maaaring mukhang okay ang unang mga hiwa. Pero sa huli, baka kulangin ang cake para sa iba.\n\nAng budget ay parang paghahati muna ng cake bago magsimula ang serving. Tinitingnan mo muna lahat ng kailangang paglaanan ng pera, saka mo malalaman kung gaano kalaking bahagi ang ligtas para sa bawat choice.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Halimbawa, pumasok ang ₱25,000 na sahod. Bumili ka ng ₱700 na meal, ₱900 na item online, gumastos ng ₱500 sa ride, at may ilan pang maliliit na bili. Wala namang mukhang delikado kapag isa-isa.\n\nPero ang rent, pagkain, pamasahe, family support, at savings ay lahat kukuha rin sa parehong ₱25,000. Hindi isang purchase ang problema. Ang problema ay bawat desisyon ay ginawa nang hindi sabay na nakikita ang ibang responsibilities.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Isang tanong ang sinasagot ng budget bago ka gumastos: “Ano ang kailangang gawin ng perang ito?”\n\nKapag walang sagot, bawat purchase ay puwedeng magmukhang valid. Kapag may budget, kailangang pumasok ang bawat purchase sa mas malaking plano.\n\nPinakasimpleng rule: desisyunan muna ang buong trabaho ng pera bago magsimulang kumuha ng piraso ang maliliit na gastos.`),
  ],
  "balance-is-not-free-money": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang account balance na parang isang kahon na may maraming sobre sa loob. Maaaring ₱10,000 ang laman ng kahon, pero may sobre na para sa rent, pagkain, pamasahe, at savings. Kapag total lang ang tinitingnan mo, nawawala ang mga assignment na iyon.\n\nHindi lang mahalaga kung magkano ang nakikita. Mas mahalaga kung magkano ang natitira pagkatapos igalang ang mga trabahong nakatalaga na sa pera.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Sabihin nating ₱8,000 ang nakikita sa account mo. Parang may ₱8,000 kang puwedeng gamitin. Pero baka ₱3,000 ay para na sa bill, ₱2,000 sa pagkain hanggang payday, at ₱1,500 sa pamasahe.\n\n₱8,000 pa rin ang visible balance, pero mas maliit ang tunay na flexible amount. Dito ka pinoprotektahan ng budget laban sa false confidence na binibigay ng malaking balance.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Puwedeng nasa account ang pera pero hindi ibig sabihing available ito sa random spending.\n\nHuwag lang itanong, “Magkano ang pera ko?” Itanong din, “Magkano rito ang wala pang ibang trabaho?”\n\nSinasabi ng balance kung ano ang hawak mo. Sinasabi ng budget kung ano talaga ang libre mong gamitin.`),
  ],
  "decide-before-spending": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Ang budgeting ay parang pagpili ng ruta bago mag-drive. Kung sa bawat kanto ka pa lang magdedesisyon kung saan pupunta, madaling baguhin ng pinakamadaling daan ang direksyon mo.\n\nBinibigyan ka ng budget ng ruta habang kalmado ka pa. Kapag may purchase na lumitaw, hindi mo kailangang gumawa ng bagong financial rule habang nandiyan na ang temptation.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Halimbawa, may nakita kang ₱1,200 sale habang nagso-scroll sa gabi. Kung walang prior plan, nagiging “Gusto ko ba ito?” at “Kaya ko pa ba?” ang usapan.\n\nKung napagdesisyunan mo nang ₱1,000 lang ang shopping room mo sa cycle, nag-iiba ang tanong. Ikinukumpara mo na ang purchase sa naunang desisyon sa halip na hayaan ang sale ang gumawa ng rule para sa iyo.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Pinakamagandang oras para magtakda ng spending limits ay bago mo gustuhin ang isang bagay.\n\nInililipat ng budget ang decision mula sa emotional moment papunta sa planning moment.\n\nMagplano muna. Mag-compare pagkatapos. Mas madali iyon kaysa gumawa ng discipline sa checkout screen.`),
  ],
  "give-money-jobs": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang income bilang maliit na team ng workers. Kung walang assigned na trabaho, ang unang sumigaw ang makakakuha ng oras nila. Pero kung may malinaw na responsibility ang bawat isa, napoprotektahan ang importanteng work.\n\nGanoon din ang pesos mo. Ang pagbibigay ng trabaho sa pera ay pagdedesisyon kung alin ang para sa daily life, protection, goals, at enjoyment.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Ang ₱30,000 na income ay maaaring kailangang sumagot sa housing, food, transport, family responsibilities, savings, at personal spending. Kung isang malaking undivided amount lang ang tingin mo sa ₱30,000, puwedeng ubusin ng isang weekend ang perang para sana sa mas tahimik na responsibility.\n\nHindi kailangan ng maraming category. Kailangan lang may puwesto muna ang importanteng trabaho bago dumating ang wants.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Kapag walang trabaho ang pera, madaling angkinin ito ng kahit ano.\n\nBigyan muna ng puwesto ang importanteng bagay. Saka mo tingnan kung ano ang natitira para sa flexible choices.\n\nHindi kailangang kontrolin nang obsessive ang bawat piso. Ang point ay mauna ang priorities bago impulses.`),
  ],
  "essentials-and-flexible": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang bahay na may pader at furniture. Mahirap ilipat ang pader; puwedeng ayusin ang furniture. May expenses na parang pader at may expenses na parang furniture.\n\nAlam ng realistic budget kung alin ang hard commitment at alin ang kaya talagang gumalaw. Hindi mo pipilitin ang savings sa category na halos wala namang room magbago.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Kung ₱6,000 ang rent at ₱2,000 ang required debt payment, hindi maaayos ang budget sa pagkunwaring puwede silang maging ₱3,000 at ₱500. Pero ang deliveries, leisure, shopping, o ilang food choices ay maaaring mas adjustable.\n\nProtektahan muna ang kailangang mangyari, saka gumawa ng deliberate changes kung saan may tunay na flexibility.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `May expenses na commitments. May expenses na choices na puwedeng gumalaw.\n\nProtektahan muna ang commitments. I-adjust ang flexible categories pagkatapos.\n\nHindi smart budget ang pantay-pantay na pag-cut sa lahat. Smart budget ang alam kung saan posible ang pagbabago.`),
  ],
  "planned-and-unplanned": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang travel plan. Puwede mong planuhin ang route, hotel, at transportation, pero puwede pa ring umulan o ma-delay. Hindi ibig sabihin na walang silbi ang planning. May bago ka lang impormasyong kailangan tugunan.\n\nGanoon din ang budget. Ang planned spending ay may puwesto na. Ang unplanned spending ay wala. Mahalaga ang difference para matuto nang hindi tinatawag na failure ang bawat surprise.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Nag-budget ka para sa pagkain, fare, bills, at savings, tapos biglang kailangan ng gamot o repair. Unplanned iyon, pero hindi nito binubura ang mga desisyong tama mong ginawa.\n\nI-record ito nang honest, tingnan kung ano ang nabago, at tanungin kung dapat bang may mas malaking room para sa ganitong expense sa next cycle.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Hindi promise ng plan na walang unexpected na mangyayari.\n\nBinibigyan ka nito ng malinaw na difference sa expected at surprise.\n\nUseful information ang difference na iyon. Gamitin ito para pagandahin ang next budget sa halip na sabihing failure ang buong plan.`),
  ],
  "breathing-room": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang basong punong-puno hanggang gilid. Kahit maliit na alog, matatapon. Kapag may kaunting bakanteng space, mas madaling dalhin.\n\nAng budget na walang kahit anong room para sa normal surprises ay parang overfilled glass. Hindi sayang ang breathing room; iyon ang tumutulong para mabuhay ang plan kapag may maliit na pagbabago.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Kung sobrang higpit na assigned ang bawat piso at walang natitira, ang ₱300 na dagdag pamasahe, gamot, school contribution, o unexpected meal ay walang mapupuntahan. Mapipilitan kang kumuha sa ibang category o iwan ang plan.\n\nKahit modest buffer lang, may landing place na ang maliliit na surprises. Hindi na kailangang maging maraming problema ang isang unexpected expense.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Huwag gumawa ng budget na gumagana lang sa perfect month.\n\nMag-iwan ng reasonable room para sa reality.\n\nDirection ang binibigay ng discipline; durability ang binibigay ng breathing room.`),
  ],
  "realistic-not-impressive": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Ang budget ay parang workout plan. Mukhang impressive ang “20 kilometers araw-araw,” pero kung dalawang kilometers pa lang ang tunay mong starting point, mas malamang na sumuko ka kaysa gumaling.\n\nAng useful budget ay nagsisimula sa tunay mong buhay at humihingi ng believable improvement. Ang imaginary plan ay maganda lang sa papel.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Kung nasa ₱4,000 talaga ang necessary food spending mo, ang pag-set nito sa ₱1,000 nang walang real change sa situation ay hindi gumagawa ng ₱3,000 savings. Gumagawa lang ito ng gap sa plan at reality.\n\nMas magandang test ang ₱3,600, alamin kung ano ang kailangang baguhin, at i-review ang result. Ang improvement na nauulit ay mas malakas kaysa dramatic target na iniiwan.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Dapat ilarawan ng budget ang buhay na kaya mong isabuhay, hindi ang taong gusto mong maging overnight.\n\nMagsimula nang honest. Mag-improve nang deliberate.\n\nMas powerful ang realistic budget na nauulit kaysa impressive budget na hindi nasusunod.`),
  ],
  "payday-behavior": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Ang payday ay parang pagsisimula ng mahabang biyahe na full tank ang gasolina. Marami ang fuel sa simula, pero kailangan pa rin nitong umabot hanggang destination.\n\nPinapaalala ng budget na ang malaking balance ngayon ay hindi lang para ngayon. Kailangang dalhin nito ang buong income cycle.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Kapag ₱20,000 ang balance sa payday, puwedeng magmukhang maliit ang ₱1,500 na purchase. Pagkalipas ng ilang araw at ilang “maliit” na gastos, kailangan mo pa ring pondohan ang dalawang linggong pagkain, pamasahe, bills, at iba pang obligasyon.\n\nPinaka-useful ang budget kapag pinakamalaki ang balance, dahil doon pinakamadaling makalimutan kung gaano katagal dapat tumagal ang pera.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Ipinapakita ng payday ang pinakamaraming pera, hindi ang pinakamaraming freedom.\n\nMay kailangan pa ring dalhin ang balance hanggang matapos ang cycle.\n\nGamitin ang budget nang maaga bago gawing afterthought ng abundance feeling ang future responsibilities.`),
  ],
  "sticking-to-the-plan": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Ang budget ay parang speedometer. Useful na alam mo ang speed limit bago mag-drive, pero kailangan mo pa ring tumingin sa dashboard habang umaandar ang sasakyan.\n\nGanoon din ang spending plan. Kailangan itong i-check habang may actual decisions para makapagbigay ng information sa oras na puwede ka pang pumili nang iba.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Halimbawa, ₱800 na lang ang leisure budget mo at sampung araw pa bago payday. Bago gumastos ng ₱600 ngayong gabi, ipinapakita ng plan na ₱200 na lang ang matitira sa buong natitirang cycle.\n\nHindi automatic na “no” iyon. Pero nakikita mo ang consequence bago ka magdesisyon. Dito nagiging practical ang “Ask before you spend.”`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Hindi ka magagabayan ng budget kung hindi mo ito titingnan.\n\nMag-check bago ang flexible spending, hindi lang pagkatapos.\n\nAng recording pagkatapos ay nagsasabi kung ano ang nangyari. Ang checking bago ay nagbibigay ng chance para baguhin ang susunod na mangyayari.`),
  ],
  "overspending-is-information": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo na nalampasan mo ang isang turn habang gumagamit ng navigation. Hindi sasabihin ng mapa na tapos na ang biyahe. Magre-recalculate lang ito mula sa kinaroroonan mo.\n\nGanoon dapat tingnan ang overspending. Hindi itapon ang budget, kundi alamin kung ano ang nagbago at paano ia-adjust ang natitirang cycle.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Kung ₱2,000 ang dining budget mo at umabot ka sa ₱2,400, may impormasyon ka na. Baka unrealistic ang original amount, baka may unusual event, o baka maraming impulses ang nag-add up.\n\nPuwede mong bawasan ang ibang flexible category, huminto muna sa dining spending, o gamitin ang lesson para sa next month. Nagiging useful ang mistake kapag binabago nito ang susunod mong decision.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Signal ang overspending, hindi permission na sumuko.\n\nAlamin ang cause, i-adjust ang kaya mo pa, at panatilihing buhay ang natitirang plan.\n\nHindi kailangang masira ang buong buwan dahil lang lumampas ang isang category.`),
  ],
  "realign-dont-pretend": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Ang budget ay parang route, hindi kontratang inukit sa bato. Kung totoong sarado ang daan, sensible na magpalit ng ruta. Pero kung lagi mong binabago ang destination dahil may mas exciting na daan, wala nang guidance ang route.\n\nAng realignment ay pagbabago dahil meaningful na nagbago ang reality habang pinoprotektahan pa rin ang purpose ng plan.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Halimbawa, biglang tumaas ng ₱1,500 ang family responsibility. Responsible na i-update ang budget at bawasan ang isang flexible category para bigyan ito ng room.\n\nIba iyon sa impulsive purchase tapos ie-edit ang budget para lang magmukhang “planned.” Ang una ay response sa reality; ang pangalawa ay pagbura ng accountability.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Baguhin ang budget kapag nagbago ang buhay, hindi lang kapag gusto mong i-excuse ng numbers ang isang decision.\n\nPuwedeng gumalaw ang useful plan, pero dapat may dahilan.\n\nMag-realign nang intentional. Huwag i-rewrite ang history.`),
  ],
  "close-and-learn": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Isipin mo ang bawat budget cycle na parang isang practice session. Hindi mo huhusgahan ang practice base lang sa kung perfect ang bawat move. Titingnan mo kung ano ang gumana, ano ang paulit-ulit na mali, at ano ang kailangang baguhin next time.\n\nAng pag-close ng cycle ay ginagawang feedback ang spending mo. Mas matibay ang susunod na budget dahil totoong patterns mo na ang basehan.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Sa month-end, baka makita mong laging mas mataas ang transportation kaysa plan, tama naman ang food, at may “unexpected” small purchases bawat linggo. May sinasabi iyon.\n\nSa next cycle, puwede mong gawing mas realistic ang transportation, panatilihin ang food, at gumawa ng mas magandang room o rules para sa repeated unplanned purchases.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Huwag tapusin ang budget tapos kalimutan.\n\nTingnan kung ano ang itinuro ng cycle at gamitin ang evidence sa susunod.\n\nGanito gumagaling ang budget: plan, isabuhay, review, adjust, repeat.`),
  ],
  "consistency-creates-control": [
    SUPPORT("Ipakita sa ibang paraan", "Ipakita mo sa akin sa ibang paraan.", "CLARA · IBANG PARAAN · 1/3", `Ang financial control ay parang pag-aaral mag-steer. Hindi goal na perfectly straight ang daan bawat segundo. Goal na mapansin kapag lumilihis at gumawa ng maliliit na correction bago ka mapalayo.\n\nBinibigyan ka ng budgeting ng steering system para sa pera. Kapag inuulit mo ito, mas maaga mong napapansin ang drift.`),
    SUPPORT("Bigyan ako ng totoong halimbawa", "Ipakita mo kung paano ito nangyayari sa totoong buhay.", "CLARA · SA TOTOONG BUHAY · 2/3", `Pagkatapos ng ilang budget cycles, maaari mo nang malaman kung magkano talaga ang daily life, gaano kalaking flexible spending ang safe, anong expenses ang madalas sumurpresa, at magkano ang realistic na mapoprotektahan para sa savings o emergencies.\n\nMas kaunti na ang guesswork. Hindi ka na naghihintay na bumaba ang balance bago kumilos. Mas maaga mong nakikita ang problema habang may room ka pang mag-adjust.`),
    SUPPORT("Pinakasimpleng version", "Ibigay mo ang pinakasimpleng version nito.", "CLARA · PINAKASIMPLE · 3/3", `Hindi perfect categories ang goal ng budgeting. Control ang goal.\n\nControl means alam mo ang trabaho ng pera, napapansin mo kapag lumilihis ang spending, at nakaka-adjust ka bago lumaki ang problema.\n\nKapag inuulit mo ito, mas sinusunod ng pera ang decisions mo sa halip na lagi kang ginugulat.`),
  ],
};

export const TL_BUDGET_MASTERCLASS_INTRO = `Hindi lang kung ano ang budget — dadaan tayo sa kung bakit puwedeng mabilis mawala ang pera kahit parang affordable ang bawat individual purchase, paano gumawa ng realistic na budget, paano ito gamitin habang gumagastos, at ano ang gagawin kapag hindi naging perfect ang plano.\n\nIkaw ang may control sa pace. Pagkatapos ng bawat importanteng point, puwede kang magpatuloy, magtanong, o magbukas ng hanggang tatlong authored supporting explanations: ibang perspective, totoong example, at pinakasimpleng version. Kung gusto mo pa rin ng tulong pagkatapos ng tatlo, puwede kang magpatuloy sa Masterclass o mag-schedule ng live conversation with CLARA.`;

export const TL_BUDGET_MASTERCLASS_FINISH = `Nakarating ka na sa dulo ng core Budgeting Masterclass.\n\nKung may bahagi pa ring hindi malinaw, hindi mo kailangang magkunwaring gets mo na. Puwede kang magtanong pa. Kung malinaw na ang framework, puwede mong tapusin dito at simulan itong gamitin sa totoong buhay.\n\nHindi goal na kabisaduhin ang bawat sentence. Ang goal ay maintindihan ang system nang sapat para magamit sa real spending decisions.`;

export const TL_BUDGET_MASTERCLASS_CLOSING = `Ayos. Tandaan ang pinakasimpleng version: desisyunan kung ano ang kailangang gawin ng pera bago gumastos, gawing realistic ang plan, i-check ito habang gumagawa ng decisions, at mag-realign kaysa sumuko kapag nagbago ang buhay.\n\nHindi mo kailangan ng perfect budget. Kailangan mo ng budget na kaya mong patuloy na gamitin.`;
