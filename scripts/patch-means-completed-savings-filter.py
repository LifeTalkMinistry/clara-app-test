from pathlib import Path

TARGET = Path('src/runtime/installClaraOrbGreeting.js')

source = TARGET.read_text()
marker = 'MEANS_COMPLETED_SAVINGS_FILTER_V1'

if marker not in source:
    old = '''    const status = normalizeLower(goal?.status);\n    const inactive = Boolean(\n      goal?.deletedAt ||\n        goal?.deleted_at ||\n        goal?.isArchived === true ||\n        goal?.is_archived === true ||\n        [\"deleted\", \"archived\", \"cancelled\", \"canceled\"].includes(status)\n    );'''
    new = '''    const status = normalizeLower(\n      goal?.completion_status || goal?.completionStatus || goal?.status\n    );\n    const inactive = Boolean(\n      goal?.deletedAt ||\n        goal?.deleted_at ||\n        goal?.completedAt ||\n        goal?.completed_at ||\n        goal?.isArchived === true ||\n        goal?.is_archived === true ||\n        [\n          \"completed\",\n          \"complete\",\n          \"fulfilled\",\n          \"consumed\",\n          \"deleted\",\n          \"archived\",\n          \"cancelled\",\n          \"canceled\",\n        ].includes(status)\n    ); // MEANS_COMPLETED_SAVINGS_FILTER_V1'''
    if old not in source:
        raise SystemExit('Means Score Savings Goal inactive filter anchor missing')
    source = source.replace(old, new, 1)
    TARGET.write_text(source)

print('Means Score completed Savings Goal filter patched')
