export function getBusinessBuilderSignalCopy(signalId, mode = "awareness") {
  const copy = {
    cashFlow: ["Cash flow needs protection.", "Separate timing from profit.", "Sales can look strong while available money stays tight because expenses, inventory, and payments do not always move together.", "Track money already available separately from money still waiting on sales, clients, or collections."],
    reinvestment: ["Reinvestment can pull hard.", "Reinvest with a limit.", "Growth often asks for tools, inventory, ads, supplies, or upgrades before profit feels fully stable.", "Set a reinvestment limit first so growth does not quietly consume money meant for stability."],
    operatingCosts: ["Operating costs can hide inside revenue.", "Make business costs visible.", "Supplies, delivery, subscriptions, platform fees, transport, and tools can make income look bigger than it really is.", "Separate operating costs before treating sales as personal spending money."],
    ownerPay: ["Owner pay needs a clear place.", "Pay yourself intentionally.", "Business owners can keep reinvesting while personal bills, rest, and stability quietly get delayed.", "Choose a small owner-pay rule so the business supports your life, not only its own growth."],
    growthPressure: ["Growth pressure can rush decisions.", "Slow down the next upgrade.", "Scaling, comparison, new ideas, and momentum can make every opportunity feel urgent.", "Before buying or expanding, check if the current system can protect cash flow, costs, and owner stability."],
    salesTiming: ["Sales timing affects stability.", "Plan around uneven sales.", "Some days look strong, some days feel quiet, and that rhythm can affect bills, stock, and personal confidence.", "Use strong sales days to protect slow days before increasing flexible spending or reinvestment."],
    personalBoundary: ["Personal boundaries protect the business too.", "Separate business from personal needs.", "When business money and personal money mix, it becomes harder to know what is profit, what is cost, and what is safe.", "Keep one boundary between business funds and personal spending so both sides stay clearer."],
  };
  const selected = copy[signalId] || copy.cashFlow;
  return {
    title: mode === "guidance" ? selected[1] : selected[0],
    body: mode === "guidance" ? selected[3] : selected[2],
  };
}
