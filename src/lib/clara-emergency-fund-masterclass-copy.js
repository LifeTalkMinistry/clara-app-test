// Subject-owned UI and completion copy shared by the generic Masterclass engine.
export const EMERGENCY_FUND_MASTERCLASS_LANGUAGE_OPTIONS = [
  { code: "en", label: "English", nativeLabel: "English", shortLabel: "EN", description: "Clear, natural English" },
  { code: "tl", label: "Tagalog", nativeLabel: "Tagalog", shortLabel: "TL", description: "Natural Tagalog with familiar money terms" },
  { code: "es", label: "Spanish", nativeLabel: "Español", shortLabel: "ES", description: "Español claro y conversacional" },
];

export const EMERGENCY_FUND_MASTERCLASS_UI = {
  en: {
    backHome: "Back to CLARA Home", closeMasterclass: "Close Emergency Fund Masterclass", learnWithClara: "Learn with CLARA", complete: "Complete", coreComplete: "Core complete",
    pointOf: (point, total) => `Point ${point} of ${total}`, introQuestion: "Want me to teach you how an emergency fund actually protects you?", introEyebrow: "CLARA · LET'S LEARN TOGETHER",
    lessonEyebrow: (point) => `Emergency Fund Masterclass · Point ${point}`, coreCompleteTitle: "You made it through the core lesson", coreCompleteEyebrow: "Emergency Fund Masterclass · Core complete",
    gotItTitle: "You got it", gotItEyebrow: "CLARA · Emergency Fund Masterclass", startUser: "Start the Emergency Fund Masterclass.", continueUser: "Continue.", gotItUser: "I got it now.",
    yourReply: "Your reply", startButton: "Start the Emergency Fund Masterclass", askMoreButton: "Ask more", gotItButton: "I got it now", scheduleButton: "Schedule with CLARA",
    backMasterclassButton: "Back to Emergency Fund", reviewButton: "Review the Masterclass again", finishCoreButton: "Finish the core Masterclass", continuePointButton: (point) => `Continue to Point ${point}`,
    talkThroughButton: "Talk this through with CLARA", continueButton: "Continue",
  },
  tl: {
    backHome: "Bumalik sa CLARA Home", closeMasterclass: "Isara ang Emergency Fund Masterclass", learnWithClara: "Matuto kasama si CLARA", complete: "Tapos na", coreComplete: "Tapos ang core",
    pointOf: (point, total) => `Point ${point} sa ${total}`, introQuestion: "Gusto mo bang ituro ko kung paano ka talaga pinoprotektahan ng emergency fund?", introEyebrow: "CLARA · SABAY TAYONG MATUTO",
    lessonEyebrow: (point) => `Emergency Fund Masterclass · Point ${point}`, coreCompleteTitle: "Natapos mo ang core lesson", coreCompleteEyebrow: "Emergency Fund Masterclass · Tapos ang core",
    gotItTitle: "Gets mo na", gotItEyebrow: "CLARA · Emergency Fund Masterclass", startUser: "Simulan ang Emergency Fund Masterclass.", continueUser: "Magpatuloy.", gotItUser: "Gets ko na.",
    yourReply: "Sagot mo", startButton: "Simulan ang Emergency Fund Masterclass", askMoreButton: "Magtanong pa", gotItButton: "Gets ko na", scheduleButton: "Mag-schedule with CLARA",
    backMasterclassButton: "Bumalik sa Emergency Fund", reviewButton: "Ulitin ang Masterclass", finishCoreButton: "Tapusin ang core Masterclass", continuePointButton: (point) => `Magpatuloy sa Point ${point}`,
    talkThroughButton: "Pag-usapan ito with CLARA", continueButton: "Magpatuloy",
  },
  es: {
    backHome: "Volver a CLARA Home", closeMasterclass: "Cerrar la Masterclass de Fondo de Emergencia", learnWithClara: "Aprende con CLARA", complete: "Completado", coreComplete: "Parte principal completa",
    pointOf: (point, total) => `Punto ${point} de ${total}`, introQuestion: "¿Quieres que te enseñe cómo te protege realmente un fondo de emergencia?", introEyebrow: "CLARA · APRENDAMOS JUNTOS",
    lessonEyebrow: (point) => `Masterclass de Fondo de Emergencia · Punto ${point}`, coreCompleteTitle: "Terminaste la parte principal", coreCompleteEyebrow: "Masterclass de Fondo de Emergencia · Parte principal completa",
    gotItTitle: "Ya lo entendiste", gotItEyebrow: "CLARA · Masterclass de Fondo de Emergencia", startUser: "Empezar la Masterclass de Fondo de Emergencia.", continueUser: "Continuar.", gotItUser: "Ya lo entendí.",
    yourReply: "Tu respuesta", startButton: "Empezar la Masterclass de Fondo de Emergencia", askMoreButton: "Preguntar más", gotItButton: "Ya lo entendí", scheduleButton: "Programar con CLARA",
    backMasterclassButton: "Volver al Fondo de Emergencia", reviewButton: "Revisar la Masterclass otra vez", finishCoreButton: "Terminar la parte principal", continuePointButton: (point) => `Continuar al Punto ${point}`,
    talkThroughButton: "Hablar de esto con CLARA", continueButton: "Continuar",
  },
};

export const EMERGENCY_FUND_MASTERCLASS_EXAMPLE_COPY = {
  en: {
    eyebrow: "YOUR CLARA EXAMPLE", title: "Your protection in CLARA",
    description: "You just learned how protection months work. Here is how that concept maps to the Emergency Fund context you opened this Masterclass from.",
    setupTitle: "Connect the lesson to your own Emergency Fund",
    setupDescription: "Set up your Emergency Fund in CLARA to see your own survival cost, target reserve, protected amount, and protection months here after the lesson.",
    note: "This board uses the Emergency Fund values already present in CLARA. It is not an AI estimate.",
    labels: { monthly: "Monthly survival cost", targetMonths: "Protection target", target: "Target reserve", current: "Current protected reserve", coverage: "Current protection", wallet: "Storage wallet" },
  },
  tl: {
    eyebrow: "YOUR CLARA EXAMPLE", title: "Protection mo sa CLARA",
    description: "Natutunan mo kung paano gumagana ang protection months. Ito ang mapping ng concept sa Emergency Fund context na pinanggalingan mo bago buksan ang Masterclass.",
    setupTitle: "I-connect ang lesson sa sarili mong Emergency Fund",
    setupDescription: "I-set up ang Emergency Fund mo sa CLARA para makita rito pagkatapos ng lesson ang survival cost, target reserve, protected amount, at protection months mo.",
    note: "Existing Emergency Fund values lang sa CLARA ang ginagamit ng board na ito. Hindi ito AI estimate.",
    labels: { monthly: "Monthly survival cost", targetMonths: "Protection target", target: "Target reserve", current: "Current protected reserve", coverage: "Current protection", wallet: "Storage wallet" },
  },
  es: {
    eyebrow: "TU EJEMPLO EN CLARA", title: "Tu protección en CLARA",
    description: "Acabas de aprender cómo funcionan los meses de protección. Así se conecta ese concepto con el contexto del Fondo de Emergencia desde el que abriste esta Masterclass.",
    setupTitle: "Conecta la lección con tu propio Fondo de Emergencia",
    setupDescription: "Configura tu Fondo de Emergencia en CLARA para ver aquí tu costo de supervivencia, objetivo, reserva protegida y meses de protección después de la lección.",
    note: "Este panel usa únicamente los valores del Fondo de Emergencia ya presentes en CLARA. No es una estimación de IA.",
    labels: { monthly: "Costo mensual de supervivencia", targetMonths: "Objetivo de protección", target: "Reserva objetivo", current: "Reserva protegida actual", coverage: "Protección actual", wallet: "Billetera de almacenamiento" },
  },
};
