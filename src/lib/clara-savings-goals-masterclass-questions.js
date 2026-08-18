const q = (question, answer, anotherWay, realLife, simplest) => [
  question,
  answer,
  anotherWay,
  realLife,
  simplest,
];

const questionSet = (first, second) => [first, second];

export const SAVINGS_GOALS_MASTERCLASS_QUESTION_DATA = {
  "savings-goal-is-direction": {
    en: questionSet(
      q(
        "Can I have a Savings Goal even if I can only protect a small amount?",
        "Yes. The goal begins with direction, not size. A small amount can still be intentionally assigned to a future purpose and protected from unrelated spending.",
        "Think of the first amount as the first piece of the destination, not as proof that the destination is already close.",
        "If your certification goal is ₱12,000 and you can protect ₱300 today, that ₱300 already has a clear job even though most of the target remains.",
        "Yes. Small money can still have a clear future job."
      ),
      q(
        "Is a general plan to ‘save more’ the same as a Savings Goal?",
        "Not quite. ‘Save more’ is a useful intention, but a Savings Goal names the purpose the money is waiting for, which makes the protection more concrete.",
        "General saving says, ‘Keep more money.’ A goal adds, ‘Keep this money because it is for this specific future purpose.’",
        "‘Save ₱5,000’ is general. ‘Protect ₱5,000 for my license renewal and documents’ gives the money a defined destination.",
        "Saving more is an intention. A Savings Goal gives the saved money a named purpose."
      )
    ),
    tl: questionSet(
      q(
        "Puwede ba akong magkaroon ng Savings Goal kahit maliit lang ang kaya kong i-protect?",
        "Oo. Nagsisimula ang goal sa direction, hindi sa laki. Kahit maliit na amount ay puwedeng italaga sa future purpose at protektahan mula sa unrelated spending.",
        "Isipin ang first amount bilang unang piraso ng destination, hindi proof na malapit ka na agad sa finish line.",
        "Kung ₱12,000 ang certification goal at ₱300 lang ang kaya mong i-protect ngayon, may malinaw nang trabaho ang ₱300 na iyon kahit malayo pa ang target.",
        "Oo. Kahit maliit na pera puwedeng magkaroon ng malinaw na future job."
      ),
      q(
        "Pareho ba ang ‘mag-save pa’ at isang tunay na Savings Goal?",
        "Hindi eksakto. Useful ang ‘mag-save pa’ bilang intention, pero pinapangalanan ng Savings Goal kung anong future purpose ang hinihintay ng pera kaya mas concrete ang protection.",
        "General saving: ‘Magtabi ng mas maraming pera.’ Savings Goal: ‘Itabi ang perang ito dahil para ito sa specific na purpose na ito.’",
        "‘Mag-save ng ₱5,000’ ay general. ‘₱5,000 para sa license renewal at documents’ ay may defined destination.",
        "Ang save more ay intention. Ang Savings Goal ay named purpose para sa pera."
      )
    ),
    es: questionSet(
      q(
        "¿Puedo tener una Meta de Ahorro aunque solo pueda proteger una cantidad pequeña?",
        "Sí. La meta comienza con dirección, no con tamaño. Una cantidad pequeña todavía puede asignarse intencionalmente a un propósito futuro y protegerse de gastos no relacionados.",
        "Piensa en la primera cantidad como la primera pieza del destino, no como prueba de que ya estás cerca de llegar.",
        "Si tu certificación cuesta ₱12,000 y hoy solo puedes proteger ₱300, esos ₱300 ya tienen un trabajo claro aunque falte mucho para el objetivo.",
        "Sí. Una cantidad pequeña también puede tener un trabajo futuro claro."
      ),
      q(
        "¿Un plan general de ‘ahorrar más’ es lo mismo que una Meta de Ahorro?",
        "No exactamente. ‘Ahorrar más’ es una intención útil, pero una Meta de Ahorro nombra el propósito que espera ese dinero y vuelve más concreta la protección.",
        "Ahorrar en general dice, ‘Conserva más dinero.’ Una meta añade, ‘Conserva este dinero porque es para este propósito futuro.’",
        "‘Ahorrar ₱5,000’ es general. ‘Proteger ₱5,000 para renovar mi licencia y documentos’ tiene un destino definido.",
        "Ahorrar más es una intención. Una Meta de Ahorro da al dinero un propósito con nombre."
      )
    ),
  },
  "give-the-goal-a-reason": {
    en: questionSet(
      q(
        "What if my reason is something optional like travel?",
        "Optional does not automatically mean wrong. The lesson is to make the purpose explicit so you can decide whether it fits alongside your current responsibilities and priorities.",
        "CLARA is not grading the category. It is helping you see what the money is for before you protect it.",
        "A travel goal can be reasonable if you choose it intentionally and it is not pretending to be rent, emergency protection, or another responsibility.",
        "A goal can be optional. What matters is that you know why the money is being protected."
      ),
      q(
        "Can the reason for a Savings Goal change later?",
        "Yes. Real life can change. If the purpose genuinely changes, realign the goal deliberately rather than quietly treating the old purpose as if it never existed.",
        "A reason is a current decision, not a lifetime contract. The important part is making the change visible and intentional.",
        "You may start saving for a phone, then decide a certification matters more. You can realign the protection instead of pretending the money was always for the certification.",
        "Yes. You can change the reason—just change it deliberately."
      )
    ),
    tl: questionSet(
      q(
        "Paano kung optional lang ang reason ko, tulad ng travel?",
        "Hindi automatic na mali ang optional. Ang lesson ay gawing explicit ang purpose para makapag-decide ka kung bagay ito kasama ng current responsibilities at priorities mo.",
        "Hindi kino-correct ni CLARA ang category mo. Tinutulungan ka lang nitong makita muna kung para saan ang pera bago mo protektahan.",
        "Puwedeng reasonable ang travel goal kung intentional ito at hindi mo ito ipinapanggap na rent, emergency protection, o ibang responsibility.",
        "Puwedeng optional ang goal. Ang mahalaga ay alam mo kung bakit protected ang pera."
      ),
      q(
        "Puwede bang magbago later ang reason ng Savings Goal?",
        "Oo. Nagbabago ang real life. Kung talagang nagbago ang purpose, i-realign nang deliberate ang goal kaysa palabasing hindi kailanman umiral ang old purpose.",
        "Current decision ang reason, hindi lifetime contract. Ang mahalaga ay visible at intentional ang pagbabago.",
        "Puwede kang magsimula sa phone goal tapos mapagtantong mas importante ang certification. I-realign ang protection kaysa palabasing certification na iyon mula umpisa.",
        "Oo. Puwedeng magbago ang reason—basta deliberate ang change."
      )
    ),
    es: questionSet(
      q(
        "¿Qué pasa si mi razón es algo opcional, como un viaje?",
        "Que sea opcional no significa automáticamente que esté mal. La lección es hacer explícito el propósito para decidir cómo encaja con tus responsabilidades y prioridades actuales.",
        "CLARA no está calificando la categoría. Te ayuda a ver para qué es el dinero antes de protegerlo.",
        "Una meta de viaje puede ser razonable si la eliges intencionalmente y no la presentas como alquiler, protección de emergencia u otra responsabilidad.",
        "Una meta puede ser opcional. Lo importante es saber por qué estás protegiendo el dinero."
      ),
      q(
        "¿Puede cambiar después la razón de una Meta de Ahorro?",
        "Sí. La vida cambia. Si el propósito cambia de verdad, realinea la meta deliberadamente en lugar de actuar como si el propósito anterior nunca hubiera existido.",
        "La razón es una decisión actual, no un contrato de por vida. Lo importante es que el cambio sea visible e intencional.",
        "Puedes empezar ahorrando para un teléfono y después decidir que una certificación importa más. Puedes realinear la protección sin fingir que siempre fue para la certificación.",
        "Sí. Puedes cambiar la razón; hazlo de forma deliberada."
      )
    ),
  },
  "give-the-goal-a-finish-line": {
    en: questionSet(
      q(
        "What if I do not know the exact cost of my goal yet?",
        "Use a reasonable working target based on what you currently know, then update it deliberately when better information arrives. A target can guide you without pretending to be perfectly final.",
        "The finish line can be provisional. It is better to have a thoughtful estimate you can revise than a vague goal with no operational amount at all.",
        "If a course is likely to cost between ₱18,000 and ₱22,000, you might start with a ₱20,000 working target and adjust when the official fee is confirmed.",
        "Use your best reasonable target now. Update it when the real amount becomes clearer."
      ),
      q(
        "Should I choose a bigger target just to be safer?",
        "Only when the purpose genuinely needs that buffer. A bigger number is not automatically better; the target should reflect what ‘enough’ reasonably means for this specific goal.",
        "Do not enlarge the finish line to make the goal look more serious. Add margin only when it serves the actual purpose.",
        "If a laptop costs about ₱30,000 and you reasonably expect ₱2,000 for accessories, a ₱32,000 target may make sense. Choosing ₱60,000 just because it sounds safer may not describe the same goal anymore.",
        "Set the target for the real job, not for a bigger-looking number."
      )
    ),
    tl: questionSet(
      q(
        "Paano kung hindi ko pa alam ang exact cost ng goal?",
        "Gumamit ng reasonable working target base sa alam mo ngayon, tapos i-update nang deliberate kapag may mas accurate na information. Puwedeng gumabay ang target kahit hindi pa final.",
        "Puwedeng provisional ang finish line. Mas useful ang thoughtful estimate na puwedeng i-revise kaysa goal na walang operational amount.",
        "Kung estimated na ₱18,000–₱22,000 ang course, puwedeng magsimula sa ₱20,000 working target at i-adjust kapag confirmed na ang official fee.",
        "Gamitin ang best reasonable target ngayon. I-update kapag mas malinaw na ang real amount."
      ),
      q(
        "Dapat ba mas malaking target na lang para mas safe?",
        "Kung kailangan lang talaga ng purpose ang buffer na iyon. Hindi automatic na better ang mas malaking number; dapat ilarawan ng target kung ano ang reasonably ‘enough’ para sa specific goal.",
        "Huwag palakihin ang finish line para lang magmukhang mas serious ang goal. Magdagdag ng margin kung may actual purpose ito.",
        "Kung ₱30,000 ang laptop at reasonable ang ₱2,000 accessories, puwedeng sensible ang ₱32,000. Pero ang ₱60,000 dahil lang ‘mas safe’ ay baka ibang goal na iyon.",
        "I-set ang target para sa real job, hindi para lang mas malaki ang number."
      )
    ),
    es: questionSet(
      q(
        "¿Qué hago si todavía no conozco el costo exacto de mi meta?",
        "Usa un objetivo de trabajo razonable con lo que sabes hoy y actualízalo deliberadamente cuando tengas mejor información. El objetivo puede guiarte sin fingir que ya es definitivo.",
        "La línea de llegada puede ser provisional. Es mejor una estimación pensada que puedas revisar que una meta vaga sin cantidad operativa.",
        "Si un curso probablemente cuesta entre ₱18,000 y ₱22,000, puedes empezar con ₱20,000 y ajustarlo cuando se confirme la tarifa oficial.",
        "Usa el mejor objetivo razonable ahora. Actualízalo cuando el monto real sea más claro."
      ),
      q(
        "¿Debería elegir un objetivo más grande solo para estar más seguro?",
        "Solo si el propósito realmente necesita ese margen. Un número más grande no es automáticamente mejor; el objetivo debe representar lo que ‘suficiente’ significa razonablemente para esa meta.",
        "No agrandes la línea de llegada para que la meta parezca más seria. Añade margen cuando sirva al propósito real.",
        "Si una laptop cuesta cerca de ₱30,000 y esperas ₱2,000 de accesorios, ₱32,000 puede tener sentido. Elegir ₱60,000 solo porque suena más seguro quizá ya describa otra meta.",
        "Define el objetivo para el trabajo real, no para mostrar un número mayor."
      )
    ),
  },
  "goal-vs-emergency-fund": {
    en: questionSet(
      q(
        "Can the same money count as both a Savings Goal and my Emergency Fund?",
        "Avoid double-counting the same protected amount for two different jobs. If the money is assigned to an Emergency Fund, treating the exact same pesos as fully available for a separate planned goal would make your protection look stronger than it really is.",
        "One pool of money can only do one job at the same moment without creating a conflict. Keep the labels honest about what those pesos are protecting.",
        "If ₱10,000 is your emergency reserve, also claiming that same ₱10,000 as fully funded travel savings would make both plans depend on the same money.",
        "Do not count the same protected pesos twice."
      ),
      q(
        "What if a planned expense suddenly feels urgent?",
        "Urgency by itself does not turn a known or chosen expense into an emergency. Ask whether the situation is truly an unexpected financial disruption or simply a planned purpose whose deadline is now close.",
        "A deadline can create pressure without changing the job of the money. Keep planned needs and emergency protection conceptually separate.",
        "Tuition due tomorrow can feel urgent, but if the tuition was known in advance it is still a planned responsibility rather than automatically an emergency event.",
        "Urgent does not always mean emergency."
      )
    ),
    tl: questionSet(
      q(
        "Puwede bang parehong Savings Goal at Emergency Fund ang exact same money?",
        "Iwasang i-double-count ang parehong protected amount para sa dalawang magkaibang trabaho. Kung Emergency Fund na ang pera, hindi honest na sabihing fully available din ang exact same pesos para sa separate planned goal.",
        "Isang pool ng pera ay hindi kayang gumawa ng dalawang full jobs sabay nang walang conflict. Panatilihing honest ang label kung ano talaga ang pinoprotektahan ng pesos.",
        "Kung ₱10,000 ang emergency reserve mo, hindi rin puwedeng sabihing fully funded travel savings ang parehong ₱10,000 nang hindi nagdo-double-count.",
        "Huwag i-count twice ang parehong protected pesos."
      ),
      q(
        "Paano kung biglang urgent ang planned expense?",
        "Hindi automatic na emergency ang known o chosen expense dahil lang urgent na. Tanungin kung unexpected financial disruption ba talaga ito o planned purpose na malapit na ang deadline.",
        "Puwedeng pressure ang deadline nang hindi nagbabago ang financial job ng pera. Panatilihing hiwalay ang planned need at emergency protection.",
        "Puwedeng urgent ang tuition bukas, pero kung matagal nang known ang tuition, planned responsibility pa rin ito at hindi automatic na emergency event.",
        "Hindi lahat ng urgent ay emergency."
      )
    ),
    es: questionSet(
      q(
        "¿Puede el mismo dinero contar a la vez como Meta de Ahorro y Fondo de Emergencia?",
        "Evita contar dos veces la misma cantidad protegida para dos trabajos distintos. Si el dinero está asignado al Fondo de Emergencia, tratar esos mismos pesos como totalmente disponibles para otra meta haría que tu protección parezca mayor de lo que es.",
        "Una sola cantidad no puede cumplir dos trabajos completos al mismo tiempo sin conflicto. Mantén honestas las etiquetas sobre lo que esos pesos protegen.",
        "Si ₱10,000 son tu reserva de emergencia, decir que esos mismos ₱10,000 también financian por completo un viaje haría que ambos planes dependan del mismo dinero.",
        "No cuentes dos veces los mismos pesos protegidos."
      ),
      q(
        "¿Qué pasa si un gasto planificado de repente se siente urgente?",
        "La urgencia por sí sola no convierte un gasto conocido o elegido en una emergencia. Pregunta si realmente es una interrupción inesperada o simplemente un propósito planificado cuyo plazo está cerca.",
        "Un plazo puede crear presión sin cambiar el trabajo financiero del dinero. Mantén separados los gastos planificados y la protección de emergencia.",
        "Una matrícula que vence mañana puede sentirse urgente, pero si se conocía con anticipación sigue siendo una responsabilidad planificada y no automáticamente una emergencia.",
        "Urgente no siempre significa emergencia."
      )
    ),
  },
  "goal-purpose-vs-wallet-location": {
    en: questionSet(
      q(
        "Does creating a Savings Goal move my money to another bank or wallet?",
        "No. The goal itself describes the purpose of protected money; it does not create an imaginary account or automatically move funds somewhere else.",
        "Creating the label and changing the physical location are separate ideas. The goal says why; the wallet still says where.",
        "You can create a ‘New Laptop’ goal associated with money in your existing wallet without opening a new bank account just for the goal.",
        "No. Creating the goal names the purpose; it does not automatically move the money."
      ),
      q(
        "Why does CLARA need to know which wallet holds the savings?",
        "Because protection should stay connected to the real place where the money exists. That helps CLARA avoid treating purpose and physical balance as two unrelated sources of money.",
        "The wallet connection anchors the goal to real funds instead of letting the goal become a floating number with no location.",
        "If your savings are in GCash, associating the goal with that wallet keeps the protected amount tied to the balance that actually contains it.",
        "The wallet tells CLARA where the real protected money lives."
      )
    ),
    tl: questionSet(
      q(
        "Kapag gumawa ako ng Savings Goal, lilipat ba ang pera ko sa ibang bank o wallet?",
        "Hindi. Ang goal mismo ay naglalarawan ng purpose ng protected money; hindi ito gumagawa ng imaginary account o automatic na naglilipat ng funds.",
        "Magkaiba ang paggawa ng label at pagbabago ng physical location. Goal ang why; wallet pa rin ang where.",
        "Puwede kang gumawa ng ‘New Laptop’ goal na associated sa existing wallet mo nang hindi nagbubukas ng bagong bank account para lang sa goal.",
        "Hindi. Pinapangalanan ng goal ang purpose; hindi nito automatic na nililipat ang pera."
      ),
      q(
        "Bakit kailangang malaman ni CLARA kung aling wallet ang may hawak ng savings?",
        "Dahil dapat connected ang protection sa real place kung saan existing ang pera. Nakakatulong itong huwag magmukhang dalawang separate source ng money ang purpose at physical balance.",
        "Ina-anchor ng wallet connection ang goal sa real funds para hindi maging floating number na walang actual location.",
        "Kung nasa GCash ang savings mo, ang pag-associate ng goal sa GCash wallet ang nagkokonekta sa protected amount sa balance na talagang may hawak nito.",
        "Sinasabi ng wallet kung saan nakatira ang real protected money."
      )
    ),
    es: questionSet(
      q(
        "¿Crear una Meta de Ahorro mueve mi dinero a otro banco o billetera?",
        "No. La meta describe el propósito del dinero protegido; no crea una cuenta imaginaria ni mueve automáticamente los fondos a otro lugar.",
        "Crear la etiqueta y cambiar la ubicación física son ideas separadas. La meta dice por qué; la billetera sigue diciendo dónde.",
        "Puedes crear una meta ‘Nueva laptop’ asociada con dinero de tu billetera actual sin abrir una nueva cuenta bancaria solo para la meta.",
        "No. Crear la meta nombra el propósito; no mueve el dinero automáticamente."
      ),
      q(
        "¿Por qué CLARA necesita saber qué billetera contiene el ahorro?",
        "Porque la protección debe mantenerse conectada al lugar real donde existe el dinero. Eso evita tratar el propósito y el saldo físico como dos fuentes distintas.",
        "La conexión con la billetera ancla la meta a fondos reales en vez de dejarla como un número flotante sin ubicación.",
        "Si tu ahorro está en GCash, asociar la meta con esa billetera mantiene la cantidad protegida ligada al saldo que realmente la contiene.",
        "La billetera indica dónde vive el dinero real protegido."
      )
    ),
  },
  "protected-is-not-free-money": {
    en: questionSet(
      q(
        "If my wallet says ₱10,000, why can’t I treat all ₱10,000 as spendable?",
        "Because the wallet balance can include money you have already assigned to a Savings Goal or another protected responsibility. Physical presence and spending availability are not always the same thing.",
        "The wallet tells you how much is there. Protection tells you how much of what is there already has a job.",
        "If ₱4,000 of a ₱10,000 wallet is protected for tuition, spending the full ₱10,000 would consume money already promised to tuition.",
        "Balance says what is there. Protection says what is already spoken for."
      ),
      q(
        "Is protected Savings Goal money locked forever?",
        "No. Protected means it currently has an assigned job. You can later use it for that job, release it when the purpose changes, or correct the record when there is a genuine mistake.",
        "Protection is intentional commitment, not permanent imprisonment. CLARA gives different actions for different reasons the protected amount may change.",
        "A laptop goal can stay protected until purchase, be released if you cancel the laptop, or be corrected if a saved amount was entered incorrectly.",
        "No. Protected money has a job, but that job can be used, released, or corrected deliberately."
      )
    ),
    tl: questionSet(
      q(
        "Kung ₱10,000 ang nasa wallet ko, bakit hindi lahat ng ₱10,000 ay spendable?",
        "Dahil puwedeng kasama sa wallet balance ang perang na-assign mo na sa Savings Goal o ibang protected responsibility. Hindi laging pareho ang physical presence at spending availability.",
        "Sinasabi ng wallet kung magkano ang naroon. Sinasabi ng protection kung gaano karami sa naroon ang may trabaho na.",
        "Kung ₱4,000 sa ₱10,000 wallet ay protected para sa tuition, ang paggastos ng buong ₱10,000 ay kakain sa perang ipinangako na sa tuition.",
        "Balance = ano ang naroon. Protection = ano ang may assigned job na."
      ),
      q(
        "Forever bang locked ang protected Savings Goal money?",
        "Hindi. Protected means may current assigned job ito. Puwede mo itong gamitin para sa goal, i-release kapag nagbago ang purpose, o i-correct kung may genuine record mistake.",
        "Intentional commitment ang protection, hindi permanent imprisonment. Magkaibang actions ang ginagamit depende kung bakit nagbabago ang protected amount.",
        "Puwedeng manatiling protected ang laptop goal hanggang purchase, i-release kung kinansela mo ang laptop, o i-correct kung mali ang saved amount entry.",
        "Hindi. May trabaho ang protected money pero puwedeng gamitin, i-release, o i-correct nang deliberate."
      )
    ),
    es: questionSet(
      q(
        "Si mi billetera muestra ₱10,000, ¿por qué no puedo tratar los ₱10,000 como disponibles para gastar?",
        "Porque el saldo puede incluir dinero que ya asignaste a una Meta de Ahorro u otra responsabilidad protegida. Presencia física y disponibilidad para gastar no siempre son lo mismo.",
        "La billetera dice cuánto hay. La protección dice cuánto de lo que hay ya tiene un trabajo.",
        "Si ₱4,000 de una billetera de ₱10,000 están protegidos para matrícula, gastar los ₱10,000 completos consumiría dinero ya prometido a esa matrícula.",
        "Saldo dice qué hay. Protección dice qué ya está comprometido."
      ),
      q(
        "¿El dinero protegido de una Meta de Ahorro queda bloqueado para siempre?",
        "No. Protegido significa que actualmente tiene un trabajo asignado. Puedes usarlo para ese trabajo, liberarlo si cambia el propósito o corregir el registro si existe un error real.",
        "La protección es un compromiso intencional, no una prisión permanente. CLARA distingue acciones según por qué cambia la cantidad protegida.",
        "Una meta de laptop puede permanecer protegida hasta la compra, liberarse si cancelas la laptop o corregirse si el monto ahorrado se registró mal.",
        "No. Tiene un trabajo, pero puede usarse, liberarse o corregirse de forma deliberada."
      )
    ),
  },
  "save-from-real-money": {
    en: questionSet(
      q(
        "Can I enter part of my future salary as if it were already saved?",
        "No. You can use expected future income when planning how you might reach a target, but the saved amount should represent money that actually exists and has been protected.",
        "Planning can look forward. Recorded savings should describe what is already real today.",
        "If you expect ₱5,000 next payday, you may plan to save some of it then. Do not show that ₱5,000 as already protected before the income arrives.",
        "Future money can be part of the plan, not part of today’s saved amount."
      ),
      q(
        "What if the money in my wallet is already protected for another responsibility?",
        "Then that protected amount should not be treated as freely available to fund a new Savings Goal. Respecting existing protection prevents the same money from being promised twice.",
        "Before assigning a new job, check whether those pesos already have one.",
        "If ₱3,000 in your wallet is already protected for an Emergency Fund, using the same ₱3,000 to fully fund a new travel goal would double-promise the money.",
        "Do not give the same protected money a second full job."
      )
    ),
    tl: questionSet(
      q(
        "Puwede ko bang ilagay ang future salary ko na parang saved na ngayon?",
        "Hindi. Puwede mong gamitin ang expected future income sa planning kung paano maaabot ang target, pero ang saved amount ay dapat perang talagang existing at protected na.",
        "Puwedeng tumingin sa future ang plan. Ang recorded savings dapat naglalarawan ng real money ngayon.",
        "Kung may expected kang ₱5,000 next payday, puwede mong planuhin kung magkano ang ise-save mo noon. Huwag muna itong ipakitang protected bago dumating ang income.",
        "Future money puwedeng nasa plan, pero hindi pa sa today’s saved amount."
      ),
      q(
        "Paano kung protected na para sa ibang responsibility ang pera sa wallet?",
        "Hindi dapat ituring na freely available ang protected amount para sa bagong Savings Goal. Ang pagrespeto sa existing protection ang pumipigil sa parehong pera na maipangako nang dalawang beses.",
        "Bago bigyan ng bagong trabaho ang pesos, tingnan muna kung may trabaho na sila.",
        "Kung ₱3,000 sa wallet ay protected na para sa Emergency Fund, ang paggamit ng parehong ₱3,000 para i-full fund ang travel goal ay double promise.",
        "Huwag bigyan ng second full job ang parehong protected money."
      )
    ),
    es: questionSet(
      q(
        "¿Puedo registrar parte de mi salario futuro como si ya estuviera ahorrado?",
        "No. Puedes usar ingresos futuros esperados al planificar cómo alcanzarás el objetivo, pero el monto ahorrado debe representar dinero que realmente existe y ya está protegido.",
        "La planificación puede mirar hacia adelante. El ahorro registrado debe describir lo que ya es real hoy.",
        "Si esperas ₱5,000 en el próximo pago, puedes planificar cuánto ahorrarás entonces. No muestres esos ₱5,000 como protegidos antes de que lleguen.",
        "El dinero futuro puede estar en el plan, no en el monto ahorrado de hoy."
      ),
      q(
        "¿Qué pasa si el dinero de mi billetera ya está protegido para otra responsabilidad?",
        "Entonces esa cantidad no debe tratarse como libre para financiar una nueva Meta de Ahorro. Respetar la protección existente evita prometer dos veces el mismo dinero.",
        "Antes de dar un trabajo nuevo a esos pesos, comprueba si ya tienen uno.",
        "Si ₱3,000 de tu billetera ya protegen el Fondo de Emergencia, usar los mismos ₱3,000 para financiar por completo un viaje sería una doble promesa.",
        "No le des un segundo trabajo completo al mismo dinero protegido."
      )
    ),
  },
  "progress-is-direction": {
    en: questionSet(
      q(
        "Is a low progress percentage a bad sign?",
        "Not by itself. A low percentage only says you are early relative to this goal’s chosen target. It does not tell you whether you are disciplined, successful, or doing worse than someone else.",
        "Progress is a map coordinate, not a grade. It helps answer ‘where am I?’ rather than ‘how good am I?’",
        "Being at 8% one month after creating a long-term goal can be completely consistent with your plan and responsibilities.",
        "Low percentage means early in this goal—not low personal value."
      ),
      q(
        "Should I compare my Savings Goal progress with a friend’s?",
        "No. Different people have different incomes, responsibilities, timing, priorities, and targets. Use progress to guide your own next decision, not to create a financial ranking.",
        "The useful comparison is your current goal versus its own purpose and target, not your life versus another person’s snapshot.",
        "Your friend may be at 80% while you are at 20%, but they may have a smaller target, fewer responsibilities, or a different timeline. The percentages are not a fair measure of either person.",
        "Compare your progress with your own goal, not with another person."
      )
    ),
    tl: questionSet(
      q(
        "Bad sign ba kapag mababa ang progress percentage ko?",
        "Hindi by itself. Ang mababang percentage ay nagsasabing early ka pa relative sa chosen target ng goal. Hindi nito sinasabi kung disciplined, successful, o mas mahina ka kaysa sa iba.",
        "Map coordinate ang progress, hindi grade. Sinasagot nito ang ‘nasaan ako?’ hindi ang ‘gaano ako kagaling?’",
        "Puwedeng completely okay ang 8% one month after gumawa ng long-term goal kung tugma iyon sa plan at responsibilities mo.",
        "Low percentage = early sa goal, hindi low personal value."
      ),
      q(
        "Dapat ko bang i-compare ang progress ko sa kaibigan ko?",
        "Hindi. Magkaiba ang income, responsibilities, timing, priorities, at targets ng bawat tao. Gamitin ang progress para sa sarili mong next decision, hindi para gumawa ng financial ranking.",
        "Ang useful comparison ay current goal mo versus sarili nitong purpose at target, hindi buhay mo versus snapshot ng ibang tao.",
        "Puwedeng 80% ang friend mo at 20% ka, pero baka mas maliit ang target niya, mas kaunti ang responsibilities, o iba ang timeline. Hindi fair score ang percentages.",
        "I-compare ang progress sa sarili mong goal, hindi sa ibang tao."
      )
    ),
    es: questionSet(
      q(
        "¿Un porcentaje de progreso bajo es una mala señal?",
        "No por sí solo. Un porcentaje bajo solo dice que estás al principio respecto al objetivo elegido. No dice si eres disciplinado, exitoso o peor que otra persona.",
        "El progreso es una coordenada en el mapa, no una nota. Responde ‘¿dónde estoy?’ y no ‘¿qué tan bueno soy?’",
        "Estar al 8% un mes después de crear una meta de largo plazo puede encajar perfectamente con tu plan y responsabilidades.",
        "Porcentaje bajo significa etapa temprana de la meta, no bajo valor personal."
      ),
      q(
        "¿Debería comparar mi progreso con el de un amigo?",
        "No. Cada persona tiene ingresos, responsabilidades, tiempos, prioridades y objetivos distintos. Usa el progreso para guiar tu propia decisión, no para crear un ranking financiero.",
        "La comparación útil es tu meta actual contra su propio propósito y objetivo, no tu vida contra una foto de otra persona.",
        "Tu amigo puede estar al 80% y tú al 20%, pero quizá tiene un objetivo menor, menos responsabilidades u otro plazo. Los porcentajes no califican justamente a ninguno.",
        "Compara tu progreso con tu propia meta, no con otra persona."
      )
    ),
  },
  "dates-and-priority": {
    en: questionSet(
      q(
        "What if my planned-use date changes?",
        "Update the date when the real plan changes. A date is a pacing tool, not a promise that must stay frozen even when circumstances change.",
        "The date should reflect when you currently expect to need the money. Keeping an outdated date can create pressure that no longer matches reality.",
        "If a certification moves from October to January, changing the goal date to January can make your pacing more accurate without calling the delay a failure.",
        "Change the date when the real timing changes."
      ),
      q(
        "Can two Savings Goals both be high priority?",
        "Yes. Priority is not required to create a perfect single ranking. It helps you think about tradeoffs when available money cannot fully support everything at once.",
        "Two goals can both matter a lot; priority becomes useful when you must decide which gets the next available peso first.",
        "Tuition and essential work equipment may both be high priority. If only one can receive this payday’s savings, their dates and consequences can help you decide the next allocation.",
        "Yes. Priority helps with the next tradeoff, not with declaring only one goal important."
      )
    ),
    tl: questionSet(
      q(
        "Paano kung magbago ang planned-use date ko?",
        "I-update ang date kapag nagbago ang real plan. Pacing tool ang date, hindi promise na kailangang frozen kahit nagbago ang circumstances.",
        "Dapat ilarawan ng date kung kailan mo currently inaasahang kakailanganin ang pera. Ang outdated date ay puwedeng gumawa ng pressure na hindi na relevant.",
        "Kung na-move ang certification mula October to January, puwedeng baguhin ang goal date to January para mas accurate ang pacing nang hindi tinatawag na failure ang delay.",
        "Baguhin ang date kapag nagbago ang totoong timing."
      ),
      q(
        "Puwede bang parehong high priority ang dalawang Savings Goal?",
        "Oo. Hindi kailangang gumawa ng perfect single ranking ang priority. Tinutulungan ka nitong mag-isip ng tradeoffs kapag hindi sapat ang available money para sa lahat sabay-sabay.",
        "Puwedeng parehong mahalaga ang dalawang goal; nagiging useful ang priority kapag kailangan mong pumili kung sino ang tatanggap ng next available peso muna.",
        "Puwedeng parehong high priority ang tuition at essential work equipment. Kung isa lang ang mapopondohan this payday, makakatulong ang dates at consequences sa next allocation.",
        "Oo. Priority ay para sa next tradeoff, hindi para sabihing isa lang ang important."
      )
    ),
    es: questionSet(
      q(
        "¿Qué pasa si cambia mi fecha de uso planificado?",
        "Actualiza la fecha cuando cambie el plan real. La fecha es una herramienta de ritmo, no una promesa que deba quedarse congelada aunque cambien las circunstancias.",
        "La fecha debe representar cuándo esperas necesitar el dinero ahora. Mantener una fecha vieja puede crear presión que ya no corresponde a la realidad.",
        "Si una certificación pasa de octubre a enero, cambiar la fecha a enero puede hacer más preciso tu ritmo sin llamar fracaso al retraso.",
        "Cambia la fecha cuando cambie el tiempo real."
      ),
      q(
        "¿Pueden dos Metas de Ahorro tener prioridad alta?",
        "Sí. La prioridad no tiene que crear un ranking perfecto. Ayuda a pensar en intercambios cuando el dinero disponible no puede financiar todo al mismo tiempo.",
        "Dos metas pueden importar mucho; la prioridad se vuelve útil cuando debes decidir cuál recibe primero el próximo peso disponible.",
        "La matrícula y equipo esencial de trabajo pueden ser prioridad alta. Si solo una recibe ahorro este pago, sus fechas y consecuencias pueden ayudarte a decidir.",
        "Sí. La prioridad ayuda con el próximo intercambio, no con declarar que solo una meta importa."
      )
    ),
  },
  "use-vs-release": {
    en: questionSet(
      q(
        "If I cancel the goal but keep the cash in my wallet, should I Use or Release Savings?",
        "Release Savings. You are removing the goal’s protection because the purpose no longer applies, but the wallet money itself is not being spent just because the protection changes.",
        "Ask whether the money is leaving the wallet for the goal. If not, and the purpose is simply being removed, that is release rather than use.",
        "You protected ₱8,000 for a phone, then decide not to buy it. Releasing ₱8,000 removes that goal protection while leaving the cash in the wallet for a new decision.",
        "Cancel purpose + keep cash = Release Savings."
      ),
      q(
        "If I actually buy the item the goal was for, should I Use or Release Savings?",
        "Use Savings. The protected money is now being spent for the purpose it was prepared for, so the real wallet is affected and the protected goal amount decreases.",
        "Use is for the moment the protected money performs its job and leaves as real spending.",
        "If you buy the planned laptop for ₱25,000 using the protected funds, that is Use Savings because an actual wallet expense happened for the goal.",
        "Money actually spent for the goal = Use Savings."
      )
    ),
    tl: questionSet(
      q(
        "Kung kinansela ko ang goal pero nasa wallet pa rin ang cash, Use ba o Release Savings?",
        "Release Savings. Tinatanggal mo ang protection ng goal dahil wala na ang purpose, pero hindi automatic na ginagastos ang wallet money dahil lang nagbago ang protection.",
        "Tanungin kung umaalis ba sa wallet ang pera para sa goal. Kung hindi at tinatanggal lang ang purpose, release iyon, hindi use.",
        "Nag-protect ka ng ₱8,000 para sa phone tapos hindi ka na bibili. Ang Release ₱8,000 ay nag-aalis ng goal protection pero iniiwan ang cash sa wallet para sa bagong decision.",
        "Cancel purpose + keep cash = Release Savings."
      ),
      q(
        "Kung binili ko talaga ang item para sa goal, Use ba o Release Savings?",
        "Use Savings. Ginagastos na ang protected money para sa purpose na pinaghandaang nito, kaya apektado ang real wallet at bumababa ang protected goal amount.",
        "Use ang moment na ginagawa ng protected money ang trabaho nito at lumalabas bilang real spending.",
        "Kung binili mo ang planned laptop for ₱25,000 gamit ang protected funds, Use Savings iyon dahil may actual wallet expense para sa goal.",
        "Actual na ginastos para sa goal = Use Savings."
      )
    ),
    es: questionSet(
      q(
        "Si cancelo la meta pero mantengo el efectivo en mi billetera, ¿debo Usar o Liberar Ahorros?",
        "Liberar Ahorros. Estás quitando la protección porque el propósito ya no aplica, pero el dinero de la billetera no se gasta automáticamente solo porque cambió la protección.",
        "Pregunta si el dinero sale de la billetera para la meta. Si no sale y solo se elimina el propósito, es liberación y no uso.",
        "Protegiste ₱8,000 para un teléfono y luego decides no comprarlo. Liberar esos ₱8,000 quita la protección de la meta pero deja el efectivo en la billetera para otra decisión.",
        "Cancelar propósito + conservar efectivo = Liberar Ahorros."
      ),
      q(
        "Si realmente compro lo que la meta preparaba, ¿debo Usar o Liberar Ahorros?",
        "Usar Ahorros. El dinero protegido ahora se gasta para el propósito preparado, por lo que la billetera real se afecta y disminuye la cantidad protegida de la meta.",
        "Usar es el momento en que el dinero protegido cumple su trabajo y sale como gasto real.",
        "Si compras la laptop planificada por ₱25,000 con los fondos protegidos, es Usar Ahorros porque ocurrió un gasto real de la billetera para la meta.",
        "Dinero realmente gastado para la meta = Usar Ahorros."
      )
    ),
  },
  "realign-without-rewriting-history": {
    en: questionSet(
      q(
        "When should I correct a Savings Goal instead of releasing money?",
        "Correct when the record itself is wrong—for example, a mistaken amount or duplicated entry. Release when the record is accurate but you intentionally decide that some protected money no longer belongs to this goal.",
        "Correction says, ‘The record did not match reality.’ Release says, ‘The record was real, but my protection decision is changing now.’",
        "If ₱2,000 was accidentally recorded twice, correct the duplicate. If ₱2,000 was genuinely protected but you cancel that part of the plan, release it.",
        "Wrong record = correct. Changed protection decision = release."
      ),
      q(
        "Is changing my target cheating or rewriting history?",
        "No, not when the real goal has changed and you update it transparently. Rewriting history means making past events look different from what actually happened, not simply adjusting today’s plan.",
        "A target is part of the current plan. You can revise the plan while still preserving honest records of past funding and use.",
        "If a course fee rises from ₱20,000 to ₱23,000, updating the target reflects a new real requirement. It does not erase the savings activity that happened before the fee changed.",
        "Changing today’s plan is okay. Falsifying yesterday’s record is different."
      )
    ),
    tl: questionSet(
      q(
        "Kailan ako dapat mag-correct kaysa mag-release ng Savings?",
        "Mag-correct kapag mali ang record mismo—halimbawa wrong amount o duplicated entry. Mag-release kapag accurate ang record pero intentional mong binabago kung anong protected money ang kabilang pa sa goal.",
        "Correction: ‘Hindi tugma ang record sa reality.’ Release: ‘Totoo ang record, pero nagbabago ngayon ang protection decision ko.’",
        "Kung na-record nang dalawang beses ang ₱2,000, i-correct ang duplicate. Kung genuinely protected ang ₱2,000 pero kinansela mo ang part ng plan, i-release ito.",
        "Wrong record = correct. Changed protection decision = release."
      ),
      q(
        "Cheating o rewriting history ba kapag binago ko ang target?",
        "Hindi kung talagang nagbago ang goal at transparent mong ina-update ang target. Rewriting history ang pagpapalabas na iba ang past events kaysa sa totoong nangyari, hindi simpleng pag-adjust ng current plan.",
        "Part ng current plan ang target. Puwede mong i-revise ang plan habang honest pa rin ang records ng past funding at use.",
        "Kung tumaas ang course fee mula ₱20,000 to ₱23,000, ang pag-update ng target ay reflection ng new requirement. Hindi nito binubura ang savings activity bago nagbago ang fee.",
        "Okay baguhin ang plan ngayon. Iba ang pag-falsify ng record kahapon."
      )
    ),
    es: questionSet(
      q(
        "¿Cuándo debería corregir una Meta de Ahorro en vez de liberar dinero?",
        "Corrige cuando el registro mismo está equivocado, por ejemplo una cantidad incorrecta o una entrada duplicada. Libera cuando el registro es correcto pero decides que parte del dinero ya no pertenece a esa meta.",
        "Corrección dice, ‘El registro no coincidía con la realidad.’ Liberación dice, ‘El registro era real, pero mi decisión de protección cambia ahora.’",
        "Si ₱2,000 se registraron dos veces por error, corrige el duplicado. Si ₱2,000 se protegieron de verdad pero cancelas esa parte del plan, libéralos.",
        "Registro incorrecto = corregir. Decisión de protección nueva = liberar."
      ),
      q(
        "¿Cambiar mi objetivo es hacer trampa o reescribir la historia?",
        "No, si la meta real cambió y actualizas el objetivo de forma transparente. Reescribir la historia significa hacer que los eventos pasados parezcan distintos de lo que ocurrió, no ajustar el plan de hoy.",
        "El objetivo pertenece al plan actual. Puedes revisar el plan conservando registros honestos del financiamiento y uso pasados.",
        "Si un curso sube de ₱20,000 a ₱23,000, actualizar el objetivo refleja un nuevo requisito real. No borra la actividad de ahorro que ocurrió antes del cambio.",
        "Cambiar el plan de hoy está bien. Falsificar el registro de ayer es distinto."
      )
    ),
  },
  "goals-serve-your-life": {
    en: questionSet(
      q(
        "What if I reach the target but decide not to spend the money yet?",
        "That is okay. Reaching the target means the goal is funded, not that you must spend immediately. If the purpose still matters, the money can remain protected until you are ready to use it deliberately.",
        "A completed preparation does not force the action date. The goal can stay ready while you confirm timing or the final purchase.",
        "You reach ₱30,000 for a laptop but decide to wait for the right model next month. The goal can remain fully protected during that wait.",
        "Fully funded does not mean spend immediately. Keep it protected until the purpose is ready."
      ),
      q(
        "What does success look like if I cannot reach my goal quickly?",
        "Success in this lesson is not speed. It is repeatedly recognizing what you have, protecting what you can, and directing it intentionally toward something that matters to you.",
        "A slow, honest plan can be more financially useful than a fast-looking number built through pressure, comparison, or money that was needed elsewhere.",
        "Adding ₱500 consistently to a meaningful goal while meeting other responsibilities can be strong financial direction even if the target takes a long time.",
        "Success is intentional direction and protection—not racing someone else to a number."
      )
    ),
    tl: questionSet(
      q(
        "Paano kung naabot ko na ang target pero ayoko pang gastusin ang pera?",
        "Okay lang iyon. Ang pag-reach ng target ay ibig sabihin funded na ang goal, hindi na kailangan mong gumastos agad. Kung relevant pa ang purpose, puwedeng manatiling protected ang pera hanggang ready ka nang gamitin ito deliberately.",
        "Hindi pinipilit ng completed preparation ang action date. Puwedeng manatiling ready ang goal habang kino-confirm mo ang timing o final purchase.",
        "Naabot mo ang ₱30,000 laptop target pero gusto mong hintayin ang right model next month. Puwedeng manatiling fully protected ang goal habang naghihintay.",
        "Fully funded hindi ibig sabihin spend immediately. Keep protected hanggang ready ang purpose."
      ),
      q(
        "Ano ang success kung hindi ko kayang maabot nang mabilis ang goal?",
        "Hindi speed ang success sa lesson na ito. Success ang paulit-ulit na pagkilala sa meron ka, pagprotekta sa kaya mo, at pagbigay ng intentional direction sa bagay na mahalaga sa iyo.",
        "Puwedeng mas financially useful ang slow, honest plan kaysa fast-looking number na galing sa pressure, comparison, o perang kailangan pala sa ibang responsibility.",
        "Ang consistent na ₱500 sa meaningful goal habang tinutupad ang ibang responsibilities ay strong financial direction kahit matagal ang target.",
        "Success = intentional direction at protection, hindi race sa number ng ibang tao."
      )
    ),
    es: questionSet(
      q(
        "¿Qué pasa si alcanzo el objetivo pero todavía no quiero gastar el dinero?",
        "Está bien. Alcanzar el objetivo significa que la meta está financiada, no que debas gastar inmediatamente. Si el propósito sigue vigente, el dinero puede permanecer protegido hasta que decidas usarlo.",
        "Haber terminado la preparación no obliga a actuar en ese instante. La meta puede quedarse lista mientras confirmas el momento o la compra final.",
        "Alcanzas ₱30,000 para una laptop pero decides esperar al modelo correcto el próximo mes. La meta puede permanecer totalmente protegida durante la espera.",
        "Financiada por completo no significa gastar de inmediato. Protégela hasta que el propósito esté listo."
      ),
      q(
        "¿Cómo se ve el éxito si no puedo alcanzar mi meta rápidamente?",
        "El éxito en esta lección no es velocidad. Es reconocer repetidamente lo que tienes, proteger lo que puedes y dirigirlo con intención hacia algo importante para ti.",
        "Un plan lento y honesto puede ser más útil que un número que crece rápido por presión, comparación o usando dinero necesario para otras responsabilidades.",
        "Añadir ₱500 de forma constante a una meta importante mientras cumples otras responsabilidades puede ser una dirección financiera fuerte aunque tarde mucho.",
        "Éxito es dirección y protección intencional, no competir por llegar primero a un número."
      )
    ),
  },
};

const SUPPORTED_LANGUAGES = new Set(["en", "tl", "es"]);

function normalizeLanguage(value = "en") {
  const code = String(value || "").trim().toLowerCase();
  return SUPPORTED_LANGUAGES.has(code) ? code : "en";
}

export function getSavingsGoalsMasterclassPointQuestions(language = "en", stepId = "") {
  const items =
    SAVINGS_GOALS_MASTERCLASS_QUESTION_DATA[String(stepId || "")]?.[
      normalizeLanguage(language)
    ] || [];
  return items.map(([question, answer]) => ({ question, answer }));
}

export function getSavingsGoalsMasterclassQuestionSupportData(
  language = "en",
  stepId = "",
  questionIndex = -1
) {
  const items =
    SAVINGS_GOALS_MASTERCLASS_QUESTION_DATA[String(stepId || "")]?.[
      normalizeLanguage(language)
    ] || [];
  const index = Number(questionIndex);
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return null;
  const [, , anotherWay, realLife, simplest] = items[index];
  if (!anotherWay || !realLife || !simplest) return null;
  return { anotherWay, realLife, simplest };
}
