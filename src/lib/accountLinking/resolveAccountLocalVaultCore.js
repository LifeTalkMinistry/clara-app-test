const clean = (value) => String(value ?? "").trim();
const cleanEmail = (value) => String(value ?? "").trim().toLowerCase();

function resolverError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertMetadataOwner(metadata, accountUserId) {
  const linkedAccountId = clean(metadata?.accountUserId);
  if (linkedAccountId && linkedAccountId !== accountUserId) {
    throw resolverError(
      "The selected local vault belongs to a different CLARA account.",
      "ACCOUNT_VAULT_DIRECTORY_CONFLICT"
    );
  }
}

async function activateAndLink({ vaultId, accountUserId, accountEmail, adapters }) {
  await adapters.activateVault(vaultId);
  await adapters.linkVault({ expectedVaultId: vaultId, accountUserId, accountEmail });
  return vaultId;
}

export async function resolveAccountLocalVaultWithAdapters(input = {}, adapters = {}) {
  const accountUserId = clean(input.accountUserId);
  const accountEmail = cleanEmail(input.accountEmail);
  if (!accountUserId || accountUserId === "local-dev-user" || accountUserId === "local-user") {
    throw resolverError("A genuine backend account ID is required.", "INVALID_ACCOUNT_ID");
  }

  const required = [
    "getMapping",
    "saveMapping",
    "findMetadataByAccountId",
    "getMetadata",
    "getActiveVaultId",
    "findMappingByVaultId",
    "createVaultId",
    "initializeMetadata",
    "activateVault",
    "linkVault",
  ];
  for (const name of required) {
    if (typeof adapters[name] !== "function") {
      throw resolverError(
        `Missing local-vault resolver adapter: ${name}`,
        "VAULT_RESOLVER_MISCONFIGURED"
      );
    }
  }

  const previousVaultId = clean(await adapters.getActiveVaultId());
  const mapping = await adapters.getMapping(accountUserId);
  if (mapping) {
    const vaultId = clean(mapping.vaultId);
    if (!vaultId) {
      throw resolverError(
        "The account-vault mapping is invalid.",
        "ACCOUNT_VAULT_DIRECTORY_CONFLICT"
      );
    }
    const metadata = await adapters.getMetadata(vaultId);
    assertMetadataOwner(metadata, accountUserId);
    await activateAndLink({ vaultId, accountUserId, accountEmail, adapters });
    await adapters.saveMapping({ accountId: accountUserId, accountEmail, vaultId });
    return {
      vaultId,
      accountUserId,
      accountEmail: accountEmail || null,
      reused: true,
      created: false,
      adoptedUnlinkedVault: false,
      switched: previousVaultId !== vaultId,
    };
  }

  const linkedMetadata = await adapters.findMetadataByAccountId(accountUserId);
  if (linkedMetadata?.vaultId) {
    const vaultId = clean(linkedMetadata.vaultId);
    const ownerMapping = await adapters.findMappingByVaultId(vaultId);
    if (ownerMapping && clean(ownerMapping.accountId) !== accountUserId) {
      throw resolverError(
        "The recovered vault mapping conflicts with another account.",
        "ACCOUNT_VAULT_DIRECTORY_CONFLICT"
      );
    }
    assertMetadataOwner(linkedMetadata, accountUserId);
    await activateAndLink({ vaultId, accountUserId, accountEmail, adapters });
    await adapters.saveMapping({ accountId: accountUserId, accountEmail, vaultId });
    return {
      vaultId,
      accountUserId,
      accountEmail: accountEmail || null,
      reused: true,
      created: false,
      adoptedUnlinkedVault: false,
      switched: previousVaultId !== vaultId,
    };
  }

  if (previousVaultId) {
    const activeMetadata = await adapters.getMetadata(previousVaultId);
    const activeMapping = await adapters.findMappingByVaultId(previousVaultId);
    const metadataOwner = clean(activeMetadata?.accountUserId);
    const activeIsUnlinked =
      !metadataOwner &&
      (!activeMetadata?.linkStatus ||
        activeMetadata.linkStatus === "local_only" ||
        activeMetadata.linkStatus === "link_failed") &&
      !activeMapping;

    if (activeIsUnlinked) {
      await activateAndLink({
        vaultId: previousVaultId,
        accountUserId,
        accountEmail,
        adapters,
      });
      await adapters.saveMapping({
        accountId: accountUserId,
        accountEmail,
        vaultId: previousVaultId,
      });
      return {
        vaultId: previousVaultId,
        accountUserId,
        accountEmail: accountEmail || null,
        reused: true,
        created: false,
        adoptedUnlinkedVault: true,
        switched: false,
      };
    }
  }

  const vaultId = clean(await adapters.createVaultId());
  if (!vaultId) {
    throw resolverError("CLARA could not create a new local vault.", "VAULT_CREATION_FAILED");
  }
  const duplicateMapping = await adapters.findMappingByVaultId(vaultId);
  if (duplicateMapping) {
    throw resolverError(
      "The new local vault ID is already mapped.",
      "ACCOUNT_VAULT_DIRECTORY_CONFLICT"
    );
  }
  await adapters.initializeMetadata(vaultId);
  await activateAndLink({ vaultId, accountUserId, accountEmail, adapters });
  await adapters.saveMapping({ accountId: accountUserId, accountEmail, vaultId });

  return {
    vaultId,
    accountUserId,
    accountEmail: accountEmail || null,
    reused: false,
    created: true,
    adoptedUnlinkedVault: false,
    switched: previousVaultId !== vaultId,
  };
}
