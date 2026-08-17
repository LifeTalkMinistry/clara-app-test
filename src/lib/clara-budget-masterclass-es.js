const SUPPORT = (buttonLabel, userText, eyebrow, text) => ({
  buttonLabel,
  userText,
  eyebrow,
  text,
});

export const ES_BUDGET_MASTERCLASS_TITLE = "Masterclass de Presupuesto";

export const ES_BUDGET_MASTERCLASS_STEPS = [
  {
    id: "budget-is-a-decision",
    title: "Lo que realmente es un presupuesto",
    topic: "Un presupuesto es una decisión que se toma antes de gastar, no solo un registro después de gastar.",
    text: `Un presupuesto no es simplemente una lista de gastos. Es una decisión sobre lo que tu dinero necesita hacer antes de que empieces a gastarlo.\n\nImagina que recibes ₱25,000 sin tener un presupuesto. Cada compra se juzga por separado: “Solo son ₱500.” “Solo son ₱300.” “Solo son ₱1,000.” Cada una puede parecer accesible por sí sola.\n\nPero tu salario no vive esas compras una por una. Las vive todas juntas. Un presupuesto te permite ver primero toda la responsabilidad de tu dinero antes de que esas pequeñas decisiones empiecen a competir entre sí.`
  },
  {
    id: "balance-is-not-free-money",
    title: "Tu saldo no es lo mismo que dinero libre",
    topic: "El dinero visible en una cuenta puede tener responsabilidades ya asignadas.",
    text: `Ver dinero en tu billetera o cuenta bancaria no significa automáticamente que todo esté disponible para gastar sin pensar.\n\nPiensa en un autobús con asientos reservados. Un asiento puede verse vacío ahora, pero alguien ya tiene un boleto para ocuparlo. Tu dinero funciona igual. Parte del saldo puede pertenecer ya a comida, transporte, facturas, apoyo familiar, ahorro u otra obligación.\n\nEl presupuesto te enseña a dejar de preguntar solamente “¿Todavía tengo dinero?” y empezar a preguntar “¿Qué responsabilidad ya tiene este dinero?”`
  },
  {
    id: "decide-before-spending",
    title: "Decide antes de comprar",
    topic: "El presupuesto mueve la decisión importante a antes de la compra.",
    text: `Sin presupuesto, la decisión suele ocurrir en la tienda, dentro de una app o cuando ya estás tentado a comprar. Ese es un momento difícil para ser objetivo.\n\nUn presupuesto mueve la decisión a un momento anterior. Cuando estás tranquilo, decides cuánto espacio debe recibir cada parte de tu vida. Más adelante, cuando aparece una compra, ya no empiezas desde cero. Ya tienes un plan con el cual compararla.\n\nPor eso presupuestar no se trata tanto de decir “no” a todo, sino de tomar las decisiones grandes antes de que la emoción tome las pequeñas por ti.`
  },
  {
    id: "give-money-jobs",
    title: "Dale trabajos a tus ingresos",
    topic: "El ingreso se vuelve más útil cuando se asigna a responsabilidades y prioridades.",
    text: `Un presupuesto útil le da trabajos a tus ingresos. Parte mantiene la vida diaria, parte protege obligaciones próximas, parte crea margen, parte puede disfrutarse y parte puede avanzar hacia ahorro u otra meta.\n\nNo se trata de crear docenas de categorías perfectas. Se trata de hacer visibles los trabajos importantes antes de que gastos menos importantes ocupen silenciosamente su lugar.\n\nSi cada peso se trata como igualmente disponible, normalmente ganan los deseos más ruidosos o inmediatos. El presupuesto reserva espacio para las prioridades menos urgentes pero más importantes.`
  },
  {
    id: "essentials-and-flexible",
    title: "Separa necesidades fijas de decisiones flexibles",
    topic: "Un presupuesto realista distingue responsabilidades rígidas de categorías que sí pueden cambiar.",
    text: `No todos los gastos se comportan igual. El alquiler, facturas obligatorias, pagos mínimos de deuda y transporte básico pueden tener muy poco espacio para moverse. La comida, ocio, compras, entregas y otros gastos de estilo de vida suelen ser más flexibles.\n\nUn buen presupuesto reconoce esa diferencia. Proteges primero las responsabilidades y después decides cuánto espacio pueden usar de forma segura las partes flexibles de tu vida.\n\nAsí evitas intentar resolver cada problema financiero recortando todo por igual. A veces la decisión inteligente es simplemente saber qué está fijo y qué realmente puedes ajustar.`
  },
  {
    id: "planned-and-unplanned",
    title: "Planificado no significa perfectamente predecible",
    topic: "Un presupuesto puede distinguir gastos planificados de imprevistos sin tratar cada sorpresa como un fracaso.",
    text: `La vida real no seguirá una hoja de cálculo perfectamente. Puede aparecer algo que no planeaste de forma específica. Eso no significa automáticamente que todo tu presupuesto haya fallado.\n\nLa diferencia útil es esta: el gasto planificado ya tenía un lugar antes de ocurrir; el gasto no planificado no. Cuando ves esa diferencia, puedes aprender de ella en vez de fingir que todo era esperado.\n\nUn presupuesto se vuelve poderoso cuando dice la verdad sobre lo que pasó, porque esa verdad te ayuda a construir un ciclo mejor la próxima vez.`
  },
  {
    id: "breathing-room",
    title: "Deja un margen para respirar",
    topic: "Un presupuesto sostenible necesita espacio razonable para sorpresas normales y comportamiento humano.",
    text: `Un presupuesto que solo funciona cuando nada inesperado ocurre es un presupuesto frágil. La vida real necesita margen.\n\nPiensa en una maleta tan llena que el cierre apenas puede cerrarse. Puede verse perfectamente organizada antes del viaje, pero en cuanto necesitas añadir algo pequeño, todo el sistema se vuelve un problema.\n\nTu presupuesto debe ser disciplinado, pero también debe sobrevivir a la realidad. Un colchón razonable o una asignación para gastos no planificados puede evitar que una sola sorpresa te haga abandonar todo el plan.`
  },
  {
    id: "realistic-not-impressive",
    title: "Hazlo realista, no impresionante",
    topic: "El presupuesto debe reflejar el comportamiento y las circunstancias reales, no una versión idealizada de la persona.",
    text: `Una de las formas más rápidas de abandonar un presupuesto es construir un plan para una versión imaginaria de ti mismo. Si normalmente gastas ₱4,000 en una categoría necesaria, escribir ₱1,000 solo porque parece disciplinado no crea disciplina. Crea un plan que probablemente se rompa.\n\nUn presupuesto fuerte puede desafiarte, pero el reto debe ser creíble. Empieza por lo que realmente cuesta tu vida, identifica dónde sí puede cambiar algo y mejora de forma deliberada.\n\nLa meta no es que los números se vean impresionantes el primer día. La meta es crear un plan que realmente puedas practicar.`
  },
  {
    id: "payday-behavior",
    title: "El presupuesto empieza a trabajar el día de pago",
    topic: "El plan importa más cuando llega el ingreso y la sensación de libertad para gastar es mayor.",
    text: `El día de pago puede crear una sensación temporal de abundancia. De repente el saldo se ve grande, así que compras que ayer parecían caras hoy pueden parecer pequeñas.\n\nEse es exactamente el momento en que importa el presupuesto. Antes de que el gasto de estilo de vida crezca para igualar el nuevo saldo, el plan te recuerda todo lo que ese ingreso debe sostener hasta el siguiente ciclo.\n\nPresupuestar no elimina la buena sensación del día de pago. Ayuda a que esa sensación dure más que los primeros días.`
  },
  {
    id: "sticking-to-the-plan",
    title: "Usa el presupuesto mientras gastas",
    topic: "Un presupuesto solo cambia el comportamiento cuando se consulta durante las decisiones de gasto.",
    text: `Crear un presupuesto una vez y no volver a mirarlo es como hacer un mapa y dejarlo en casa. El plan se vuelve útil cuando lo consultas mientras ocurren las decisiones.\n\nAntes de una compra flexible, mira cuánto queda y qué cosas todavía deben suceder antes de terminar el ciclo. Esa pequeña pausa conecta la decisión de hoy con el resto del mes.\n\nPor eso el hábito central de CLARA es “Ask before you spend.” Registrar después te da historia. Revisar antes de gastar te da la oportunidad de cambiar el resultado.`
  },
  {
    id: "overspending-is-information",
    title: "Gastar de más es información, no el final",
    topic: "Superar una categoría debe activar revisión y recuperación, no abandono del presupuesto.",
    text: `Si gastas de más, una de las peores respuestas es pensar “Ya se arruinó. El próximo mes empiezo otra vez.” Un error no borra el resto del plan.\n\nEn cambio, pregunta qué significa ese exceso. ¿La cantidad original era poco realista? ¿Hubo una necesidad inesperada? ¿Fue un impulso que manejarías diferente la próxima vez? ¿Necesitas reducir otra categoría flexible?\n\nEl propósito del presupuesto no es demostrar que nunca cometes errores. Es ayudarte a detectarlos lo suficientemente pronto como para responder.`
  },
  {
    id: "realign-dont-pretend",
    title: "Reajusta cuando cambie la vida",
    topic: "Un presupuesto puede modificarse intencionalmente cuando cambian las circunstancias.",
    text: `Cambiar un presupuesto no es automáticamente hacer trampa. A veces el plan inicial estaba equivocado. A veces la vida cambió. A veces apareció una nueva responsabilidad.\n\nLa diferencia importante es si estás reajustando de forma intencional o simplemente reescribiendo el plan después de cada impulso para que nada parezca no planificado.\n\nUn presupuesto útil es lo bastante firme para guiarte y lo bastante flexible para seguir conectado con la realidad. Cuando algo importante cambie, actualiza el plan conscientemente y entiende por qué.`
  },
  {
    id: "close-and-learn",
    title: "Cierra el ciclo y aprende de él",
    topic: "Cerrar un ciclo de presupuesto crea información para mejorar el siguiente.",
    text: `Al terminar un ciclo, no juzgues el éxito solo por si cada categoría quedó perfecta. Mira el patrón. ¿Dónde te mantuviste dentro del plan? ¿Dónde subestimaste? ¿Qué gastos no planificados aparecieron una y otra vez? ¿Qué decisiones ayudaron?\n\nEsa revisión convierte un mes en información para el siguiente. Tu segundo presupuesto puede ser mejor que el primero porque ya tiene evidencia. El tercero puede mejorar otra vez.\n\nPresupuestar se vuelve más fácil cuando cada ciclo enseña al siguiente.`
  },
  {
    id: "consistency-creates-control",
    title: "La verdadera meta es el control financiero",
    topic: "Presupuestar es un sistema repetido de decisiones que crea claridad y control con el tiempo.",
    text: `El verdadero logro no es una hoja de cálculo bonita. Es llegar al punto en que entiendes lo que tu dinero necesita hacer, notas cuando el gasto se desvía y puedes ajustar antes de que las decisiones pequeñas se conviertan en problemas grandes.\n\nEse control crea algo valioso: margen. Puedes ahorrar con más intención, prepararte para emergencias, avanzar hacia metas y disfrutar del dinero con menos incertidumbre porque tus prioridades están visibles.\n\nPor eso un presupuesto no es castigo. Es un sistema repetido para lograr que tu dinero siga tus decisiones en vez de obligarte a reaccionar después de que desaparece.`
  },
];

export const ES_BUDGET_MASTERCLASS_SUPPORT_SEQUENCE = {
  "budget-is-a-decision": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en tu salario como un pastel de cumpleaños que debe alcanzar para varias personas. Si empiezas a cortar porciones sin decidir primero cuántas personas deben comer, las primeras porciones pueden parecer totalmente razonables. El problema aparece después, cuando ya no queda suficiente para todos.\n\nEl presupuesto es la decisión de dividir el pastel antes de servirlo. Primero ves todo lo que tu dinero debe cubrir y después sabes cuánto espacio puede tomar cada decisión de forma segura.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Imagina que llegan ₱25,000 el día de pago. Compras una comida de ₱700, un artículo de ₱900 por internet, gastas ₱500 en transporte y aceptas varias compras pequeñas más. Ninguna parece peligrosa por sí sola.\n\nDespués, alquiler, comida, transporte, apoyo familiar y ahorro necesitan dinero de los mismos ₱25,000. El problema no fue una compra. Fue tomar cada decisión sin ver al mismo tiempo las demás responsabilidades.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Un presupuesto responde una pregunta antes de gastar: “¿Qué necesita hacer este dinero?”\n\nSin esa respuesta, cada compra puede defenderse sola. Con presupuesto, cada compra debe caber dentro del plan completo.\n\nLa regla más simple: decide primero el trabajo total de tu dinero antes de que los gastos pequeños empiecen a quitarle partes.`),
  ],
  "balance-is-not-free-money": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en el saldo de tu cuenta como una caja que contiene varios sobres. La caja puede tener ₱10,000, pero algunos sobres ya son para alquiler, comida, transporte o ahorro. Mirar solo el total oculta esas asignaciones.\n\nEl número importante no es solamente lo que ves. Es lo que queda después de respetar lo que ese dinero ya debe hacer.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Supón que tu cuenta muestra ₱8,000. Puede sentirse como si tuvieras ₱8,000 disponibles. Pero ₱3,000 quizá ya sean para una factura, ₱2,000 para comida hasta el próximo pago y ₱1,500 para transporte.\n\nEl saldo visible sigue siendo ₱8,000, pero tu cantidad realmente flexible es mucho menor. El presupuesto te ayuda a ver esa diferencia antes de que el saldo te dé una falsa sensación de libertad.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `El dinero puede estar en tu cuenta y aun así no estar disponible para gasto aleatorio.\n\nNo preguntes solamente “¿Cuánto dinero tengo?” Pregunta también “¿Cuánto de este dinero todavía no tiene otro trabajo?”\n\nTu saldo dice lo que tienes. Tu presupuesto dice lo que realmente está libre para usar.`),
  ],
  "decide-before-spending": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Presupuestar es como elegir la ruta antes de conducir. Si esperas hasta cada cruce para decidir adónde ir, lo que parezca más fácil en el momento puede cambiar tu dirección una y otra vez.\n\nEl presupuesto te da la ruta mientras todavía estás tranquilo. Cuando aparece una compra, no tienes que inventar una regla financiera cuando la tentación ya está pidiendo una respuesta.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Imagina que ves una oferta de ₱1,200 mientras navegas por la noche. Sin un plan previo, la decisión se convierte en “¿Lo quiero suficiente?” y “¿Todavía puedo pagarlo?”\n\nSi ya decidiste que tu espacio flexible para compras en el ciclo es ₱1,000, la pregunta cambia. Ahora comparas la compra con una decisión tomada antes, en vez de dejar que la oferta cree la regla.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `El mejor momento para decidir tus límites de gasto es antes de querer algo.\n\nEl presupuesto mueve la decisión del momento emocional al momento de planificación.\n\nPlanifica primero. Compara después. Es más fácil que intentar crear disciplina en la pantalla de pago.`),
  ],
  "give-money-jobs": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en tus ingresos como un pequeño equipo de trabajadores. Si nadie tiene una tarea asignada, lo primero que grite puede quedarse con su tiempo. Si cada trabajador ya tiene una responsabilidad, el trabajo importante queda protegido.\n\nTus pesos se comportan parecido. Darle trabajos al dinero significa decidir qué parte mantiene tu vida, qué parte te protege, qué parte construye una meta y qué parte puedes disfrutar.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Un ingreso de ₱30,000 puede tener que cubrir vivienda, comida, transporte, responsabilidades familiares, ahorro y gasto personal. Si los ₱30,000 se ven como una sola cantidad sin dividir, un fin de semana puede consumir silenciosamente dinero destinado a algo menos inmediato.\n\nAsignar trabajos no requiere docenas de categorías. Solo asegura que las responsabilidades importantes tengan lugar antes de que lleguen los deseos.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Si el dinero no tiene un trabajo, cualquier cosa puede reclamarlo.\n\nDale un lugar primero a lo importante. Después mira qué queda para decisiones flexibles.\n\nPresupuestar no es controlar cada peso obsesivamente. Es lograr que tus prioridades cobren antes que tus impulsos.`),
  ],
  "essentials-and-flexible": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en una casa con paredes y muebles. Las paredes son difíciles de mover; los muebles pueden reorganizarse. Algunos gastos funcionan como las paredes y otros como los muebles.\n\nUn presupuesto realista sabe qué costos son compromisos duros y cuáles realmente pueden cambiar. Así no intentas crear ahorro apretando categorías que casi no tienen margen.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Si el alquiler es ₱6,000 y un pago obligatorio de deuda es ₱2,000, fingir que pueden convertirse en ₱3,000 y ₱500 no arreglará el presupuesto. Pero entregas, ocio, compras o algunas decisiones de comida pueden tener más flexibilidad.\n\nProtege primero lo que debe suceder y después haz cambios deliberados donde tus decisiones realmente puedan moverse.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Algunos gastos son compromisos. Otros son decisiones con margen para cambiar.\n\nProtege primero los compromisos. Ajusta después las categorías flexibles.\n\nUn presupuesto inteligente no recorta todo por igual; sabe dónde el cambio es realmente posible.`),
  ],
  "planned-and-unplanned": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en un plan de viaje. Puedes planear la ruta, el hotel y el transporte, pero aun así puede llover o haber un retraso. La sorpresa no significa que planear fuera inútil. Simplemente te da nueva información a la cual responder.\n\nUn presupuesto funciona igual. El gasto planificado ya tenía lugar; el no planificado no. Ver esa diferencia te ayuda a aprender sin tratar cada sorpresa como fracaso.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Puedes presupuestar comida, transporte, facturas y ahorro, y después necesitar de repente medicina o una reparación. Ese gasto no estaba planificado, pero no borra las decisiones que sí hiciste correctamente.\n\nRegístralo con honestidad, mira qué cambió y pregunta si este tipo de gasto necesita más espacio en el siguiente ciclo.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Un plan no promete que nada inesperado ocurrirá.\n\nTe da una diferencia clara entre lo que esperabas y lo que te sorprendió.\n\nEsa diferencia es información valiosa. Úsala para mejorar el próximo presupuesto en vez de llamar fracaso a todo el plan.`),
  ],
  "breathing-room": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en caminar con un vaso lleno exactamente hasta el borde. Un pequeño movimiento hace que se derrame. Un poco de espacio vacío hace que el mismo vaso sea mucho más fácil de llevar.\n\nUn presupuesto sin margen para sorpresas normales se comporta como ese vaso demasiado lleno. El margen no es dinero desperdiciado; ayuda a que el plan sobreviva a la vida cotidiana.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Supón que cada peso está asignado tan ajustadamente que no queda nada. Entonces un aumento de ₱300 en transporte, medicina, una contribución escolar o una comida inesperada no tiene dónde ir. Tendrás que quitar dinero de otra categoría o abandonar el plan.\n\nIncluso un pequeño colchón da un lugar a esas sorpresas y evita que un gasto inesperado se convierta en varios problemas.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `No construyas un presupuesto que solo funcione en un mes perfecto.\n\nDeja un margen razonable para la realidad.\n\nLa disciplina le da dirección al plan; el margen le da resistencia.`),
  ],
  "realistic-not-impressive": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Un presupuesto es como un plan de entrenamiento. Escribir “corre 20 kilómetros cada día” puede verse impresionante, pero si tu punto real de partida son dos kilómetros, el plan probablemente te hará abandonar antes que mejorar.\n\nUn presupuesto útil empieza en tu vida real y pide una mejora creíble. Un plan imaginario solo produce números difíciles de sostener.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Si tu gasto necesario de comida ha estado alrededor de ₱4,000, fijarlo en ₱1,000 sin ningún cambio real en tus circunstancias no crea ₱3,000 de ahorro. Crea una distancia entre el presupuesto y la realidad.\n\nUn plan mejor podría probar ₱3,600, entender qué necesita cambiar y revisar el resultado. La mejora repetible vale más que una meta dramática que abandonas.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Tu presupuesto debe describir una vida que realmente puedes practicar, no la persona que deseas convertirte de la noche a la mañana.\n\nEmpieza con honestidad. Mejora de forma deliberada.\n\nUn presupuesto realista que puedes repetir es más poderoso que uno impresionante que no puedes seguir.`),
  ],
  "payday-behavior": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `El día de pago es como empezar un viaje largo con el tanque lleno. Al principio se siente abundante, pero ese combustible todavía debe llevarte hasta el destino.\n\nEl presupuesto te recuerda que el saldo grande de hoy no es solo para hoy. Debe sobrevivir todo el ciclo de ingreso.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Un saldo de ₱20,000 el día de pago puede hacer que una compra de ₱1,500 parezca pequeña. Días después, tras varias compras “pequeñas”, todavía necesitas cubrir semanas de comida, transporte, facturas y otras obligaciones.\n\nEl presupuesto es más útil justo cuando el saldo se ve más grande, porque es cuando más fácil es olvidar cuánto debe durar.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `El día de pago te muestra más dinero, no más libertad.\n\nEse saldo todavía debe sostener el resto del ciclo.\n\nUsa el presupuesto temprano, antes de que la sensación de abundancia convierta tus responsabilidades futuras en una idea secundaria.`),
  ],
  "sticking-to-the-plan": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Un presupuesto es como un velocímetro. Saber el límite antes de conducir ayuda, pero todavía necesitas mirar el tablero mientras el auto está en movimiento.\n\nTu plan de gasto también necesita consultarse durante las decisiones reales. No sirve solo por existir; sirve cuando te da información en el momento exacto en que aún puedes elegir diferente.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Supón que quedan ₱800 en tu presupuesto de ocio y faltan diez días para el próximo pago. Antes de gastar ₱600 esta noche, revisar el plan te muestra que quedarían solo ₱200 para el resto del ciclo.\n\nEso no significa automáticamente “no”. Significa que ves la consecuencia antes de decidir. Ahí es donde “Ask before you spend” se vuelve práctico.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Un presupuesto no puede guiar una decisión que nunca consultas.\n\nMíralo antes del gasto flexible, no solo después.\n\nRegistrar después te cuenta lo que pasó. Revisar antes te da una oportunidad de cambiar lo que ocurrirá.`),
  ],
  "overspending-is-information": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en equivocarte de giro usando navegación. El mapa no dice que todo el viaje está perdido. Recalcula desde donde estás.\n\nEl exceso de gasto puede tratarse igual. La respuesta útil no es tirar el presupuesto, sino identificar qué cambió y decidir cómo ajustar el resto del ciclo desde ese punto.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Si planeaste ₱2,000 para comer fuera y llegas a ₱2,400, ya tienes información. Quizá la cantidad original era poco realista, quizá ocurrió algo excepcional o varios impulsos se acumularon.\n\nAhora puedes reducir otra categoría flexible, pausar ese tipo de gasto o aprender que el próximo mes necesita un número diferente. El error se vuelve útil cuando cambia tu siguiente decisión.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Gastar de más es una señal, no permiso para rendirte.\n\nPregunta qué lo causó, ajusta lo que todavía puedas y mantén vivo el resto del plan.\n\nQue una categoría salga mal no significa que todo el mes tenga que salir mal.`),
  ],
  "realign-dont-pretend": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Un presupuesto se parece más a una ruta que a un contrato tallado en piedra. Si una carretera realmente se cierra, cambiar la ruta tiene sentido. Si cambias el destino cada vez que otra carretera parece más divertida, la ruta deja de guiarte.\n\nReajustar significa cambiar el plan porque la realidad cambió de forma importante, sin perder el propósito del plan.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Supón que una responsabilidad familiar aumenta de repente en ₱1,500. Actualizar el presupuesto para darle espacio puede ser la decisión responsable. Puedes ver qué categoría flexible necesita reducirse y por qué.\n\nEso es diferente a hacer una compra impulsiva y editar el presupuesto después solo para que parezca “planificada”. Una cosa responde a la realidad; la otra borra responsabilidad.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `Cambia el presupuesto cuando cambie la vida, no solo cuando quieras que los números excusen una decisión.\n\nUn plan útil puede moverse, pero ese movimiento debe tener una razón.\n\nReajusta intencionalmente. No reescribas la historia.`),
  ],
  "close-and-learn": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `Piensa en cada ciclo de presupuesto como una sesión de práctica. No juzgarías la práctica solo por si cada movimiento fue perfecto. Mirarías qué funcionó, qué siguió fallando y qué necesitas cambiar la próxima vez.\n\nCerrar el ciclo convierte tu gasto en retroalimentación. El siguiente presupuesto es más fuerte porque se basa en tus patrones reales.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Al terminar el mes puedes notar que transporte fue constantemente más alto de lo previsto, comida estuvo correcta y pequeñas compras “inesperadas” aparecieron cada semana. Eso te dice algo.\n\nEn el siguiente ciclo puedes dar a transporte una cantidad más realista, mantener comida parecida y crear mejores reglas o margen para esas compras repetidas.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `No termines un presupuesto y lo olvides.\n\nMira qué te enseñó el ciclo y usa esa evidencia para construir el siguiente.\n\nEl presupuesto mejora con repetición: planifica, vívelo, revisa, ajusta y repite.`),
  ],
  "consistency-creates-control": [
    SUPPORT("Muéstramelo de otra forma", "Muéstrame otra forma de verlo.", "CLARA · OTRA FORMA DE VERLO · 1/3", `El control financiero es como aprender a conducir. La meta no es mantener el camino perfectamente recto cada segundo. La meta es notar cuando te desvías y hacer pequeñas correcciones antes de salirte del camino.\n\nPresupuestar te da ese sistema de dirección para el dinero. Al repetirlo, detectas antes la desviación.`),
    SUPPORT("Dame un ejemplo real", "Muéstrame cómo se ve esto en la vida real.", "CLARA · EN LA VIDA REAL · 2/3", `Después de varios ciclos puedes conocer aproximadamente cuánto cuesta tu vida diaria, cuánto gasto flexible es seguro, qué gastos suelen sorprenderte y cuánto puedes proteger de forma realista para ahorro o emergencias.\n\nEso reduce las suposiciones. Ya no reaccionas solo cuando el saldo está bajo. Puedes ver problemas antes y actuar mientras todavía tienes margen.`),
    SUPPORT("Dame la versión más simple", "Dame la versión más simple de este punto.", "CLARA · VERSIÓN MÁS SIMPLE · 3/3", `La meta del presupuesto no son categorías perfectas. Es control.\n\nControl significa saber qué necesita hacer tu dinero, notar cuando el gasto se desvía y ajustar antes de que el problema crezca.\n\nHazlo repetidamente y tu dinero empezará a seguir tus decisiones en vez de sorprenderte constantemente.`),
  ],
};

export const ES_BUDGET_MASTERCLASS_INTRO = `No solo veremos qué es un presupuesto. Te voy a mostrar por qué el dinero puede desaparecer aunque cada compra individual parezca accesible, cómo construir un presupuesto realista, cómo usarlo mientras gastas y qué hacer cuando el plan no sale perfecto.\n\nTú controlas el ritmo. Después de cada punto importante puedes continuar, hacer una pregunta o abrir hasta tres explicaciones de apoyo ya preparadas: otra perspectiva, un ejemplo de la vida real y la versión más simple. Si todavía quieres ayuda después de las tres, puedes continuar la Masterclass o programar una conversación en vivo con CLARA.`;

export const ES_BUDGET_MASTERCLASS_FINISH = `Has llegado al final de la parte principal de la Masterclass de Presupuesto.\n\nSi alguna parte todavía no está clara, no tienes que fingir que la entendiste. Puedes preguntar más. Si el sistema ya tiene sentido para ti, puedes terminar aquí y empezar a practicarlo.\n\nLa meta no es memorizar cada frase. La meta es entender el sistema lo suficiente como para usarlo cuando tomes decisiones reales de gasto.`;

export const ES_BUDGET_MASTERCLASS_CLOSING = `Muy bien. Recuerda la versión más simple: decide qué necesita hacer tu dinero antes de gastar, mantén el plan realista, consúltalo mientras tomas decisiones y reajusta en lugar de rendirte cuando cambie la vida.\n\nNo necesitas un presupuesto perfecto. Necesitas un presupuesto que puedas seguir usando.`;
