import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import GuidedWalletCreationModal from "@/components/fresh/main-dashboard/dashboard-primitives/GuidedWalletCreationModal";
import FinanceActionModalLegacy from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModalLegacy";

const CREATE_WALLET_TITLE = "Where will your money live?";

function findFirstElement(node, predicate) {
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;

  for (const child of Children.toArray(node.props?.children)) {
    const result = findFirstElement(child, predicate);
    if (result) return result;
  }

  return null;
}

function findField(children, label) {
  return Children.toArray(children).find(
    (child) => isValidElement(child) && child.props?.label === label
  );
}

function emitChange(element, value) {
  element?.props?.onChange?.({
    target: { value },
    currentTarget: { value },
  });
}

function buildInitialForm(children) {
  const nameField = findField(children, "Wallet name");
  const typeField = findField(children, "Wallet type");
  const balanceField = findField(children, "Starting balance");

  const nameInput = findFirstElement(
    nameField,
    (node) => node.type === "input" && node.props?.type !== "number"
  );
  const typeSelect = findFirstElement(typeField, (node) => node.type === "select");
  const customTypeInput = findFirstElement(
    typeField,
    (node) => node.type === "input" && node.props?.type !== "number"
  );
  const balanceInput = findFirstElement(
    balanceField,
    (node) => node.type === "input" && node.props?.type === "number"
  );

  const startingBalance = String(balanceInput?.props?.value ?? "0");

  return {
    form: {
      name: String(nameInput?.props?.value ?? ""),
      type: String(typeSelect?.props?.value ?? "cash"),
      customWalletType: String(customTypeInput?.props?.value ?? ""),
      startingBalance,
      amount: startingBalance,
      startingBalanceMode:
        Number(startingBalance) > 0 ? "manual_balance" : "skip",
      incomeSourceId: "",
    },
    controls: {
      nameInput,
      typeSelect,
      customTypeInput,
      balanceInput,
    },
  };
}

export default function FinanceActionModal(props) {
  const {
    open,
    title,
    children,
    onClose,
    onSubmit,
    loading = false,
    submitDisabled = false,
  } = props;
  const isCreateWalletModal = title === CREATE_WALLET_TITLE;
  const initial = useMemo(() => buildInitialForm(children), [children]);
  const [guidedForm, setGuidedForm] = useState(initial.form);

  useEffect(() => {
    if (!open || !isCreateWalletModal) return;
    setGuidedForm(initial.form);
    // Reset only when the create-wallet surface is opened. Parent field changes
    // are synchronized below without restarting the guided steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCreateWalletModal]);

  useEffect(() => {
    if (!open || !isCreateWalletModal) return;

    const { nameInput, typeSelect, customTypeInput, balanceInput } = initial.controls;
    const nextName = String(guidedForm.name ?? "");
    const nextType = String(guidedForm.type ?? "cash");
    const nextCustomType = String(guidedForm.customWalletType ?? "");
    const nextBalance = String(
      guidedForm.startingBalance ?? guidedForm.amount ?? "0"
    );

    if (String(nameInput?.props?.value ?? "") !== nextName) {
      emitChange(nameInput, nextName);
    }
    if (String(typeSelect?.props?.value ?? "cash") !== nextType) {
      emitChange(typeSelect, nextType);
    }
    if (
      customTypeInput &&
      String(customTypeInput?.props?.value ?? "") !== nextCustomType
    ) {
      emitChange(customTypeInput, nextCustomType);
    }
    if (String(balanceInput?.props?.value ?? "0") !== nextBalance) {
      emitChange(balanceInput, nextBalance);
    }
  }, [guidedForm, initial.controls, isCreateWalletModal, open]);

  if (!isCreateWalletModal) {
    return <FinanceActionModalLegacy {...props} />;
  }

  return (
    <GuidedWalletCreationModal
      open={open}
      onClose={onClose}
      onSave={() => {
        if (loading || submitDisabled) return;
        onSubmit?.({
          preventDefault() {},
          stopPropagation() {},
        });
      }}
      loading={loading}
      financeForm={guidedForm}
      setFinanceForm={setGuidedForm}
      incomeSources={[]}
      incomeSourcesLoading={false}
    />
  );
}
