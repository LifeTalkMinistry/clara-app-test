import "../runtime/installLocalVaultSettingsExperience.js";
import { initializeLocalVaultIdentity } from "./localVaultIdentity.js";

initializeLocalVaultIdentity().catch(() => null);
