from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"Missing expected source for {label}")
    return text.replace(old, new, 1)


universal_path = Path("src/pages/onboarding/UniversalOnboarding.jsx")
universal = universal_path.read_text()

universal = replace_once(
    universal,
    'import ClaraLogo from "@/components/ClaraLogo";\n',
    'import ClaraLogo from "@/components/ClaraLogo";\nimport ClaraBrandName from "@/components/ClaraBrandName";\n',
    "UniversalOnboarding ClaraBrandName import",
)

replacements = [
    (
        "<Eyebrow>Why CLARA exists</Eyebrow>",
        "<Eyebrow>Why <ClaraBrandName /> exists</Eyebrow>",
        "country eyebrow",
    ),
    (
        "<Eyebrow>CLARA&apos;s difference</Eyebrow>",
        "<Eyebrow><ClaraBrandName />&apos;s difference</Eyebrow>",
        "difference eyebrow",
    ),
    (
        '<p className="clara-onboarding-kicker clara-onboarding-kicker--blue">CLARA</p>',
        '<p className="clara-onboarding-kicker clara-onboarding-kicker--blue"><ClaraBrandName /></p>',
        "comparison kicker",
    ),
    (
        "        CLARA exists to help build a generation of Filipinos who are wiser, more intentional, more disciplined, and better prepared financially.",
        "        <ClaraBrandName /> exists to help build a generation of Filipinos who are wiser, more intentional, more disciplined, and better prepared financially.",
        "mission body",
    ),
    (
        "        CLARA is free to start. You are never forced to pay to begin.",
        "        <ClaraBrandName /> is free to start. You are never forced to pay to begin.",
        "support title",
    ),
    (
        "        If CLARA becomes valuable to you, you can choose to support what we&apos;re building and receive additional supporter tools and experiences.",
        "        If <ClaraBrandName /> becomes valuable to you, you can choose to support what we&apos;re building and receive additional supporter tools and experiences.",
        "support body",
    ),
    (
        '<p className="clara-onboarding-support-copy">Help CLARA keep improving and reach more Filipinos.</p>',
        '<p className="clara-onboarding-support-copy">Help <ClaraBrandName /> keep improving and reach more Filipinos.</p>',
        "support mission card",
    ),
    (
        "              Supporting CLARA doesn&apos;t buy discipline. It can be your deliberate commitment to practice it.",
        "              Supporting <ClaraBrandName /> doesn&apos;t buy discipline. It can be your deliberate commitment to practice it.",
        "commitment card",
    ),
    (
        "              Supporters receive extra benefits designed to deepen the CLARA experience.",
        "              Supporters receive extra benefits designed to deepen the <ClaraBrandName /> experience.",
        "go deeper card",
    ),
    (
        "        <span>ask CLARA.</span>",
        '        <span className="clara-onboarding-final-line">ask <ClaraBrandName />.</span>',
        "final ask CLARA line",
    ),
    (
        "        .clara-onboarding-title--final span { display: block; margin-top: 6px; color: #8dbbff; }",
        "        .clara-onboarding-title--final > .clara-onboarding-final-line { display: block; margin-top: 6px; color: #8dbbff; }",
        "final title span selector",
    ),
    (
        '''            <span>\n              {isLast ? "Start with CLARA" : activeScreen === "support" ? "Continue with free CLARA" : "Continue"}\n            </span>''',
        '''            <span>\n              {isLast ? (\n                <>Start with <ClaraBrandName /></>\n              ) : activeScreen === "support" ? (\n                <>Continue with free <ClaraBrandName /></>\n              ) : (\n                "Continue"\n              )}\n            </span>''',
        "footer CLARA CTA labels",
    ),
]

for old, new, label in replacements:
    universal = replace_once(universal, old, new, label)

universal_path.write_text(universal)


beta_path = Path("src/pages/onboarding/FoundingBetaWelcome.jsx")
beta = beta_path.read_text()

beta = replace_once(
    beta,
    'import ClaraLogo from "@/components/ClaraLogo";\n',
    'import ClaraLogo from "@/components/ClaraLogo";\nimport ClaraBrandName from "@/components/ClaraBrandName";\n',
    "FoundingBetaWelcome ClaraBrandName import",
)

beta_replacements = [
    (
        "        Before CLARA reaches more people, you&apos;re among the first real users invited to experience it.",
        "        Before <ClaraBrandName /> reaches more people, you&apos;re among the first real users invited to experience it.",
        "beta first body",
    ),
    (
        '    eyebrow: "From the CLARA team",',
        '    eyebrow: <>From the <ClaraBrandName /> team</>,',
        "beta team eyebrow",
    ),
    (
        "    title: <>Thank you for giving CLARA a real chance.</>,",
        "    title: <>Thank you for giving <ClaraBrandName /> a real chance.</>,",
        "beta thank-you title",
    ),
    (
        "        Until now, CLARA has been something we&apos;ve imagined, designed, rebuilt, tested, and believed in.",
        "        Until now, <ClaraBrandName /> has been something we&apos;ve imagined, designed, rebuilt, tested, and believed in.",
        "beta second body",
    ),
    (
        "        You&apos;re helping shape what <span>CLARA becomes.</span>",
        "        You&apos;re helping shape what <span><ClaraBrandName /> becomes.</span>",
        "beta third title",
    ),
    (
        '    closing: "What you experience here may help shape the CLARA that thousands of Filipinos use someday.",',
        '    closing: <>What you experience here may help shape the <ClaraBrandName /> that thousands of Filipinos use someday.</>,',
        "beta third closing",
    ),
]

for old, new, label in beta_replacements:
    beta = replace_once(beta, old, new, label)

beta_path.write_text(beta)
